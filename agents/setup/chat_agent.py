"""
Chat agent for experiment setup.

Drives a natural-language conversation to collect the two required inputs:
  1. target_col  — which column to predict
  2. task_description — one-sentence description of the ML goal

Uses tool_use to signal structured actions back to the API layer:
  - pick_target       { column: str }
  - start_experiment  { target_col: str, task_description: str }
"""
import os
from anthropic import Anthropic

MODEL = "claude-haiku-4-5-20251001"

_BASE_SYSTEM = """\
You are a concise ML experiment assistant for AutoResearch.
Your only job is to collect two pieces of information from the user:
  1. Which column in their CSV dataset they want to predict (target column).
  2. A one-sentence description of the ML task.

Rules:
- Keep every reply to 1–3 short sentences.
- If no CSV has been uploaded yet, tell the user to upload one using the panel on the right.
- Once columns are available, list a few and ask which to predict.
- Once the target is chosen, immediately ask for a one-sentence task description.
- As soon as you have a clear task description, call start_experiment — do not ask for confirmation.
- When the user clearly names a column as the target, call pick_target.
- Never ask for information you already have.
"""

TOOLS = [
    {
        "name": "pick_target",
        "description": "Call this when the user has identified which column to predict.",
        "input_schema": {
            "type": "object",
            "properties": {
                "column": {
                    "type": "string",
                    "description": "Exact column name the user selected.",
                }
            },
            "required": ["column"],
        },
    },
    {
        "name": "start_experiment",
        "description": (
            "Call this when you have both the target column AND a clear task description. "
            "This triggers the experiment immediately."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "target_col": {"type": "string"},
                "task_description": {"type": "string"},
            },
            "required": ["target_col", "task_description"],
        },
    },
]


def run_chat(
    message: str,
    history: list[dict],
    columns: list[str],
    target_col: str | None,
) -> dict:
    """
    Single conversational turn.

    Args:
        message:    Current user message (empty string on first/trigger calls).
        history:    Prior turns as [{"role": "user"|"assistant", "content": str}].
        columns:    Column names from the uploaded CSV (empty if no CSV yet).
        target_col: Already-selected target, or None.

    Returns:
        {"response": str, "action": None | {"type": ..., ...}}
    """
    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # Build a dynamic system prompt that includes current experiment state so
    # Claude always has context without needing it injected into message history.
    state_lines = []
    if columns:
        preview = ", ".join(columns[:15])
        if len(columns) > 15:
            preview += f" … (+{len(columns) - 15} more)"
        state_lines.append(f"CSV uploaded. Columns: {preview}")
    else:
        state_lines.append("No CSV uploaded yet.")

    if target_col:
        state_lines.append(f"Target column already confirmed: '{target_col}'")
    else:
        state_lines.append("Target column: not yet selected.")

    system = _BASE_SYSTEM + "\n\nCurrent state:\n" + "\n".join(state_lines)

    # Build messages: history + current user message
    messages = list(history)
    if message:
        messages.append({"role": "user", "content": message})
    elif not messages:
        # Initial trigger (no user message yet) — send a system note
        messages.append({"role": "user", "content": "[The user just opened the app. Greet them briefly and tell them to upload a CSV.]"})

    # Anthropic requires the first message to have role "user".
    # Guard against a malformed history that starts with "assistant".
    if messages and messages[0]["role"] != "user":
        messages.insert(0, {"role": "user", "content": "Hello"})

    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=system,
        tools=TOOLS,
        messages=messages,
    )

    text_response = ""
    action = None

    for block in response.content:
        if hasattr(block, "text"):
            text_response += block.text
        elif block.type == "tool_use":
            if block.name == "pick_target":
                action = {"type": "pick_target", "value": block.input["column"]}
            elif block.name == "start_experiment":
                action = {
                    "type": "start_experiment",
                    "target_col": block.input["target_col"],
                    "task_description": block.input["task_description"],
                }

    # If Claude called a tool but produced no text, do a follow-up turn to get
    # the confirmation message (tool_use requires a tool_result before continuing).
    if action and not text_response.strip():
        messages.append({"role": "assistant", "content": response.content})
        tool_results = [
            {
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": "ok",
            }
            for block in response.content
            if block.type == "tool_use"
        ]
        messages.append({"role": "user", "content": tool_results})

        follow = client.messages.create(
            model=MODEL,
            max_tokens=256,
            system=system,
            tools=TOOLS,
            messages=messages,
        )
        for block in follow.content:
            if hasattr(block, "text"):
                text_response = block.text.strip()

    return {"response": text_response.strip(), "action": action}
