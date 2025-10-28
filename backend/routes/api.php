<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PlayerController;
use App\Http\Controllers\Api\PredictionController;
use App\Http\Controllers\Api\FixtureController;
use App\Http\Controllers\Api\TeamAnalyzerController;
use App\Http\Controllers\Api\TransferSuggestionController;
use App\Http\Controllers\Api\MyTeamController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/players', [PlayerController::class, 'index']);
Route::get('/players/{id}', [PlayerController::class, 'show']);
Route::get('/players/{id}/fixtures', [FixtureController::class, 'playerFixtures']);
Route::get('/fixtures', [FixtureController::class, 'index']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/players/{playerId}/prediction', [PredictionController::class, 'show']);

    Route::post('/team-analyzer', [TeamAnalyzerController::class, 'analyze']);

    Route::post('/transfers/suggest', [TransferSuggestionController::class, 'suggest']);

    Route::post('/my-team', [MyTeamController::class, 'load']);
});
