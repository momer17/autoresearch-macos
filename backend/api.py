import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.orchestrator import start_experiment, get_status, state

app = FastAPI(title="autoresearch")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartRequest(BaseModel):
    task_description: str
    total_iterations: int = 8


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/start")
def start(req: StartRequest):
    if state.get("status") in ("running", "setting_up", "running_baseline"):
        return {"error": "Experiment already running", "status": state["status"]}

    config = {
        "experiment_id": str(uuid.uuid4())[:8],
        "task_description": req.task_description,
        "total_iterations": req.total_iterations,
    }
    start_experiment(config)
    return {"experiment_id": config["experiment_id"], "status": "started"}


@app.get("/status")
def status():
    return get_status()
