import anthropic
import os
import pathlib

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PROMPTS_DIR = pathlib.Path(__file__).parent.parent / "prompts"


def _load_system_prompt() -> str:
    return (PROMPTS_DIR / "program.txt").read_text()


def generate_program(config: dict, research: str, task_description: str) -> str:
    """Returns program.md content as string — the research plan for the agent loop."""
    metric = config.get("metric", "f1")
    task_type = config.get("task_type", "binary_classification")

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=_load_system_prompt(),
        messages=[{
            "role": "user",
            "content": (
                f"Task: {task_description}\n"
                f"Task type: {task_type}\n"
                f"Metric: {metric}\n\n"
                f"Research findings:\n{research}\n\n"
                "Write the experiment plan with the top 8 experiments to try."
            )
        }],
    )
    return response.content[0].text.strip()
