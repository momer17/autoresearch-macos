import shutil
import uuid
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.orchestrator import start_experiment, get_status, state

REPO_ROOT = Path(__file__).parent.parent
UPLOADS_DIR = REPO_ROOT / "data" / "uploads"

app = FastAPI(title="autoresearch")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _infer_task_and_metric(y) -> tuple[str, str]:
    """Infer task_type and best default metric from the target column."""
    n_unique = y.nunique()
    if n_unique == 2:
        return "binary_classification", "roc_auc"
    elif n_unique <= 20:
        return "multiclass_classification", "f1_macro"
    else:
        return "regression", "rmse"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/start")
async def start(
    file: UploadFile = File(...),
    target_col: str = Form(...),
    task_description: str = Form(...),
    total_iterations: int = Form(8),
):
    if state.get("status") in ("running", "setting_up", "running_baseline"):
        return {"error": "Experiment already running", "status": state["status"]}

    # Save uploaded CSV
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    experiment_id = str(uuid.uuid4())[:8]
    csv_path = UPLOADS_DIR / f"{experiment_id}.csv"
    with csv_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # Infer task type and metric from the data
    df = pd.read_csv(csv_path)
    feature_cols = [c for c in df.columns if c != target_col]
    task_type, metric = _infer_task_and_metric(df[target_col])

    config = {
        "experiment_id": experiment_id,
        "csv_path": str(csv_path),
        "target_col": target_col,
        "feature_cols": feature_cols,
        "metric": metric,
        "task_type": task_type,
        "task_description": task_description,
        "total_iterations": total_iterations,
    }

    start_experiment(config)
    return {
        "experiment_id": experiment_id,
        "status": "started",
        "task_type": task_type,
        "metric": metric,
    }


@app.get("/status")
def status():
    return get_status()
