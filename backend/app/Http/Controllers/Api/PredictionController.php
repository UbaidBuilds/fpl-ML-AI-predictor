<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\Prediction;
use App\Services\FeatureCalculator;
use App\Services\FplApiService;
use App\Services\MLService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PredictionController extends Controller
{
    public function show(Request $request, int $playerId): JsonResponse
    {
        $user = $request->user();

        if (!$user->canViewPredictions()) {
            return response()->json([
                'error' => 'Rate limit exceeded. Upgrade to premium for unlimited predictions.',
            ], 429);
        }

        $player = Player::with('team')->findOrFail($playerId);

        try {
            $fplApi = new FplApiService();
            $nextGw = $fplApi->getNextGameweek();
        } catch (\Exception $e) {
            $nextGw = 0;
        }

        // Check for cached prediction (fresh = updated within last 24 hours)
        $cached = Prediction::where('player_id', $player->id)
            ->where('gameweek', $nextGw)
            ->where('updated_at', '>=', now()->subHours(24))
            ->first();

        if ($cached) {
            $user->increment('api_calls_today');

            return response()->json([
                'player' => $player,
                'prediction' => [
                    'predicted_points' => (float) $cached->predicted_points,
                    'confidence' => (float) $cached->confidence,
                    'gameweek' => (string) $nextGw,
                ],
            ]);
        }

        // No cache — compute real features and call ML
        try {
            $calculator = new FeatureCalculator();
            $features = $calculator->calculateFeatures($player->fpl_id, $nextGw);

            // Null = blank GW (no fixture)
            if ($features === null) {
                $user->increment('api_calls_today');
                return response()->json([
                    'player' => $player,
                    'prediction' => [
                        'predicted_points' => 0,
                        'confidence' => 0,
                        'gameweek' => (string) $nextGw,
                    ],
                ]);
            }

            $ml = new MLService();
            $result = $ml->predict($player->fpl_id, $features);

            // Cache the prediction
            Prediction::updateOrCreate(
                ['player_id' => $player->id, 'gameweek' => $nextGw],
                [
                    'predicted_points' => $result['predicted_points'],
                    'confidence' => $result['confidence'],
                    'features' => $features,
                ]
            );

            $user->increment('api_calls_today');

            return response()->json([
                'player' => $player,
                'prediction' => [
                    'predicted_points' => $result['predicted_points'],
                    'confidence' => $result['confidence'],
                    'gameweek' => (string) $nextGw,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'ML service unavailable',
                'message' => $e->getMessage(),
            ], 503);
        }
    }
}
