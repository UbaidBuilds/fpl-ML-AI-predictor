"""
train_position_models.py
Trains position-specific XGBoost models with Optuna hyperparameter tuning
and quantile regression for confidence intervals.

Produces 4 model sets (GKP, DEF, MID, FWD), each with:
  - main model (reg:squarederror)
  - Q10 model (10th percentile)
  - Q90 model (90th percentile)
  - StandardScaler

Usage: python training/train_position_models.py
Input: data/processed/features_data.csv
Output: models/{pos}_model.pkl, {pos}_scaler.pkl, {pos}_q10.pkl, {pos}_q90.pkl, best_params.json
"""

import os
import json
import warnings
import pandas as pd
import numpy as np
import joblib
import optuna
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor

# Suppress Optuna info logs (keep warnings/errors)
optuna.logging.set_verbosity(optuna.logging.WARNING)
warnings.filterwarnings("ignore", category=UserWarning)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEATURES_PATH = os.path.join(BASE_DIR, "data", "processed", "features_data.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")

FEATURES = [
    "points_last_3", "minutes_last_3", "goals_last_3", "assists_last_3",
    "points_last_gw", "minutes_last_gw", "home_game", "position",
    "price", "form",
    "xg_last_3", "xa_last_3", "xgi_last_3",
    "ict_last_3",
    "points_last_5", "minutes_last_5",
    "opponent_difficulty",
    "starts_last_3", "clean_sheets_last_3",
]
TARGET = "total_points"

POSITIONS = {1: "gkp", 2: "def", 3: "mid", 4: "fwd"}
OPTUNA_TRIALS = 75
CV_FOLDS = 5


def create_objective(X_train_scaled, y_train):
    """Create an Optuna objective function for XGBoost tuning."""
    def objective(trial):
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 200, 1000),
            "max_depth": trial.suggest_int("max_depth", 4, 12),
            "learning_rate": trial.suggest_float("learning_rate", 0.005, 0.3, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
            "reg_alpha": trial.suggest_float("reg_alpha", 0.0, 2.0),
            "reg_lambda": trial.suggest_float("reg_lambda", 0.0, 5.0),
            "random_state": 42,
            "n_jobs": -1,
        }
        model = XGBRegressor(**params)
        scores = cross_val_score(
            model, X_train_scaled, y_train,
            cv=CV_FOLDS, scoring="neg_root_mean_squared_error", n_jobs=-1,
        )
        return -scores.mean()  # minimize RMSE

    return objective


def train_position(pos_id, pos_name, df_pos, all_results):
    """Train models for a single position."""
    print(f"\n{'='*60}")
    print(f"POSITION: {pos_name.upper()} (id={pos_id}, {len(df_pos)} rows)")
    print(f"{'='*60}")

    X = df_pos[FEATURES]
    y = df_pos[TARGET]

    # 80/20 split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # --- Optuna hyperparameter tuning ---
    print(f"\n  Running Optuna ({OPTUNA_TRIALS} trials, {CV_FOLDS}-fold CV)...")
    study = optuna.create_study(direction="minimize")
    study.optimize(
        create_objective(X_train_scaled, y_train),
        n_trials=OPTUNA_TRIALS,
        show_progress_bar=True,
    )
    best_params = study.best_params
    best_params["random_state"] = 42
    best_params["n_jobs"] = -1
    print(f"  Best RMSE (CV): {study.best_value:.3f}")
    print(f"  Best params: {json.dumps({k: round(v, 4) if isinstance(v, float) else v for k, v in best_params.items()}, indent=4)}")

    # --- Train main model with early stopping ---
    print(f"\n  Training main model (reg:squarederror) with early stopping...")
    train_params = {**best_params, "early_stopping_rounds": 50}
    model = XGBRegressor(**train_params)
    model.fit(
        X_train_scaled, y_train,
        eval_set=[(X_test_scaled, y_test)],
        verbose=False,
    )
    actual_rounds = model.best_iteration + 1 if hasattr(model, "best_iteration") else best_params.get("n_estimators", 500)
    print(f"  Stopped at {actual_rounds} rounds (max was {best_params['n_estimators']})")

    # --- Train quantile models with reduced regularization ---
    # Quantile models need less regularization to produce properly calibrated intervals
    q_params = {**best_params}
    q_params["reg_alpha"] = best_params.get("reg_alpha", 0.0) * 0.5
    q_params["reg_lambda"] = best_params.get("reg_lambda", 1.0) * 0.5
    q_params["early_stopping_rounds"] = 50

    print(f"  Training Q10 model (10th percentile, reduced regularization)...")
    q10_params = {**q_params, "objective": "reg:quantileerror", "quantile_alpha": 0.1}
    q10_model = XGBRegressor(**q10_params)
    q10_model.fit(X_train_scaled, y_train, eval_set=[(X_test_scaled, y_test)], verbose=False)

    print(f"  Training Q90 model (90th percentile, reduced regularization)...")
    q90_params = {**q_params, "objective": "reg:quantileerror", "quantile_alpha": 0.9}
    q90_model = XGBRegressor(**q90_params)
    q90_model.fit(X_train_scaled, y_train, eval_set=[(X_test_scaled, y_test)], verbose=False)

    # --- Evaluate ---
    y_pred = model.predict(X_test_scaled)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    # Baseline: predict last gameweek's points
    baseline_pred = X_test["points_last_gw"].values
    baseline_rmse = np.sqrt(mean_squared_error(y_test, baseline_pred))

    # Quantile evaluation
    q10_pred = q10_model.predict(X_test_scaled)
    q90_pred = q90_model.predict(X_test_scaled)
    coverage = np.mean((y_test.values >= q10_pred) & (y_test.values <= q90_pred))
    avg_interval = np.mean(np.maximum(0, q90_pred - q10_pred))

    print(f"\n  RESULTS:")
    print(f"    RMSE:           {rmse:.3f}")
    print(f"    MAE:            {mae:.3f}")
    print(f"    R2:             {r2:.3f}")
    print(f"    Baseline RMSE:  {baseline_rmse:.3f}")
    print(f"    Improvement:    {baseline_rmse - rmse:.3f}")
    print(f"    Q10-Q90 coverage: {coverage:.1%} (target: ~80%)")
    print(f"    Avg interval:   {avg_interval:.2f} pts")

    if coverage > 0.85:
        print(f"    WARNING: Coverage too high ({coverage:.1%}), intervals may be too wide")

    # Feature importance (top 10)
    importance = pd.DataFrame({
        "feature": FEATURES,
        "importance": model.feature_importances_
    }).sort_values("importance", ascending=False)
    print(f"\n  TOP 10 FEATURES:")
    for _, row in importance.head(10).iterrows():
        bar = "#" * int(row["importance"] * 40)
        print(f"    {row['feature']:22s} {row['importance']:.4f} {bar}")

    # --- Save models ---
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(model, os.path.join(MODELS_DIR, f"{pos_name}_model.pkl"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, f"{pos_name}_scaler.pkl"))
    joblib.dump(q10_model, os.path.join(MODELS_DIR, f"{pos_name}_q10.pkl"))
    joblib.dump(q90_model, os.path.join(MODELS_DIR, f"{pos_name}_q90.pkl"))
    print(f"\n  Saved: {pos_name}_model.pkl, {pos_name}_scaler.pkl, {pos_name}_q10.pkl, {pos_name}_q90.pkl")

    # Collect results (ensure all values are native Python types for JSON)
    all_results[pos_name] = {
        "rows": len(df_pos),
        "train": len(X_train),
        "test": len(X_test),
        "rmse": round(float(rmse), 3),
        "mae": round(float(mae), 3),
        "r2": round(float(r2), 3),
        "baseline_rmse": round(float(baseline_rmse), 3),
        "q10_q90_coverage": round(float(coverage), 3),
        "avg_interval": round(float(avg_interval), 2),
        "best_params": {k: round(float(v), 4) if isinstance(v, (float, np.floating)) else int(v) if isinstance(v, (np.integer,)) else v for k, v in best_params.items()},
    }

    return rmse, mae, r2


def train():
    print("Loading processed features...")
    df = pd.read_csv(FEATURES_PATH)
    print(f"Dataset: {len(df)} rows, {len(FEATURES)} features")

    # Show position distribution
    print("\nPosition distribution:")
    for pos_id, pos_name in POSITIONS.items():
        count = len(df[df["position"] == pos_id])
        print(f"  {pos_name.upper()}: {count} rows ({count/len(df)*100:.1f}%)")

    all_results = {}
    all_rmse = []

    for pos_id, pos_name in POSITIONS.items():
        df_pos = df[df["position"] == pos_id].copy()
        if len(df_pos) < 100:
            print(f"\nWARNING: {pos_name.upper()} has only {len(df_pos)} rows, skipping")
            continue
        rmse, mae, r2 = train_position(pos_id, pos_name, df_pos, all_results)
        all_rmse.append(rmse)

    # Save combined results + params
    results_path = os.path.join(MODELS_DIR, "best_params.json")
    with open(results_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nSaved results to {results_path}")

    # --- Summary ---
    print(f"\n{'='*60}")
    print("SUMMARY — ALL POSITIONS")
    print(f"{'='*60}")
    print(f"  {'Position':8s} {'Rows':>7s} {'RMSE':>7s} {'MAE':>7s} {'R2':>7s} {'Base':>7s} {'Coverage':>9s}")
    print(f"  {'-'*55}")
    for pos_name, res in all_results.items():
        print(f"  {pos_name.upper():8s} {res['rows']:7d} {res['rmse']:7.3f} {res['mae']:7.3f} "
              f"{res['r2']:7.3f} {res['baseline_rmse']:7.3f} {res['q10_q90_coverage']:8.1%}")

    weighted_rmse = np.average(
        [r["rmse"] for r in all_results.values()],
        weights=[r["rows"] for r in all_results.values()]
    )
    print(f"\n  Weighted avg RMSE: {weighted_rmse:.3f} (was 1.932 single model)")
    print(f"  Single-model R2 was: 0.308")

    if weighted_rmse < 1.932:
        print("\n  Position-specific models IMPROVED over single model!")
    else:
        print("\n  Position-specific models did NOT improve — review per-position results.")


if __name__ == "__main__":
    train()
