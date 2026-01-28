<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fixture;
use App\Models\Player;
use App\Models\Prediction;
use App\Services\FeatureCalculator;
use App\Services\FplApiService;
use App\Services\MLService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MyTeamController extends Controller
{
    public function load(Request $request): JsonResponse
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
            $activeChip = $latest['chip'] ?? null;
            $picksData = $latest['data'];
            $picks = $picksData['picks'];
            $entryHistory = $picksData['entry_history'];

            // Apply pending transfers not yet reflected in picks
            $transferThreshold = $freeHitActive ? $gameweek + 1 : $gameweek;
            $transfers = $fplApi->getTeamTransfers($teamId);
            $history = $fplApi->getTeamHistory($teamId);
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

            // Build fixture map for next gameweek (single query)
            $nextGw = $fplApi->getNextGameweek();
            $gwFixtures = Fixture::with(['homeTeam', 'awayTeam'])
                ->where('gameweek', $nextGw)
                ->where('finished', false)
                ->get();

            $fixtureMap = [];
            foreach ($gwFixtures as $fixture) {
                $fixtureMap[$fixture->home_team_fpl_id] = [
                    'opponent_short_name' => $fixture->awayTeam->short_name,
                    'is_home' => true,
                    'difficulty' => $fixture->home_difficulty,
                ];
                $fixtureMap[$fixture->away_team_fpl_id] = [
                    'opponent_short_name' => $fixture->homeTeam->short_name,
                    'is_home' => false,
                    'difficulty' => $fixture->away_difficulty,
                ];
            }

            // Batch-load cached predictions for all squad players
            $playerIds = $players->pluck('id')->toArray();
            $cachedPredictions = Prediction::whereIn('player_id', $playerIds)
                ->where('gameweek', $nextGw)
                ->get()
                ->keyBy('player_id');

            // For players missing cached predictions, compute on-the-fly
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

            // Build squad response
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
                        'web_name' => $player->web_name,
                        'position' => $player->position,
                        'price' => $player->price,
                        'form' => $player->form,
                        'total_points' => $player->total_points,
                        'status' => $player->status,
                        'team_fpl_id' => $player->team_fpl_id,
                        'selected_by_percent' => $player->selected_by_percent,
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
                    'next_fixture' => $fixtureMap[$player->team_fpl_id] ?? null,
                ];
            }

            $analysis = $this->computeAnalysis($squad);

            // Budget info
            $budget = [
                'bank' => round(($entryHistory['bank'] ?? 0) / 10, 1),
                'squad_value' => round(($entryHistory['value'] ?? 0) / 10, 1),
                'event_transfers' => $entryHistory['event_transfers'] ?? 0,
                'event_transfers_cost' => $entryHistory['event_transfers_cost'] ?? 0,
                'free_transfers' => $this->estimateFreeTransfers(
                    $history['current'] ?? [],
                    $history['chips'] ?? [],
                ),
            ];

            $user->increment('api_calls_today');

            return response()->json([
                'team_info' => [
                    ...$teamEntry,
                    'fpl_team_id' => $teamId,
                    'gameweek' => $gameweek,
                    'free_hit_active' => $freeHitActive,
                    'active_chip' => ($gameweek >= $nextGw) ? $activeChip : null,
                    'next_gameweek' => $nextGw,
                ],
                'squad' => $squad,
                'analysis' => $analysis,
                'budget' => $budget,
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
                'error' => 'Failed to load team',
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

    /**
     * Estimate free transfers available for next GW using official history data.
     *
     * Uses the last event in the history array as the loop bound (not $gameweek)
     * to avoid off-by-one issues from Free Hit fallback or next-GW picks.
     *
     * FPL rules:
     * - 1 free transfer for GW 2 (first transferable GW), unused roll over, max 5
     * - Wildcard: resets to 1 for next GW
     * - Free Hit: transfers don't count, balance preserved
     * - Triple Captain / Bench Boost: no effect on transfers
     */
    private function estimateFreeTransfers(array $gwHistory, array $chips): int
    {
        $transfersPerGw = [];
        $lastGw = 0;
        foreach ($gwHistory as $gw) {
            $event = $gw['event'] ?? 0;
            $transfersPerGw[$event] = $gw['event_transfers'] ?? 0;
            $lastGw = max($lastGw, $event);
        }

        $chipPerGw = [];
        foreach ($chips as $chip) {
            $chipPerGw[$chip['event'] ?? 0] = $chip['name'] ?? '';
        }

        $free = 1;
        for ($gw = 2; $gw <= $lastGw; $gw++) {
            $chip = $chipPerGw[$gw] ?? null;
            $used = $transfersPerGw[$gw] ?? 0;

            if ($chip === 'wildcard') {
                $free = 2;
            } elseif ($chip === 'freehit') {
                $free = min($free + 1, 5);
            } else {
                $free = min(max($free - $used, 0) + 1, 5);
            }
        }

        return $free;
    }
}
