<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Player::with('team');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('web_name', 'ilike', "%{$search}%");
            });
        }

        if ($position = $request->query('position')) {
            $query->where('position', strtoupper($position));
        }

        if ($teamId = $request->query('team')) {
            $query->where('team_fpl_id', $teamId);
        }

        $sortBy = $request->query('sort', 'total_points');
        $sortDir = $request->query('dir', 'desc');
        $allowed = ['total_points', 'price', 'form', 'name'];

        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $players = $query->paginate($request->query('per_page', 25));

        return response()->json($players);
    }

    public function show(int $id): JsonResponse
    {
        $player = Player::with(['team', 'predictions' => function ($q) {
            $q->orderByDesc('gameweek')->limit(5);
        }])->findOrFail($id);

        return response()->json($player);
    }
}
