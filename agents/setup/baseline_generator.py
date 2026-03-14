def generate_baseline(config: dict, task_description: str) -> str:
    """Returns a deterministic, intentionally simple baseline model.py."""
    task_type = config.get("task_type", "binary_classification")
    if task_type == "regression":
        return '''import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


def build_model(X_train, y_train):
    X = X_train.copy()

    for col in X.columns:
        if pd.api.types.is_object_dtype(X[col]) or pd.api.types.is_string_dtype(X[col]):
            cleaned = X[col].astype("string").str.strip().replace("", pd.NA)
            numeric = pd.to_numeric(cleaned, errors="coerce")
            if numeric.notna().sum() == cleaned.notna().sum() and cleaned.notna().sum() > 0:
                X[col] = numeric
            else:
                X[col] = cleaned

    numeric_cols = X.select_dtypes(include=["number", "bool"]).columns.tolist()
    categorical_cols = [col for col in X.columns if col not in numeric_cols]

    preprocess = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="median")),
                ]),
                numeric_cols,
            ),
            (
                "cat",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="most_frequent")),
                    ("onehot", OneHotEncoder(handle_unknown="ignore")),
                ]),
                categorical_cols,
            ),
        ]
    )

    model = Pipeline([
        ("preprocess", preprocess),
        ("regressor", Ridge()),
    ])
    model.fit(X, y_train)
    return model
'''

    return '''import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


def build_model(X_train, y_train):
    X = X_train.copy()

    for col in X.columns:
        if pd.api.types.is_object_dtype(X[col]) or pd.api.types.is_string_dtype(X[col]):
            cleaned = X[col].astype("string").str.strip().replace("", pd.NA)
            numeric = pd.to_numeric(cleaned, errors="coerce")
            if numeric.notna().sum() == cleaned.notna().sum() and cleaned.notna().sum() > 0:
                X[col] = numeric
            else:
                X[col] = cleaned

    numeric_cols = X.select_dtypes(include=["number", "bool"]).columns.tolist()
    categorical_cols = [col for col in X.columns if col not in numeric_cols]

    preprocess = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="median")),
                ]),
                numeric_cols,
            ),
            (
                "cat",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="most_frequent")),
                    ("onehot", OneHotEncoder(handle_unknown="ignore")),
                ]),
                categorical_cols,
            ),
        ]
    )

    model = Pipeline([
        ("preprocess", preprocess),
        ("classifier", LogisticRegression(max_iter=1000)),
    ])
    model.fit(X, y_train)
    return model
'''
