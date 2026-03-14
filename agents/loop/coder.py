import anthropic
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def write_model(strategy: str, current_model_code: str) -> str:
    """Returns complete new train.py content as string."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8096,
        system=(
            "You are an expert Python ML engineer. "
            "You will be given a strategy and the current train.py file. "
            "Apply the strategy as described — make ONLY the specified change, nothing else. "
            "Return the COMPLETE train.py file with the change applied. "
            "Do not add any explanation, markdown, or code fences — just the raw Python file."
        ),
        messages=[{
            "role": "user",
            "content": (
                f"Strategy to apply:\n{strategy}\n\n"
                f"Current train.py:\n{current_model_code}"
            )
        }],
    )
    code = response.content[0].text.strip()
    # Strip markdown fences if model added them
    if code.startswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    return code
