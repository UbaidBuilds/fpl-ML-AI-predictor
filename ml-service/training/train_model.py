"""
train_model.py
Trains XGBoost model to predict next gameweek total_points.
Evaluates against baseline and prints metrics + feature importance.

Usage: python training/train_model.py
Input: data/processed/features_data.csv
Output: models/xgboost_model.pkl, models/scaler.pkl
"""

import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEATURES_PATH = os.path.join(BASE_DIR, "data", "processed", "features_data.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")

FEATURES = [
    # Original 10
    "points_last_3", "minutes_last_3", "goals_last_3", "assists_last_3",
    "points_last_gw", "minutes_last_gw", "home_game", "position",
    "price", "form",
    # xG/xA rolling
    "xg_last_3", "xa_last_3", "xgi_last_3",
    # ICT rolling
    "ict_last_3",
    # 5-GW windows
    "points_last_5", "minutes_last_5",
    # Fixture difficulty
    "opponent_difficulty",
    # Availability/defense signals
    "starts_last_3", "clean_sheets_last_3",
]
TARGET = "total_points"


def train():
    # Load data
    print("Loading processed features...")
    df = pd.read_csv(FEATURES_PATH)
    print(f"Dataset: {len(df)} rows, {len(FEATURES)} features")

    X = df[FEATURES]
    y = df[TARGET]

    # Train/test split 80/20
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    # Scale features (fit on train only)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train XGBoost
    print("\nTraining XGBoost model...")
    model = XGBRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=6,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train_scaled, y_train)
    print("Training complete.")

    # Evaluate model
    y_pred = model.predict(X_test_scaled)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    # Baseline: predict last gameweek's points (unscaled)
    baseline_pred = X_test["points_last_gw"].values
    baseline_rmse = np.sqrt(mean_squared_error(y_test, baseline_pred))
    baseline_mae = mean_absolute_error(y_test, baseline_pred)

    # Print results
    print("\n" + "=" * 50)
    print("MODEL PERFORMANCE")
    print("=" * 50)
    print(f"  XGBoost RMSE:    {rmse:.3f}")
    print(f"  XGBoost MAE:     {mae:.3f}")
    print(f"  XGBoost R2:      {r2:.3f}")
    print(f"  Baseline RMSE:   {baseline_rmse:.3f}")
    print(f"  Baseline MAE:    {baseline_mae:.3f}")
    print(f"  RMSE improvement: {baseline_rmse - rmse:.3f}")

    print("\n" + "=" * 50)
    print("TARGET CHECK")
    print("=" * 50)
    rmse_pass = rmse < 4.0
    mae_pass = mae < 3.0
    beats_baseline = rmse < baseline_rmse
    print(f"  RMSE < 4.0:       {'PASS' if rmse_pass else 'FAIL'} ({rmse:.3f})")
    print(f"  MAE  < 3.0:       {'PASS' if mae_pass else 'FAIL'} ({mae:.3f})")
    print(f"  Beats baseline:   {'PASS' if beats_baseline else 'FAIL'}")

    # Feature importance
    importance = pd.DataFrame({
        "feature": FEATURES,
        "importance": model.feature_importances_
    }).sort_values("importance", ascending=False)

    print("\n" + "=" * 50)
    print("FEATURE IMPORTANCE")
    print("=" * 50)
    for _, row in importance.iterrows():
        bar = "#" * int(row["importance"] * 50)
        print(f"  {row['feature']:20s} {row['importance']:.4f} {bar}")

    # Save model and scaler
    os.makedirs(MODELS_DIR, exist_ok=True)
    model_path = os.path.join(MODELS_DIR, "xgboost_model.pkl")
    scaler_path = os.path.join(MODELS_DIR, "scaler.pkl")
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"\nModel saved to {model_path}")
    print(f"Scaler saved to {scaler_path}")

    if rmse_pass and mae_pass and beats_baseline:
        print("\nAll targets met! Stage 1 model is ready.")
    else:
        print("\nSome targets not met — consider fallback strategies.")


if __name__ == "__main__":
    train()
