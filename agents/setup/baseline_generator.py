import anthropic
import os
import pathlib

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PROMPTS_DIR = pathlib.Path(__file__).parent.parent / "prompts"


def _load_system_prompt() -> str:
    return (PROMPTS_DIR / "baseline.txt").read_text()


def generate_baseline(config: dict, task_description: str) -> str:
    """Returns complete model.py content with a simple baseline build_model()."""
    task_type = config.get("task_type", "binary_classification")
    metric = config.get("metric", "f1")
    feature_cols = config.get("feature_cols", [])
    target_col = config.get("target_col", "target")

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
<<<<<<< HEAD
        system=_load_system_prompt(),
=======
        system=(
            "You are an expert ML engineer. Write a complete model.py file. "
            "The file must contain exactly one function: build_model(X_train, y_train) "
            "that returns a fitted sklearn or xgboost model. "
            "Start with a deliberately conservative, interpretable baseline that leaves room "
            "for future iterations to improve. "
            "Prefer LogisticRegression, RandomForest, or another simple sklearn baseline "
            "before any boosted tree model. "
            "Do not start with XGBoost, CatBoost-style feature engineering, ensembles, or "
            "aggressive hyperparameter tuning. "
            "Use straightforward preprocessing only — enough to make the model robust, but not optimized. "
            "Handle preprocessing robustly inline. "
            "Assume Kaggle-style CSVs may contain mixed dtypes, missing values, "
            "categorical string columns, and numeric-looking strings such as 'TotalCharges'. "
            "Before fitting, convert numeric-like object columns with pandas.to_numeric(errors='coerce') "
            "when appropriate, fill numeric columns with a numeric statistic, and encode remaining "
            "categorical columns safely. "
            "Any preprocessing applied at fit time must also work at predict time via the returned model "
            "or returned sklearn pipeline. "
            "Do not import anything outside of sklearn, xgboost, numpy, pandas. "
            "Return ONLY the raw Python file — no markdown, no code fences."
        ),
>>>>>>> origin/master
        messages=[{
            "role": "user",
            "content": (
                f"Task: {task_description}\n"
                f"Task type: {task_type}\n"
                f"Metric: {metric}\n"
                f"Target column: {target_col}\n"
                f"Feature columns: {feature_cols}\n\n"
                "Write the baseline model.py. "
                "Make it a true baseline, not a near-final optimized solution."
            )
        }],
    )
    code = response.content[0].text.strip()
    if code.startswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return code
