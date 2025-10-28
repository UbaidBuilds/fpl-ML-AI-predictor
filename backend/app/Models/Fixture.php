<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fixture extends Model
{
    protected $fillable = [
        'fpl_id',
        'gameweek',
        'home_team_fpl_id',
        'away_team_fpl_id',
        'kickoff_time',
        'home_score',
        'away_score',
        'home_difficulty',
        'away_difficulty',
        'finished',
    ];

    protected function casts(): array
    {
        return [
            'kickoff_time' => 'datetime',
            'finished' => 'boolean',
        ];
    }

    public function homeTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'home_team_fpl_id', 'fpl_id');
    }

    public function awayTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'away_team_fpl_id', 'fpl_id');
    }
}
