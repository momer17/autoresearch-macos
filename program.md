# Experiment Plan: Customer Churn Prediction (F1 Optimization)

## Priority-Ordered Experiments

1. **Implement XGBoost with class weight balancing and stratified cross-validation**
   - Change: Replace default classifier with `XGBClassifier(scale_pos_weight=calculate_scale_pos_weight(), random_state=42)` and use `StratifiedKFold(n_splits=5)` in cross-validation pipeline
   - Rationale: Gradient boosting is the proven highest-impact approach for churn; `scale_pos_weight` directly addresses class imbalance for F1 optimization
   - Expected impact: Baseline F1 improvement of 5-15%

2. **Apply SMOTE oversampling on training data with stratified splitting**
   - Change: Add `from imblearn.pipeline import Pipeline; from imblearn.over_sampling import SMOTE` and insert SMOTE before model training in the pipeline, ensuring stratified train/test split before SMOTE application
   - Rationale: SMOTE is critical for minority class representation; prevents model bias and improves recall (precision-recall balance needed for F1)
   - Expected impact: 3-8% F1 improvement, particularly in recall lift

3. **Implement probability threshold tuning on validation set**
   - Change: After model training, use `from sklearn.metrics import precision_recall_curve` to compute optimal threshold maximizing F1 on validation fold, then apply this threshold to predictions: `y_pred = (y_pred_proba >= optimal_threshold).astype(int)`
   - Rationale: Default 0.5 threshold is suboptimal for imbalanced churn; F1 is often maximized at thresholds between 0.3-0.4
   - Expected impact: 2-6% F1 improvement with minimal computational cost

4. **Replace with LightGBM and optimize for F1 with early stopping**
   - Change: Use `LGBMClassifier(objective='binary', metric='binary_logloss', class_weight='balanced', num_leaves=31, learning_rate=0.05)` with `early_stopping_rounds=50` monitoring validation F1 score
   - Rationale: LightGBM often outperforms XGBoost on categorical/mixed data; `class_weight='balanced'` and explicit F1 monitoring improve minority class optimization
   - Expected impact: 2-4% F1 improvement over XGBoost baseline; faster training

5. **Engineer behavioral features: recency, frequency, and engagement trends**
   - Change: Create new columns in feature preprocessing: `days_since_last_activity`, `activity_frequency_per_month`, `usage_trend_3m` (slope of 3-month activity), `service_count` (number of active services); add target encoding for categorical features with cardinality >10
   - Rationale: Behavioral patterns directly correlate with churn; target encoding captures categorical relationships relevant to F1 without overfitting
   - Expected impact: 4-10% F1 improvement depending on data richness

6. **Stack XGBoost + LightGBM + Random Forest with logistic regression meta-learner**
   - Change: Implement `StackingClassifier` with base estimators=[XGBClassifier(...), LGBMClassifier(...), RandomForestClassifier(n_estimators=100, class_weight='balanced')], final_estimator=LogisticRegression(class_weight='balanced'), cv=StratifiedKFold(5)
   - Rationale: Ensemble stacking leverages strengths of multiple algorithms; meta-learner learns optimal combination for F1 in churn prediction
   - Expected impact: 2-5% F1 improvement over single best model; reduced variance

7. **Calibrate probability predictions using isotonic regression on validation data**
   - Change: Add `from sklearn.calibration import CalibratedClassifierCV` wrapping the trained model with `method='isotonic'` and `cv='prefit'` on validation fold; apply calibrated probabilities to final threshold tuning
   - Rationale: Uncalibrated probabilities lead to suboptimal thresholds; calibration improves reliability of threshold selection for F1 optimization
   - Expected impact: 1-3% F1 improvement; larger gains if probability outputs are poorly calibrated

8