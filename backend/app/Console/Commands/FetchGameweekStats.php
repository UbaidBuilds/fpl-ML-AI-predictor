<?php

namespace App\Console\Commands;

use App\Models\PlayerGameweekStat;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class FetchGameweekStats extends Command
{
    protected $signature = 'fpl:fetch-gw-stats {--gameweek= : Specific GW to fetch (fetches all completed if omitted)}';
    protected $description = 'Fetch per-gameweek player stats from the FPL live endpoint';

    private const FPL_API = 'https://fantasy.premierleague.com/api';

    public function handle(): int
    {
        $specificGw = $this->option('gameweek');

        if ($specificGw) {
            $gameweeks = [(int) $specificGw];
        } else {
            $gameweeks = $this->getCompletedGameweeks();
            if (empty($gameweeks)) {
                $this->info('No completed gameweeks found.');
                return self::SUCCESS;
            }

            // Skip GWs already fully stored
            $storedGws = PlayerGameweekStat::select('gameweek')
                ->distinct()
                ->pluck('gameweek')
                ->toArray();

            $gameweeks = array_values(array_diff($gameweeks, $storedGws));

            if (empty($gameweeks)) {
                $this->info('All completed gameweeks already stored.');
                return self::SUCCESS;
            }
        }

        $this->info('Fetching stats for ' . count($gameweeks) . ' gameweek(s)...');
        $bar = $this->output->createProgressBar(count($gameweeks));
        $bar->start();

        $totalRows = 0;

        foreach ($gameweeks as $gw) {
            $count = $this->fetchGameweek($gw);
            if ($count === false) {
                $this->newLine();
                $this->error("Failed to fetch GW {$gw}, skipping.");
            } else {
                $totalRows += $count;
            }

            $bar->advance();

            // Rate limit: 0.5s between requests
            if ($gw !== end($gameweeks)) {
                usleep(500000);
            }
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Done! Upserted {$totalRows} player-gameweek rows.");

        return self::SUCCESS;
    }

    private function getCompletedGameweeks(): array
    {
        $response = Http::timeout(30)->get(self::FPL_API . '/bootstrap-static/');

        if ($response->failed()) {
            $this->error('Failed to fetch bootstrap data: ' . $response->status());
            return [];
        }

        $events = $response->json('events') ?? [];
        $completed = [];

        foreach ($events as $event) {
            if ($event['finished'] === true) {
                $completed[] = (int) $event['id'];
            }
        }

        return $completed;
    }

    /**
     * Fetch all player stats for a single gameweek from the live endpoint.
     *
     * @return int|false Number of rows upserted, or false on failure
     */
    private function fetchGameweek(int $gw): int|false
    {
        $response = Http::timeout(30)->get(self::FPL_API . "/event/{$gw}/live/");

        if ($response->failed()) {
            return false;
        }

        $elements = $response->json('elements') ?? [];
        $count = 0;

        foreach ($elements as $element) {
            $stats = $element['stats'] ?? [];
            $fplId = $element['id'] ?? null;

            if (!$fplId || empty($stats)) {
                continue;
            }

            PlayerGameweekStat::updateOrCreate(
                [
                    'player_fpl_id' => $fplId,
                    'gameweek' => $gw,
                ],
                [
                    'total_points' => $stats['total_points'] ?? 0,
                    'minutes' => $stats['minutes'] ?? 0,
                    'goals_scored' => $stats['goals_scored'] ?? 0,
                    'assists' => $stats['assists'] ?? 0,
                    'clean_sheets' => $stats['clean_sheets'] ?? 0,
                    'saves' => $stats['saves'] ?? 0,
                    'bonus' => $stats['bonus'] ?? 0,
                    'bps' => $stats['bps'] ?? 0,
                    'expected_goals' => (float) ($stats['expected_goals'] ?? 0),
                    'expected_assists' => (float) ($stats['expected_assists'] ?? 0),
                    'expected_goal_involvements' => (float) ($stats['expected_goal_involvements'] ?? 0),
                    'expected_goals_conceded' => (float) ($stats['expected_goals_conceded'] ?? 0),
                    'ict_index' => (float) ($stats['ict_index'] ?? 0),
                    'influence' => (float) ($stats['influence'] ?? 0),
                    'creativity' => (float) ($stats['creativity'] ?? 0),
                    'threat' => (float) ($stats['threat'] ?? 0),
                    'yellow_cards' => $stats['yellow_cards'] ?? 0,
                    'red_cards' => $stats['red_cards'] ?? 0,
                    'starts' => $stats['starts'] ?? 0,
                ]
            );
            $count++;
        }

        return $count;
    }
}
