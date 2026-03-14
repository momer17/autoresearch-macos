# program.md

## Multiclass Classification Experiment Plan
**Task:** TechSupport prediction | **Metric:** f1_macro | **Budget:** 8 experiments

---

### Experiment 1: Baseline XGBoost with Target Encoding
**Priority:** CRITICAL  
**Change:** Implement ordinal encoding for categorical features + XGBoost with stratified 5-fold CV optimized for f1_macro.
```python
# In build_model():
# - Remove customerID
# - Target-encode all categorical features
# - XGBClassifier(objective='multi:softprob', eval_metric='mlogloss', max_depth=6, learning_rate=0.1)
# - Evaluate f1_macro on validation fold
```
**Rationale:** Establishes baseline performance with sklearn-compatible approach. Target encoding handles categorical data better than one-hot for this dataset size.

---

### Experiment 2: Tenure Binning + Service Count Features
**Priority:** HIGH  
**Change:** Add engineered features: tenure quartiles, total service adoption count, tenure × SeniorCitizen interaction.
```python
# In build_model():
# - pd.qcut(tenure, q=4, labels=['0-3m', '3-12m', '1-2y', '2y+'])
# - service_count = sum([OnlineSecurity=='Yes', OnlineBackup=='Yes', ...])
# - Add interaction: tenure_bin × SeniorCitizen (ordinal encoded)
```
**Rationale:** Research shows tenure is critical; binning captures non-linear churn patterns. Service adoption is a key risk indicator.

---

### Experiment 3: Class Weight Balancing in XGBoost
**Priority:** HIGH  
**Change:** Add `scale_pos_weight` adjustment and `class_weight='balanced'` equivalent via sample weights in XGBoost.
```python
# In build_model():
# - Compute class frequencies in training set
# - Pass scale_pos_weight or use sample_weight parameter scaled inversely to class counts
# - XGBClassifier(..., scale_pos_weight=[w1, w2, w3])
```
**Rationale:** F1-macro requires balanced performance across minority classes. Weighted loss prevents majority class collapse.

---

### Experiment 4: Sklearn Gradient Boosting (GradientBoostingClassifier)
**Priority:** MEDIUM  
**Change:** Replace XGBoost with sklearn's GradientBoostingClassifier; tune max_depth, learning_rate, n_estimators.
```python
# In build_model():
# - GradientBoostingClassifier(loss='log_loss', max_depth=5, learning_rate=0.05, n_estimators=200, validation_fraction=0.1, n_iter_no_change=10)
# - Same feature encoding as Exp 1
```
**Rationale:** Pure sklearn baseline; research shows comparable f1 (0.786) to XGBoost. Validates if XGBoost-specific tuning is necessary.

---

### Experiment 5: One-Hot Encoding + XGBoost with Regularization
**Priority:** MEDIUM  
**Change:** Replace target encoding with one-hot encoding; add L1/L2 regularization via `reg_alpha` and `reg_lambda`.
```python
# In build_model():
# - pd.get_dummies(categorical_features)
# - XGBClassifier(..., max_depth=4, reg_alpha=1.0, reg_lambda=1.0, subsample=0.8, colsample_bytree=0.8)
```
**Rationale:** Tests if simpler encoding + regularization reduces overfitting on minority classes. Prevents aggressive minority class fitting.

---

### Experiment 6: SMOTE-Inspired Oversampling (RandomOverSampler)
**Priority:** MEDIUM  
**Change:** Apply RandomOverSampler from imbalanced-learn (sklearn-compatible) to minority classes before training.
```python
# In build_model():
# - from imblearn.over_sampling import RandomOverSampler
# - ros = RandomOverSampler(random_state=42)
# - X_train_resampled, y_train_resampled = ros.fit_resample(