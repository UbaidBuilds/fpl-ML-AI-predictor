<?php

namespace App\Console\Commands;

use App\Models\Player;
use App\Models\Prediction;
use App\Services\FeatureCalculator;
use App\Services\FplApiService;
use App\Services\MLService;
use Illuminate\Console\Command;

class GeneratePredictions extends Command
{
    protected $signature = 'fpl:generate-predictions {--gameweeks=3 : Number of upcoming GWs to predict}';
    protected $description = 'Pre-generate ML predictions for all active players';

    public function handle(): int
    {
        $numGws = (int) $this->option('gameweeks');

        try {
            $fplApi = new FplApiService();
            $nextGw = $fplApi->getCurrentGameweek();
        } catch (\Exception $e) {
            $this->error('Failed to determine next gameweek: ' . $e->getMessage());
            return self::FAILURE;
        }

        $players = Player::where('status', '!=', 'u')->get();
        $this->info("Generating predictions for {$players->count()} players across {$numGws} gameweek(s) (GW {$nextGw}-" . ($nextGw + $numGws - 1) . ")...");

        $calculator = new FeatureCalculator();
        $mlService = new MLService();

        $totalGenerated = 0;
        $totalSkipped = 0;
        $totalFailed = 0;

        for ($gw = $nextGw; $gw < $nextGw + $numGws; $gw++) {
            $this->info("Processing GW {$gw}...");

            // Batch-calculate features for all players
            $featureMap = $calculator->calculateBatch($players, $gw);

            // Build batch payload for ML service
            $batchPlayers = [];
            $fplIdToPlayer = [];
            $fplIdToFeatures = [];
            foreach ($featureMap as $fplId => $features) {
                $player = $players->firstWhere('fpl_id', $fplId);
                if (!$player) {
                    $totalSkipped++;
                    continue;
                }
                $batchPlayers[] = ['player_id' => $fplId, 'features' => $features];
                $fplIdToPlayer[$fplId] = $player;
                $fplIdToFeatures[$fplId] = $features;
            }

            // Single batch HTTP call for all players in this GW
            try {
                $results = $mlService->predictBatch($batchPlayers);
            } catch (\Exception $e) {
                $this->error("  Batch prediction failed for GW {$gw}: {$e->getMessage()}");
                $totalFailed += count($batchPlayers);
                continue;
            }

            $bar = $this->output->createProgressBar(count($results));
            $bar->start();

            foreach ($results as $result) {
                $fplId = $result['player_id'];
                $player = $fplIdToPlayer[$fplId] ?? null;
                if (!$player) {
                    $bar->advance();
                    continue;
                }

                Prediction::updateOrCreate(
                    ['player_id' => $player->id, 'gameweek' => $gw],
                    [
                        'predicted_points' => round((float) $result['predicted_points'], 2),
                        'confidence' => round((float) $result['confidence'], 2),
                        'features' => $fplIdToFeatures[$fplId] ?? null,
                    ]
                );
                $totalGenerated++;
                $bar->advance();
            }

            $bar->finish();
            $this->newLine();

            // Players without fixtures this GW (blank GW) get 0 predicted points
            $playersWithFeatures = array_keys($featureMap);
            $blankPlayers = $players->whereNotIn('fpl_id', $playersWithFeatures);

            foreach ($blankPlayers as $player) {
                Prediction::updateOrCreate(
                    ['player_id' => $player->id, 'gameweek' => $gw],
                    [
                        'predicted_points' => 0,
                        'confidence' => 0,
                        'features' => null,
                    ]
                );
                $totalSkipped++;
            }
        }

        $this->newLine();
        $this->info("Done! Generated: {$totalGenerated}, Skipped (blank GW): {$totalSkipped}, Failed: {$totalFailed}");

        return self::SUCCESS;
    }
}
