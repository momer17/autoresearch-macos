import anthropic
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def run_research(config: dict, task_description: str) -> str:
    """Returns markdown string of research findings."""
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1024,
        system="You are an ML research assistant. Given a training task, summarise the most relevant techniques to try: architecture choices, optimiser settings, regularisation, etc. Be concise and specific. Output markdown.",
        messages=[{"role": "user", "content": f"Task: {task_description}\n\nWhat are the most promising techniques to try to improve val_bpb (lower is better)?"}],
    )
    return response.content[0].text.strip()
