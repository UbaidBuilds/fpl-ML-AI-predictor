"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { playerApi, fixtureApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerSearchSelect } from "@/components/PlayerSearchSelect";
import { ComparisonTable } from "@/components/ComparisonTable";
import { EmptyState } from "@/components/EmptyState";
import { MetricTooltip, METRIC_EXPLANATIONS } from "@/components/MetricTooltip";
import { BarChart3, X, Users } from "lucide-react";
import { motion } from "framer-motion";
import type { Player } from "@/lib/types";
import type { ComparePlayer } from "@/components/ComparisonTable";

const MAX_PLAYERS = 4;

function ComparePageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load initial players from URL params
  const initialPlayerIds = useMemo(() => {
    const param = searchParams.get("players");
    if (!param) return [];
    return param
      .split(",")
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id) && id > 0)
      .slice(0, MAX_PLAYERS);
  }, [searchParams]);

  // Fetch initial players from URL
  const { data: initialPlayersData } = useQuery({
    queryKey: ["compare-initial", initialPlayerIds.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        initialPlayerIds.map((id) => playerApi.getById(id))
      );
      return results.map((r) => r.data);
    },
    enabled: initialPlayerIds.length > 0 && selectedPlayers.length === 0,
  });

  useEffect(() => {
    if (initialPlayersData && selectedPlayers.length === 0) {
      setSelectedPlayers(initialPlayersData);
    }
    if (initialPlayerIds.length === 0 || initialPlayersData) {
      setInitialLoading(false);
    }
  }, [initialPlayersData, initialPlayerIds, selectedPlayers.length]);

  // Update URL when selection changes
  const updateUrl = useCallback(
    (players: Player[]) => {
      if (players.length === 0) {
        router.replace("/compare", { scroll: false });
      } else {
        const ids = players.map((p) => p.id).join(",");
        router.replace(`/compare?players=${ids}`, { scroll: false });
      }
    },
    [router]
  );

  const handleAddPlayer = useCallback(
    (player: Player) => {
      if (selectedPlayers.length >= MAX_PLAYERS) return;
      if (selectedPlayers.some((p) => p.id === player.id)) return;
      const next = [...selectedPlayers, player];
      setSelectedPlayers(next);
      updateUrl(next);
    },
    [selectedPlayers, updateUrl]
  );

  const handleRemovePlayer = useCallback(
    (playerId: number) => {
      const next = selectedPlayers.filter((p) => p.id !== playerId);
      setSelectedPlayers(next);
      updateUrl(next);
    },
    [selectedPlayers, updateUrl]
  );

  const excludeIds = useMemo(
    () => selectedPlayers.map((p) => p.id),
    [selectedPlayers]
  );

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="text-center mb-8">
            <BarChart3 className="w-12 h-12 text-[#00FF87] mx-auto mb-4" />
            <h1 className="text-4xl font-black text-white mb-2">
              Compare Players
            </h1>
            <p className="text-slate-400">
              Compare up to {MAX_PLAYERS} players side by side to find the best
              transfer
            </p>
          </div>

          {/* Search */}
          <Card className="p-6 bg-[#111827] border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-slate-400">
                Add a player
              </span>
              <MetricTooltip explanation="Search for any player to add them to the comparison. You can compare up to 4 players." />
            </div>
            <PlayerSearchSelect
              onSelect={handleAddPlayer}
              excludeIds={excludeIds}
              disabled={selectedPlayers.length >= MAX_PLAYERS}
              placeholder={
                selectedPlayers.length >= MAX_PLAYERS
                  ? `Maximum ${MAX_PLAYERS} players reached`
                  : "Search by player name..."
              }
            />

            {/* Selected pills */}
            {selectedPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedPlayers.map((player) => (
                  <Badge
                    key={player.id}
                    variant="secondary"
                    className="pl-3 pr-1 py-1.5 text-sm flex items-center gap-1.5"
                  >
                    {player.web_name}
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(player.id)}
                      className="ml-1 p-0.5 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Loading */}
        {initialLoading && initialPlayerIds.length > 0 && (
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-96 rounded-xl" />
          </div>
        )}

        {/* Empty State */}
        {!initialLoading && selectedPlayers.length === 0 && (
          <EmptyState
            icon={Users}
            title="No players selected"
            description="Search for players above to start comparing their stats, predictions, and fixtures side by side."
          />
        )}

        {/* Comparison */}
        {selectedPlayers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <ComparisonTableWithData
              players={selectedPlayers}
              isAuthenticated={!!user}
              onRemovePlayer={handleRemovePlayer}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

/**
 * Wrapper that fetches fixtures and predictions for each player,
 * then passes the enriched data to ComparisonTable.
 */
function ComparisonTableWithData({
  players,
  isAuthenticated,
  onRemovePlayer,
}: {
  players: Player[];
  isAuthenticated: boolean;
  onRemovePlayer: (id: number) => void;
}) {
  // Fetch fixtures for all players
  const fixtureQueries = players.map((player) => {
    const { data, isLoading } = useQuery({
      queryKey: ["player-fixtures", player.id],
      queryFn: () => fixtureApi.getPlayerFixtures(player.id),
    });
    return { data, isLoading };
  });

  // Fetch predictions for all players (auth-gated)
  const predictionQueries = players.map((player) => {
    const { data, isLoading } = useQuery({
      queryKey: ["prediction", player.id],
      queryFn: () => playerApi.getPrediction(player.id),
      enabled: isAuthenticated,
      retry: false,
    });
    return { data, isLoading };
  });

  const anyLoading =
    fixtureQueries.some((q) => q.isLoading) ||
    (isAuthenticated && predictionQueries.some((q) => q.isLoading));

  if (anyLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  const comparePlayers: ComparePlayer[] = players.map((player, i) => ({
    player,
    fixtures: fixtureQueries[i].data?.data?.fixtures ?? [],
    prediction: predictionQueries[i].data?.data?.prediction
      ? {
          predicted_points:
            predictionQueries[i].data!.data.prediction.predicted_points,
          confidence:
            predictionQueries[i].data!.data.prediction.confidence,
        }
      : null,
  }));

  return (
    <ComparisonTable
      players={comparePlayers}
      isAuthenticated={isAuthenticated}
      onRemovePlayer={onRemovePlayer}
    />
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-xl mx-auto text-center mb-10">
              <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
              <Skeleton className="h-10 w-64 mx-auto mb-2" />
              <Skeleton className="h-5 w-80 mx-auto" />
            </div>
            <Skeleton className="h-16 max-w-xl mx-auto rounded-xl" />
          </div>
        </div>
      }
    >
      <ComparePageInner />
    </Suspense>
  );
}
