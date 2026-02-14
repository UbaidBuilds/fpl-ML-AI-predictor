"use client";

import { useQuery } from "@tanstack/react-query";
import { fixtureApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import type { PlayerFixture } from "@/lib/types";

function getDifficultyClasses(difficulty: number): string {
  if (difficulty <= 2) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (difficulty === 3) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-rose-500/20 text-rose-300 border-rose-500/30";
}

interface FixtureTickerProps {
  playerId: number;
}

export function FixtureTicker({ playerId }: FixtureTickerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["playerFixtures", playerId],
    queryFn: () => fixtureApi.getPlayerFixtures(playerId),
    enabled: !!playerId,
  });

  if (isLoading) {
    return (
      <Card className="p-6 bg-[#111827] border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  const fixtures: PlayerFixture[] = data?.data.fixtures ?? [];

  if (fixtures.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-[#111827] border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-slate-400" />
        <h3 className="font-bold text-white">Upcoming Fixtures</h3>
      </div>
      <div className="overflow-x-auto">
      <div className="grid grid-cols-5 gap-2 min-w-[300px]">
        {fixtures.map((fixture) => (
          <div
            key={fixture.id}
            className={`rounded-lg border p-2 text-center ${getDifficultyClasses(fixture.difficulty)}`}
          >
            <div className="text-xs font-medium opacity-70 mb-1">
              GW{fixture.gameweek}
            </div>
            <div className="text-sm font-bold">
              {fixture.opponent.short_name}
            </div>
            <div className="text-xs font-medium">
              ({fixture.is_home ? "H" : "A"})
            </div>
          </div>
        ))}
      </div>
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/40" />
          Easy
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/40" />
          Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500/40" />
          Hard
        </span>
      </div>
    </Card>
  );
}
