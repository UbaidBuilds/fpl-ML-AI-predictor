"""
data_collection.py
Fetches FPL historical data from vaastav/Fantasy-Premier-League GitHub repo
and current season snapshot from the official FPL API.

Usage: python training/data_collection.py
Output: data/raw/historical_data.csv, data/raw/current_season.json
"""

import os
import sys
import time
import json
import requests
import pandas as pd
from io import StringIO

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")

VAASTAV_BASE = "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data"
SEASONS = ["2021-22", "2022-23", "2023-24", "2024-25"]
FPL_API = "https://fantasy.premierleague.com/api/bootstrap-static/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FPL-ML-Project/1.0"
}


def fetch_gameweek(session, season, gw):
    """Fetch a single gameweek CSV. Returns DataFrame or None."""
    url = f"{VAASTAV_BASE}/{season}/gws/gw{gw}.csv"
    for attempt in range(3):
        try:
            resp = session.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            df = pd.read_csv(StringIO(resp.text))
            df["season"] = season
            df["gameweek"] = gw
            return df
        except requests.exceptions.RequestException as e:
            if attempt < 2:
                time.sleep(1 * (attempt + 1))
            else:
                print(f"  FAILED {season} GW{gw}: {e}")
                return None
    return None


def fetch_historical():
    """Fetch all gameweek CSVs for each season from vaastav repo."""
    print("=" * 50)
    print("FETCHING HISTORICAL DATA")
    print("=" * 50)

    session = requests.Session()
    all_frames = []

    for season in SEASONS:
        season_count = 0
        print(f"\n{season}:", end=" ")
        for gw in range(1, 39):
            df = fetch_gameweek(session, season, gw)
            if df is not None:
                all_frames.append(df)
                season_count += len(df)
                print(f"GW{gw}", end=" ", flush=True)
            time.sleep(0.3)
        print(f"\n  -> {season_count} records")

    if not all_frames:
        print("ERROR: No data fetched!")
        sys.exit(1)

    combined = pd.concat(all_frames, ignore_index=True)
    out_path = os.path.join(RAW_DIR, "historical_data.csv")
    combined.to_csv(out_path, index=False)

    print(f"\nSaved {len(combined)} total records to {out_path}")
    print(f"Columns: {len(combined.columns)}")
    print(f"\nRecords per season:")
    print(combined["season"].value_counts().sort_index().to_string())

    # Verify required columns exist
    required = ["name", "total_points", "minutes", "goals_scored", "assists",
                 "was_home", "position", "value", "round"]
    missing = [c for c in required if c not in combined.columns]
    if missing:
        print(f"\nWARNING: Missing required columns: {missing}")
    else:
        print("\nAll required columns present.")

    return combined


def fetch_current_season():
    """Fetch current season data from FPL API."""
    print("\n" + "=" * 50)
    print("FETCHING CURRENT SEASON (FPL API)")
    print("=" * 50)

    try:
        resp = requests.get(FPL_API, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        out_path = os.path.join(RAW_DIR, "current_season.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        players = pd.DataFrame(data["elements"])
        teams = pd.DataFrame(data["teams"])

        print(f"Players: {len(players)}")
        print(f"Teams: {len(teams)}")
        print(f"Saved to {out_path}")

    except requests.exceptions.RequestException as e:
        print(f"WARNING: Could not fetch FPL API: {e}")
        print("This is optional — historical data is sufficient for training.")


if __name__ == "__main__":
    os.makedirs(RAW_DIR, exist_ok=True)
    fetch_historical()
    fetch_current_season()
    print("\nData collection complete!")
