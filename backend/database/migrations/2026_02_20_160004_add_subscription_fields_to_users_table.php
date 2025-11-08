<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('fpl_team_id')->nullable()->after('email');
            $table->string('subscription_tier', 10)->default('free')->after('fpl_team_id');
            $table->timestamp('subscription_expires')->nullable()->after('subscription_tier');
            $table->unsignedInteger('api_calls_today')->default(0)->after('subscription_expires');
            $table->unsignedInteger('api_limit')->default(50)->after('api_calls_today');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'fpl_team_id',
                'subscription_tier',
                'subscription_expires',
                'api_calls_today',
                'api_limit',
            ]);
        });
    }
};
