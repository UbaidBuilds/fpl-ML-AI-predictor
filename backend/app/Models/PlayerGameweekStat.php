<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerGameweekStat extends Model
{
    protected $fillable = [
        'player_fpl_id',
        'gameweek',
        'total_points',
        'minutes',
        'goals_scored',
        'assists',
        'clean_sheets',
        'saves',
        'bonus',
        'bps',
        'expected_goals',
        'expected_assists',
        'expected_goal_involvements',
        'expected_goals_conceded',
        'ict_index',
        'influence',
        'creativity',
        'threat',
        'yellow_cards',
        'red_cards',
        'starts',
    ];

    protected function casts(): array
    {
        return [
            'gameweek' => 'integer',
            'total_points' => 'integer',
            'minutes' => 'integer',
            'goals_scored' => 'integer',
            'assists' => 'integer',
            'clean_sheets' => 'integer',
            'saves' => 'integer',
            'bonus' => 'integer',
            'bps' => 'integer',
            'expected_goals' => 'decimal:2',
            'expected_assists' => 'decimal:2',
            'expected_goal_involvements' => 'decimal:2',
            'expected_goals_conceded' => 'decimal:2',
            'ict_index' => 'decimal:1',
            'influence' => 'decimal:1',
            'creativity' => 'decimal:1',
            'threat' => 'decimal:1',
            'yellow_cards' => 'integer',
            'red_cards' => 'integer',
            'starts' => 'integer',
        ];
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player_fpl_id', 'fpl_id');
    }
}
