<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    protected $fillable = [
        'fpl_id',
        'name',
        'short_name',
        'strength',
    ];

    public function players(): HasMany
    {
        return $this->hasMany(Player::class, 'team_fpl_id', 'fpl_id');
    }
}
