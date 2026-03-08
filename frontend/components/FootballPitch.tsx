"use client";

import { PitchMarkings } from "@/components/PitchMarkings";
import { PitchPlayerCard } from "@/components/PitchPlayerCard";
import type { DisplayStat } from "@/components/PitchPlayerCard";
import type {
  MyTeamSquadEntry,
  MyTeamPendingTransfer,
  TeamAnalyzerAnalysis,
} from "@/lib/types";

interface Props {
  squad: MyTeamSquadEntry[];
  analysis: TeamAnalyzerAnalysis;
  pendingTransfers: MyTeamPendingTransfer[];
  onPlayerClick: (entry: MyTeamSquadEntry) => void;
  onUndoTransfer: (outFplId: number) => void;
  onDoubleClickPlayer?: (entry: MyTeamSquadEntry) => void;
  displayStat?: DisplayStat;
  selectedFplId?: number | null;
  validTargetFplIds?: Set<number>;
  selectedChip?: string | null;
}

export function FootballPitch({
  squad,
  analysis,
  pendingTransfers,
  onPlayerClick,
  onUndoTransfer,
  onDoubleClickPlayer,
  displayStat = "aiPts",
  selectedFplId,
  validTargetFplIds,
  selectedChip,
}: Props) {
  const starters = squad.filter((e) => e.pick.is_starter);
  const bench = squad
    .filter((e) => !e.pick.is_starter)
    .sort((a, b) => a.pick.squad_position - b.pick.squad_position);

  const gkp = starters.filter((e) => e.player.position === "GKP");
  const def = starters.filter((e) => e.player.position === "DEF");
  const mid = starters.filter((e) => e.player.position === "MID");
  const fwd = starters.filter((e) => e.player.position === "FWD");

  const optimalSet = new Set(analysis.optimal_xi_fpl_ids);
  const weakSet = new Set(analysis.weak_player_fpl_ids);
  const transferMap = new Map(
    pendingTransfers.map((t) => [t.playerOut.player.fpl_id, t])
  );

  const suggestedCaptainFplId = analysis.optimal_captain_fpl_id;
  const isTripleCaptain = selectedChip === "3xc";
  const isBenchBoostActive = selectedChip === "bboost";

  function renderCard(entry: MyTeamSquadEntry, isBench = false) {
    const transfer = transferMap.get(entry.player.fpl_id);
    const isTransferred = !!transfer;

    return (
      <PitchPlayerCard
        key={entry.player.fpl_id}
        entry={entry}
        isInOptimalXI={optimalSet.has(entry.player.fpl_id)}
        isWeak={weakSet.has(entry.player.fpl_id)}
        isTransferred={isTransferred}
        incomingPlayer={transfer?.playerIn}
        isBench={isBench}
        displayStat={displayStat}
        isSelected={selectedFplId === entry.player.fpl_id}
        isValidTarget={validTargetFplIds?.has(entry.player.fpl_id) ?? false}
        isSuggestedCaptain={entry.player.fpl_id === suggestedCaptainFplId}
        isTripleCaptain={isTripleCaptain}
        isBenchBoostActive={isBenchBoostActive}
        onClick={() => {
          if (isTransferred) {
            onUndoTransfer(entry.player.fpl_id);
          } else {
            onPlayerClick(entry);
          }
        }}
        onDoubleClick={() => {
          if (!isTransferred && entry.pick.is_starter && onDoubleClickPlayer) {
            onDoubleClickPlayer(entry);
          }
        }}
      />
    );
  }

  function renderRow(entries: MyTeamSquadEntry[], isBench = false) {
    return entries.map((entry) => renderCard(entry, isBench));
  }

  function getBenchLabel(entry: MyTeamSquadEntry, index: number): string {
    if (entry.player.position === "GKP") return "GK";
    // Outfield bench: number them 1st, 2nd, 3rd based on index
    const outfieldIndex =
      bench.filter((e, i) => i < bench.indexOf(entry) && e.player.position !== "GKP").length;
    return ["1st", "2nd", "3rd"][outfieldIndex] ?? `${outfieldIndex + 1}`;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Pitch surface */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-xl bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-800 p-3 sm:p-5"
      >
        {/* Grass stripe effect */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background:
              "repeating-linear-gradient(to bottom, transparent 0px, transparent 28px, rgba(0,0,0,0.08) 28px, rgba(0,0,0,0.08) 56px)",
          }}
        />

        <PitchMarkings />

        {/* Formation rows */}
        <div
          className="relative z-10 flex flex-col gap-4 sm:gap-8 py-3 sm:py-5"
          style={{ minHeight: "460px" }}
        >
          {/* FWD row (top — attacking end) */}
          <div className="flex justify-center items-end gap-1.5 sm:gap-3 flex-1">
            {renderRow(fwd)}
          </div>

          {/* MID row */}
          <div className="flex justify-center items-end gap-1.5 sm:gap-3 flex-1">
            {renderRow(mid)}
          </div>

          {/* DEF row */}
          <div className="flex justify-center items-end gap-1.5 sm:gap-3 flex-1">
            {renderRow(def)}
          </div>

          {/* GKP row (bottom) */}
          <div className="flex justify-center items-end gap-1.5 sm:gap-3 flex-1">
            {renderRow(gkp)}
          </div>
        </div>
      </div>

      {/* Bench */}
      <div className={`mt-3 rounded-xl backdrop-blur-sm p-3 shadow-lg ${
        isBenchBoostActive
          ? "bg-blue-900/80 ring-2 ring-blue-400/50"
          : "bg-[#0a0e1a]/90"
      }`}>
        <div className={`text-[10px] sm:text-xs font-bold text-center mb-2 uppercase tracking-wider ${
          isBenchBoostActive ? "text-blue-300" : "text-slate-500"
        }`}>
          {isBenchBoostActive ? "Substitutes (Scoring)" : "Substitutes"}
        </div>
        <div className="flex justify-center gap-1.5 sm:gap-3">
          {bench.map((entry, index) => (
            <div key={entry.player.fpl_id} className="flex flex-col items-center">
              <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 mb-1">
                {getBenchLabel(entry, index)}
              </span>
              {renderCard(entry, true)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
