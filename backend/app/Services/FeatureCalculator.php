<?php

namespace App\Services;

use App\Models\Fixture;
use App\Models\Player;
use App\Models\PlayerGameweekStat;
use Illuminate\Support\Collection;

class FeatureCalculator
{
    private const POSITION_MAP = ['GKP' => 1, 'DEF' => 2, 'MID' => 3, 'FWD' => 4];

    /**
     * Calculate ML features for a single player targeting a specific gameweek.
     *
     * @return float[]|null 19-feature array, or null if player has no fixture (blank GW)
     */
    public function calculateFeatures(int $playerFplId, int $targetGameweek): ?array
    {
        $player = Player::where('fpl_id', $playerFplId)->first();
        if (!$player) {
            return null;
        }

        // Look up fixture to determine home/away + difficulty
        $fixture = Fixture::where('gameweek', $targetGameweek)
            ->where(function ($q) use ($player) {
                $q->where('home_team_fpl_id', $player->team_fpl_id)
                  ->orWhere('away_team_fpl_id', $player->team_fpl_id);
            })
            ->first();

        if (!$fixture) {
            return null; // Blank gameweek
        }

        $isHome = $fixture->home_team_fpl_id === $player->team_fpl_id;
        $difficulty = $isHome ? (int) $fixture->home_difficulty : (int) $fixture->away_difficulty;

        // Fetch last 5 GW stats (need 5 for points_last_5, minutes_last_5)
        $recentStats = PlayerGameweekStat::where('player_fpl_id', $playerFplId)
            ->where('gameweek', '<', $targetGameweek)
            ->orderByDesc('gameweek')
            ->limit(5)
            ->get();

        return $this->buildFeatureArray($player, $recentStats, $isHome, $difficulty);
    }

    /**
     * Calculate features for many players in batch (efficient for bulk prediction).
     *
     * @param Collection<Player> $players
     * @return array<int, float[]> Map of fpl_id => 19-feature array (missing = blank GW)
     */
    public function calculateBatch(Collection $players, int $targetGameweek): array
    {
        $fplIds = $players->pluck('fpl_id')->toArray();
        $teamFplIds = $players->pluck('team_fpl_id')->unique()->toArray();

        // Single query: all fixtures for targetGameweek involving these teams
        $fixtures = Fixture::where('gameweek', $targetGameweek)
            ->where(function ($q) use ($teamFplIds) {
                $q->whereIn('home_team_fpl_id', $teamFplIds)
                  ->orWhereIn('away_team_fpl_id', $teamFplIds);
            })
            ->get();

        // Build team → [isHome, difficulty] map
        $fixtureMap = [];
        foreach ($fixtures as $fixture) {
            $fixtureMap[$fixture->home_team_fpl_id] = [
                'is_home' => true,
                'difficulty' => (int) $fixture->home_difficulty,
            ];
            $fixtureMap[$fixture->away_team_fpl_id] = [
                'is_home' => false,
                'difficulty' => (int) $fixture->away_difficulty,
            ];
        }

        // Single query: last 5 GW stats for all players
        $minGw = max(1, $targetGameweek - 5);
        $allStats = PlayerGameweekStat::whereIn('player_fpl_id', $fplIds)
            ->where('gameweek', '<', $targetGameweek)
            ->where('gameweek', '>=', $minGw)
            ->orderByDesc('gameweek')
            ->get()
            ->groupBy('player_fpl_id');

        $result = [];

        foreach ($players as $player) {
            // Skip if team has no fixture this GW
            if (!array_key_exists($player->team_fpl_id, $fixtureMap)) {
                continue;
            }

            $fixtureInfo = $fixtureMap[$player->team_fpl_id];
            $stats = $allStats->get($player->fpl_id, collect());

            $result[$player->fpl_id] = $this->buildFeatureArray(
                $player,
                $stats,
                $fixtureInfo['is_home'],
                $fixtureInfo['difficulty']
            );
        }

        return $result;
    }

    /**
     * Build the 19-feature array from player data and recent stats.
     *
     * Feature order (must match ML model exactly):
     *   0:  points_last_3        (avg total_points of last 3 GWs)
     *   1:  minutes_last_3       (avg minutes of last 3 GWs)
     *   2:  goals_last_3         (sum goals of last 3 GWs)
     *   3:  assists_last_3       (sum assists of last 3 GWs)
     *   4:  points_last_gw       (total_points of most recent GW)
     *   5:  minutes_last_gw      (minutes of most recent GW)
     *   6:  home_game            (1.0 = home, 0.0 = away)
     *   7:  position             (1=GKP, 2=DEF, 3=MID, 4=FWD)
     *   8:  price
     *   9:  form                 (weighted: 0.5*gw-1 + 0.3*gw-2 + 0.2*gw-3)
     *   10: xg_last_3            (avg expected_goals of last 3 GWs)
     *   11: xa_last_3            (avg expected_assists of last 3 GWs)
     *   12: xgi_last_3           (avg expected_goal_involvements of last 3 GWs)
     *   13: ict_last_3           (avg ict_index of last 3 GWs)
     *   14: points_last_5        (avg total_points of last 5 GWs)
     *   15: minutes_last_5       (avg minutes of last 5 GWs)
     *   16: opponent_difficulty   (FDR 1-5)
     *   17: starts_last_3        (sum starts of last 3 GWs)
     *   18: clean_sheets_last_3  (sum clean_sheets of last 3 GWs)
     */
    private function buildFeatureArray(Player $player, Collection $recentStats, bool $isHome, int $difficulty = 3): array
    {
        $positionNum = self::POSITION_MAP[$player->position] ?? 3;

        if ($recentStats->isEmpty()) {
            // Fallback: use FPL form + position-aware defaults for advanced stats.
            // These approximate league averages per position per game to avoid
            // the train-test mismatch that occurs when all features are zero.
            $form = (float) $player->form;
            $posDefaults = [
                1 => ['xg' => 0.0,  'xa' => 0.01, 'xgi' => 0.01, 'ict' => 5.0,  'starts' => 0.8, 'cs' => 0.3],
                2 => ['xg' => 0.03, 'xa' => 0.04, 'xgi' => 0.07, 'ict' => 8.0,  'starts' => 0.7, 'cs' => 0.3],
                3 => ['xg' => 0.08, 'xa' => 0.08, 'xgi' => 0.16, 'ict' => 15.0, 'starts' => 0.7, 'cs' => 0.1],
                4 => ['xg' => 0.15, 'xa' => 0.05, 'xgi' => 0.20, 'ict' => 12.0, 'starts' => 0.6, 'cs' => 0.0],
            ];
            $defaults = $posDefaults[$positionNum] ?? $posDefaults[3];

            return [
                $form,                // points_last_3
                90.0,                 // minutes_last_3
                0.0,                  // goals_last_3
                0.0,                  // assists_last_3
                $form,                // points_last_gw
                90.0,                 // minutes_last_gw
                $isHome ? 1.0 : 0.0,
                (float) $positionNum,
                (float) $player->price,
                $form,                // form
                $defaults['xg'],      // xg_last_3
                $defaults['xa'],      // xa_last_3
                $defaults['xgi'],     // xgi_last_3
                $defaults['ict'],     // ict_last_3
                $form,                // points_last_5
                90.0,                 // minutes_last_5
                (float) $difficulty,  // opponent_difficulty
                $defaults['starts'],  // starts_last_3
                $defaults['cs'],      // clean_sheets_last_3
            ];
        }

        // Split stats: last 3 for 3-GW features, all (up to 5) for 5-GW features
        $last3 = $recentStats->take(3);
        $last5 = $recentStats->take(5);

        // --- Original 10 features ---
        $pointsLast3 = $last3->avg('total_points');
        $minutesLast3 = $last3->avg('minutes');
        $goalsLast3 = $last3->sum('goals_scored');
        $assistsLast3 = $last3->sum('assists');

        $latest = $recentStats->first();
        $pointsLastGw = (float) $latest->total_points;
        $minutesLastGw = (float) $latest->minutes;

        // Weighted form: 50% most recent, 30% second, 20% third
        $weights = [0.5, 0.3, 0.2];
        $weightedForm = 0.0;
        $totalWeight = 0.0;
        foreach ($last3->values() as $i => $stat) {
            $weightedForm += $weights[$i] * (float) $stat->total_points;
            $totalWeight += $weights[$i];
        }
        $form = $totalWeight > 0 ? $weightedForm / $totalWeight : (float) $player->form;

        // --- New Phase 2 features ---
        $xgLast3 = $last3->avg('expected_goals') ?? 0.0;
        $xaLast3 = $last3->avg('expected_assists') ?? 0.0;
        $xgiLast3 = $last3->avg('expected_goal_involvements') ?? 0.0;
        $ictLast3 = $last3->avg('ict_index') ?? 0.0;

        $pointsLast5 = $last5->avg('total_points');
        $minutesLast5 = $last5->avg('minutes');

        $startsLast3 = $last3->sum('starts');
        $cleanSheetsLast3 = $last3->sum('clean_sheets');

        return [
            round($pointsLast3, 2),
            round($minutesLast3, 2),
            (float) $goalsLast3,
            (float) $assistsLast3,
            $pointsLastGw,
            $minutesLastGw,
            $isHome ? 1.0 : 0.0,
            (float) $positionNum,
            (float) $player->price,
            round($form, 2),
            round((float) $xgLast3, 2),
            round((float) $xaLast3, 2),
            round((float) $xgiLast3, 2),
            round((float) $ictLast3, 2),
            round($pointsLast5, 2),
            round($minutesLast5, 2),
            (float) $difficulty,
            (float) $startsLast3,
            (float) $cleanSheetsLast3,
        ];
    }
}
