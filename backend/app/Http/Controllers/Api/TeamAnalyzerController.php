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

class TeamAnalyzerController extends Controller
{
    public function analyze(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->canViewPredictions()) {
            return response()->json([
                'error' => 'Rate limit exceeded. Upgrade to premium for unlimited predictions.',
            ], 429);
        }

        $validated = $request->validate([
            'fpl_team_id' => 'required|integer|min:1',
        ]);

        $teamId = (int) $validated['fpl_team_id'];

        try {
            $fplApi = new FplApiService();

            $teamEntry = $fplApi->getTeamEntry($teamId);
            $latest = $fplApi->getLatestTeamPicks($teamId);
            $gameweek = $latest['gameweek'];
            $freeHitActive = $latest['free_hit_active'] ?? false;
            $picksData = $latest['data'];
            $picks = $picksData['picks'];

            // Apply pending transfers not yet reflected in picks
            $transferThreshold = $freeHitActive ? $gameweek + 1 : $gameweek;
            $transfers = $fplApi->getTeamTransfers($teamId);
            foreach ($transfers as $transfer) {
                if ($transfer['event'] > $transferThreshold) {
                    foreach ($picks as &$pick) {
                        if ($pick['element'] === $transfer['element_out']) {
                            $pick['element'] = $transfer['element_in'];
                            break;
                        }
                    }
                    unset($pick);
                }
            }

            // Map FPL IDs to local players
            $fplIds = array_column($picks, 'element');
            $players = Player::with('team')
                ->whereIn('fpl_id', $fplIds)
                ->get()
                ->keyBy('fpl_id');

            $nextGw = $fplApi->getNextGameweek();

            // Batch-load cached predictions
            $playerIds = $players->pluck('id')->toArray();
            $cachedPredictions = Prediction::whereIn('player_id', $playerIds)
                ->where('gameweek', $nextGw)
                ->get()
                ->keyBy('player_id');

            // Compute predictions for any missing players
            $missingPlayerIds = array_diff($playerIds, $cachedPredictions->keys()->toArray());
            if (!empty($missingPlayerIds)) {
                $missingPlayers = $players->filter(fn ($p) => in_array($p->id, $missingPlayerIds));
                $calculator = new FeatureCalculator();
                $mlService = new MLService();

                $featureMap = $calculator->calculateBatch($missingPlayers->values(), $nextGw);

                foreach ($missingPlayers as $player) {
                    $features = $featureMap[$player->fpl_id] ?? null;

                    if ($features) {
                        try {
                            $result = $mlService->predict($player->fpl_id, $features);
                            $predictedPoints = round((float) $result['predicted_points'], 2);
                            $confidence = round((float) $result['confidence'], 2);
                        } catch (\Exception $e) {
                            $predictedPoints = round((float) $player->form, 2);
                            $confidence = 0.0;
                        }
                    } else {
                        $predictedPoints = 0;
                        $confidence = 0.0;
                    }

                    $prediction = Prediction::updateOrCreate(
                        ['player_id' => $player->id, 'gameweek' => $nextGw],
                        [
                            'predicted_points' => $predictedPoints,
                            'confidence' => $confidence,
                            'features' => $features,
                        ]
                    );
                    $cachedPredictions[$player->id] = $prediction;
                }
            }

            // Build squad with predictions
            $squad = [];
            $unmappedCount = 0;

            foreach ($picks as $pick) {
                $fplId = $pick['element'];
                $player = $players->get($fplId);

                if (!$player) {
                    $unmappedCount++;
                    continue;
                }

                $prediction = $cachedPredictions->get($player->id);
                $predictedPoints = $prediction ? round((float) $prediction->predicted_points, 2) : round((float) $player->form, 2);
                $confidence = $prediction ? round((float) $prediction->confidence, 2) : 0.0;

                $squad[] = [
                    'player' => [
                        'id' => $player->id,
                        'fpl_id' => $player->fpl_id,
                        'name' => $player->name,
                        'web_name' => $player->web_name,
                        'position' => $player->position,
                        'price' => $player->price,
                        'form' => $player->form,
                        'total_points' => $player->total_points,
                        'status' => $player->status,
                        'team' => $player->team ? [
                            'name' => $player->team->name,
                            'short_name' => $player->team->short_name,
                        ] : null,
                    ],
                    'pick' => [
                        'squad_position' => $pick['position'],
                        'is_starter' => $pick['position'] <= 11,
                        'multiplier' => $pick['multiplier'],
                        'is_captain' => $pick['is_captain'],
                        'is_vice_captain' => $pick['is_vice_captain'],
                    ],
                    'prediction' => [
                        'predicted_points' => $predictedPoints,
                        'confidence' => $confidence,
                    ],
                ];
            }

            $analysis = $this->computeAnalysis($squad);

            $user->increment('api_calls_today');

            return response()->json([
                'team_info' => [
                    ...$teamEntry,
                    'fpl_team_id' => $teamId,
                    'gameweek' => $gameweek,
                    'free_hit_active' => $freeHitActive,
                ],
                'squad' => $squad,
                'analysis' => $analysis,
                'meta' => [
                    'players_found' => count($squad),
                    'players_missing' => $unmappedCount,
                    'api_calls_remaining' => max(0, $user->api_limit - $user->api_calls_today),
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Team analysis failed',
                'message' => $e->getMessage(),
            ], 503);
        }
    }

    private function computeAnalysis(array $squad): array
    {
        $byPosition = ['GKP' => [], 'DEF' => [], 'MID' => [], 'FWD' => []];
        foreach ($squad as $entry) {
            $pos = $entry['player']['position'];
            if (isset($byPosition[$pos])) {
                $byPosition[$pos][] = $entry;
            }
        }

        foreach ($byPosition as &$group) {
            usort($group, fn ($a, $b) => $b['prediction']['predicted_points'] <=> $a['prediction']['predicted_points']);
        }
        unset($group);

        $gkpPicks = array_splice($byPosition['GKP'], 0, 1);
        $defPicks = array_splice($byPosition['DEF'], 0, 3);
        $midPicks = array_splice($byPosition['MID'], 0, 2);
        $fwdPicks = array_splice($byPosition['FWD'], 0, 1);

        $optimalXI = array_merge($gkpPicks, $defPicks, $midPicks, $fwdPicks);

        $remaining = array_merge(
            $byPosition['DEF'],
            $byPosition['MID'],
            $byPosition['FWD']
        );
        usort($remaining, fn ($a, $b) => $b['prediction']['predicted_points'] <=> $a['prediction']['predicted_points']);

        $optimalXI = array_merge($optimalXI, array_slice($remaining, 0, 4));

        $optimalFplIds = array_map(fn ($e) => $e['player']['fpl_id'], $optimalXI);

        $currentStartersTotal = 0;
        foreach ($squad as $entry) {
            if ($entry['pick']['is_starter']) {
                $currentStartersTotal += $entry['prediction']['predicted_points'] * $entry['pick']['multiplier'];
            }
        }

        usort($optimalXI, fn ($a, $b) => $b['prediction']['predicted_points'] <=> $a['prediction']['predicted_points']);
        $optimalCaptainFplId = $optimalXI[0]['player']['fpl_id'] ?? null;

        $optimalTotal = 0;
        foreach ($optimalXI as $entry) {
            $multiplier = ($entry['player']['fpl_id'] === $optimalCaptainFplId) ? 2 : 1;
            $optimalTotal += $entry['prediction']['predicted_points'] * $multiplier;
        }

        $allSorted = $squad;
        usort($allSorted, fn ($a, $b) => $a['prediction']['predicted_points'] <=> $b['prediction']['predicted_points']);
        $weakFplIds = array_map(fn ($e) => $e['player']['fpl_id'], array_slice($allSorted, 0, 3));

        return [
            'optimal_xi_fpl_ids' => $optimalFplIds,
            'optimal_captain_fpl_id' => $optimalCaptainFplId,
            'current_xi_predicted' => round($currentStartersTotal, 2),
            'optimal_xi_predicted' => round($optimalTotal, 2),
            'points_improvement' => round($optimalTotal - $currentStartersTotal, 2),
            'weak_player_fpl_ids' => $weakFplIds,
        ];
    }
}
