<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Player extends Model
{
    protected $fillable = [
        'fpl_id',
        'name',
        'web_name',
        'team_fpl_id',
        'position',
        'price',
        'total_points',
        'form',
        'status',
        'selected_by_percent',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:1',
            'form' => 'decimal:1',
            'selected_by_percent' => 'decimal:1',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_fpl_id', 'fpl_id');
    }

    public function predictions(): HasMany
    {
        return $this->hasMany(Prediction::class);
    }

    public function gameweekStats(): HasMany
    {
        return $this->hasMany(PlayerGameweekStat::class, 'player_fpl_id', 'fpl_id');
    }
}
