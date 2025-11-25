<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('predictions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->unsignedSmallInteger('gameweek');
            $table->decimal('predicted_points', 5, 2);
            $table->decimal('confidence', 3, 2);
            $table->json('features')->nullable();
            $table->timestamps();

            $table->unique(['player_id', 'gameweek']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('predictions');
    }
};
