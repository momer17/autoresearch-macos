import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier


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
        ("classifier", XGBClassifier(
            objective='multi:softprob',
            eval_metric='mlogloss',
            max_depth=6,
            learning_rate=0.02,
            n_estimators=1500,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=1.0,
            random_state=42,
        )),
    ])

    sample_weights = compute_sample_weight('balanced', y_train)
    model.fit(X, y_train, classifier__sample_weight=sample_weights)
    return model