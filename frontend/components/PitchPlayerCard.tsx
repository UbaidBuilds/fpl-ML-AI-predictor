"use client";

import { useState } from "react";
import { Crown, Undo2, Sparkles } from "lucide-react";
import type { MyTeamSquadEntry, Player } from "@/lib/types";
import { POSITION_COLORS } from "@/lib/constants";

export type DisplayStat = "aiPts" | "form" | "points" | "price";

function getFixtureBg(difficulty: number): string {
  if (difficulty <= 2) return "bg-green-500";
  if (difficulty === 3) return "bg-orange-400";
  return "bg-red-500";
}

function getStatDisplay(entry: MyTeamSquadEntry, stat: DisplayStat): { value: string; color: string } {
  switch (stat) {
    case "aiPts":
      return { value: entry.prediction.predicted_points.toFixed(1), color: "text-[#00FF87]" };
    case "form":
      return { value: entry.player.form, color: "text-emerald-400" };
    case "points":
      return { value: String(entry.player.total_points), color: "text-sky-400" };
    case "price":
      return { value: `\u00A3${entry.player.price}m`, color: "text-emerald-400" };
  }
}

interface Props {
  entry: MyTeamSquadEntry;
  isInOptimalXI?: boolean;
  isWeak?: boolean;
  isTransferred?: boolean;
  incomingPlayer?: Player;
  onClick: () => void;
  onDoubleClick?: () => void;
  isBench?: boolean;
  displayStat?: DisplayStat;
  isSelected?: boolean;
  isValidTarget?: boolean;
  isSuggestedCaptain?: boolean;
  isTripleCaptain?: boolean;
  isBenchBoostActive?: boolean;
}

export function PitchPlayerCard({
  entry,
  isInOptimalXI,
  isWeak,
  isTransferred,
  incomingPlayer,
  onClick,
  onDoubleClick,
  isBench,
  displayStat = "aiPts",
  isSelected,
  isValidTarget,
  isSuggestedCaptain,
  isTripleCaptain,
  isBenchBoostActive,
}: Props) {
  const { player, pick, prediction, next_fixture } = entry;
  const posColor = POSITION_COLORS[player.position as keyof typeof POSITION_COLORS];
  const shirtGradient = posColor?.gradient ?? "from-gray-400 to-gray-500";
  const [showTooltip, setShowTooltip] = useState(false);

  const statDisplay = getStatDisplay(entry, displayStat);

  if (isTransferred && incomingPlayer) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 hover:scale-105 bg-red-900/40 backdrop-blur-sm shadow-md border-2 border-red-500/40 w-[62px] sm:w-[82px] group"
      >
        {/* Shirt */}
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b ${shirtGradient} flex items-center justify-center opacity-50`}>
          <span className="text-white font-bold text-[10px] sm:text-xs">
            {player.position.charAt(0)}
          </span>
        </div>

        {/* Out name */}
        <span className="text-[8px] sm:text-[10px] text-slate-500 line-through truncate w-full text-center mt-0.5">
          {player.web_name}
        </span>

        {/* In name */}
        <span className="text-[9px] sm:text-[11px] font-bold text-[#00FF87] truncate w-full text-center">
          {incomingPlayer.web_name}
        </span>

        {/* Undo hint */}
        <Undo2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex flex-col items-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 hover:scale-105 hover:-translate-y-1 backdrop-blur-sm shadow-md w-[62px] sm:w-[82px] ${
          isBench
            ? "bg-[#111827]/80 border border-white/10"
            : "bg-[#111827]/90 border border-white/10"
        } ${isSelected ? "ring-2 ring-sky-400 scale-105" : ""} ${
          isValidTarget ? "ring-2 ring-[#00FF87] bg-emerald-900/30" : ""
        } ${isInOptimalXI && !isSelected && !isValidTarget ? "ring-2 ring-[#00FF87]/60" : ""} ${
          isWeak && !isSelected && !isValidTarget ? "ring-2 ring-red-400" : ""
        }`}
      >
        {/* Shirt */}
        <div className="relative">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b ${shirtGradient} flex items-center justify-center`}>
            <span className="text-white font-bold text-[10px] sm:text-xs">
              {player.position.charAt(0)}
            </span>
          </div>
          {pick.is_captain && (
            <div className={`absolute -top-1 -right-1 ${isTripleCaptain ? "w-5 h-4 rounded-md" : "w-4 h-4 rounded-full"} bg-yellow-400 flex items-center justify-center`}>
              {isTripleCaptain ? (
                <span className="text-[7px] font-black text-yellow-800">3x</span>
              ) : (
                <Crown className="w-2.5 h-2.5 text-yellow-800" />
              )}
            </div>
          )}
          {pick.is_vice_captain && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-slate-500 rounded-full flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">V</span>
            </div>
          )}
          {isSuggestedCaptain && !pick.is_captain && (
            <div className="absolute -top-1 -left-1 w-4 h-4 bg-[#00FF87] rounded-full flex items-center justify-center animate-pulse">
              <Sparkles className="w-2.5 h-2.5 text-gray-900" />
            </div>
          )}
        </div>

        {/* Name */}
        <span className="text-[9px] sm:text-[11px] font-bold text-white truncate w-full text-center mt-0.5 leading-tight">
          {player.web_name}
        </span>

        {/* Fixture badge */}
        {next_fixture && (
          <span className={`text-[7px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-px rounded text-white mt-0.5 ${getFixtureBg(next_fixture.difficulty)}`}>
            {next_fixture.opponent_short_name} ({next_fixture.is_home ? "H" : "A"})
          </span>
        )}

        {/* Stat display */}
        <span className={`text-sm sm:text-base font-black ${statDisplay.color} mt-0.5`}>
          {statDisplay.value}
        </span>

        {/* Bench boost scoring indicator */}
        {isBench && isBenchBoostActive && (
          <span className="text-[7px] sm:text-[8px] font-bold text-blue-400 bg-blue-900/50 px-1 rounded mt-0.5">
            SCORING
          </span>
        )}

        {/* Price (only show when stat isn't price) */}
        {displayStat !== "price" && !isBenchBoostActive && (
          <span className="hidden sm:block text-[8px] text-slate-500">
            {"\u00A3"}{player.price}m
          </span>
        )}
      </button>

      {/* Hover tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none hidden sm:block">
          <div className="bg-[#111827] text-white rounded-lg shadow-xl ring-1 ring-white/10 p-2.5 text-[10px] w-[140px]">
            <div className="font-bold text-xs mb-1">{player.web_name}</div>
            <div className="text-slate-400 mb-1.5">
              {player.team?.short_name ?? "?"} &bull; {player.position} &bull; {"\u00A3"}{player.price}m
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-400">AI Pts</span>
                <span className="font-semibold text-[#00FF87]">{prediction.predicted_points.toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Confidence</span>
                <span className="font-semibold">{(prediction.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Form</span>
                <span className="font-semibold">{player.form}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Pts</span>
                <span className="font-semibold">{player.total_points}</span>
              </div>
              {next_fixture && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Fixture</span>
                  <span className="font-semibold">{next_fixture.opponent_short_name} ({next_fixture.is_home ? "H" : "A"})</span>
                </div>
              )}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#111827]" />
          </div>
        </div>
      )}
    </div>
  );
}
