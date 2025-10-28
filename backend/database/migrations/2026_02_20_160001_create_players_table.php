<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('fpl_id')->unique();
            $table->string('name');
            $table->string('web_name');
            $table->unsignedInteger('team_fpl_id');
            $table->string('position', 3);
            $table->decimal('price', 4, 1);
            $table->integer('total_points')->default(0);
            $table->decimal('form', 4, 1)->default(0);
            $table->string('status', 1)->default('a');
            $table->timestamps();

            $table->foreign('team_fpl_id')->references('fpl_id')->on('teams');
            $table->index('position');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};
