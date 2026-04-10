# FPL AI Predictor

A full-stack Fantasy Premier League analytics platform. Syncs live data from the official FPL API, runs position-specific XGBoost models to generate points predictions with confidence intervals, and surfaces actionable recommendations for transfers and captaincy.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Laravel](https://img.shields.io/badge/Laravel-12-red?logo=laravel)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.10-blue?logo=python)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

## Architecture

Three independently runnable services communicate over HTTP:

```
┌──────────────────────────────────────────────────────────┐
│  Browser                                                 │
│  Next.js 16 · React 19 · TypeScript · Tailwind CSS       │
│  port 3000                                               │
└───────────────────────┬──────────────────────────────────┘
                        │ REST (Axios / TanStack Query)
┌───────────────────────▼──────────────────────────────────┐
│  Laravel 12 API  (PHP 8.2)                               │
│  Sanctum auth · SQLite / PostgreSQL · FPL data sync      │
│  port 8080                                               │
└──────────┬───────────────────────────────┬───────────────┘
           │ POST /predict/batch            │ HTTPS
┌──────────▼──────────┐          ┌─────────▼──────────────┐
│  FastAPI ML Service │          │  fantasy.premierleague  │
│  XGBoost · Optuna   │          │  .com/api               │
│  port 5000          │          └────────────────────────-┘
└─────────────────────┘
```

The Laravel backend is the single API gateway — it handles auth, caches FPL data, and proxies prediction requests to the ML service. The frontend never calls the ML service directly.

## Features

- **Live data sync** — pulls current gameweek players, fixtures, and per-player stats from the official FPL API
- **Point predictions** — position-specific XGBoost models predict expected FPL points for all 600+ players per gameweek
- **Confidence intervals** — quantile regression (Q10/Q90) produces an uncertainty range alongside each prediction
- **Transfer recommendations** — analyzes your squad budget and suggests optimal transfers ranked by predicted gain
- **Captain picker** — ranks players by predicted ceiling to maximise captaincy upside
- **Player comparison** — side-by-side breakdown of up to four players across form, xG, xA, ICT, price, and fixture difficulty
- **Football pitch visualisation** — renders your 15-man squad on an interactive pitch layout with drag-and-drop transfers
- **Fixture difficulty ticker** — colour-coded 5-gameweek look-ahead for any player or team

## ML Model

### Approach

Four separate XGBoost regressors, one per position (GKP, DEF, MID, FWD). Training separate models per position avoids conflating goalkeeper clean-sheet scoring with forward goal contributions, which have very different statistical profiles.

Each model is paired with two quantile regressors (α=0.10, α=0.90) that produce a prediction interval rather than a point estimate. Confidence scores are derived from the relative width of that interval.

### Feature Set (19 features)

| Category | Features |
|---|---|
| Recent form | `points_last_3`, `points_last_5`, `points_last_gw` |
| Playing time | `minutes_last_3`, `minutes_last_5`, `minutes_last_gw`, `starts_last_3` |
| Attacking | `goals_last_3`, `assists_last_3`, `xg_last_3`, `xa_last_3`, `xgi_last_3` |
| Influence | `ict_last_3`, `form` |
| Defensive | `clean_sheets_last_3` |
| Context | `home_game`, `opponent_difficulty`, `price`, `position` |

### Training

- **Hyperparameter tuning**: Optuna with 75 trials per position, 5-fold cross-validation objective
- **Search space**: `n_estimators` (200–1000), `max_depth` (4–12), `learning_rate` (0.005–0.3), `subsample`, `colsample_bytree`, `reg_alpha`, `reg_lambda`
- **Training data**: ~77,000 player-gameweek rows across three seasons (via Vaastav FPL dataset)

### Results

| Position | Samples | RMSE | R² |
|---|---|---|---|
| GKP | 8,275 | 1.720 | 0.398 |
| DEF | 25,521 | 1.925 | 0.246 |
| MID | 33,604 | 1.933 | 0.343 |
| FWD | 9,107 | 2.257 | 0.306 |

Predicting FPL points is inherently noisy — rotation, injuries, and referee decisions are unmodellable. RMSE of ~2 points at this resolution is broadly in line with published academic work on FPL prediction.

### Batch Inference

The `/predict/batch` endpoint accepts an array of feature vectors and returns predictions for all players in a single HTTP round trip. The backend calls this once per gameweek sync, processing the full 600+ player dataset in one request (down from ~30 minutes of sequential calls to a few seconds).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, TanStack Query v5, shadcn/ui |
| Backend | Laravel 12, PHP 8.2, Laravel Sanctum |
| Database | SQLite (development), PostgreSQL (production) |
| ML service | Python 3.10, XGBoost 3.x, Optuna 4.x, FastAPI 0.115, scikit-learn, pandas |

## Project Structure

```
fpl-ai-predictor/
├── frontend/                    # Next.js app
│   ├── app/                     # App Router pages
│   ├── components/              # UI components (FootballPitch, PlayerCard, TransferSuggestionCard, …)
│   └── lib/                     # API client, TypeScript types, auth context
├── backend/                     # Laravel REST API
│   ├── app/
│   │   ├── Http/Controllers/Api/  # AuthController, PlayerController, PredictionController, …
│   │   └── Services/              # FplApiService, MLService, FeatureCalculator
│   └── routes/api.php
└── ml-service/                  # FastAPI prediction service
    ├── main.py                  # POST /predict, POST /predict/batch, GET /health
    ├── training/                # train_position_models.py, feature_engineering.py
    └── models/                  # Trained .pkl files (generated locally — see setup)
```

## Getting Started

### Prerequisites

- Node.js 20+
- PHP 8.2+ with Composer
- Python 3.10+

### 1. ML Service

```bash
cd ml-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Collect training data and train models
python training/data_collection.py
python training/train_position_models.py

# Start the service
uvicorn main:app --reload --port 5000
```

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate

# Seed initial data from the FPL API
php artisan fpl:fetch
php artisan fpl:fetch-fixtures
php artisan fpl:fetch-gw-stats
php artisan fpl:generate-predictions

php artisan serve --port=8080
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The app is available at `http://localhost:3000`.

## API Reference

### Public endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/register` | Register a new user |
| `POST` | `/api/login` | Authenticate, returns Sanctum token |
| `GET` | `/api/players` | List all players (paginated, filterable) |
| `GET` | `/api/players/{id}` | Single player detail |
| `GET` | `/api/players/{id}/fixtures` | Upcoming fixtures for a player |
| `GET` | `/api/fixtures` | All fixtures |

### Authenticated endpoints (Bearer token)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/user` | Current user |
| `POST` | `/api/logout` | Revoke token |
| `GET` | `/api/players/{playerId}/prediction` | ML prediction for a player |
| `POST` | `/api/team-analyzer` | Analyze a team by FPL team ID |
| `POST` | `/api/transfers/suggest` | Transfer recommendations |
| `POST` | `/api/my-team` | Load squad from FPL team ID |

## License

MIT — see [LICENSE](LICENSE).
