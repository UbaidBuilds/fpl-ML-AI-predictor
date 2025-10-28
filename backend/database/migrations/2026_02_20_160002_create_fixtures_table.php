<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fixtures', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('fpl_id')->unique();
            $table->unsignedSmallInteger('gameweek');
            $table->unsignedInteger('home_team_fpl_id');
            $table->unsignedInteger('away_team_fpl_id');
            $table->timestamp('kickoff_time')->nullable();
            $table->unsignedSmallInteger('home_score')->nullable();
            $table->unsignedSmallInteger('away_score')->nullable();
            $table->unsignedSmallInteger('home_difficulty')->default(0);
            $table->unsignedSmallInteger('away_difficulty')->default(0);
            $table->boolean('finished')->default(false);
            $table->timestamps();

            $table->foreign('home_team_fpl_id')->references('fpl_id')->on('teams');
            $table->foreign('away_team_fpl_id')->references('fpl_id')->on('teams');
            $table->index('gameweek');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fixtures');
    }
};
