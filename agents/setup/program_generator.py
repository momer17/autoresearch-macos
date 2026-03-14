import anthropic
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def generate_program(config: dict, research: str, task_description: str) -> str:
    """Returns program.md content as string."""
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1024,
        system="You are an ML research program manager. Given research findings, write a concise program.md that lists the top experiments to run in priority order. Each experiment should be a single, concrete, testable change to train.py.",
        messages=[{"role": "user", "content": f"Task: {task_description}\n\nResearch findings:\n{research}\n\nWrite program.md listing the top 8 experiments to try."}],
    )
    return response.content[0].text.strip()
