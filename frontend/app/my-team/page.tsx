"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { myTeamApi, transferApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  ArrowRight,
  Search,
  Users,
  Info,
  Repeat,
  Settings,
  Crown,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { FootballPitch } from "@/components/FootballPitch";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { BudgetBar } from "@/components/BudgetBar";
import { TransferSummary } from "@/components/TransferSummary";
import { ReplacementSearch } from "@/components/ReplacementSearch";
import { ChipSelector } from "@/components/ChipSelector";
import { TransferSuggestionCard } from "@/components/TransferSuggestionCard";
import { ErrorState } from "@/components/ErrorState";
import { MetricTooltip, METRIC_EXPLANATIONS } from "@/components/MetricTooltip";
import Link from "next/link";
import type { DisplayStat } from "@/components/PitchPlayerCard";
import type {
  MyTeamResponse,
  MyTeamSquadEntry,
  MyTeamPendingTransfer,
  TransferDraft,
  TransferSuggestionsResponse,
  Player,
} from "@/lib/types";

const DRAFTS_KEY = "fpl_transfer_drafts";

function loadDrafts(): TransferDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDrafts(drafts: TransferDraft[]) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

type InteractionMode = "transfer" | "manage";

function getStatOptions(nextGameweek?: number): { key: DisplayStat; label: string }[] {
  const gwLabel = nextGameweek ? ` (GW${nextGameweek})` : "";
  return [
    { key: "aiPts", label: `AI Pts${gwLabel}` },
    { key: "form", label: "Form" },
    { key: "points", label: "Points" },
    { key: "price", label: "Price" },
  ];
}

function isValidSwap(
  a: MyTeamSquadEntry,
  b: MyTeamSquadEntry,
  squad: MyTeamSquadEntry[]
): boolean {
  // GKP can only swap with GKP
  if (a.player.position === "GKP" || b.player.position === "GKP") {
    return a.player.position === b.player.position;
  }
  // Both starters or both bench — always fine
  if (a.pick.is_starter === b.pick.is_starter) return true;
  // Starter ↔ Bench — check resulting formation
  const starter = a.pick.is_starter ? a : b;
  const benched = a.pick.is_starter ? b : a;
  const newStarters = squad.filter(
    (e) => e.pick.is_starter && e.player.fpl_id !== starter.player.fpl_id
  );
  newStarters.push(benched);
  const counts: Record<string, number> = { DEF: 0, MID: 0, FWD: 0 };
  newStarters.forEach((e) => {
    if (e.player.position in counts) counts[e.player.position]++;
  });
  return counts.DEF >= 3 && counts.MID >= 2 && counts.FWD >= 1;
}

export default function MyTeamPage() {
  const { user } = useAuth();
  const [teamId, setTeamId] = useState<string>(
    user?.fpl_team_id?.toString() ?? ""
  );
  const [teamData, setTeamData] = useState<MyTeamResponse | null>(null);
  const [pendingTransfers, setPendingTransfers] = useState<
    MyTeamPendingTransfer[]
  >([]);
  const [freeTransfers, setFreeTransfers] = useState(1);
  const [selectedPlayer, setSelectedPlayer] =
    useState<MyTeamSquadEntry | null>(null);
  const [drafts, setDrafts] = useState<TransferDraft[]>([]);
  const [draftName, setDraftName] = useState("");
  const [showDrafts, setShowDrafts] = useState(false);

  // New state for enhancements
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("transfer");
  const [displayStat, setDisplayStat] = useState<DisplayStat>("aiPts");
  const [manageSelectedFplId, setManageSelectedFplId] = useState<number | null>(
    null
  );
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  // Local squad overrides (for swaps/captain changes — keyed by fpl_id)
  const [squadOverrides, setSquadOverrides] = useState<
    Map<
      number,
      {
        is_starter?: boolean;
        squad_position?: number;
        is_captain?: boolean;
        is_vice_captain?: boolean;
      }
    >
  >(new Map());

  // Transfer suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<TransferSuggestionsResponse | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Ref for loading a draft after team loads
  const pendingDraftLoad = useRef<TransferDraft | null>(null);

  useEffect(() => {
    setDrafts(loadDrafts());
  }, []);

  const mutation = useMutation({
    mutationFn: (fplTeamId: number) => myTeamApi.load(fplTeamId),
    onSuccess: (response) => {
      setTeamData(response.data);
      setPendingTransfers([]);
      setSquadOverrides(new Map());
      setManageSelectedFplId(null);
      setSelectedChip(response.data.team_info.active_chip ?? null);
      setFreeTransfers(response.data.budget.free_transfers ?? 1);

      // If a draft load was pending, apply it now
      const draft = pendingDraftLoad.current;
      if (draft) {
        pendingDraftLoad.current = null;
        applyDraftToSquad(draft, response.data);
      }
    },
  });

  // Apply squad overrides to get the effective squad
  const effectiveSquad = useMemo(() => {
    if (!teamData) return [];
    if (squadOverrides.size === 0) return teamData.squad;
    return teamData.squad.map((entry) => {
      const override = squadOverrides.get(entry.player.fpl_id);
      if (!override) return entry;
      return {
        ...entry,
        pick: { ...entry.pick, ...override },
      };
    });
  }, [teamData, squadOverrides]);

  // Recompute analysis based on overrides and chip selection
  const effectiveAnalysis = useMemo(() => {
    if (!teamData) return null;

    const captainMultiplier = selectedChip === "3xc" ? 3 : 2;
    const isBenchBoost = selectedChip === "bboost";

    // Always recompute when a chip is active (even without overrides)
    if (squadOverrides.size === 0 && !selectedChip) return teamData.analysis;

    const starters = effectiveSquad.filter((e) => e.pick.is_starter);
    const benchPlayers = effectiveSquad.filter((e) => !e.pick.is_starter);

    const currentPredicted = starters.reduce((sum, e) => {
      const mult = e.pick.is_captain ? captainMultiplier : 1;
      return sum + e.prediction.predicted_points * mult;
    }, 0);

    const benchPredicted = isBenchBoost
      ? benchPlayers.reduce((sum, e) => sum + e.prediction.predicted_points, 0)
      : 0;

    const totalPredicted = currentPredicted + benchPredicted;

    // Recalculate optimal with same chip logic
    const optimalIds = new Set(teamData.analysis.optimal_xi_fpl_ids);
    const optimalCaptainId = teamData.analysis.optimal_captain_fpl_id;
    const optimalStarters = effectiveSquad.filter((e) =>
      optimalIds.has(e.player.fpl_id)
    );
    const optimalBench = effectiveSquad.filter(
      (e) => !optimalIds.has(e.player.fpl_id)
    );

    const optimalPredicted = optimalStarters.reduce((sum, e) => {
      const mult = e.player.fpl_id === optimalCaptainId ? captainMultiplier : 1;
      return sum + e.prediction.predicted_points * mult;
    }, 0);

    const optimalBenchPredicted = isBenchBoost
      ? optimalBench.reduce((sum, e) => sum + e.prediction.predicted_points, 0)
      : 0;

    const optimalTotal = optimalPredicted + optimalBenchPredicted;

    return {
      ...teamData.analysis,
      current_xi_predicted: Math.round(totalPredicted * 10) / 10,
      optimal_xi_predicted: Math.round(optimalTotal * 10) / 10,
      points_improvement: Math.round((optimalTotal - totalPredicted) * 10) / 10,
    };
  }, [teamData, effectiveSquad, squadOverrides, selectedChip]);

  const statOptions = useMemo(
    () => getStatOptions(teamData?.team_info.next_gameweek),
    [teamData?.team_info.next_gameweek]
  );

  function handleDoubleClickPlayer(entry: MyTeamSquadEntry) {
    if (!entry.pick.is_starter) return;
    handleSetCaptain(entry.player.fpl_id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = parseInt(teamId, 10);
    if (!id || id < 1) return;
    setTeamData(null);
    setPendingTransfers([]);
    setSquadOverrides(new Map());
    setManageSelectedFplId(null);
    mutation.mutate(id);
  }

  // Budget calculations
  const budget = useMemo(() => {
    if (!teamData) return null;
    const originalBank = teamData.budget.bank;
    const totalOut = pendingTransfers.reduce(
      (sum, t) => sum + parseFloat(t.playerOut.player.price),
      0
    );
    const totalIn = pendingTransfers.reduce(
      (sum, t) => sum + parseFloat(t.playerIn.price),
      0
    );
    const remainingBank =
      Math.round((originalBank + totalOut - totalIn) * 10) / 10;
    const noHits = selectedChip === "wildcard" || selectedChip === "freehit";
    const hits = noHits ? 0 : Math.max(0, pendingTransfers.length - freeTransfers);
    const hitCost = hits * 4;
    return { remainingBank, hits, hitCost, totalOut, totalIn };
  }, [teamData, pendingTransfers, freeTransfers, selectedChip]);

  // Current squad FPL IDs (for excluding from replacement search)
  const currentSquadFplIds = useMemo(() => {
    if (!teamData) return [];
    const outIds = new Set(
      pendingTransfers.map((t) => t.playerOut.player.fpl_id)
    );
    const inIds = pendingTransfers.map((t) => t.playerIn.fpl_id);
    const baseIds = teamData.squad
      .filter((e) => !outIds.has(e.player.fpl_id))
      .map((e) => e.player.fpl_id);
    return [...baseIds, ...inIds];
  }, [teamData, pendingTransfers]);

  // Valid swap targets for the currently selected player in manage mode
  const validTargetFplIds = useMemo(() => {
    if (!manageSelectedFplId || interactionMode !== "manage") return new Set<number>();
    const selected = effectiveSquad.find(
      (e) => e.player.fpl_id === manageSelectedFplId
    );
    if (!selected) return new Set<number>();
    const targets = new Set<number>();
    for (const entry of effectiveSquad) {
      if (entry.player.fpl_id === manageSelectedFplId) continue;
      if (isValidSwap(selected, entry, effectiveSquad)) {
        targets.add(entry.player.fpl_id);
      }
    }
    return targets;
  }, [manageSelectedFplId, effectiveSquad, interactionMode]);

  function handlePlayerClick(entry: MyTeamSquadEntry) {
    if (interactionMode === "transfer") {
      // Transfer mode: open replacement search
      if (
        pendingTransfers.some(
          (t) => t.playerOut.player.fpl_id === entry.player.fpl_id
        )
      ) {
        return;
      }
      setSelectedPlayer(entry);
    } else {
      // Manage mode: swap logic
      if (manageSelectedFplId === null) {
        // Select this player
        setManageSelectedFplId(entry.player.fpl_id);
      } else if (manageSelectedFplId === entry.player.fpl_id) {
        // Deselect
        setManageSelectedFplId(null);
      } else {
        // Try to swap
        const selected = effectiveSquad.find(
          (e) => e.player.fpl_id === manageSelectedFplId
        );
        if (!selected) {
          setManageSelectedFplId(null);
          return;
        }
        if (isValidSwap(selected, entry, effectiveSquad)) {
          performSwap(selected, entry);
        }
        setManageSelectedFplId(null);
      }
    }
  }

  function performSwap(a: MyTeamSquadEntry, b: MyTeamSquadEntry) {
    setSquadOverrides((prev) => {
      const next = new Map(prev);
      // Swap is_starter and squad_position
      next.set(a.player.fpl_id, {
        ...(prev.get(a.player.fpl_id) ?? {}),
        is_starter: b.pick.is_starter,
        squad_position: b.pick.squad_position,
      });
      next.set(b.player.fpl_id, {
        ...(prev.get(b.player.fpl_id) ?? {}),
        is_starter: a.pick.is_starter,
        squad_position: a.pick.squad_position,
      });
      return next;
    });
  }

  function handleSetCaptain(fplId: number) {
    setSquadOverrides((prev) => {
      const next = new Map(prev);
      // Remove captain from all
      for (const entry of effectiveSquad) {
        if (entry.pick.is_captain || next.get(entry.player.fpl_id)?.is_captain) {
          next.set(entry.player.fpl_id, {
            ...(prev.get(entry.player.fpl_id) ?? {}),
            is_captain: false,
          });
        }
      }
      // Set new captain
      next.set(fplId, {
        ...(prev.get(fplId) ?? {}),
        is_captain: true,
        is_vice_captain: false,
      });
      return next;
    });
    setManageSelectedFplId(null);
  }

  function handleSetViceCaptain(fplId: number) {
    setSquadOverrides((prev) => {
      const next = new Map(prev);
      // Remove VC from all
      for (const entry of effectiveSquad) {
        if (
          entry.pick.is_vice_captain ||
          next.get(entry.player.fpl_id)?.is_vice_captain
        ) {
          next.set(entry.player.fpl_id, {
            ...(prev.get(entry.player.fpl_id) ?? {}),
            is_vice_captain: false,
          });
        }
      }
      // Set new VC
      next.set(fplId, {
        ...(prev.get(fplId) ?? {}),
        is_vice_captain: true,
        is_captain: false,
      });
      return next;
    });
    setManageSelectedFplId(null);
  }

  const handleApplyOptimal = useCallback(() => {
    if (!teamData) return;
    const optimalIds = new Set(teamData.analysis.optimal_xi_fpl_ids);
    const optimalCaptain = teamData.analysis.optimal_captain_fpl_id;

    setSquadOverrides(() => {
      const next = new Map<
        number,
        {
          is_starter?: boolean;
          squad_position?: number;
          is_captain?: boolean;
          is_vice_captain?: boolean;
        }
      >();

      // Assign starters and bench
      let starterPos = 1;
      let benchPos = 12;

      // Sort: starters first (GKP, DEF, MID, FWD), then bench
      const posOrder: Record<string, number> = {
        GKP: 0,
        DEF: 1,
        MID: 2,
        FWD: 3,
      };

      const starters = teamData.squad
        .filter((e) => optimalIds.has(e.player.fpl_id))
        .sort(
          (a, b) =>
            posOrder[a.player.position] - posOrder[b.player.position]
        );
      const benched = teamData.squad
        .filter((e) => !optimalIds.has(e.player.fpl_id))
        .sort(
          (a, b) =>
            posOrder[a.player.position] - posOrder[b.player.position]
        );

      for (const entry of starters) {
        next.set(entry.player.fpl_id, {
          is_starter: true,
          squad_position: starterPos++,
          is_captain: entry.player.fpl_id === optimalCaptain,
          is_vice_captain: false,
        });
      }
      for (const entry of benched) {
        next.set(entry.player.fpl_id, {
          is_starter: false,
          squad_position: benchPos++,
          is_captain: false,
          is_vice_captain: false,
        });
      }

      return next;
    });

    setManageSelectedFplId(null);
  }, [teamData]);

  function handleResetLineup() {
    setSquadOverrides(new Map());
    setManageSelectedFplId(null);
  }

  function handleSelectReplacement(player: Player) {
    if (!selectedPlayer) return;
    setPendingTransfers((prev) => [
      ...prev,
      { playerOut: selectedPlayer, playerIn: player },
    ]);
    setSelectedPlayer(null);
  }

  function handleUndoTransfer(outFplId: number) {
    setPendingTransfers((prev) =>
      prev.filter((t) => t.playerOut.player.fpl_id !== outFplId)
    );
  }

  function handleClearAll() {
    setPendingTransfers([]);
  }

  function handleSaveDraft() {
    if (!teamData || pendingTransfers.length === 0) return;
    const name = draftName.trim() || `Draft ${drafts.length + 1}`;
    const draft: TransferDraft = {
      id: Date.now().toString(),
      name,
      savedAt: new Date().toISOString(),
      fplTeamId: teamData.team_info.fpl_team_id,
      selectedChip,
      transfers: pendingTransfers.map((t) => ({
        outFplId: t.playerOut.player.fpl_id,
        outName: t.playerOut.player.web_name,
        inFplId: t.playerIn.fpl_id,
        inName: t.playerIn.web_name,
        inPrice: t.playerIn.price,
        playerInData: t.playerIn,
      })),
    };
    const updated = [...drafts, draft];
    setDrafts(updated);
    saveDrafts(updated);
    setDraftName("");
  }

  function handleDeleteDraft(id: string) {
    const updated = drafts.filter((d) => d.id !== id);
    setDrafts(updated);
    saveDrafts(updated);
  }

  function applyDraftToSquad(draft: TransferDraft, data: MyTeamResponse) {
    const transfers: MyTeamPendingTransfer[] = [];
    for (const t of draft.transfers) {
      if (!t.playerInData) continue; // Skip old drafts without full data
      const playerOut = data.squad.find(
        (e) => e.player.fpl_id === t.outFplId
      );
      if (!playerOut) continue; // Player no longer in squad
      transfers.push({ playerOut, playerIn: t.playerInData });
    }
    setPendingTransfers(transfers);
    if (draft.selectedChip !== undefined) {
      setSelectedChip(draft.selectedChip);
    }
  }

  function handleLoadDraft(draft: TransferDraft) {
    // If correct team is already loaded, apply immediately
    if (
      teamData &&
      teamData.team_info.fpl_team_id === draft.fplTeamId
    ) {
      applyDraftToSquad(draft, teamData);
      return;
    }
    // Otherwise, load the team first — draft will apply in onSuccess
    pendingDraftLoad.current = draft;
    setTeamId(draft.fplTeamId.toString());
    mutation.mutate(draft.fplTeamId);
  }

  async function fetchSuggestions() {
    setSuggestionsLoading(true);
    try {
      const response = await transferApi.suggest({});
      setSuggestions(response.data);
    } catch {
      setSuggestions(null);
    } finally {
      setSuggestionsLoading(false);
    }
  }

  function handleToggleSuggestions() {
    const next = !showSuggestions;
    setShowSuggestions(next);
    if (next && !suggestions && !suggestionsLoading) {
      fetchSuggestions();
    }
  }

  function applySuggestion(suggestion: TransferSuggestionsResponse["suggestions"][number]) {
    if (!teamData) return;
    const playerOut = teamData.squad.find(
      (e) => e.player.fpl_id === suggestion.player_out.fpl_id
    );
    if (!playerOut) return;
    // Already transferred out?
    if (pendingTransfers.some((t) => t.playerOut.player.fpl_id === suggestion.player_out.fpl_id)) return;
    const playerIn: Player = {
      id: suggestion.player_in.id,
      fpl_id: suggestion.player_in.fpl_id,
      name: suggestion.player_in.web_name,
      web_name: suggestion.player_in.web_name,
      position: suggestion.player_in.position,
      price: suggestion.player_in.price,
      form: suggestion.player_in.form,
      total_points: suggestion.player_in.total_points,
      status: "a",
      selected_by_percent: suggestion.player_in.selected_by_percent ?? "0",
      team_fpl_id: 0,
      team: suggestion.player_in.team
        ? { id: 0, fpl_id: 0, strength: 0, created_at: "", updated_at: "", ...suggestion.player_in.team }
        : undefined,
      created_at: "",
      updated_at: "",
    };
    setPendingTransfers((prev) => [...prev, { playerOut, playerIn }]);
  }

  const maxAffordable = useMemo(() => {
    if (!selectedPlayer || !budget) return 0;
    return (
      Math.round(
        (budget.remainingBank + parseFloat(selectedPlayer.player.price)) * 10
      ) / 10
    );
  }, [selectedPlayer, budget]);

  const errorMessage =
    mutation.error &&
    ((
      mutation.error as {
        response?: { data?: { error?: string; message?: string } };
      }
    ).response?.data?.error ||
      "Failed to load team. Please try again.");

  // Get selected player entry for manage mode actions
  const manageSelectedEntry = useMemo(() => {
    if (!manageSelectedFplId) return null;
    return effectiveSquad.find(
      (e) => e.player.fpl_id === manageSelectedFplId
    ) ?? null;
  }, [manageSelectedFplId, effectiveSquad]);

  const hasOverrides = squadOverrides.size > 0;

  // Auth guard
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md bg-[#111827] border-white/10">
          <LayoutDashboard className="w-12 h-12 text-[#00FF87] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">My Team</h2>
          <p className="text-slate-400 mb-6">
            Login to view predictions, plan transfers, and optimize your FPL
            team
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
        {/* Header + Input */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="text-center mb-8">
            <LayoutDashboard className="w-12 h-12 text-[#00FF87] mx-auto mb-4" />
            <h1 className="text-4xl font-black text-white mb-2">My Team</h1>
            <p className="text-slate-400">
              AI predictions, transfer planning, and squad optimization in one
              view
            </p>
          </div>

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
                    "Analyzing..."
                  ) : (
                    <>
                      Load Team <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
              {errorMessage && (
                <div className="mt-3">
                  <ErrorState
                    message={errorMessage}
                    onRetry={() => mutation.mutate(parseInt(teamId, 10))}
                  />
                </div>
              )}
            </Card>
          </form>
        </div>

        {/* Loading State */}
        {mutation.isPending && (
          <div className="max-w-2xl mx-auto space-y-4">
            <Skeleton className="h-24 rounded-xl" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
            <Skeleton className="h-[500px] rounded-2xl" />
          </div>
        )}

        {/* Results */}
        {teamData && !mutation.isPending && effectiveAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            {/* Team Info */}
            <Card className="p-5 bg-[#111827] border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00FF87] to-emerald-500 flex items-center justify-center">
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
                  {teamData.team_info.next_gameweek && (
                    <p className="text-xs text-[#00FF87] font-medium mt-0.5">
                      Predictions for GW {teamData.team_info.next_gameweek}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm text-slate-500">
                  {teamData.meta.players_found} players
                </div>
              </div>
            </Card>

            {/* Free Hit Warning */}
            {teamData.team_info.free_hit_active && (
              <Card className="p-4 border-sky-500/30 bg-sky-900/20">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-sky-300">
                    <p className="font-medium">
                      Free Hit detected in the latest gameweek
                    </p>
                    <p className="mt-1 text-sky-400">
                      Showing your pre-Free Hit squad. If you&apos;ve made
                      transfers since, they may not be reflected until the next
                      gameweek deadline passes.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Analysis Panel */}
            <AnalysisPanel
              analysis={effectiveAnalysis}
              onApplyOptimal={handleApplyOptimal}
              squad={effectiveSquad}
              selectedChip={selectedChip}
            />

            {/* Budget Bar */}
            {budget && (
              <BudgetBar
                remainingBank={budget.remainingBank}
                freeTransfers={freeTransfers}
                setFreeTransfers={setFreeTransfers}
                transferCount={pendingTransfers.length}
                hits={budget.hits}
                hitCost={budget.hitCost}
                selectedChip={selectedChip}
              />
            )}

            {/* Chip Selector */}
            <ChipSelector
              selectedChip={selectedChip}
              onSelectChip={setSelectedChip}
              apiActiveChip={teamData.team_info.active_chip}
            />

            {/* Mode + Stat Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Interaction mode toggle */}
              <div className="flex items-center gap-1 bg-[#111827] rounded-lg shadow-sm border border-white/10 p-1">
                <Button
                  size="sm"
                  variant={interactionMode === "transfer" ? "default" : "outline"}
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    setInteractionMode("transfer");
                    setManageSelectedFplId(null);
                  }}
                >
                  <Repeat className="w-3 h-3" />
                  Transfer
                </Button>
                <Button
                  size="sm"
                  variant={interactionMode === "manage" ? "default" : "outline"}
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    setInteractionMode("manage");
                    setSelectedPlayer(null);
                  }}
                >
                  <Settings className="w-3 h-3" />
                  Manage
                </Button>
              </div>

              {/* Stat display toggle */}
              <div className="flex items-center gap-1 bg-[#111827] rounded-lg shadow-sm border border-white/10 p-1">
                {statOptions.map((opt) => (
                  <Button
                    key={opt.key}
                    size="sm"
                    variant={displayStat === opt.key ? "default" : "outline"}
                    className="h-7 text-xs px-2"
                    onClick={() => setDisplayStat(opt.key)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Manage mode actions */}
            {interactionMode === "manage" && manageSelectedEntry && manageSelectedEntry.pick.is_starter && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-slate-400">
                  {manageSelectedEntry.player.web_name} selected:
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleSetCaptain(manageSelectedFplId!)}
                >
                  <Crown className="w-3 h-3 text-amber-400" />
                  Set Captain
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleSetViceCaptain(manageSelectedFplId!)}
                >
                  V - Set Vice
                </Button>
              </div>
            )}

            {/* Reset lineup button */}
            {hasOverrides && (
              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-orange-600 hover:text-orange-700"
                  onClick={handleResetLineup}
                >
                  Reset to Original Lineup
                </Button>
              </div>
            )}

            {/* Football Pitch */}
            <FootballPitch
              squad={effectiveSquad}
              analysis={effectiveAnalysis}
              pendingTransfers={pendingTransfers}
              onPlayerClick={handlePlayerClick}
              onUndoTransfer={handleUndoTransfer}
              onDoubleClickPlayer={handleDoubleClickPlayer}
              displayStat={displayStat}
              selectedFplId={
                interactionMode === "manage" ? manageSelectedFplId : undefined
              }
              validTargetFplIds={
                interactionMode === "manage" ? validTargetFplIds : undefined
              }
              selectedChip={selectedChip}
            />

            {/* Manage mode hint */}
            {interactionMode === "manage" && !manageSelectedFplId && (
              <p className="text-xs text-center text-slate-500">
                Click a player to select, then click another to swap. Double-click a starter to set as Captain.
              </p>
            )}

            {/* Transfer Summary + Drafts */}
            {budget && (
              <TransferSummary
                pendingTransfers={pendingTransfers}
                budget={budget}
                onClearAll={handleClearAll}
                drafts={drafts}
                draftName={draftName}
                setDraftName={setDraftName}
                onSaveDraft={handleSaveDraft}
                onDeleteDraft={handleDeleteDraft}
                onLoadDraft={handleLoadDraft}
                showDrafts={showDrafts}
                setShowDrafts={setShowDrafts}
              />
            )}

            {/* AI Transfer Suggestions */}
            <Card className="p-5 bg-[#111827] border-white/10">
              <button
                onClick={handleToggleSuggestions}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-white">
                    AI Transfer Suggestions
                  </h3>
                </div>
                {showSuggestions ? (
                  <ChevronUp className="w-5 h-5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500" />
                )}
              </button>

              {showSuggestions && (
                <div className="mt-4 space-y-4">
                  {suggestionsLoading && (
                    <div className="flex items-center justify-center py-8 text-slate-500">
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Finding best transfers...
                    </div>
                  )}

                  {suggestions && !suggestionsLoading && (
                    <>
                      <p className="text-xs text-slate-500 text-center">
                        Analyzed {suggestions.meta.players_analyzed} players
                        {suggestions.meta.position_filter &&
                          ` (${suggestions.meta.position_filter} only)`}
                      </p>
                      {suggestions.suggestions.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">
                          No transfer suggestions found.
                        </p>
                      ) : (
                        suggestions.suggestions.map((s) => {
                          const inSquad = teamData!.squad.some(
                            (e) => e.player.fpl_id === s.player_out.fpl_id
                          );
                          const alreadyTransferred = pendingTransfers.some(
                            (t) =>
                              t.playerOut.player.fpl_id === s.player_out.fpl_id
                          );
                          return (
                            <TransferSuggestionCard
                              key={`${s.player_out.fpl_id}-${s.player_in.fpl_id}`}
                              suggestion={s}
                              onApply={() => applySuggestion(s)}
                              canApply={inSquad && !alreadyTransferred}
                            />
                          );
                        })
                      )}
                    </>
                  )}

                  {!suggestions && !suggestionsLoading && (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Failed to load suggestions. Try again later.
                    </p>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Replacement Search Dialog */}
        {selectedPlayer && (
          <ReplacementSearch
            open={!!selectedPlayer}
            onOpenChange={(open) => {
              if (!open) setSelectedPlayer(null);
            }}
            position={selectedPlayer.player.position}
            maxPrice={maxAffordable}
            excludeFplIds={currentSquadFplIds}
            onSelect={handleSelectReplacement}
          />
        )}
      </div>
    </div>
  );
}
