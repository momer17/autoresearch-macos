import threading
import uuid
from pathlib import Path

from backend.evaluate import run_training, restore_backup

REPO_ROOT = Path(__file__).parent.parent
TRAIN_PY = REPO_ROOT / "train.py"

# Global experiment state — api.py reads this directly
state = {
    "status": "idle",
    "experiment_id": None,
    "baseline": None,
    "best_score": None,
    "current_iteration": 0,
    "total_iterations": 8,
    "research_summary": "",
    "iterations": [],
    "error": None,
}


def _run(config: dict):
    global state

    total = config.get("total_iterations", 8)
    task = config.get("task_description", "Improve LLM training efficiency")

    state.update({
        "status": "setting_up",
        "baseline": None,
        "best_score": None,
        "current_iteration": 0,
        "total_iterations": total,
        "research_summary": "",
        "iterations": [],
        "error": None,
    })

    try:
        from agents.setup.research_agent import run_research
        from agents.setup.program_generator import generate_program
        from agents.setup.baseline_generator import generate_baseline
        from agents.loop.strategist import get_strategy
        from agents.loop.coder import write_model

        # --- Setup phase (runs once) ---
        state["research_summary"] = "Running research..."
        research = run_research(config, task)

        state["research_summary"] = "Generating program plan..."
        program = generate_program(config, research, task)

        state["research_summary"] = "Generating baseline model..."
        baseline_code = generate_baseline(config, task)

        state["research_summary"] = research[:600] if research else "Research complete."

        # --- Baseline run ---
        state["status"] = "running_baseline"
        baseline_result = run_training(baseline_code, f"{state['experiment_id']}_baseline")

        if not baseline_result["success"]:
            state["status"] = "error"
            state["error"] = f"Baseline failed: {baseline_result.get('error')} | stdout: {baseline_result.get('stdout', '')[-500:]}"
            restore_backup()
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

            strategy = get_strategy(best_code, program, research, history)
            new_code = write_model(strategy, best_code)

            result = run_training(new_code, f"{state['experiment_id']}_iter_{i + 1}")

            if result["success"] and result["score"] is not None:
                score = result["score"]
                kept = score < best_score
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
                    "duration_s": result["duration_s"],
                }
            else:
                record = {
                    "iteration": i + 1,
                    "score": None,
                    "best_score": best_score,
                    "strategy": strategy,
                    "kept": False,
                    "duration_s": result["duration_s"],
                    "error": result.get("error"),
                }

            state["iterations"].append(record)
            history.append(record)

        state["status"] = "complete"

    except Exception as e:
        import traceback
        state["status"] = "error"
        state["error"] = traceback.format_exc()
        restore_backup()


def start_experiment(config: dict):
    state["experiment_id"] = config.get("experiment_id", str(uuid.uuid4())[:8])
    t = threading.Thread(target=_run, args=(config,), daemon=True)
    t.start()


def get_status() -> dict:
    return dict(state)
