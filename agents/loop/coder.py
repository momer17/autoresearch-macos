import anthropic
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def write_model(strategy: str, current_model_code: str, config: dict = None) -> str:
    """Returns complete new model.py content as string."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=(
            "You are an expert Python ML engineer. "
            "Apply the given strategy to model.py — make ONLY the described change, nothing else. "
            "The file must contain exactly one function: build_model(X_train, y_train) returning a fitted model. "
            "Preserve robust preprocessing for mixed-type tabular data. "
            "Do not break support for categorical string columns, numeric-looking string columns, "
            "or missing values. Any transformation added during fit must also be applied during predict, "
            "typically by returning a sklearn Pipeline or another fitted object that encapsulates preprocessing. "
            "Do not import anything outside sklearn, xgboost, numpy, pandas. "
            "Return ONLY the complete raw Python file — no markdown, no code fences."
        ),
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
