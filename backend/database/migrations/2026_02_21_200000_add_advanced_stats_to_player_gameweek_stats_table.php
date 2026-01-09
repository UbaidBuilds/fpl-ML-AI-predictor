<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('player_gameweek_stats', function (Blueprint $table) {
            $table->decimal('expected_goals', 5, 2)->default(0);
            $table->decimal('expected_assists', 5, 2)->default(0);
            $table->decimal('expected_goal_involvements', 5, 2)->default(0);
            $table->decimal('expected_goals_conceded', 5, 2)->default(0);
            $table->decimal('ict_index', 6, 1)->default(0);
            $table->decimal('influence', 6, 1)->default(0);
            $table->decimal('creativity', 6, 1)->default(0);
            $table->decimal('threat', 6, 1)->default(0);
            $table->smallInteger('yellow_cards')->default(0);
            $table->smallInteger('red_cards')->default(0);
            $table->smallInteger('starts')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('player_gameweek_stats', function (Blueprint $table) {
            $table->dropColumn([
                'expected_goals', 'expected_assists', 'expected_goal_involvements',
                'expected_goals_conceded', 'ict_index', 'influence', 'creativity',
                'threat', 'yellow_cards', 'red_cards', 'starts',
            ]);
        });
    }
};
