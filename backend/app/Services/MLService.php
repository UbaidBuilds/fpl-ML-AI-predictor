<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MLService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.ml.url'), '/');
    }

    public function predict(int $playerId, array $features): array
    {
        $response = Http::timeout(10)->post("{$this->baseUrl}/predict", [
            'player_id' => $playerId,
            'features' => $features,
        ]);

        if ($response->failed()) {
            throw new \RuntimeException('ML service prediction failed: ' . $response->body());
        }

        return $response->json();
    }

    public function predictBatch(array $players): array
    {
        $response = Http::timeout(60)->post("{$this->baseUrl}/predict/batch", [
            'players' => $players,
        ]);

        if ($response->failed()) {
            throw new \RuntimeException('ML batch prediction failed: ' . $response->body());
        }

        return $response->json()['predictions'];
    }

    public function healthCheck(): array
    {
        $response = Http::timeout(5)->get("{$this->baseUrl}/health");

        if ($response->failed()) {
            return ['status' => 'unreachable', 'model_loaded' => false];
        }

        return $response->json();
    }
}
