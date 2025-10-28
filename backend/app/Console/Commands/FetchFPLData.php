<?php

namespace App\Console\Commands;

use App\Models\Player;
use App\Models\Team;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class FetchFPLData extends Command
{
    protected $signature = 'fpl:fetch';
    protected $description = 'Fetch current FPL data (teams + players) from the official API';

    private const FPL_API = 'https://fantasy.premierleague.com/api/bootstrap-static/';

    private const POSITION_MAP = [
        1 => 'GKP',
        2 => 'DEF',
        3 => 'MID',
        4 => 'FWD',
    ];

    public function handle(): int
    {
        $this->info('Fetching data from FPL API...');

        $response = Http::timeout(30)->get(self::FPL_API);

        if ($response->failed()) {
            $this->error('Failed to fetch FPL data: ' . $response->status());
            return self::FAILURE;
        }

        $data = $response->json();

        // Upsert teams
        $teams = $data['teams'] ?? [];
        $this->info('Processing ' . count($teams) . ' teams...');

        foreach ($teams as $team) {
            Team::updateOrCreate(
                ['fpl_id' => $team['id']],
                [
                    'name' => $team['name'],
                    'short_name' => $team['short_name'],
                    'strength' => $team['strength'],
                ]
            );
        }

        $teamCount = count($teams);
        $this->info("Upserted {$teamCount} teams.");

        // Upsert players
        $players = $data['elements'] ?? [];
        $playerCount = 0;

        foreach ($players as $player) {
            Player::updateOrCreate(
                ['fpl_id' => $player['id']],
                [
                    'name' => $player['first_name'] . ' ' . $player['second_name'],
                    'web_name' => $player['web_name'],
                    'team_fpl_id' => $player['team'],
                    'position' => self::POSITION_MAP[$player['element_type']] ?? 'MID',
                    'price' => $player['now_cost'] / 10,
                    'total_points' => $player['total_points'],
                    'form' => (float) $player['form'],
                    'status' => $player['status'],
                    'selected_by_percent' => (float) ($player['selected_by_percent'] ?? 0),
                ]
            );
            $playerCount++;
        }

        $this->info("Upserted {$playerCount} players.");
        $this->info('FPL data fetch complete!');

        return self::SUCCESS;
    }
}
