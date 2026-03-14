import anthropic
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def generate_program(config: dict, research: str, task_description: str) -> str:
    """Returns program.md content as string — the research plan for the agent loop."""
    metric = config.get("metric", "f1")
    task_type = config.get("task_type", "binary_classification")

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1024,
        system=(
            "You are an ML research program manager. "
            "Write a concise program.md that lists experiments to run in priority order. "
            "Each experiment must be a single concrete change to build_model() in model.py. "
            "Only propose experiments that can be implemented with sklearn and xgboost. "
            "Do not include LightGBM, CatBoost, or any unsupported library. "
            "Focus on high-impact changes first."
        ),
        messages=[{
            "role": "user",
            "content": (
                f"Task: {task_description}\n"
                f"Task type: {task_type}\n"
                f"Metric: {metric}\n\n"
                f"Research findings:\n{research}\n\n"
                "Write program.md with the top 8 experiments to try."
            )
        }],
    )
    return response.content[0].text.strip()
