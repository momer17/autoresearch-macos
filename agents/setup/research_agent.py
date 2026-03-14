import os
import json
import pathlib
import httpx
from anthropic import Anthropic

MODEL = "claude-haiku-4-5-20251001"
PROMPTS_DIR = pathlib.Path(__file__).parent.parent / "prompts"

MAX_SEARCHES = 3  # Keep Tavily usage low (free-tier budget)

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


def _get_client() -> Anthropic:
    return Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def _load_system_prompt() -> str:
    return (PROMPTS_DIR / "research.txt").read_text()


def _tavily_search(query: str, max_results: int = 3) -> list[dict]:
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


def run_research(config: dict, task_description: str) -> str:
    """Returns markdown string of research findings."""
    client = _get_client()

    metric = config.get("metric", "f1")
    task_type = config.get("task_type", "binary_classification")
    feature_cols = config.get("feature_cols", [])
    feature_preview = ", ".join(feature_cols[:10])
    if len(feature_cols) > 10:
        feature_preview += f" … (+{len(feature_cols) - 10} more)"

    messages = [{
        "role": "user",
        "content": (
            f"Task: {task_description}\n"
            f"Task type: {task_type}\n"
            f"Target column: {config.get('target_col')}\n"
            f"Features: {feature_preview}\n"
            f"Metric to optimise: {metric} (higher is better for f1/accuracy/roc_auc/r2, lower for rmse/mae)\n\n"
            "Please research the best ML approaches for this task and return a Markdown summary of your findings."
        ),
    }]

    searches_used = 0
    while True:
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=_load_system_prompt(),
            tools=TOOLS,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            for block in response.content:
                if hasattr(block, "text"):
                    return block.text.strip()
            return ""

        if response.stop_reason == "tool_use":
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

            messages.append({"role": "user", "content": tool_results})
