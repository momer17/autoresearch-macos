# LOCKED - do not modify
import re
import shutil
import subprocess
import time
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
TRAIN_PY = REPO_ROOT / "train.py"
TRAIN_PY_BACKUP = REPO_ROOT / "train.py.backup"


def _ensure_backup():
    if not TRAIN_PY_BACKUP.exists():
        shutil.copy(TRAIN_PY, TRAIN_PY_BACKUP)


def restore_backup():
    if TRAIN_PY_BACKUP.exists():
        shutil.copy(TRAIN_PY_BACKUP, TRAIN_PY)


def run_training(model_code: str, experiment_id: str) -> dict:
    """
    Writes model_code to train.py, runs it for the fixed time budget,
    parses val_bpb from stdout, returns result dict.
    """
    _ensure_backup()
    TRAIN_PY.write_text(model_code)

    t_start = time.time()
    try:
        result = subprocess.run(
            ["python", str(TRAIN_PY)],
            capture_output=True,
            text=True,
            timeout=700,
            cwd=str(REPO_ROOT),
        )
        stdout = result.stdout + "\n" + result.stderr
        duration = time.time() - t_start

        match = re.search(r"val_bpb:\s+([\d.]+)", stdout)
        if match:
            return {
                "score": float(match.group(1)),
                "duration_s": round(duration, 1),
                "stdout": stdout,
                "success": True,
            }
        else:
            return {
                "score": None,
                "duration_s": round(duration, 1),
                "stdout": stdout,
                "success": False,
                "error": "val_bpb not found in output",
            }

    except subprocess.TimeoutExpired:
        return {
            "score": None,
            "duration_s": round(time.time() - t_start, 1),
            "stdout": "",
            "success": False,
            "error": "Training timed out after 700s",
        }
    except Exception as e:
        return {
            "score": None,
            "duration_s": round(time.time() - t_start, 1),
            "stdout": "",
            "success": False,
            "error": str(e),
        }
