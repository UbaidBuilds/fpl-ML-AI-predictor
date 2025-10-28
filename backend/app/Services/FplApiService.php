<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class FplApiService
{
    private const BASE_URL = 'https://fantasy.premierleague.com/api';

    /**
     * Get the current gameweek number. Cached for 30 minutes.
     */
    public function getCurrentGameweek(): int
    {
        return Cache::remember('fpl_current_gameweek', 1800, function () {
            $response = Http::timeout(30)->get(self::BASE_URL . '/bootstrap-static/');

            if ($response->failed()) {
                throw new \RuntimeException('Failed to fetch FPL bootstrap data: ' . $response->status());
            }

            $events = $response->json('events');

            foreach ($events as $event) {
                if ($event['is_current'] === true) {
                    return (int) $event['id'];
                }
            }

            // Fallback: last finished gameweek
            $lastFinished = collect($events)->where('finished', true)->last();

            return $lastFinished ? (int) $lastFinished['id'] : 1;
        });
    }

    /**
     * Get the next (upcoming) gameweek number. Cached for 30 minutes.
     * Use this to load the latest squad state with pending transfers applied.
     */
    public function getNextGameweek(): int
    {
        return Cache::remember('fpl_next_gameweek', 1800, function () {
            $response = Http::timeout(30)->get(self::BASE_URL . '/bootstrap-static/');

            if ($response->failed()) {
                throw new \RuntimeException('Failed to fetch FPL bootstrap data: ' . $response->status());
            }

            $events = $response->json('events');

            foreach ($events as $event) {
                if ($event['is_next'] === true) {
                    return (int) $event['id'];
                }
            }

            // Fallback: current gameweek
            return $this->getCurrentGameweek();
        });
    }

    /**
     * Fetch FPL team entry info (manager name, rank, etc.).
     */
    public function getTeamEntry(int $teamId): array
    {
        $response = Http::timeout(15)->get(self::BASE_URL . "/entry/{$teamId}/");

        if ($response->failed()) {
            if ($response->status() === 404) {
                throw new \InvalidArgumentException("FPL Team ID {$teamId} not found.");
            }
            throw new \RuntimeException('Failed to fetch FPL team entry: ' . $response->status());
        }

        $data = $response->json();

        return [
            'team_name' => $data['name'] ?? 'Unknown',
            'manager_name' => trim(($data['player_first_name'] ?? '') . ' ' . ($data['player_last_name'] ?? '')),
            'overall_points' => $data['summary_overall_points'] ?? 0,
            'overall_rank' => $data['summary_overall_rank'] ?? null,
        ];
    }

    /**
     * Get the latest available picks for a team.
     * Tries the next gameweek first (shows pending transfers), falls back to current.
     */
    public function getLatestTeamPicks(int $teamId): array
    {
        $nextGw = $this->getNextGameweek();
        try {
            $data = $this->getTeamPicks($teamId, $nextGw);
            return [
                'data' => $data,
                'gameweek' => $nextGw,
                'chip' => $data['active_chip'] ?? null,
            ];
        } catch (\InvalidArgumentException $e) {
            // Next GW picks not available yet, fall back to current
        }

        $currentGw = $this->getCurrentGameweek();
        $data = $this->getTeamPicks($teamId, $currentGw);
        $chip = $data['active_chip'] ?? null;

        // Free Hit squad is temporary — load previous GW for the real team
        if ($chip === 'freehit' && $currentGw > 1) {
            $prevData = $this->getTeamPicks($teamId, $currentGw - 1);
            return [
                'data' => $prevData,
                'gameweek' => $currentGw - 1,
                'chip' => null,
                'free_hit_active' => true,
            ];
        }

        return ['data' => $data, 'gameweek' => $currentGw, 'chip' => $chip];
    }

    /**
     * Fetch all transfers for a team (used to apply pending transfers).
     */
    public function getTeamTransfers(int $teamId): array
    {
        $response = Http::timeout(15)->get(self::BASE_URL . "/entry/{$teamId}/transfers/");
        if ($response->failed()) {
            return [];
        }
        return $response->json() ?? [];
    }

    /**
     * Fetch team history: per-GW summaries and chips used.
     * Used for accurate free transfer estimation.
     */
    public function getTeamHistory(int $teamId): array
    {
        $response = Http::timeout(15)->get(self::BASE_URL . "/entry/{$teamId}/history/");

        if ($response->failed()) {
            return ['current' => [], 'chips' => []];
        }

        return [
            'current' => $response->json('current') ?? [],
            'chips' => $response->json('chips') ?? [],
        ];
    }

    /**
     * Fetch the 15 picks for a team in a given gameweek.
     */
    public function getTeamPicks(int $teamId, int $gameweek): array
    {
        $response = Http::timeout(15)->get(
            self::BASE_URL . "/entry/{$teamId}/event/{$gameweek}/picks/"
        );

        if ($response->failed()) {
            if ($response->status() === 404) {
                throw new \InvalidArgumentException(
                    "Picks not found for team {$teamId} in gameweek {$gameweek}."
                );
            }
            throw new \RuntimeException('Failed to fetch FPL team picks: ' . $response->status());
        }

        return [
            'picks' => $response->json('picks'),
            'entry_history' => $response->json('entry_history'),
            'active_chip' => $response->json('active_chip'),
        ];
    }
}
