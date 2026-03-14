import anthropic
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def run_research(config: dict, task_description: str) -> str:
    """Returns markdown string of research findings."""
    metric = config.get("metric", "f1")
    task_type = config.get("task_type", "binary_classification")

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=(
            "You are an ML research assistant specialising in tabular data. "
            "Given a task, summarise the most effective techniques for that problem type: "
            "feature engineering, model families, hyperparameter ranges, class imbalance handling, etc. "
            "Be specific and concise. Output markdown."
        ),
        messages=[{
            "role": "user",
            "content": (
                f"Task: {task_description}\n"
                f"Task type: {task_type}\n"
                f"Metric to optimise: {metric} (higher is better for f1/accuracy/roc_auc/r2, lower for rmse/mae)\n\n"
                "What are the most effective techniques to try with sklearn/xgboost?"
            )
        }],
    )
    return response.content[0].text.strip()
