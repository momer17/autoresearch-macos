import anthropic
import os
import pathlib

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PROMPTS_DIR = pathlib.Path(__file__).parent.parent / "prompts"


def _load_system_prompt() -> str:
    return (PROMPTS_DIR / "baseline.txt").read_text()


def generate_baseline(config: dict, task_description: str) -> str:
    """Returns complete model.py content with a simple baseline build_model()."""
    task_type = config.get("task_type", "binary_classification")
    metric = config.get("metric", "f1")
    feature_cols = config.get("feature_cols", [])
    target_col = config.get("target_col", "target")

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=_load_system_prompt(),
        messages=[{
            "role": "user",
            "content": (
                f"Task: {task_description}\n"
                f"Task type: {task_type}\n"
                f"Metric: {metric}\n"
                f"Target column: {target_col}\n"
                f"Feature columns: {feature_cols}\n\n"
                "Write the baseline model.py."
            )
        }],
    )
    code = response.content[0].text.strip()
    if code.startswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return code
