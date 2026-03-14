import json
import threading
import traceback
import uuid
from pathlib import Path

from backend.evaluate import run_evaluation, higher_is_better

REPO_ROOT = Path(__file__).parent.parent
RESULTS_DIR = REPO_ROOT / "results"

# Global experiment state — api.py reads this directly
state = {
    "status": "idle",           # idle | setting_up | running_baseline | running | complete | error
    "experiment_id": None,
    "stage_label": "",          # human-readable label of what is happening right now
    "baseline": None,           # baseline score (float)
    "best_score": None,
    "current_iteration": 0,
    "total_iterations": 12,
    # Agent outputs — filled in progressively
    "research_summary": "",     # markdown from research_agent
    "program": "",              # markdown from program_generator
    "baseline_code": "",        # Python from baseline_generator
    "current_strategy": "",     # plain-English strategy from strategist (latest)
    "current_code": "",         # Python from coder (latest)
    "iterations": [],           # list of iteration records
    "error": None,
}


def _write_result(experiment_id: str, record: dict):
    RESULTS_DIR.mkdir(exist_ok=True)
    path = RESULTS_DIR / f"{experiment_id}.json"
    history = []
    if path.exists():
        history = json.loads(path.read_text())
    history.append(record)
    path.write_text(json.dumps(history, indent=2))


def _is_improvement(new_score: float, best_score: float, metric: str) -> bool:
    if higher_is_better(metric):
        return new_score > best_score
    return new_score < best_score


def _run(config: dict):
    global state

    experiment_id = state["experiment_id"]
    total = config.get("total_iterations", 12)
    task = config.get("task_description", "Improve model performance")
    metric = config["metric"]

    state.update({
        "status": "setting_up",
        "stage_label": "",
        "baseline": None,
        "best_score": None,
        "current_iteration": 0,
        "total_iterations": total,
        "research_summary": "",
        "program": "",
        "baseline_code": "",
        "current_strategy": "",
        "current_code": "",
        "iterations": [],
        "error": None,
    })

    try:
        from agents.setup.research_agent import run_research
        from agents.setup.program_generator import generate_program
        from agents.setup.baseline_generator import generate_baseline
        from agents.loop.strategist import get_strategy
        from agents.loop.coder import write_model

        # --- Research agent ---
        state["stage_label"] = "Research agent: scanning ML literature..."
        research = run_research(config, task)
        state["research_summary"] = research

        # --- Program generator ---
        state["stage_label"] = "Program generator: building experiment plan..."
        program = generate_program(config, research, task)
        state["program"] = program

        # --- Baseline generator ---
        state["stage_label"] = "Baseline generator: writing initial model..."
        baseline_code = generate_baseline(config, task)
        state["baseline_code"] = baseline_code

        # --- Baseline evaluation ---
        state["status"] = "running_baseline"
        state["stage_label"] = "Evaluating baseline model..."
        baseline_result = run_evaluation(baseline_code, config)

        if not baseline_result["success"]:
            state["status"] = "error"
            state["error"] = f"Baseline failed:\n{baseline_result.get('error')}"
            return

        best_score = baseline_result["score"]
        best_code = baseline_code
        state["baseline"] = best_score
        state["best_score"] = best_score

        history = []

        # --- Optimisation loop ---
        for i in range(total):
            state["status"] = "running"
            state["current_iteration"] = i + 1

            state["stage_label"] = f"Strategist: choosing strategy for iteration {i + 1}..."
            state["current_strategy"] = ""
            state["current_code"] = ""
            strategy = get_strategy(best_code, program, research, history, config)
            state["current_strategy"] = strategy

            state["stage_label"] = f"Coder: implementing iteration {i + 1}..."
            new_code = write_model(strategy, best_code, config)
            state["current_code"] = new_code

            state["stage_label"] = f"Evaluating iteration {i + 1}..."
            result = run_evaluation(new_code, config)

            if result["success"] and result["score"] is not None:
                score = result["score"]
                kept = _is_improvement(score, best_score, metric)
                if kept:
                    best_score = score
                    best_code = new_code
                    state["best_score"] = best_score

                record = {
                    "iteration": i + 1,
                    "score": score,
                    "best_score": best_score,
                    "strategy": strategy,
                    "kept": kept,
                    "error": None,
                }
            else:
                record = {
                    "iteration": i + 1,
                    "score": None,
                    "best_score": best_score,
                    "strategy": strategy,
                    "kept": False,
                    "error": result.get("error"),
                }

            state["iterations"].append(record)
            history.append(record)
            _write_result(experiment_id, record)

        state["status"] = "complete"
        state["stage_label"] = "Experiment complete."

    except Exception:
        state["status"] = "error"
        state["error"] = traceback.format_exc()


def start_experiment(config: dict):
    state["experiment_id"] = config.get("experiment_id", str(uuid.uuid4())[:8])
    t = threading.Thread(target=_run, args=(config,), daemon=True)
    t.start()


def get_status() -> dict:
    return dict(state)
