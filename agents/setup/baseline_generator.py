from pathlib import Path


def generate_baseline(config: dict, task_description: str) -> str:
    """Returns the current train.py as the baseline — no changes."""
    train_py = Path(__file__).parent.parent.parent / "train.py.backup"
    if not train_py.exists():
        train_py = Path(__file__).parent.parent.parent / "train.py"
    return train_py.read_text()
