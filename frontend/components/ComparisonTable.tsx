"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Lock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { POSITION_COLORS, DIFFICULTY_COLORS } from "@/lib/constants";
import type { Player, PlayerFixture } from "@/lib/types";

export interface ComparePlayer {
  player: Player;
  fixtures: PlayerFixture[];
  prediction?: { predicted_points: number; confidence: number } | null;
}

interface ComparisonTableProps {
  players: ComparePlayer[];
  isAuthenticated: boolean;
  onRemovePlayer: (id: number) => void;
}

function findBestIndex(
  values: (number | null)[],
  mode: "highest" | "lowest"
): number | null {
  let bestIdx: number | null = null;
  let bestVal: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null) continue;
    if (
      bestVal === null ||
      (mode === "highest" && v > bestVal) ||
      (mode === "lowest" && v < bestVal)
    ) {
      bestVal = v;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function ComparisonTable({
  players,
  isAuthenticated,
  onRemovePlayer,
}: ComparisonTableProps) {
  // Find winner (highest predicted points)
  const predValues = players.map((p) =>
    p.prediction ? p.prediction.predicted_points : null
  );
  const winnerIdx = findBestIndex(predValues, "highest");

  // Metric rows
  const priceValues = players.map((p) => parseFloat(p.player.price));
  const formValues = players.map((p) => parseFloat(p.player.form));
  const pointsValues = players.map((p) => p.player.total_points);
  const ownershipValues = players.map((p) =>
    parseFloat(p.player.selected_by_percent ?? "0")
  );
  const confValues = players.map((p) =>
    p.prediction ? p.prediction.confidence : null
  );

  const bestPrice = findBestIndex(priceValues, "lowest");
  const bestForm = findBestIndex(formValues, "highest");
  const bestPoints = findBestIndex(pointsValues, "highest");
  const bestPred = findBestIndex(predValues, "highest");
  const bestConf = findBestIndex(
    confValues.map((v) => (v !== null ? v : null)),
    "highest"
  );

  // Max fixtures to show (up to 5)
  const maxFixtures = Math.max(...players.map((p) => Math.min(p.fixtures.length, 5)), 0);

  return (
    <Card className="overflow-hidden bg-[#111827] border-white/5">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-3 sm:p-4 min-w-[100px] sticky left-0 bg-[#111827] z-10">
                Metric
              </th>
              {players.map((p, i) => (
                <th
                  key={p.player.id}
                  className="p-3 sm:p-4 min-w-[140px] sm:min-w-[180px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate text-sm">
                          {p.player.web_name}
                        </span>
                        {winnerIdx === i && isAuthenticated && (
                          <Trophy className="w-4 h-4 text-[#00FF87] flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {p.player.team?.short_name ?? "?"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-slate-500 hover:text-red-400 flex-shrink-0"
                      onClick={() => onRemovePlayer(p.player.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {/* Position */}
            <MetricRow label="Position">
              {players.map((p) => {
                const posColor = POSITION_COLORS[p.player.position as keyof typeof POSITION_COLORS];
                return (
                  <td key={p.player.id} className="p-3 sm:p-4">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs bg-white/5",
                        posColor?.text ?? "text-slate-400"
                      )}
                    >
                      {p.player.position}
                    </Badge>
                  </td>
                );
              })}
            </MetricRow>

            {/* Team */}
            <MetricRow label="Team">
              {players.map((p) => (
                <td key={p.player.id} className="p-3 sm:p-4 text-sm text-white">
                  {p.player.team?.name ?? "Unknown"}
                </td>
              ))}
            </MetricRow>

            {/* Price */}
            <MetricRow label="Price">
              {players.map((p, i) => (
                <td
                  key={p.player.id}
                  className={cn(
                    "p-3 sm:p-4 text-sm font-semibold",
                    bestPrice === i
                      ? "bg-[#00FF87]/10 text-[#00FF87]"
                      : "text-white"
                  )}
                >
                  &pound;{p.player.price}m
                </td>
              ))}
            </MetricRow>

            {/* Form */}
            <MetricRow label="Form">
              {players.map((p, i) => (
                <td
                  key={p.player.id}
                  className={cn(
                    "p-3 sm:p-4 text-sm font-semibold",
                    bestForm === i
                      ? "bg-[#00FF87]/10 text-[#00FF87]"
                      : "text-white"
                  )}
                >
                  {p.player.form}
                </td>
              ))}
            </MetricRow>

            {/* Total Points */}
            <MetricRow label="Total Points">
              {players.map((p, i) => (
                <td
                  key={p.player.id}
                  className={cn(
                    "p-3 sm:p-4 text-sm font-semibold",
                    bestPoints === i
                      ? "bg-[#00FF87]/10 text-[#00FF87]"
                      : "text-white"
                  )}
                >
                  {p.player.total_points}
                </td>
              ))}
            </MetricRow>

            {/* Ownership */}
            <MetricRow label="Ownership">
              {players.map((p) => (
                <td key={p.player.id} className="p-3 sm:p-4 text-sm text-white">
                  {p.player.selected_by_percent ?? "0"}%
                </td>
              ))}
            </MetricRow>

            {/* Predicted Points (auth-gated) */}
            <MetricRow label="Predicted Pts">
              {players.map((p, i) => (
                <td
                  key={p.player.id}
                  className={cn(
                    "p-3 sm:p-4",
                    isAuthenticated && bestPred === i
                      ? "bg-[#00FF87]/10"
                      : ""
                  )}
                >
                  {!isAuthenticated ? (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                      Login to view
                    </span>
                  ) : p.prediction ? (
                    <span
                      className={cn(
                        "text-sm font-bold",
                        bestPred === i
                          ? "text-[#00FF87]"
                          : "text-white"
                      )}
                    >
                      {p.prediction.predicted_points.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">N/A</span>
                  )}
                </td>
              ))}
            </MetricRow>

            {/* Certainty (auth-gated) */}
            <MetricRow label="Certainty">
              {players.map((p, i) => (
                <td
                  key={p.player.id}
                  className={cn(
                    "p-3 sm:p-4",
                    isAuthenticated && bestConf === i ? "bg-[#00FF87]/10" : ""
                  )}
                >
                  {!isAuthenticated ? (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                      Login
                    </span>
                  ) : p.prediction ? (
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        bestConf === i
                          ? "text-[#00FF87]"
                          : "text-white"
                      )}
                    >
                      {(p.prediction.confidence * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">N/A</span>
                  )}
                </td>
              ))}
            </MetricRow>

            {/* Next Fixtures */}
            {maxFixtures > 0 && (
              <>
                <tr>
                  <td
                    colSpan={players.length + 1}
                    className="px-3 sm:px-4 pt-4 pb-2"
                  >
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Next Fixtures
                    </span>
                  </td>
                </tr>
                {Array.from({ length: maxFixtures }).map((_, fIdx) => (
                  <tr key={`fixture-${fIdx}`} className="border-t border-white/5">
                    <td className="p-2 sm:p-3 text-xs text-slate-500 sticky left-0 bg-[#111827] z-10">
                      GW{" "}
                      {players[0]?.fixtures[fIdx]?.gameweek ?? fIdx + 1}
                    </td>
                    {players.map((p) => {
                      const fixture = p.fixtures[fIdx];
                      if (!fixture) {
                        return (
                          <td key={p.player.id} className="p-2 sm:p-3 text-xs text-slate-600">
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={p.player.id} className="p-2 sm:p-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                DIFFICULTY_COLORS[fixture.difficulty] ??
                                  "bg-slate-700"
                              )}
                            >
                              {fixture.opponent.short_name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {fixture.is_home ? "H" : "A"}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MetricRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td className="p-3 sm:p-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-[#111827] z-10">
        {label}
      </td>
      {children}
    </tr>
  );
}
