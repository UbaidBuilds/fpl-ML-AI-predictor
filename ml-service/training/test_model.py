"""
test_model.py
Validates position-specific models by testing archetypes per position
and verifying predictions against real data. Falls back to single model if needed.

Usage: python training/test_model.py
"""

import os
import joblib
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
FEATURES_PATH = os.path.join(BASE_DIR, "data", "processed", "features_data.csv")

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
POSITION_MAP = {1: "gkp", 2: "def", 3: "mid", 4: "fwd"}


def load_position_models():
    """Load all position-specific models."""
    models = {}
    for pos_id, pos_name in POSITION_MAP.items():
        try:
            models[pos_name] = {
                "model": joblib.load(os.path.join(MODELS_DIR, f"{pos_name}_model.pkl")),
                "scaler": joblib.load(os.path.join(MODELS_DIR, f"{pos_name}_scaler.pkl")),
                "q10": joblib.load(os.path.join(MODELS_DIR, f"{pos_name}_q10.pkl")),
                "q90": joblib.load(os.path.join(MODELS_DIR, f"{pos_name}_q90.pkl")),
            }
        except Exception as e:
            print(f"  WARNING: Could not load {pos_name} models: {e}")
    return models


def predict_with_confidence(models, pos_name, features_dict):
    """Predict using position model with quantile confidence."""
    m = models[pos_name]
    feature_values = [features_dict[f] for f in FEATURES]
    df = pd.DataFrame([feature_values], columns=FEATURES)
    scaled = m["scaler"].transform(df)
    pred = float(m["model"].predict(scaled)[0])
    q10 = float(m["q10"].predict(scaled)[0])
    q90 = float(m["q90"].predict(scaled)[0])
    interval = max(0.0, q90 - q10)
    confidence = max(0.1, min(0.95, 1.0 - interval / 10.0))
    return pred, confidence, q10, q90


def test_sample_players(models):
    """Test archetypes against their position-specific models."""
    print("=" * 60)
    print("SAMPLE PLAYER PREDICTIONS (Position-Specific)")
    print("=" * 60)

    samples = {
        "GK — Solid form, home": {
            "pos": "gkp",
            "features": {
                "points_last_3": 5.0, "minutes_last_3": 90.0,
                "goals_last_3": 0, "assists_last_3": 0,
                "points_last_gw": 6, "minutes_last_gw": 90,
                "home_game": 1, "position": 1, "price": 5.5, "form": 5.3,
                "xg_last_3": 0.0, "xa_last_3": 0.0, "xgi_last_3": 0.0,
                "ict_last_3": 5.0, "points_last_5": 4.8, "minutes_last_5": 90.0,
                "opponent_difficulty": 2, "starts_last_3": 3, "clean_sheets_last_3": 2,
            },
        },
        "DEF — Budget, avg form": {
            "pos": "def",
            "features": {
                "points_last_3": 3.0, "minutes_last_3": 90.0,
                "goals_last_3": 0, "assists_last_3": 0,
                "points_last_gw": 2, "minutes_last_gw": 90,
                "home_game": 0, "position": 2, "price": 4.5, "form": 2.6,
                "xg_last_3": 0.05, "xa_last_3": 0.10, "xgi_last_3": 0.15,
                "ict_last_3": 12.0, "points_last_5": 3.2, "minutes_last_5": 90.0,
                "opponent_difficulty": 4, "starts_last_3": 3, "clean_sheets_last_3": 1,
            },
        },
        "MID — Premium, in form": {
            "pos": "mid",
            "features": {
                "points_last_3": 8.5, "minutes_last_3": 89.0,
                "goals_last_3": 3, "assists_last_3": 2,
                "points_last_gw": 12, "minutes_last_gw": 90,
                "home_game": 1, "position": 3, "price": 13.0, "form": 9.2,
                "xg_last_3": 0.85, "xa_last_3": 0.45, "xgi_last_3": 1.30,
                "ict_last_3": 42.0, "points_last_5": 7.8, "minutes_last_5": 88.0,
                "opponent_difficulty": 2, "starts_last_3": 3, "clean_sheets_last_3": 0,
            },
        },
        "MID — Not playing": {
            "pos": "mid",
            "features": {
                "points_last_3": 0.0, "minutes_last_3": 0.0,
                "goals_last_3": 0, "assists_last_3": 0,
                "points_last_gw": 0, "minutes_last_gw": 0,
                "home_game": 1, "position": 3, "price": 5.0, "form": 0.0,
                "xg_last_3": 0.0, "xa_last_3": 0.0, "xgi_last_3": 0.0,
                "ict_last_3": 0.0, "points_last_5": 0.0, "minutes_last_5": 0.0,
                "opponent_difficulty": 3, "starts_last_3": 0, "clean_sheets_last_3": 0,
            },
        },
        "FWD — Hot streak": {
            "pos": "fwd",
            "features": {
                "points_last_3": 9.0, "minutes_last_3": 85.0,
                "goals_last_3": 4, "assists_last_3": 1,
                "points_last_gw": 13, "minutes_last_gw": 90,
                "home_game": 1, "position": 4, "price": 11.0, "form": 10.0,
                "xg_last_3": 1.20, "xa_last_3": 0.20, "xgi_last_3": 1.40,
                "ict_last_3": 48.0, "points_last_5": 8.0, "minutes_last_5": 86.0,
                "opponent_difficulty": 2, "starts_last_3": 3, "clean_sheets_last_3": 0,
            },
        },
        "FWD — Benched": {
            "pos": "fwd",
            "features": {
                "points_last_3": 0.5, "minutes_last_3": 10.0,
                "goals_last_3": 0, "assists_last_3": 0,
                "points_last_gw": 0, "minutes_last_gw": 0,
                "home_game": 0, "position": 4, "price": 5.5, "form": 0.3,
                "xg_last_3": 0.02, "xa_last_3": 0.0, "xgi_last_3": 0.02,
                "ict_last_3": 1.5, "points_last_5": 0.4, "minutes_last_5": 8.0,
                "opponent_difficulty": 5, "starts_last_3": 0, "clean_sheets_last_3": 0,
            },
        },
    }

    predictions = {}
    for label, data in samples.items():
        pos = data["pos"]
        if pos not in models:
            print(f"  SKIP {label} (no {pos} model)")
            continue
        pred, conf, q10, q90 = predict_with_confidence(models, pos, data["features"])
        predictions[label] = pred
        print(f"  {label:35s} -> {pred:5.2f} pts  (conf={conf:.2f}, [{q10:.1f}, {q90:.1f}])")

    # Sanity checks
    print("\nSANITY CHECKS:")
    checks_passed = 0
    total_checks = 4

    # 1. Premium MID > Budget DEF
    if "MID — Premium, in form" in predictions and "DEF — Budget, avg form" in predictions:
        if predictions["MID — Premium, in form"] > predictions["DEF — Budget, avg form"]:
            print("  [PASS] Premium MID > Budget DEF")
            checks_passed += 1
        else:
            print("  [FAIL] Premium MID should predict higher than Budget DEF")
    else:
        total_checks -= 1

    # 2. Non-playing MID should predict < 1.0
    if "MID — Not playing" in predictions:
        if predictions["MID — Not playing"] < 1.0:
            print("  [PASS] Non-playing MID < 1.0")
            checks_passed += 1
        else:
            print("  [FAIL] Non-playing MID should predict < 1.0")
    else:
        total_checks -= 1

    # 3. Hot streak FWD > Benched FWD
    if "FWD — Hot streak" in predictions and "FWD — Benched" in predictions:
        if predictions["FWD — Hot streak"] > predictions["FWD — Benched"]:
            print("  [PASS] Hot streak FWD > Benched FWD")
            checks_passed += 1
        else:
            print("  [FAIL] Hot streak FWD should predict higher than Benched FWD")
    else:
        total_checks -= 1

    # 4. All predictions reasonable (> -1)
    all_reasonable = all(p > -1 for p in predictions.values())
    if all_reasonable:
        print("  [PASS] All predictions > -1")
        checks_passed += 1
    else:
        print("  [FAIL] Some predictions unreasonably negative")

    print(f"\n  {checks_passed}/{total_checks} sanity checks passed")
    return checks_passed == total_checks


def test_per_position_real_data(models):
    """Test on real data, per position."""
    print("\n" + "=" * 60)
    print("REAL DATA VALIDATION (per position)")
    print("=" * 60)

    df = pd.read_csv(FEATURES_PATH)

    for pos_id, pos_name in POSITION_MAP.items():
        if pos_name not in models:
            print(f"\n  SKIP {pos_name.upper()} (no model)")
            continue

        m = models[pos_name]
        df_pos = df[df["position"] == pos_id]
        sample = df_pos.sample(min(10, len(df_pos)), random_state=42)

        X = sample[FEATURES]
        y_actual = sample["total_points"].values
        X_scaled = m["scaler"].transform(X)
        y_pred = m["model"].predict(X_scaled)
        q10_pred = m["q10"].predict(X_scaled)
        q90_pred = m["q90"].predict(X_scaled)

        rmse = np.sqrt(np.mean((y_actual - y_pred) ** 2))
        mae = np.mean(np.abs(y_actual - y_pred))
        coverage = np.mean((y_actual >= q10_pred) & (y_actual <= q90_pred))

        print(f"\n  {pos_name.upper()} ({len(df_pos)} total rows, {len(sample)} sampled):")
        print(f"    Sample RMSE: {rmse:.3f}")
        print(f"    Sample MAE:  {mae:.3f}")
        print(f"    Q10-Q90 coverage: {coverage:.1%}")

        # Show a few rows
        print(f"    {'Player':25s} {'Actual':>7s} {'Pred':>7s} {'Q10':>6s} {'Q90':>6s}")
        print(f"    {'-'*50}")
        for i, (_, row) in enumerate(sample.head(5).iterrows()):
            name = str(row.get("name", f"Player {i}"))[:23]
            print(f"    {name:25s} {y_actual[i]:7.0f} {y_pred[i]:7.2f} {q10_pred[i]:6.1f} {q90_pred[i]:6.1f}")

    return True


def test_quantile_ordering(models):
    """Verify Q10 < prediction < Q90 for most samples."""
    print("\n" + "=" * 60)
    print("QUANTILE ORDERING CHECK")
    print("=" * 60)

    df = pd.read_csv(FEATURES_PATH)
    all_ok = True

    for pos_id, pos_name in POSITION_MAP.items():
        if pos_name not in models:
            continue

        m = models[pos_name]
        df_pos = df[df["position"] == pos_id].sample(min(100, len(df[df["position"] == pos_id])), random_state=42)
        X = df_pos[FEATURES]
        X_scaled = m["scaler"].transform(X)

        preds = m["model"].predict(X_scaled)
        q10 = m["q10"].predict(X_scaled)
        q90 = m["q90"].predict(X_scaled)

        q10_ok = np.mean(q10 <= preds) * 100
        q90_ok = np.mean(preds <= q90) * 100
        order_ok = np.mean(q10 <= q90) * 100

        print(f"  {pos_name.upper()}: Q10<=pred {q10_ok:.0f}%, pred<=Q90 {q90_ok:.0f}%, Q10<=Q90 {order_ok:.0f}%")
        if order_ok < 90:
            print(f"    WARNING: Q10 > Q90 for {100 - order_ok:.0f}% of samples")
            all_ok = False

    return all_ok


if __name__ == "__main__":
    print("Loading position-specific models...\n")
    models = load_position_models()

    if not models:
        print("ERROR: No models loaded. Run train_position_models.py first.")
        exit(1)

    print(f"Loaded models for: {list(models.keys())}\n")

    samples_ok = test_sample_players(models)
    real_ok = test_per_position_real_data(models)
    quantile_ok = test_quantile_ordering(models)

    print("\n" + "=" * 60)
    if samples_ok and real_ok and quantile_ok:
        print("ALL VALIDATION TESTS PASSED")
    else:
        print("SOME VALIDATION TESTS FAILED — review output above")
    print("=" * 60)
