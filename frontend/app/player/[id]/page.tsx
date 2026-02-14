"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { playerApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  User,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { FixtureTicker } from "@/components/FixtureTicker";
import { EmptyState } from "@/components/EmptyState";
import { MetricTooltip, METRIC_EXPLANATIONS } from "@/components/MetricTooltip";
import { POSITION_NAMES, POSITION_COLORS } from "@/lib/constants";
import Link from "next/link";

export default function PlayerPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = Number(params.id);

  const { data: playerRes, isLoading: playerLoading } = useQuery({
    queryKey: ["player", id],
    queryFn: () => playerApi.getById(id),
    enabled: !!id,
  });

  const {
    data: predictionRes,
    isLoading: predictionLoading,
    error: predictionError,
  } = useQuery({
    queryKey: ["prediction", id],
    queryFn: () => playerApi.getPrediction(id),
    enabled: !!user && !!id,
    retry: false,
  });

  if (playerLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const player = playerRes?.data;
  if (!player) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <EmptyState
            icon={User}
            title="Player not found"
            description="This player may no longer be available."
            action={{ label: "Back to players", href: "/players" }}
          />
        </div>
      </div>
    );
  }

  const prediction = predictionRes?.data.prediction;
  const posName = POSITION_NAMES[player.position] ?? player.position;
  const posGradient = POSITION_COLORS[player.position as keyof typeof POSITION_COLORS]?.gradient ?? "from-gray-500 to-gray-600";

  // Check for rate limit error
  const isRateLimited =
    predictionError &&
    "response" in (predictionError as object) &&
    (predictionError as { response?: { status?: number } }).response?.status === 429;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/players"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to players
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Player Info */}
          <div className="lg:col-span-2">
            <Card className="p-8 bg-[#111827] border-white/10">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${posGradient} flex items-center justify-center flex-shrink-0`}
                >
                  <User className="w-12 h-12 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-4xl font-black text-white mb-2">
                    {player.name}
                  </h1>
                  <p className="text-xl text-slate-400">
                    {player.team?.name ?? "Unknown"} &bull; {posName}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {player.web_name}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30">
                  <DollarSign className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-white">
                    £{player.price}m
                  </div>
                  <div className="text-sm text-slate-400">Price</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-sky-900/20 border border-sky-500/30">
                  <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-white">
                    {player.form}
                  </div>
                  <div className="text-sm text-slate-400">Form</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[#00FF87]/10 border border-[#00FF87]/30">
                  <Sparkles className="w-8 h-8 text-[#00FF87] mx-auto mb-2" />
                  <div className="text-3xl font-bold text-white">
                    {player.total_points}
                  </div>
                  <div className="text-sm text-slate-400">Total Points</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-amber-900/20 border border-amber-500/30">
                  <User className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-white">
                    {player.selected_by_percent ?? "0"}%
                  </div>
                  <div className="text-sm text-slate-400">Owned</div>
                </div>
              </div>
            </Card>

            {/* Fixture Ticker */}
            <div className="mt-6">
              <FixtureTicker playerId={id} />
            </div>
          </div>

          {/* Prediction */}
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00FF87]/30 via-emerald-500/20 to-sky-500/20 p-[2px]"
            >
              <Card className="relative h-full bg-[#111827] p-8 border-0">
                <div className="text-center">
                  <Sparkles className="w-12 h-12 text-[#00FF87] mx-auto mb-4" />
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-white">
                      AI Prediction
                    </h2>
                    <MetricTooltip explanation={METRIC_EXPLANATIONS.xPts} />
                  </div>

                  {!user ? (
                    <div className="my-8">
                      <p className="text-slate-400 mb-4">
                        Login to see AI predictions
                      </p>
                      <Link href="/login">
                        <Button>Login</Button>
                      </Link>
                    </div>
                  ) : predictionLoading ? (
                    <div className="my-8 space-y-4">
                      <Skeleton className="h-20 w-32 mx-auto rounded-xl" />
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </div>
                  ) : isRateLimited ? (
                    <div className="my-8">
                      <p className="text-slate-400 mb-2">
                        Daily limit reached
                      </p>
                      <p className="text-sm text-slate-500">
                        Upgrade to premium for unlimited predictions
                      </p>
                    </div>
                  ) : prediction ? (
                    <>
                      <div className="text-8xl font-black text-[#00FF87] my-6">
                        {prediction.predicted_points.toFixed(1)}
                      </div>
                      <p className="text-slate-400 mb-4">AI Pts</p>

                      <div className="rounded-xl bg-[#00FF87]/10 p-4 border border-[#00FF87]/30">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400 flex items-center gap-1">
                            Certainty
                            <MetricTooltip explanation={METRIC_EXPLANATIONS.confidence} />
                          </span>
                          <span className="font-semibold text-white">
                            {(prediction.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#00FF87] to-sky-400"
                            style={{
                              width: `${prediction.confidence * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="my-8">
                      <p className="text-slate-500 text-sm">
                        Prediction not available for this player yet.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
