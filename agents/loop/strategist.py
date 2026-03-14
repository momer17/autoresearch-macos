import anthropic
import os
import pathlib

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PROMPTS_DIR = pathlib.Path(__file__).parent.parent / "prompts"


def _load_system_prompt(task_type: str, metric: str) -> str:
    template = (PROMPTS_DIR / "strategist.txt").read_text()
    return template.format(task_type=task_type, metric=metric)


def get_strategy(model_code: str, program_md: str, research_md: str, history: list, config: dict = None) -> str:
    """Returns plain English strategy string."""
    config = config or {}
    metric = config.get("metric", "f1")
    task_type = config.get("task_type", "binary_classification")

    history_str = ""
    if history:
        history_str = "\n".join(
            f"- Iter {h['iteration']}: {metric}={h.get('score', 'N/A')}, kept={h['kept']}, strategy: {h['strategy'][:120]}"
            for h in history[-6:]
        )

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        system=_load_system_prompt(task_type, metric),
        messages=[{
            "role": "user",
            "content": (
                f"Program plan:\n{program_md}\n\n"
                f"Research:\n{research_md}\n\n"
                f"Recent history:\n{history_str or 'No history yet — first iteration.'}\n\n"
                f"Current model.py:\n{model_code}\n\n"
                "What single change should we try next?"
            )
        }],
    )
    return response.content[0].text.strip()
