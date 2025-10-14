<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// FPL data pipeline: fetch data → compute predictions daily
Schedule::command('fpl:fetch')->daily()->at('05:00');
Schedule::command('fpl:fetch-fixtures')->daily()->at('05:05');
Schedule::command('fpl:fetch-gw-stats')->daily()->at('05:10');
Schedule::command('fpl:generate-predictions')->daily()->at('05:20');
