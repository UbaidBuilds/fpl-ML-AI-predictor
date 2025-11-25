"""
FPL ML Service — FastAPI wrapper for position-specific XGBoost models.

Endpoints:
  POST /predict       — Predict FPL points for a single player
  POST /predict/batch — Predict FPL points for multiple players at once
  GET  /health        — Health check (model loaded status)
  GET  /              — Service info

Run: uvicorn main:app --reload --port 5000
"""

import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
from typing import List

app = FastAPI(title="FPL ML Service", version="2.0.0")

# Feature names in expected order (19 features)
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

POSITION_INDEX = 7  # index of "position" in FEATURES
POSITION_MAP = {1: "gkp", 2: "def", 3: "mid", 4: "fwd"}

# Model storage
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
position_models = {}  # {pos_name: {"model", "scaler", "q10", "q90"}}
fallback_model = None
fallback_scaler = None
use_position_models = False


def load_models():
    """Load position-specific models, falling back to single model if not available."""
    global position_models, fallback_model, fallback_scaler, use_position_models

    # Try loading position-specific models
    all_loaded = True
    for pos_id, pos_name in POSITION_MAP.items():
        try:
            position_models[pos_name] = {
                "model": joblib.load(os.path.join(MODELS_DIR, f"{pos_name}_model.pkl")),
                "scaler": joblib.load(os.path.join(MODELS_DIR, f"{pos_name}_scaler.pkl")),
                "q10": joblib.load(os.path.join(MODELS_DIR, f"{pos_name}_q10.pkl")),
                "q90": joblib.load(os.path.join(MODELS_DIR, f"{pos_name}_q90.pkl")),
            }
        except Exception as e:
            print(f"WARNING: Failed to load {pos_name} models: {e}")
            all_loaded = False

    if all_loaded and len(position_models) == 4:
        use_position_models = True
        print(f"Loaded position-specific models: {list(position_models.keys())}")
        return

    # Fallback to single model
    position_models = {}
    try:
        fallback_model = joblib.load(os.path.join(MODELS_DIR, "xgboost_model.pkl"))
        fallback_scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
        use_position_models = False
        print("Loaded fallback single model (position models not available)")
    except Exception as e:
        print(f"WARNING: Failed to load any models: {e}")


load_models()


def _compute_confidence(prediction: float, q10: float, q90: float, features: List[float]) -> float:
    """Compute confidence using relative uncertainty (interval vs prediction magnitude).

    - Narrow interval relative to prediction = high confidence
    - Wide interval relative to prediction = low confidence
    - 0 minutes in last 3 GWs = capped at 0.25
    """
    interval = max(0.0, q90 - q10)
    prediction_abs = max(abs(prediction), 0.5)
    relative_uncertainty = interval / prediction_abs
    confidence = max(0.10, min(0.95, 1.0 - (relative_uncertainty / 4.0)))

    # If player hasn't played recently, cap confidence low
    minutes_last_3 = features[1]  # index 1 = minutes_last_3
    if minutes_last_3 == 0:
        confidence = min(confidence, 0.25)

    return confidence


def predict_single(player_id: int, features: List[float]) -> dict:
    """Predict for a single player, routing to correct position model."""
    position = int(features[POSITION_INDEX])
    pos_name = POSITION_MAP.get(position)

    if use_position_models and pos_name and pos_name in position_models:
        m = position_models[pos_name]
        df = pd.DataFrame([features], columns=FEATURES)
        scaled = m["scaler"].transform(df)
        prediction = max(0.0, float(m["model"].predict(scaled)[0]))

        q10 = float(m["q10"].predict(scaled)[0])
        q90 = float(m["q90"].predict(scaled)[0])
        confidence = _compute_confidence(prediction, q10, q90, features)
    elif fallback_model is not None:
        df = pd.DataFrame([features], columns=FEATURES)
        scaled = fallback_scaler.transform(df)
        prediction = max(0.0, float(fallback_model.predict(scaled)[0]))
        confidence = max(0.10, min(0.70, prediction / 10.0))
    else:
        raise RuntimeError("No models loaded")

    return {
        "player_id": player_id,
        "predicted_points": round(prediction, 2),
        "confidence": round(confidence, 2),
    }


# --- Request/Response models ---

class PredictionRequest(BaseModel):
    player_id: int
    features: List[float]

    @field_validator("features")
    @classmethod
    def validate_features(cls, v):
        if len(v) != len(FEATURES):
            raise ValueError(
                f"Must provide exactly {len(FEATURES)} features, got {len(v)}. "
                f"Expected order: {', '.join(FEATURES)}"
            )
        return v


class PredictionResponse(BaseModel):
    player_id: int
    predicted_points: float
    confidence: float


class BatchPlayer(BaseModel):
    player_id: int
    features: List[float]

    @field_validator("features")
    @classmethod
    def validate_features(cls, v):
        if len(v) != len(FEATURES):
            raise ValueError(
                f"Must provide exactly {len(FEATURES)} features, got {len(v)}."
            )
        return v


class BatchRequest(BaseModel):
    players: List[BatchPlayer]


class BatchResponse(BaseModel):
    predictions: List[PredictionResponse]


# --- Endpoints ---

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    if not use_position_models and fallback_model is None:
        raise HTTPException(status_code=503, detail="No models loaded")

    try:
        result = predict_single(request.player_id, request.features)
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch", response_model=BatchResponse)
async def predict_batch(request: BatchRequest):
    if not use_position_models and fallback_model is None:
        raise HTTPException(status_code=503, detail="No models loaded")

    if len(request.players) == 0:
        return BatchResponse(predictions=[])

    try:
        if use_position_models:
            predictions = _batch_predict_position(request.players)
        else:
            predictions = _batch_predict_fallback(request.players)

        return BatchResponse(predictions=predictions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _batch_predict_position(players: List[BatchPlayer]) -> List[PredictionResponse]:
    """Vectorized batch prediction using position-specific models."""
    # Group players by position
    groups = {}  # {pos_name: [(index, player), ...]}
    for i, player in enumerate(players):
        position = int(player.features[POSITION_INDEX])
        pos_name = POSITION_MAP.get(position, "mid")  # default to mid if unknown
        if pos_name not in groups:
            groups[pos_name] = []
        groups[pos_name].append((i, player))

    results = [None] * len(players)

    for pos_name, group in groups.items():
        m = position_models[pos_name]
        indices = [g[0] for g in group]
        features_list = [g[1].features for g in group]
        player_ids = [g[1].player_id for g in group]

        # Vectorized prediction
        df = pd.DataFrame(features_list, columns=FEATURES)
        scaled = m["scaler"].transform(df)
        preds = m["model"].predict(scaled)
        q10_preds = m["q10"].predict(scaled)
        q90_preds = m["q90"].predict(scaled)

        for j, idx in enumerate(indices):
            pred = max(0.0, float(preds[j]))
            q10 = float(q10_preds[j])
            q90 = float(q90_preds[j])
            confidence = _compute_confidence(pred, q10, q90, features_list[j])
            results[idx] = PredictionResponse(
                player_id=player_ids[j],
                predicted_points=round(pred, 2),
                confidence=round(confidence, 2),
            )

    return results


def _batch_predict_fallback(players: List[BatchPlayer]) -> List[PredictionResponse]:
    """Vectorized batch prediction using single fallback model."""
    features_list = [p.features for p in players]
    player_ids = [p.player_id for p in players]

    df = pd.DataFrame(features_list, columns=FEATURES)
    scaled = fallback_scaler.transform(df)
    preds = fallback_model.predict(scaled)

    results = []
    for i, pred in enumerate(preds):
        prediction = max(0.0, float(pred))
        confidence = max(0.10, min(0.70, prediction / 10.0))
        results.append(PredictionResponse(
            player_id=player_ids[i],
            predicted_points=round(prediction, 2),
            confidence=round(confidence, 2),
        ))
    return results


@app.get("/health")
async def health():
    loaded_positions = list(position_models.keys()) if use_position_models else []
    return {
        "status": "healthy" if (use_position_models or fallback_model is not None) else "unhealthy",
        "model_type": "position_specific" if use_position_models else ("fallback" if fallback_model else "none"),
        "positions_loaded": loaded_positions,
    }


@app.get("/")
async def root():
    return {
        "service": "FPL ML Service",
        "version": "2.0.0",
        "model_type": "position_specific" if use_position_models else "fallback",
        "endpoints": {
            "POST /predict": "Predict single player points",
            "POST /predict/batch": "Predict multiple players at once",
            "GET /health": "Health check",
        },
    }
