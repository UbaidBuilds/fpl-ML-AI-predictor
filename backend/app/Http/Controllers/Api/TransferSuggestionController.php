<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fixture;
use App\Models\Player;
use App\Models\Prediction;
use App\Services\FplApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransferSuggestionController extends Controller
{
    public function suggest(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->canViewPredictions()) {
            return response()->json([
                'error' => 'Rate limit exceeded. Upgrade to premium for unlimited predictions.',
            ], 429);
        }

        $validated = $request->validate([
            'position' => 'nullable|string|in:GKP,DEF,MID,FWD',
            'max_price' => 'nullable|numeric|min:0',
            'min_price' => 'nullable|numeric|min:0',
        ]);

        $positionFilter = $validated['position'] ?? null;
        $maxPrice = isset($validated['max_price']) ? (float) $validated['max_price'] : null;
        $minPrice = isset($validated['min_price']) ? (float) $validated['min_price'] : null;

        $fplApi = new FplApiService();
        $nextGw = $fplApi->getNextGameweek();

        // Query all matching players
        $query = Player::with('team')->where('form', '>', 0);

        if ($positionFilter) {
            $query->where('position', $positionFilter);
        }
        if ($maxPrice !== null) {
            $query->where('price', '<=', $maxPrice);
        }
        if ($minPrice !== null) {
            $query->where('price', '>=', $minPrice);
        }

        $players = $query->get();

        if ($players->isEmpty()) {
            $user->increment('api_calls_today');
            return response()->json([
                'suggestions' => [],
                'meta' => [
                    'gameweek' => $nextGw,
                    'players_analyzed' => 0,
                    'position_filter' => $positionFilter,
                    'api_calls_remaining' => max(0, $user->api_limit - $user->api_calls_today),
                ],
            ]);
        }

        // Batch-load next 3 fixtures for all teams (for display)
        $teamFplIds = $players->pluck('team_fpl_id')->unique()->values()->toArray();
        $teamFixtures = $this->loadTeamFixtures($teamFplIds);

        // Batch-load cached ML predictions for next 3 GWs
        $playerIds = $players->pluck('id')->toArray();
        $predictions = Prediction::whereIn('player_id', $playerIds)
            ->whereBetween('gameweek', [$nextGw, $nextGw + 2])
            ->get()
            ->groupBy('player_id');

        // Score each player using ML predictions (sum of next 3 GW predicted points)
        $scored = [];
        foreach ($players as $player) {
            $playerPredictions = $predictions->get($player->id, collect());
            $fixtures = $teamFixtures[$player->team_fpl_id] ?? [];
            $fixtureInfo = array_map(fn ($f) => [
                'opponent_short' => $f['opponent_short'],
                'difficulty' => $f['difficulty'],
                'is_home' => $f['is_home'],
            ], $fixtures);

            if ($playerPredictions->isNotEmpty()) {
                // ML-powered scoring: sum predicted points over next 3 GWs
                $score3gw = $playerPredictions->sum('predicted_points');
            } else {
                // Fallback to form × difficulty heuristic if no cached predictions
                $score3gw = $this->computeHeuristicScore((float) $player->form, $fixtures);
            }

            $scored[] = [
                'player' => $player,
                'score_3gw' => round((float) $score3gw, 2),
                'fixtures' => $fixtureInfo,
            ];
        }

        // Sort by score ascending (worst first for transfer-out candidates)
        usort($scored, fn ($a, $b) => $a['score_3gw'] <=> $b['score_3gw']);

        // Available players only (status = 'a')
        $available = array_values(array_filter($scored, fn ($s) => $s['player']->status === 'a'));

        $totalAvailable = count($available);
        if ($totalAvailable < 2) {
            $user->increment('api_calls_today');
            return response()->json([
                'suggestions' => [],
                'meta' => [
                    'gameweek' => $nextGw,
                    'players_analyzed' => count($scored),
                    'position_filter' => $positionFilter,
                    'api_calls_remaining' => max(0, $user->api_limit - $user->api_calls_today),
                ],
            ]);
        }

        // Bottom 10 = transfer out candidates, Top 10 = transfer in candidates
        $outCandidates = array_slice($available, 0, min(10, (int) floor($totalAvailable / 2)));
        $inCandidates = array_reverse(
            array_slice($available, max(0, $totalAvailable - min(10, (int) floor($totalAvailable / 2))))
        );

        // Create pairs
        $suggestions = [];
        $usedInIds = [];

        foreach ($outCandidates as $out) {
            $outPrice = (float) $out['player']->price;
            $bestIn = null;

            foreach ($inCandidates as $in) {
                if (in_array($in['player']->id, $usedInIds)) {
                    continue;
                }
                if ($out['player']->position !== $in['player']->position) {
                    continue;
                }
                $inPrice = (float) $in['player']->price;
                if (abs($inPrice - $outPrice) > 1.5) {
                    continue;
                }
                if ($in['score_3gw'] <= $out['score_3gw']) {
                    continue;
                }
                $bestIn = $in;
                break;
            }

            if (!$bestIn) {
                continue;
            }

            $usedInIds[] = $bestIn['player']->id;
            $pointsGain = round($bestIn['score_3gw'] - $out['score_3gw'], 2);
            $priceDiff = round((float) $bestIn['player']->price - $outPrice, 1);
            $worthHit = $pointsGain > 4;
            $reason = $this->generateReason($out, $bestIn);

            $suggestions[] = [
                'player_out' => $this->formatPlayer($out),
                'player_in' => $this->formatPlayer($bestIn),
                'points_gain' => $pointsGain,
                'price_diff' => $priceDiff,
                'worth_hit' => $worthHit,
                'reason' => $reason,
            ];
        }

        usort($suggestions, fn ($a, $b) => $b['points_gain'] <=> $a['points_gain']);
        $suggestions = array_slice($suggestions, 0, 10);

        $user->increment('api_calls_today');

        return response()->json([
            'suggestions' => $suggestions,
            'meta' => [
                'gameweek' => $nextGw,
                'players_analyzed' => count($scored),
                'position_filter' => $positionFilter,
                'api_calls_remaining' => max(0, $user->api_limit - $user->api_calls_today),
            ],
        ]);
    }

    /**
     * Load next 3 unfinished fixtures for each team, grouped by team_fpl_id.
     */
    private function loadTeamFixtures(array $teamFplIds): array
    {
        $fixtures = Fixture::with(['homeTeam', 'awayTeam'])
            ->where('finished', false)
            ->where(function ($query) use ($teamFplIds) {
                $query->whereIn('home_team_fpl_id', $teamFplIds)
                      ->orWhereIn('away_team_fpl_id', $teamFplIds);
            })
            ->orderBy('gameweek')
            ->orderBy('kickoff_time')
            ->get();

        $grouped = [];

        foreach ($fixtures as $fixture) {
            if (in_array($fixture->home_team_fpl_id, $teamFplIds)) {
                $teamId = $fixture->home_team_fpl_id;
                if (!isset($grouped[$teamId]) || count($grouped[$teamId]) < 3) {
                    $grouped[$teamId][] = [
                        'is_home' => true,
                        'difficulty' => $fixture->home_difficulty,
                        'opponent_short' => $fixture->awayTeam->short_name ?? '?',
                    ];
                }
            }
            if (in_array($fixture->away_team_fpl_id, $teamFplIds)) {
                $teamId = $fixture->away_team_fpl_id;
                if (!isset($grouped[$teamId]) || count($grouped[$teamId]) < 3) {
                    $grouped[$teamId][] = [
                        'is_home' => false,
                        'difficulty' => $fixture->away_difficulty,
                        'opponent_short' => $fixture->homeTeam->short_name ?? '?',
                    ];
                }
            }
        }

        return $grouped;
    }

    /**
     * Fallback heuristic scoring when no ML predictions are cached.
     */
    private function computeHeuristicScore(float $form, array $fixtures): float
    {
        if (empty($fixtures)) {
            return $form * 3;
        }

        $score = 0;
        foreach ($fixtures as $f) {
            $multiplier = match (true) {
                $f['difficulty'] <= 2 => 1.2,
                $f['difficulty'] >= 4 => 0.8,
                default => 1.0,
            };
            $score += $form * $multiplier;
        }

        if (count($fixtures) < 3) {
            $avgPerGw = $score / count($fixtures);
            $score = $avgPerGw * 3;
        }

        return $score;
    }

    /**
     * Format a scored player entry for the response.
     */
    private function formatPlayer(array $entry): array
    {
        $player = $entry['player'];
        return [
            'id' => $player->id,
            'fpl_id' => $player->fpl_id,
            'web_name' => $player->web_name,
            'position' => $player->position,
            'price' => $player->price,
            'form' => $player->form,
            'total_points' => $player->total_points,
            'selected_by_percent' => $player->selected_by_percent,
            'team' => $player->team ? [
                'name' => $player->team->name,
                'short_name' => $player->team->short_name,
            ] : null,
            'score_3gw' => $entry['score_3gw'],
            'fixtures' => $entry['fixtures'],
        ];
    }

    /**
     * Generate a human-readable reasoning string.
     */
    private function generateReason(array $out, array $in): string
    {
        $parts = [];

        $outAvgDiff = $this->avgDifficulty($out['fixtures']);
        $inAvgDiff = $this->avgDifficulty($in['fixtures']);

        if ($inAvgDiff < $outAvgDiff - 0.5) {
            $inFixtureNames = implode(', ', array_map(fn ($f) => $f['opponent_short'], $in['fixtures']));
            $parts[] = "easier fixtures ({$inFixtureNames})";
        }

        $outForm = (float) $out['player']->form;
        $inForm = (float) $in['player']->form;
        if ($inForm > $outForm + 1) {
            $parts[] = "much better form ({$inForm} vs {$outForm})";
        } elseif ($inForm > $outForm) {
            $parts[] = "better form ({$inForm} vs {$outForm})";
        }

        $priceDiff = (float) $out['player']->price - (float) $in['player']->price;
        if ($priceDiff > 0.5) {
            $parts[] = "saves £" . round($priceDiff, 1) . "m";
        }

        if (empty($parts)) {
            $parts[] = "higher predicted points over next 3 gameweeks";
        }

        $inName = $in['player']->web_name;
        return "{$inName} has " . implode(' and ', $parts);
    }

    private function avgDifficulty(array $fixtures): float
    {
        if (empty($fixtures)) {
            return 3.0;
        }
        return array_sum(array_column($fixtures, 'difficulty')) / count($fixtures);
    }
}
