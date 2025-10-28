<?php

namespace App\Console\Commands;

use App\Models\Fixture;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class FetchFixtures extends Command
{
    protected $signature = 'fpl:fetch-fixtures';
    protected $description = 'Fetch all fixtures from the official FPL API';

    private const FPL_FIXTURES_API = 'https://fantasy.premierleague.com/api/fixtures/';

    public function handle(): int
    {
        $this->info('Fetching fixtures from FPL API...');

        $response = Http::timeout(30)->get(self::FPL_FIXTURES_API);

        if ($response->failed()) {
            $this->error('Failed to fetch fixtures: ' . $response->status());
            return self::FAILURE;
        }

        $fixtures = $response->json();
        $count = 0;

        foreach ($fixtures as $fixture) {
            if (empty($fixture['event'])) {
                continue;
            }

            Fixture::updateOrCreate(
                ['fpl_id' => $fixture['id']],
                [
                    'gameweek'          => $fixture['event'],
                    'home_team_fpl_id'  => $fixture['team_h'],
                    'away_team_fpl_id'  => $fixture['team_a'],
                    'kickoff_time'      => $fixture['kickoff_time'],
                    'home_score'        => $fixture['team_h_score'],
                    'away_score'        => $fixture['team_a_score'],
                    'home_difficulty'   => $fixture['team_h_difficulty'] ?? 0,
                    'away_difficulty'   => $fixture['team_a_difficulty'] ?? 0,
                    'finished'          => $fixture['finished'] ?? false,
                ]
            );
            $count++;
        }

        $this->info("Upserted {$count} fixtures.");
        $this->info('Fixture fetch complete!');

        return self::SUCCESS;
    }
}
