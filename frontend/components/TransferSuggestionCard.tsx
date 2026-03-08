"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, XCircle, Plus } from "lucide-react";
import Link from "next/link";
import type { TransferSuggestion, TransferFixtureInfo } from "@/lib/types";
import { POSITION_COLORS } from "@/lib/constants";

function getDifficultyColor(difficulty: number): string {
  if (difficulty <= 2) return "bg-green-400";
  if (difficulty === 3) return "bg-yellow-400";
  return "bg-red-400";
}

function FixtureBadges({ fixtures }: { fixtures: TransferFixtureInfo[] }) {
  return (
    <div className="flex items-center gap-1">
      {fixtures.map((f, i) => (
        <span
          key={i}
          className={`inline-flex items-center justify-center w-8 h-5 rounded text-[10px] font-bold text-white ${getDifficultyColor(f.difficulty)}`}
          title={`${f.opponent_short} (${f.is_home ? "H" : "A"}) - Difficulty ${f.difficulty}`}
        >
          {f.opponent_short}
        </span>
      ))}
    </div>
  );
}

interface Props {
  suggestion: TransferSuggestion;
  onApply?: () => void;
  canApply?: boolean;
}

export function TransferSuggestionCard({ suggestion, onApply, canApply }: Props) {
  const { player_out, player_in, points_gain, price_diff, worth_hit, reason } =
    suggestion;
  const posColor = POSITION_COLORS[player_out.position as keyof typeof POSITION_COLORS];

  return (
    <Card className="p-4 sm:p-5 bg-[#111827] border-white/5">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {/* Player Out */}
        <div className="flex-1 rounded-xl bg-red-900/20 border border-red-500/20 p-3">
          <div className="text-xs font-semibold text-red-400 mb-2">
            TRANSFER OUT
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-7 h-7 rounded-full ${posColor?.bg ?? "bg-gray-500"} flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-[10px] font-bold text-white">
                {player_out.position}
              </span>
            </div>
            <div className="min-w-0">
              <Link
                href={`/player/${player_out.id}`}
                className="font-bold text-white hover:text-[#00FF87] truncate block"
              >
                {player_out.web_name}
              </Link>
              <div className="text-xs text-slate-400">
                {player_out.team?.short_name ?? "?"} &bull; {"\u00A3"}{player_out.price}m
                {player_out.selected_by_percent && ` \u00B7 ${player_out.selected_by_percent}%`}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Form: {player_out.form}</span>
            <span>3GW: {player_out.score_3gw.toFixed(1)} pts</span>
          </div>
          <FixtureBadges fixtures={player_out.fixtures} />
        </div>

        {/* Center: Arrow + Stats */}
        <div className="flex sm:flex-col items-center justify-center gap-2 sm:gap-1.5 flex-shrink-0 px-1">
          <ArrowRight className="w-6 h-6 text-[#00FF87] hidden sm:block" />
          <div className="text-lg font-bold text-[#00FF87]">
            +{points_gain.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500">
            {price_diff > 0
              ? `+\u00A3${price_diff.toFixed(1)}m`
              : price_diff < 0
                ? `-\u00A3${Math.abs(price_diff).toFixed(1)}m`
                : "Same price"}
          </div>
          {worth_hit ? (
            <Badge className="bg-emerald-900/40 text-[#00FF87] border-emerald-500/30 text-[10px]">
              <CheckCircle className="w-3 h-3 mr-0.5" />
              Hit worth it
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-slate-500 border-white/10 text-[10px]"
            >
              <XCircle className="w-3 h-3 mr-0.5" />
              Wait for FT
            </Badge>
          )}
        </div>

        {/* Player In */}
        <div className="flex-1 rounded-xl bg-emerald-900/20 border border-emerald-500/20 p-3">
          <div className="text-xs font-semibold text-[#00FF87] mb-2">
            TRANSFER IN
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-7 h-7 rounded-full ${posColor?.bg ?? "bg-gray-500"} flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-[10px] font-bold text-white">
                {player_in.position}
              </span>
            </div>
            <div className="min-w-0">
              <Link
                href={`/player/${player_in.id}`}
                className="font-bold text-white hover:text-[#00FF87] truncate block"
              >
                {player_in.web_name}
              </Link>
              <div className="text-xs text-slate-400">
                {player_in.team?.short_name ?? "?"} &bull; {"\u00A3"}{player_in.price}m
                {player_in.selected_by_percent && ` \u00B7 ${player_in.selected_by_percent}%`}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Form: {player_in.form}</span>
            <span>3GW: {player_in.score_3gw.toFixed(1)} pts</span>
          </div>
          <FixtureBadges fixtures={player_in.fixtures} />
        </div>
      </div>

      {/* Reasoning + Apply */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-slate-500 italic flex-1">{reason}</p>
        {onApply && (
          <Button
            size="sm"
            variant="outline"
            className="ml-3 h-7 text-xs gap-1 flex-shrink-0 border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
            onClick={onApply}
            disabled={!canApply}
            title={canApply ? "Apply this transfer" : "Player not in your squad"}
          >
            <Plus className="w-3 h-3" />
            Apply
          </Button>
        )}
      </div>
    </Card>
  );
}
