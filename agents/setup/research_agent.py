import os
import json
import pathlib
import httpx
from anthropic import Anthropic

MODEL = "claude-haiku-4-5-20251001"
PROMPTS_DIR = pathlib.Path(__file__).parent.parent / "prompts"


def _get_client() -> Anthropic:
    return Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def _load_system_prompt() -> str:
    return (PROMPTS_DIR / "research.txt").read_text()


MAX_SEARCHES = 3  # Keep Tavily usage low (free-tier budget)


def _tavily_search(query: str, max_results: int = 3) -> list[dict]:
    """Call the Tavily search API and return a list of result dicts."""
    response = httpx.post(
        "https://api.tavily.com/search",
        json={
            "api_key": os.environ["TAVILY_API_KEY"],
            "query": query,
            "max_results": max_results,
            "search_depth": "basic",
        },
        timeout=15,
    )
    response.raise_for_status()
    return response.json().get("results", [])


# Tool definition passed to Claude so it knows what it can call.
TOOLS = [
    {
        "name": "search_web",
        "description": (
            "Search the web for ML research, papers, benchmarks, and techniques. "
            "Use this to find relevant methods for the given task."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to run.",
                }
            },
            "required": ["query"],
        },
    }
]


def run_research(config: dict, task_description: str) -> str:
    """
    Research relevant ML techniques for the given task.

    Claude drives the search autonomously — it decides what queries to run,
    reads the results, and loops until it has enough to write a summary.

    Args:
        config: Experiment config dict (target_col, feature_cols, metric, …).
        task_description: Plain-English description of the ML goal.

    Returns:
        Markdown string of research findings.
    """
    client = _get_client()

    feature_cols = config.get("feature_cols", [])
    feature_preview = ", ".join(feature_cols[:10])
    if len(feature_cols) > 10:
        feature_preview += f" … (+{len(feature_cols) - 10} more)"

    user_message = (
        f"Task: {task_description}\n\n"
        f"Config:\n"
        f"- Target column: {config.get('target_col')}\n"
        f"- Features: {feature_preview}\n"
        f"- Metric to optimise: {config.get('metric')}\n\n"
        "Please research the best ML approaches for this task and return a "
        "Markdown summary of your findings."
    )

    messages = [{"role": "user", "content": user_message}]

    # -----------------------------------------------------------------------
    # Agentic loop
    # Claude will call search_web as many times as it needs, then produce a
    # final text response when it has enough information (stop_reason="end_turn").
    # Hard cap at MAX_SEARCHES to protect free-tier Tavily credits.
    # -----------------------------------------------------------------------
    searches_used = 0
    while True:
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=_load_system_prompt(),
            tools=TOOLS,
            messages=messages,
        )

        # Always append the full assistant turn to maintain valid message history.
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            # Claude is done — return the final text block.
            for block in response.content:
                if hasattr(block, "text"):
                    return block.text.strip()
            return ""

        if response.stop_reason == "tool_use":
            # Execute each tool call Claude requested and collect results.
            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue

                if block.name == "search_web":
                    try:
                        if searches_used >= MAX_SEARCHES:
                            output = "Search limit reached. Summarise findings so far."
                        else:
                            results = _tavily_search(block.input["query"])
                            searches_used += 1
                            # Give Claude the title, URL, and snippet for each result.
                            output = json.dumps(
                                [
                                    {
                                        "title": r.get("title"),
                                        "url": r.get("url"),
                                        "content": r.get("content", "")[:500],
                                    }
                                    for r in results
                                ],
                                indent=2,
                            )
                    except Exception as exc:
                        output = f"Search failed: {exc}"
                else:
                    output = f"Unknown tool: {block.name}"

                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": output,
                    }
                )

            # Feed all results back to Claude as a single user turn.
            messages.append({"role": "user", "content": tool_results})
