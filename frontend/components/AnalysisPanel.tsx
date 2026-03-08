"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Crown,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Wand2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
} from "lucide-react";
import { MetricTooltip, METRIC_EXPLANATIONS } from "@/components/MetricTooltip";
import type { TeamAnalyzerAnalysis, MyTeamSquadEntry } from "@/lib/types";

interface Props {
  analysis: TeamAnalyzerAnalysis;
  onApplyOptimal?: () => void;
  squad?: MyTeamSquadEntry[];
  selectedChip?: string | null;
}

export function AnalysisPanel({ analysis, onApplyOptimal, squad, selectedChip }: Props) {
  const [showPreview, setShowPreview] = useState(false);

  const suggestedCaptainName = squad?.find(
    (e) => e.player.fpl_id === analysis.optimal_captain_fpl_id
  )?.player.web_name;

  // Compute lineup changes between current and optimal
  const changes = useMemo(() => {
    if (!squad) return null;
    const optimalIds = new Set(analysis.optimal_xi_fpl_ids);

    const movingToXI = squad.filter(
      (e) => !e.pick.is_starter && optimalIds.has(e.player.fpl_id)
    );
    const movingToBench = squad.filter(
      (e) => e.pick.is_starter && !optimalIds.has(e.player.fpl_id)
    );

    const currentCaptain = squad.find((e) => e.pick.is_captain);
    const newCaptainId = analysis.optimal_captain_fpl_id;
    const captainChange =
      currentCaptain && newCaptainId !== currentCaptain.player.fpl_id
        ? squad.find((e) => e.player.fpl_id === newCaptainId)
        : null;

    return { movingToXI, movingToBench, captainChange };
  }, [squad, analysis]);

  function handleApplyClick() {
    if (!showPreview) {
      setShowPreview(true);
      return;
    }
    onApplyOptimal?.();
    setShowPreview(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 text-center bg-[#111827] border-l-4 border-sky-400">
          <Trophy className="w-6 h-6 text-sky-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-white">
            {analysis.current_xi_predicted.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
            Current XI Predicted
            <MetricTooltip explanation={METRIC_EXPLANATIONS.currentXI} />
          </div>
          {selectedChip === "3xc" && (
            <div className="text-[9px] text-yellow-400 font-medium mt-0.5">incl. 3x captain</div>
          )}
          {selectedChip === "bboost" && (
            <div className="text-[9px] text-sky-400 font-medium mt-0.5">incl. bench</div>
          )}
        </Card>
        <Card className="p-4 text-center bg-[#111827] border-l-4 border-[#00FF87]">
          <Crown className="w-6 h-6 text-[#00FF87] mx-auto mb-1" />
          <div className="text-2xl font-bold text-white">
            {analysis.optimal_xi_predicted.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
            Best Lineup Predicted
            <MetricTooltip explanation={METRIC_EXPLANATIONS.optimalXI} />
          </div>
        </Card>
        <Card
          className={`p-4 text-center bg-[#111827] ${
            analysis.points_improvement > 0
              ? "border-l-4 border-emerald-400"
              : "border-l-4 border-slate-600"
          }`}
        >
          {analysis.points_improvement > 0 ? (
            <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
          ) : (
            <TrendingDown className="w-6 h-6 text-slate-500 mx-auto mb-1" />
          )}
          <div
            className={`text-2xl font-bold ${
              analysis.points_improvement > 0 ? "text-emerald-400" : "text-white"
            }`}
          >
            {analysis.points_improvement > 0 ? "+" : ""}
            {analysis.points_improvement.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
            Potential Improvement
            <MetricTooltip explanation={METRIC_EXPLANATIONS.improvement} />
          </div>
        </Card>
      </div>

      {suggestedCaptainName && (
        <Card className="p-3 bg-amber-900/20 border-amber-500/30">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-200">
              Suggested Captain:{" "}
              <span className="font-bold">{suggestedCaptainName}</span>
              <span className="text-amber-400/70 ml-1 text-xs">
                (double-click on pitch to set)
              </span>
            </p>
          </div>
        </Card>
      )}

      {analysis.points_improvement > 0 && (
        <Card className="p-3 bg-emerald-900/20 border-emerald-500/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-200 flex-1">
              <span className="font-semibold">
                +{analysis.points_improvement.toFixed(1)} predicted pts
              </span>{" "}
              available by switching to the best lineup. Players with a green
              ring are in the suggested XI.
            </p>
            {onApplyOptimal && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1 flex-shrink-0 bg-gradient-to-r from-[#00FF87] to-emerald-500 text-gray-900 hover:from-[#00FF87]/90 hover:to-emerald-500/90"
                onClick={handleApplyClick}
              >
                <Wand2 className="w-3 h-3" />
                {showPreview ? "Confirm" : "Apply"}
              </Button>
            )}
          </div>

          {/* Best Lineup preview */}
          {showPreview && changes && (
            <div className="mt-3 pt-3 border-t border-emerald-500/20 space-y-2">
              <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
                Changes
              </p>

              {changes.movingToXI.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-emerald-300">
                    <span className="font-semibold">
                      {changes.movingToXI.map((e) => e.player.web_name).join(", ")}
                    </span>
                    <span className="text-emerald-400/70 ml-1">→ Starting XI</span>
                  </p>
                </div>
              )}

              {changes.movingToBench.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <ArrowDown className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <p className="text-rose-300">
                    <span className="font-semibold">
                      {changes.movingToBench.map((e) => e.player.web_name).join(", ")}
                    </span>
                    <span className="text-rose-400/70 ml-1">→ Bench</span>
                  </p>
                </div>
              )}

              {changes.captainChange && (
                <div className="flex items-start gap-2 text-sm">
                  <Crown className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-300">
                    <span className="font-semibold">
                      {changes.captainChange.player.web_name}
                    </span>
                    <span className="text-amber-400/70 ml-1">→ Captain</span>
                  </p>
                </div>
              )}

              {changes.movingToXI.length === 0 &&
                changes.movingToBench.length === 0 &&
                !changes.captainChange && (
                  <p className="text-xs text-emerald-400/70">
                    Only captain change — lineup already matches.
                  </p>
                )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs gap-1 border-white/10 text-slate-300 hover:bg-white/5"
                  onClick={() => setShowPreview(false)}
                >
                  <X className="w-3 h-3" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-6 text-xs gap-1 bg-gradient-to-r from-[#00FF87] to-emerald-500 text-gray-900 hover:from-[#00FF87]/90 hover:to-emerald-500/90"
                  onClick={() => {
                    onApplyOptimal?.();
                    setShowPreview(false);
                  }}
                >
                  <Check className="w-3 h-3" />
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
