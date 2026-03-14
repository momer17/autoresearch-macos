# Architecture

## What this system does

An autonomous agent loop that iteratively improves a machine learning model on any tabular CSV dataset. You upload a CSV, describe your goal, and the system runs experiments overnight — rewriting the model, evaluating it, keeping improvements, and discarding regressions.

## What it is NOT

This repo started as a fork of Karpathy's autoresearch (GPT pretraining on text). We kept the concept — an agent loop that rewrites and evaluates code — but replaced the domain entirely. There is no `train.py`, no `val_bpb`, no language model. The target is general tabular ML: classification and regression on CSV data.

---

## How it works

```
User uploads CSV + config
        │
        ▼
   Setup agents (once)
   ├── research_agent     → summarise relevant ML techniques
   ├── program_generator  → write a prioritised experiment plan
   └── baseline_generator → write the first model.py
        │
        ▼
   evaluate.py runs baseline → score
        │
        ▼
   Loop (N iterations)
   ├── strategist  → read history, propose ONE change in plain English
   ├── coder       → rewrite model.py to implement the change
   ├── evaluate.py → run the new model, get score
   └── keep if improved, discard if not
        │
        ▼
   results/{id}.json updated after every iteration
   GET /status returns live progress to frontend
```

---

## The contract that never changes

### `evaluate.py` — locked, do not modify

- Dynamically imports `build_model()` from `model.py`
- Runs a fixed 80/20 train/test split with `random_state=42`
- Scores using the metric from the experiment config
- Returns a result dict with `score`, `success`, `error`

The metric and task type come from the user at upload time — the system never infers them.

### `model.py` — the only file the agent rewrites

Contains exactly one function:

```python
def build_model(X_train, y_train):
    # fit and return a sklearn/xgboost model
    return model
```

For classification: returns a fitted classifier.
For regression: returns a fitted regressor.
The signature never changes. The agent only changes what's inside.

### `results/{id}.json` — written after every iteration

```json
[
  {
    "iteration": 1,
    "score": 0.74,
    "best_score": 0.74,
    "strategy": "Switch from LogisticRegression to RandomForestClassifier with n_estimators=100",
    "kept": true,
    "error": null
  }
]
```

---

## Supported task types and metrics

| Task type | Metrics available |
|-----------|-------------------|
| `binary_classification` | `f1`, `accuracy`, `roc_auc` |
| `multiclass_classification` | `f1_macro`, `accuracy` |
| `regression` | `rmse`, `mae`, `r2` |

For f1 / accuracy / roc_auc / r2 — higher is better.
For rmse / mae — lower is better.
The orchestrator handles direction automatically.

---

## API

### `POST /start` — multipart form

| Field | Type | Example |
|-------|------|---------|
| `file` | CSV upload | fraud.csv |
| `target_col` | string | `isFraud` |
| `task_description` | string | `Detect fraudulent transactions, prioritise recall` |
| `metric` | string | `f1` |
| `task_type` | string | `binary_classification` |
| `feature_cols` | string (comma-separated, optional) | `V1,V2,V3` |
| `total_iterations` | int (default 8) | `8` |

### `GET /status` — polled by frontend every 3s

```json
{
  "status": "running",
  "experiment_id": "abc123",
  "baseline": 0.71,
  "best_score": 0.84,
  "current_iteration": 3,
  "total_iterations": 8,
  "research_summary": "...",
  "iterations": [...]
}
```

Status values: `idle` → `setting_up` → `running_baseline` → `running` → `complete` | `error`

---

## Agents

| Agent | Model | Called | Job |
|-------|-------|--------|-----|
| `research_agent` | claude-haiku-4-5 | Once | Research best techniques for the task |
| `program_generator` | claude-haiku-4-5 | Once | Write prioritised experiment plan |
| `baseline_generator` | claude-sonnet-4-6 | Once | Write the first model.py |
| `strategist` | claude-opus-4-6 | Every iteration | Propose the next change |
| `coder` | claude-sonnet-4-6 | Every iteration | Implement the change |

---

## File structure

```
backend/
  evaluate.py      ← LOCKED. Ground truth evaluator.
  orchestrator.py  ← Runs the loop, manages state, writes results/
  api.py           ← POST /start, GET /status

agents/
  setup/
    research_agent.py      ← run_research(config, task_description) -> str
    program_generator.py   ← generate_program(config, research, task) -> str
    baseline_generator.py  ← generate_baseline(config, task) -> str
  loop/
    strategist.py          ← get_strategy(model_code, program, research, history, config) -> str
    coder.py               ← write_model(strategy, current_code, config) -> str
  prompts/                 ← .txt files for each agent (load and use in your agent code)

model.py      ← written/rewritten by the agent each iteration
results/      ← {experiment_id}.json written after every iteration
data/uploads/ ← uploaded CSVs saved here
```
