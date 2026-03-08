"use client";

import { Crown, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { POSITION_COLORS, DIFFICULTY_COLORS } from "@/lib/constants";
import type { MyTeamSquadEntry } from "@/lib/types";

const positionLetters: Record<string, string> = {
  GKP: "G",
  DEF: "D",
  MID: "M",
  FWD: "F",
};

interface CaptainCardProps {
  entry: MyTeamSquadEntry;
  rank: number;
  multiplier: 2 | 3;
  isCurrentCaptain: boolean;
}

export function CaptainCard({
  entry,
  rank,
  multiplier,
  isCurrentCaptain,
}: CaptainCardProps) {
  const { player, prediction, next_fixture } = entry;
  const captainPoints = prediction.predicted_points * multiplier;

  const cardStyles =
    rank === 1
      ? "border-yellow-500/40 bg-yellow-900/20"
      : rank === 2
        ? "border-slate-400/30 bg-slate-700/20"
        : rank === 3
          ? "border-orange-500/30 bg-orange-900/20"
          : "";

  return (
    <Card className={cn("p-3 sm:p-4 bg-[#111827]", cardStyles)}>
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Rank badge */}
        <div className="flex-shrink-0">
          {rank === 1 ? (
            <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-950" />
            </div>
          ) : rank === 2 ? (
            <div className="w-10 h-10 rounded-full bg-slate-500 flex items-center justify-center">
              <Star className="w-5 h-5 text-slate-200" />
            </div>
          ) : rank === 3 ? (
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
              <Star className="w-5 h-5 text-orange-950" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <span className="text-sm font-bold text-slate-400">{rank}</span>
            </div>
          )}
        </div>

        {/* Position avatar */}
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
            POSITION_COLORS[player.position as keyof typeof POSITION_COLORS]?.bg ?? "bg-slate-500"
          )}
        >
          {positionLetters[player.position] ?? "?"}
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white truncate">
              {player.web_name}
            </span>
            {isCurrentCaptain && (
              <span className="text-[10px] font-semibold bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                C
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate">
            {player.team?.short_name ?? "?"} &bull; {player.position}
          </p>
        </div>

        {/* Fixture badge */}
        {next_fixture && (
          <div className="hidden sm:flex flex-col items-center flex-shrink-0">
            <span
              className={cn(
                "text-xs font-bold px-2 py-1 rounded",
                DIFFICULTY_COLORS[next_fixture.difficulty] ?? "bg-slate-700"
              )}
            >
              {next_fixture.opponent_short_name}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {next_fixture.is_home ? "H" : "A"}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-center flex-shrink-0">
          <div>
            <div className="text-sm font-semibold text-white">
              {player.form}
            </div>
            <div className="text-[10px] text-slate-500">Form</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {player.total_points}
            </div>
            <div className="text-[10px] text-slate-500">Pts</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {player.selected_by_percent ?? "0"}%
            </div>
            <div className="text-[10px] text-slate-500">Own</div>
          </div>
        </div>

        {/* Captain points */}
        <div className="text-right flex-shrink-0 ml-2">
          <div className="text-xl sm:text-2xl font-black text-[#00FF87]">
            {captainPoints.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500">
            {prediction.predicted_points.toFixed(1)} &times; {multiplier}
          </div>
        </div>
      </div>

      {/* Mobile stats row */}
      <div className="sm:hidden flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs text-slate-400">
        {next_fixture && (
          <span
            className={cn(
              "font-bold px-1.5 py-0.5 rounded text-[10px]",
              DIFFICULTY_COLORS[next_fixture.difficulty] ?? "bg-slate-700"
            )}
          >
            {next_fixture.opponent_short_name} ({next_fixture.is_home ? "H" : "A"})
          </span>
        )}
        <span>Form: {player.form}</span>
        <span>Pts: {player.total_points}</span>
        <span>Own: {player.selected_by_percent ?? "0"}%</span>
      </div>
    </Card>
  );
}
