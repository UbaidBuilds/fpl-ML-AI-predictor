"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fixtureApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { MetricTooltip, METRIC_EXPLANATIONS } from "@/components/MetricTooltip";
import { DIFFICULTY_COLORS } from "@/lib/constants";
import type { FixtureItem } from "@/lib/types";

function getDifficultyColor(difficulty: number): string {
  if (difficulty <= 2) return "bg-green-500";
  if (difficulty === 3) return "bg-yellow-500";
  return "bg-red-500";
}

export default function FixturesPage() {
  const [gameweek, setGameweek] = useState<number | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["fixtures", gameweek],
    queryFn: () => fixtureApi.getByGameweek(gameweek),
  });

  const currentGW = data?.data.gameweek ?? gameweek ?? 1;
  const fixtures: FixtureItem[] = data?.data.fixtures ?? [];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Calendar className="w-12 h-12 text-[#00FF87] mx-auto mb-4" />
          <h1 className="text-4xl font-black text-white mb-2">Fixtures</h1>
          <p className="text-slate-400">
            Premier League fixtures with difficulty ratings
          </p>
        </div>

        {/* Gameweek Navigation */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGameweek(Math.max(1, currentGW - 1))}
            disabled={currentGW <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xl font-bold text-white min-w-[160px] text-center">
            Gameweek {currentGW}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGameweek(Math.min(38, currentGW + 1))}
            disabled={currentGW >= 38}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-8 text-sm text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Easy (1-2)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            Medium (3)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            Hard (4-5)
          </span>
          <MetricTooltip explanation={METRIC_EXPLANATIONS.fixtureDifficulty} />
        </div>

        {/* Fixtures List */}
        {isLoading ? (
          <div className="max-w-2xl mx-auto space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : fixtures.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No fixtures found"
            description="No fixtures are available for this gameweek."
          />
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {fixtures.map((fixture) => (
              <Card key={fixture.id} className="p-4 bg-[#111827] border-white/10">
                <div className="flex items-center gap-3">
                  {/* Home team */}
                  <div className="flex-1 text-right">
                    <div className="font-bold text-white">
                      {fixture.home_team.short_name}
                    </div>
                    <div className="text-xs text-slate-500 hidden sm:block">
                      {fixture.home_team.name}
                    </div>
                  </div>

                  {/* Home difficulty dot */}
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${getDifficultyColor(fixture.home_difficulty)}`}
                    title={`Home difficulty: ${fixture.home_difficulty}`}
                  />

                  {/* Score or kickoff time */}
                  <div className="w-24 text-center flex-shrink-0">
                    {fixture.finished ? (
                      <span className="text-lg font-bold text-white">
                        {fixture.home_score} - {fixture.away_score}
                      </span>
                    ) : fixture.kickoff_time ? (
                      <div>
                        <div className="text-xs text-slate-500">
                          {format(new Date(fixture.kickoff_time), "EEE d MMM")}
                        </div>
                        <div className="text-xs text-slate-500">
                          {format(new Date(fixture.kickoff_time), "HH:mm")}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">TBD</span>
                    )}
                  </div>

                  {/* Away difficulty dot */}
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${getDifficultyColor(fixture.away_difficulty)}`}
                    title={`Away difficulty: ${fixture.away_difficulty}`}
                  />

                  {/* Away team */}
                  <div className="flex-1 text-left">
                    <div className="font-bold text-white">
                      {fixture.away_team.short_name}
                    </div>
                    <div className="text-xs text-slate-500 hidden sm:block">
                      {fixture.away_team.name}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
