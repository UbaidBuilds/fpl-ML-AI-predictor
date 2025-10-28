<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'fpl_team_id',
        'subscription_tier',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'subscription_expires' => 'datetime',
        ];
    }

    public function canViewPredictions(): bool
    {
        if ($this->subscription_tier === 'premium') {
            return $this->subscription_expires === null || $this->subscription_expires->isFuture();
        }

        return !$this->hasExceededRateLimit();
    }

    public function hasExceededRateLimit(): bool
    {
        return $this->api_calls_today >= $this->api_limit;
    }
}
