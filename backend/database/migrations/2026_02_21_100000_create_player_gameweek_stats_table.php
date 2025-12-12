<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_gameweek_stats', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('player_fpl_id');
            $table->unsignedSmallInteger('gameweek');
            $table->integer('total_points')->default(0);
            $table->unsignedSmallInteger('minutes')->default(0);
            $table->unsignedSmallInteger('goals_scored')->default(0);
            $table->unsignedSmallInteger('assists')->default(0);
            $table->unsignedSmallInteger('clean_sheets')->default(0);
            $table->unsignedSmallInteger('saves')->default(0);
            $table->unsignedSmallInteger('bonus')->default(0);
            $table->integer('bps')->default(0);
            $table->timestamps();

            $table->unique(['player_fpl_id', 'gameweek']);
            $table->index('player_fpl_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_gameweek_stats');
    }
};
