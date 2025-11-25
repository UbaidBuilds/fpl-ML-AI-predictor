<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Prediction extends Model
{
    protected $fillable = [
        'player_id',
        'gameweek',
        'predicted_points',
        'confidence',
        'features',
    ];

    protected function casts(): array
    {
        return [
            'predicted_points' => 'decimal:2',
            'confidence' => 'decimal:2',
            'features' => 'array',
        ];
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }
}
