import anthropic
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def generate_baseline(config: dict, task_description: str) -> str:
    """Returns complete model.py content with a simple baseline build_model()."""
    task_type = config.get("task_type", "binary_classification")
    metric = config.get("metric", "f1")
    feature_cols = config.get("feature_cols", [])
    target_col = config.get("target_col", "target")

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=(
            "You are an expert ML engineer. Write a complete model.py file. "
            "The file must contain exactly one function: build_model(X_train, y_train) "
            "that returns a fitted sklearn or xgboost model. "
            "Start with a simple but reasonable baseline — no complex pipelines yet. "
            "Handle any obvious preprocessing inline (e.g. fillna, label encoding if needed). "
            "Do not import anything outside of sklearn, xgboost, numpy, pandas. "
            "Return ONLY the raw Python file — no markdown, no code fences."
        ),
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
