# FPL AI Predictor — Backend

Laravel 12 REST API serving FPL data, user authentication, and ML prediction integration.

## Stack

- Laravel 12, PHP 8.2
- Laravel Sanctum (Bearer token authentication)
- SQLite (development), PostgreSQL (production)

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --port=8080
```

Key `.env` values:

```
DB_CONNECTION=sqlite
ML_SERVICE_URL=http://localhost:5000
```

## Artisan Commands

| Command | Description |
|---|---|
| `php artisan fpl:fetch` | Sync teams and players from the FPL API |
| `php artisan fpl:fetch-fixtures` | Update fixture list and difficulty ratings |
| `php artisan fpl:fetch-gw-stats` | Fetch player stats for the current gameweek |
| `php artisan fpl:generate-predictions` | Run batch ML predictions for all players |

See the root [README](../README.md) for full project setup and API reference.
