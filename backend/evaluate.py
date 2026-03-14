# LOCKED - do not modify
import importlib.util
import sys
import traceback
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    f1_score,
    accuracy_score,
    roc_auc_score,
    mean_squared_error,
    mean_absolute_error,
    r2_score,
)

REPO_ROOT = Path(__file__).parent.parent
MODEL_PY = REPO_ROOT / "model.py"

# For each metric: True = higher is better, False = lower is better
METRIC_DIRECTION = {
    "f1": True,
    "f1_macro": True,
    "accuracy": True,
    "roc_auc": True,
    "r2": True,
    "rmse": False,
    "mae": False,
}


def higher_is_better(metric: str) -> bool:
    return METRIC_DIRECTION.get(metric, True)


def _load_build_model(model_code: str):
    """Write model_code to model.py and dynamically import build_model."""
    MODEL_PY.write_text(model_code)
    if "model" in sys.modules:
        del sys.modules["model"]
    spec = importlib.util.spec_from_file_location("model", str(MODEL_PY))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.build_model


def _score(y_true, y_pred, y_prob, metric: str, task_type: str) -> float:
    if metric == "f1":
        avg = "binary" if task_type == "binary_classification" else "macro"
        return float(f1_score(y_true, y_pred, average=avg, zero_division=0))
    elif metric == "f1_macro":
        return float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    elif metric == "accuracy":
        return float(accuracy_score(y_true, y_pred))
    elif metric == "roc_auc":
        prob = y_prob if y_prob is not None else y_pred
        return float(roc_auc_score(y_true, prob))
    elif metric == "rmse":
        return float(np.sqrt(mean_squared_error(y_true, y_pred)))
    elif metric == "mae":
        return float(mean_absolute_error(y_true, y_pred))
    elif metric == "r2":
        return float(r2_score(y_true, y_pred))
    else:
        raise ValueError(f"Unknown metric: {metric}")


def run_evaluation(model_code: str, config: dict) -> dict:
    """
    Locked evaluator. Writes model_code to model.py, imports build_model,
    runs a fixed 80/20 train/test split (random_state=42), scores with the
    configured metric, and returns a result dict.

    config keys required:
        experiment_id   str
        csv_path        str   — absolute path to uploaded CSV
        target_col      str   — name of label column
        feature_cols    list  — list of input column names (None = all except target)
        metric          str   — one of: f1, f1_macro, accuracy, roc_auc, rmse, mae, r2
        task_type       str   — binary_classification | multiclass_classification | regression
    """
    experiment_id = config["experiment_id"]
    metric = config["metric"]
    task_type = config.get("task_type", "binary_classification")

    try:
        df = pd.read_csv(config["csv_path"])
        target_col = config["target_col"]
        feature_cols = config.get("feature_cols") or [c for c in df.columns if c != target_col]

        X = df[feature_cols]
        y = df[target_col]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if task_type != "regression" else None
        )

        build_model = _load_build_model(model_code)
        model = build_model(X_train.copy(), y_train.copy())

        y_pred = model.predict(X_test)
        y_prob = None
        if hasattr(model, "predict_proba") and task_type in (
            "binary_classification",
            "multiclass_classification",
        ):
            proba = model.predict_proba(X_test)
            y_prob = proba[:, 1] if task_type == "binary_classification" else proba

        score = _score(y_test, y_pred, y_prob, metric, task_type)

        return {
            "experiment_id": experiment_id,
            "score": score,
            "metric": metric,
            "success": True,
            "error": None,
        }

    except Exception:
        return {
            "experiment_id": experiment_id,
            "score": None,
            "metric": metric,
            "success": False,
            "error": traceback.format_exc(),
        }
