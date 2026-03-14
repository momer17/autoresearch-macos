import anthropic
import os
import pathlib

import pandas as pd

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PROMPTS_DIR = pathlib.Path(__file__).parent.parent / "prompts"


def _load_system_prompt() -> str:
    return (PROMPTS_DIR / "baseline.txt").read_text()


def _dataset_shape(config: dict) -> tuple[int, int] | None:
    csv_path = config.get("csv_path")
    if not csv_path:
        return None
    try:
        df = pd.read_csv(csv_path, nrows=0)
        n_cols = len(df.columns)
        n_rows = sum(1 for _ in open(csv_path)) - 1
        return n_rows, n_cols
    except Exception:
        return None


def generate_baseline(config: dict, task_description: str) -> str:
    """Returns complete model.py content with a simple baseline build_model()."""
    task_type = config.get("task_type", "binary_classification")
    metric = config.get("metric", "f1")
    feature_cols = config.get("feature_cols") or []
    target_col = config.get("target_col", "target")

    feature_preview = ", ".join(feature_cols[:15])
    if len(feature_cols) > 15:
        feature_preview += f" … (+{len(feature_cols) - 15} more)"

    shape = _dataset_shape(config)
    shape_line = f"Dataset size: {shape[0]} rows, {shape[1]} columns\n" if shape else ""

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
                f"Features: {feature_preview or 'all columns except target'}\n"
                f"{shape_line}"
                "Write the baseline model.py."
            )
        }],
    )
    code = response.content[0].text.strip()
    if code.startswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return code
