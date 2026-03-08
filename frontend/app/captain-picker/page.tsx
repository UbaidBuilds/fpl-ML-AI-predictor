"use client";

import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { myTeamApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CaptainCard } from "@/components/CaptainCard";
import { ErrorState } from "@/components/ErrorState";
import { MetricTooltip, METRIC_EXPLANATIONS } from "@/components/MetricTooltip";
import {
  Crown,
  ArrowRight,
  Search,
  Users,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { MyTeamResponse } from "@/lib/types";

export default function CaptainPickerPage() {
  const { user } = useAuth();
  const [teamId, setTeamId] = useState<string>(
    user?.fpl_team_id?.toString() ?? ""
  );
  const [teamData, setTeamData] = useState<MyTeamResponse | null>(null);
  const [multiplier, setMultiplier] = useState<2 | 3>(2);

  const mutation = useMutation({
    mutationFn: (fplTeamId: number) => myTeamApi.load(fplTeamId),
    onSuccess: (response) => {
      setTeamData(response.data);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = parseInt(teamId, 10);
    if (!id || id < 1) return;
    setTeamData(null);
    mutation.mutate(id);
  }

  // Sort squad by predicted points descending
  const rankedSquad = useMemo(() => {
    if (!teamData) return [];
    return [...teamData.squad]
      .filter((e) => e.pick.is_starter)
      .sort((a, b) => b.prediction.predicted_points - a.prediction.predicted_points);
  }, [teamData]);

  // Also show bench players sorted separately
  const benchSquad = useMemo(() => {
    if (!teamData) return [];
    return [...teamData.squad]
      .filter((e) => !e.pick.is_starter)
      .sort((a, b) => b.prediction.predicted_points - a.prediction.predicted_points);
  }, [teamData]);

  // Current captain
  const currentCaptain = useMemo(() => {
    if (!teamData) return null;
    return teamData.squad.find((e) => e.pick.is_captain) ?? null;
  }, [teamData]);

  // Recommended captain (highest predicted points among starters)
  const recommendedCaptain = rankedSquad[0] ?? null;

  const errorMessage =
    mutation.error &&
    ((
      mutation.error as {
        response?: { data?: { error?: string; message?: string } };
      }
    ).response?.data?.error ||
      "Failed to load team. Please try again.");

  // Auth guard
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md bg-[#111827] border-white/10">
          <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Captain Picker
          </h2>
          <p className="text-slate-400 mb-6">
            Login to get AI-powered captain recommendations for your FPL team
          </p>
          <Link href="/login">
            <Button>Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="text-center mb-8">
            <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-4xl font-black text-white mb-2">
              Captain Picker
            </h1>
            <p className="text-slate-400">
              Choose your captain with AI predictions — the most important
              decision each gameweek
            </p>
          </div>

          {/* Team ID Form */}
          <form onSubmit={handleSubmit}>
            <Card className="p-6 bg-[#111827] border-white/10">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <Input
                    type="number"
                    placeholder="Enter FPL Team ID..."
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="pl-10 h-12"
                    min={1}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 px-6"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    "Loading..."
                  ) : (
                    <>
                      Load Team <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        </div>

        {/* Error State */}
        {errorMessage && (
          <div className="max-w-2xl mx-auto mb-6">
            <ErrorState
              message={errorMessage}
              onRetry={() => mutation.mutate(parseInt(teamId, 10))}
            />
          </div>
        )}

        {/* Loading State */}
        {mutation.isPending && (
          <div className="max-w-2xl mx-auto space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        )}

        {/* Results */}
        {teamData && !mutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            {/* Team Info */}
            <Card className="p-5 bg-[#111827] border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">
                    {teamData.team_info.team_name}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {teamData.team_info.manager_name} &bull;{" "}
                    {teamData.team_info.overall_points} pts &bull; Rank{" "}
                    {teamData.team_info.overall_rank?.toLocaleString() ?? "N/A"}
                  </p>
                </div>
                {teamData.team_info.next_gameweek && (
                  <div className="text-right">
                    <span className="text-xs text-[#00FF87] font-medium">
                      GW {teamData.team_info.next_gameweek}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Multiplier Toggle */}
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-1 bg-[#111827] rounded-lg shadow-sm border border-white/10 p-1">
                <Button
                  size="sm"
                  variant={multiplier === 2 ? "default" : "outline"}
                  className="h-8 text-xs gap-1"
                  onClick={() => setMultiplier(2)}
                >
                  <Crown className="w-3.5 h-3.5" />
                  Captain (&times;2)
                </Button>
                <Button
                  size="sm"
                  variant={multiplier === 3 ? "default" : "outline"}
                  className="h-8 text-xs gap-1"
                  onClick={() => setMultiplier(3)}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Triple Captain (&times;3)
                </Button>
              </div>
              <MetricTooltip explanation={METRIC_EXPLANATIONS.xPts} />
            </div>

            {/* Summary Card */}
            {currentCaptain && recommendedCaptain && (
              <Card className="p-5 border-[#00FF87]/30 bg-[#00FF87]/10">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Your Captain</p>
                    <p className="font-bold text-white">
                      {currentCaptain.player.web_name}
                    </p>
                    <p className="text-lg font-black text-slate-400">
                      {(currentCaptain.prediction.predicted_points * multiplier).toFixed(1)} pts
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    {currentCaptain.player.fpl_id !== recommendedCaptain.player.fpl_id ? (
                      <div>
                        <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-sm font-bold text-emerald-400">
                          +{(
                            (recommendedCaptain.prediction.predicted_points -
                              currentCaptain.prediction.predicted_points) *
                            multiplier
                          ).toFixed(1)} pts
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-emerald-400">
                        Already optimal!
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">AI Recommends</p>
                    <p className="font-bold text-[#00FF87]">
                      {recommendedCaptain.player.web_name}
                    </p>
                    <p className="text-lg font-black text-[#00FF87]">
                      {(recommendedCaptain.prediction.predicted_points * multiplier).toFixed(1)} pts
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Starters */}
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Starting XI — Ranked by Predicted Points
              </h3>
              <div className="space-y-2">
                {rankedSquad.map((entry, idx) => (
                  <CaptainCard
                    key={entry.player.fpl_id}
                    entry={entry}
                    rank={idx + 1}
                    multiplier={multiplier}
                    isCurrentCaptain={entry.pick.is_captain}
                  />
                ))}
              </div>
            </div>

            {/* Bench */}
            {benchSquad.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Bench
                </h3>
                <div className="space-y-2 opacity-60">
                  {benchSquad.map((entry, idx) => (
                    <CaptainCard
                      key={entry.player.fpl_id}
                      entry={entry}
                      rank={rankedSquad.length + idx + 1}
                      multiplier={multiplier}
                      isCurrentCaptain={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
