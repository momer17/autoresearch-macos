import anthropic
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def get_strategy(model_code: str, program_md: str, research_md: str, history: list) -> str:
    """Returns plain English strategy string."""
    history_str = ""
    if history:
        history_str = "\n".join(
            f"- Iter {h['iteration']}: score={h.get('score', 'N/A')}, kept={h['kept']}, strategy={h['strategy'][:100]}"
            for h in history[-5:]
        )

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        system=(
            "You are an expert ML researcher optimising a GPT language model. "
            "The metric is val_bpb — lower is better. "
            "Suggest ONE specific, concrete change to make to train.py. "
            "Be precise: name the exact variable or code section to change and the new value. "
            "Do not repeat strategies that were already tried. "
            "Respond with a single short paragraph — no code, just the strategy."
        ),
        messages=[{
            "role": "user",
            "content": (
                f"Program plan:\n{program_md}\n\n"
                f"Research:\n{research_md}\n\n"
                f"Recent history:\n{history_str or 'No history yet — this is the first iteration.'}\n\n"
                f"Current best model code (first 3000 chars):\n{model_code[:3000]}\n\n"
                "What single change should we try next?"
            )
        }],
    )
    return response.content[0].text.strip()
