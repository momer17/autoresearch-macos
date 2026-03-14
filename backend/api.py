import shutil
import uuid
from pathlib import Path

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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/start")
async def start(
    file: UploadFile = File(...),
    target_col: str = Form(...),
    task_description: str = Form(...),
    metric: str = Form(...),
    task_type: str = Form("binary_classification"),
    feature_cols: str = Form(""),       # comma-separated, empty = all except target
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

    # Parse feature_cols
    cols = [c.strip() for c in feature_cols.split(",") if c.strip()] if feature_cols else None

    config = {
        "experiment_id": experiment_id,
        "csv_path": str(csv_path),
        "target_col": target_col,
        "feature_cols": cols,
        "metric": metric,
        "task_type": task_type,
        "task_description": task_description,
        "total_iterations": total_iterations,
    }

    start_experiment(config)
    return {"experiment_id": experiment_id, "status": "started"}


@app.get("/status")
def status():
    return get_status()
