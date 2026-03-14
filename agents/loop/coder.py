import anthropic
import os
import pathlib

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PROMPTS_DIR = pathlib.Path(__file__).parent.parent / "prompts"


def _load_system_prompt() -> str:
    return (PROMPTS_DIR / "coder.txt").read_text()


def write_model(strategy: str, current_model_code: str, config: dict = None) -> str:
    """Returns complete new model.py content as string."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=_load_system_prompt(),
        messages=[{
            "role": "user",
            "content": (
                f"Strategy to apply:\n{strategy}\n\n"
                f"Current model.py:\n{current_model_code}"
            )
        }],
    )
    code = response.content[0].text.strip()
    if code.startswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return code
