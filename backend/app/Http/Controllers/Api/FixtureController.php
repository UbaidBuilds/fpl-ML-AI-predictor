<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fixture;
use App\Models\Player;
use App\Services\FplApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FixtureController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $gameweek = $request->query('gameweek');

        if (!$gameweek) {
            $fplApi = new FplApiService();
            $gameweek = $fplApi->getCurrentGameweek();
        }

        $fixtures = Fixture::with(['homeTeam', 'awayTeam'])
            ->where('gameweek', (int) $gameweek)
            ->orderBy('kickoff_time')
            ->get();

        return response()->json([
            'gameweek' => (int) $gameweek,
            'fixtures' => $fixtures,
        ]);
    }

    public function playerFixtures(int $id): JsonResponse
    {
        $player = Player::findOrFail($id);
        $teamFplId = $player->team_fpl_id;

        $fixtures = Fixture::with(['homeTeam', 'awayTeam'])
            ->where('finished', false)
            ->where(function ($query) use ($teamFplId) {
                $query->where('home_team_fpl_id', $teamFplId)
                      ->orWhere('away_team_fpl_id', $teamFplId);
            })
            ->orderBy('gameweek')
            ->orderBy('kickoff_time')
            ->limit(5)
            ->get()
            ->map(function ($fixture) use ($teamFplId) {
                $isHome = $fixture->home_team_fpl_id === $teamFplId;
                return [
                    'id'           => $fixture->id,
                    'gameweek'     => $fixture->gameweek,
                    'kickoff_time' => $fixture->kickoff_time,
                    'is_home'      => $isHome,
                    'opponent'     => $isHome
                        ? $fixture->awayTeam
                        : $fixture->homeTeam,
                    'difficulty'   => $isHome
                        ? $fixture->home_difficulty
                        : $fixture->away_difficulty,
                    'finished'     => $fixture->finished,
                ];
            });

        return response()->json([
            'player_id'   => $player->id,
            'team_fpl_id' => $teamFplId,
            'fixtures'    => $fixtures,
        ]);
    }
}
