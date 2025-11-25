"""
feature_engineering.py
Creates predictive features from raw historical FPL data.
Carefully avoids data leakage by calling shift(1) before any rolling operations.

Usage: python training/feature_engineering.py
Input: data/raw/historical_data.csv
Output: data/processed/features_data.csv
"""

import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_PATH = os.path.join(BASE_DIR, "data", "raw", "historical_data.csv")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
OUT_PATH = os.path.join(PROCESSED_DIR, "features_data.csv")

FEATURE_COLUMNS = [
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


def create_features(df):
    """Create predictive features from raw gameweek data.

    All rolling/lag features use shift(1) first to only use past data,
    preventing data leakage of the current gameweek's target variable.
    """
    print("Sorting data...")
    df = df.sort_values(["name", "season", "round"]).copy()

    # Handle missing xG/xA columns (older seasons may not have them)
    for col in ["expected_goals", "expected_assists", "expected_goal_involvements"]:
        if col not in df.columns:
            df[col] = 0.0

    # Handle missing ict_index column
    if "ict_index" not in df.columns:
        df["ict_index"] = 0.0
    else:
        df["ict_index"] = pd.to_numeric(df["ict_index"], errors="coerce").fillna(0.0)

    # Handle missing starts column (older seasons may not have it)
    if "starts" not in df.columns:
        # Approximate: if minutes > 0, assume started
        df["starts"] = (df["minutes"] > 0).astype(int)

    # Ensure numeric types for rolling columns
    for col in ["expected_goals", "expected_assists", "expected_goal_involvements"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    # Group by name + season so rolling stats don't span across seasons
    group = df.groupby(["name", "season"])

    print("Computing rolling features (shift before roll)...")

    # --- Original 3-GW rolling features ---
    df["points_last_3"] = group["total_points"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).mean()
    )
    df["minutes_last_3"] = group["minutes"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).mean()
    )
    df["goals_last_3"] = group["goals_scored"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).sum()
    )
    df["assists_last_3"] = group["assists"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).sum()
    )

    print("Computing lag features...")

    # Last gameweek features
    df["points_last_gw"] = group["total_points"].transform(lambda x: x.shift(1))
    df["minutes_last_gw"] = group["minutes"].transform(lambda x: x.shift(1))

    print("Computing static features...")

    # Home/away
    df["home_game"] = df["was_home"].astype(bool).astype(int)

    # Position: vaastav data uses string labels, map to numeric 1-4
    position_map = {"GK": 1, "GKP": 1, "DEF": 2, "MID": 3, "AM": 3, "FWD": 4}
    df["position"] = df["position"].map(position_map)

    # Price in millions
    df["price"] = df["value"] / 10

    # Weighted form: 50% last GW + 30% two GWs ago + 20% three GWs ago
    df["form"] = (
        group["total_points"].transform(lambda x: x.shift(1)) * 0.5
        + group["total_points"].transform(lambda x: x.shift(2)) * 0.3
        + group["total_points"].transform(lambda x: x.shift(3)) * 0.2
    )

    print("Computing new Phase 2 features...")

    # --- xG/xA rolling (3-GW avg) ---
    df["xg_last_3"] = group["expected_goals"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).mean()
    )
    df["xa_last_3"] = group["expected_assists"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).mean()
    )
    df["xgi_last_3"] = group["expected_goal_involvements"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).mean()
    )

    # --- ICT rolling (3-GW avg) ---
    df["ict_last_3"] = group["ict_index"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).mean()
    )

    # --- 5-GW rolling windows ---
    df["points_last_5"] = group["total_points"].transform(
        lambda x: x.shift(1).rolling(5, min_periods=1).mean()
    )
    df["minutes_last_5"] = group["minutes"].transform(
        lambda x: x.shift(1).rolling(5, min_periods=1).mean()
    )

    # --- Fixture difficulty (neutral default for training data) ---
    df["opponent_difficulty"] = 3.0

    # --- Starts rolling (3-GW sum) ---
    df["starts_last_3"] = group["starts"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).sum()
    )

    # --- Clean sheets rolling (3-GW sum) ---
    df["clean_sheets_last_3"] = group["clean_sheets"].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).sum()
    )

    # Drop rows where any feature is NaN (first few GWs per player-season)
    before = len(df)
    df = df.dropna(subset=FEATURE_COLUMNS)
    after = len(df)
    print(f"\nDropped {before - after} rows with NaN features ({before} -> {after})")

    return df


def validate(df):
    """Run sanity checks on the processed data."""
    print("\n" + "=" * 50)
    print("VALIDATION")
    print("=" * 50)

    # Check no NaN in features or target
    nan_counts = df[FEATURE_COLUMNS + [TARGET]].isna().sum()
    has_nan = nan_counts.sum() > 0
    if has_nan:
        print("WARNING: NaN values found:")
        print(nan_counts[nan_counts > 0])
    else:
        print("No NaN values in features or target.")

    # Spot check: verify shift works correctly
    sample_player = df.groupby(["name", "season"]).filter(lambda x: len(x) >= 5)
    if len(sample_player) > 0:
        player_group = sample_player.groupby(["name", "season"]).first()
        first_name = player_group.index[0]
        player_data = df[(df["name"] == first_name[0]) & (df["season"] == first_name[1])].head(5)
        print(f"\nSpot check ({first_name[0]}, {first_name[1]}):")
        print(player_data[["round", "total_points", "points_last_gw", "points_last_3", "xg_last_3", "ict_last_3"]].to_string(index=False))

    # Feature statistics
    print(f"\nFeature statistics ({len(FEATURE_COLUMNS)} features):")
    print(df[FEATURE_COLUMNS].describe().round(2).to_string())

    # Target statistics
    print(f"\nTarget (total_points): mean={df[TARGET].mean():.2f}, "
          f"std={df[TARGET].std():.2f}, "
          f"min={df[TARGET].min()}, max={df[TARGET].max()}")

    # Records per season
    print(f"\nRecords per season:")
    print(df["season"].value_counts().sort_index().to_string())


if __name__ == "__main__":
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    print("Loading raw data...")
    df = pd.read_csv(RAW_PATH, low_memory=False)
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")

    df = create_features(df)

    # Save only the columns needed for training + some identifiers
    keep_cols = ["name", "season", "round", "team"] + FEATURE_COLUMNS + [TARGET]
    # Only keep columns that exist (team might be named differently)
    keep_cols = [c for c in keep_cols if c in df.columns]
    df_out = df[keep_cols]

    df_out.to_csv(OUT_PATH, index=False)
    print(f"\nSaved {len(df_out)} rows to {OUT_PATH}")

    validate(df_out)
    print("\nFeature engineering complete!")
