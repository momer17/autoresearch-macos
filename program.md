# Experiment Plan: Customer Churn Prediction (F1 Optimization)

1. **XGBoost with scale_pos_weight and stratified CV**
   - Implement XGBoost classifier with `scale_pos_weight=6` (inverse class ratio for ~14% churn), `max_depth=5`, `learning_rate=0.05`, `subsample=0.8`, `colsample_bytree=0.8`
   - Use StratifiedKFold (5 folds) with F1 scoring
   - Tune decision threshold on validation fold to maximize F1 (test range 0.3–0.5)
   - Expected impact: Establish strong baseline; addresses class imbalance directly

2. **LightGBM with is_unbalance flag and native categorical handling**
   - Implement LightGBM with `is_unbalance=True`, `num_leaves=30`, `min_child_samples=20`, `learning_rate=0.05`
   - Pass categorical features directly (no one-hot encoding) using `categorical_feature` parameter
   - Use StratifiedKFold (5 folds) with F1 scoring
   - Tune decision threshold on validation fold (test range 0.3–0.5)
   - Expected impact: Faster training than XGBoost; cleaner categorical handling reduces preprocessing

3. **Feature engineering: tenure polynomial and tenure bins**
   - Add `tenure_squared = tenure^2` and `tenure_cubed = tenure^3` to feature set
   - Create tenure bins: `tenure_0_6m`, `tenure_6_12m`, `tenure_12_24m`, `tenure_24plus` (dummy variables)
   - Retrain XGBoost (Experiment 1 settings) with expanded features
   - Expected impact: Capture non-linear churn decay patterns; tenure is the strongest churn predictor

4. **Service bundle interaction features**
   - Create `num_services = OnlineSecurity + OnlineBackup + DeviceProtection + TechSupport + StreamingTV + StreamingMovies` (count of active services)
   - Create interaction: `tenure × num_services`
   - Create high_risk_profile flag: `(num_services == 0) & (Contract == 'Month-to-month')`
   - Retrain XGBoost (Experiment 1 settings) with new features
   - Expected impact: Identify retention through service adoption; contract + service interaction is strong churn signal

5. **SMOTE oversampling + XGBoost without scale_pos_weight**
   - Apply SMOTE (k_neighbors=5) to training fold only (fit on train, transform train, apply to test within CV)
   - Train XGBoost without `scale_pos_weight` (set to 1), `max_depth=5`, `learning_rate=0.05`
   - Use StratifiedKFold (5 folds) with F1 scoring
   - Tune decision threshold on validation fold (test range 0.3–0.5)
   - Expected impact: Compare synthetic oversampling vs. cost-weighting; validate class balance approach

6. **XGBoost hyperparameter grid search focused on F1**
   - Grid search: `max_depth` ∈ {3, 5, 7}, `learning_rate` ∈ {0.01, 0.05, 0.1}, `scale_pos_weight` ∈ {5, 6, 7}
   - Use StratifiedKFold (5 folds) with F1 scoring (not accuracy)
   - Set `reg_lambda=1.0`, `reg_alpha=0.5` to prevent overfitting
   - Optimize threshold post-grid-search
   - Expected impact: Data-driven hyperparameter selection; prevents suboptimal defaults

7. **Stacked ensemble: XGBoost + LightGBM meta-learner**
   - Train XGBoost (Experiment 1) and LightGBM (Experiment 2) on 80% of data
   - Generate probability predictions from both models on held-out 20%
   - Train Logistic Regression (L2 regularization, C=1.0) on stacked predictions
   - Use final meta-learner for test predictions and