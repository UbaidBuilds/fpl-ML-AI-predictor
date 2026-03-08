"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, Save, FolderOpen, Trash2, Upload } from "lucide-react";
import type { MyTeamPendingTransfer, TransferDraft } from "@/lib/types";

interface Props {
  pendingTransfers: MyTeamPendingTransfer[];
  budget: {
    remainingBank: number;
    hits: number;
    hitCost: number;
    totalOut: number;
    totalIn: number;
  };
  onClearAll: () => void;
  drafts: TransferDraft[];
  draftName: string;
  setDraftName: (name: string) => void;
  onSaveDraft: () => void;
  onDeleteDraft: (id: string) => void;
  onLoadDraft: (draft: TransferDraft) => void;
  showDrafts: boolean;
  setShowDrafts: (show: boolean) => void;
}

export function TransferSummary({
  pendingTransfers,
  budget,
  onClearAll,
  drafts,
  draftName,
  setDraftName,
  onSaveDraft,
  onDeleteDraft,
  onLoadDraft,
  showDrafts,
  setShowDrafts,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Transfer list */}
      {pendingTransfers.length > 0 && (
        <Card className="p-5 bg-[#111827] border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Transfer Summary</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="text-red-400 hover:text-red-300 border-white/10 hover:bg-white/5"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>
          <div className="space-y-2">
            {pendingTransfers.map((t) => {
              const priceDiff =
                parseFloat(t.playerIn.price) -
                parseFloat(t.playerOut.player.price);
              return (
                <div
                  key={t.playerOut.player.fpl_id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[#0a0e1a] text-sm"
                >
                  <span className="text-rose-400 font-medium truncate flex-1">
                    {t.playerOut.player.web_name}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="text-emerald-400 font-medium truncate flex-1">
                    {t.playerIn.web_name}
                  </span>
                  <span
                    className={`text-xs font-semibold flex-shrink-0 ${
                      priceDiff > 0
                        ? "text-rose-400"
                        : priceDiff < 0
                          ? "text-emerald-400"
                          : "text-slate-500"
                    }`}
                  >
                    {priceDiff > 0
                      ? `+£${priceDiff.toFixed(1)}m`
                      : priceDiff < 0
                        ? `-£${Math.abs(priceDiff).toFixed(1)}m`
                        : "£0.0m"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-sm">
            <span className="text-slate-400">
              Net cost:{" "}
              <span className="font-bold text-white">
                £{(budget.totalIn - budget.totalOut).toFixed(1)}m
              </span>
            </span>
            {budget.hitCost > 0 && (
              <span className="text-rose-400 font-semibold">
                -{budget.hitCost} pts from hits
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Drafts */}
      <Card className="p-5 bg-[#111827] border-white/5">
        <h3 className="text-lg font-bold text-white mb-4">Drafts</h3>

        {pendingTransfers.length > 0 && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Draft name..."
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="flex-1 bg-[#0a0e1a] border-white/10 text-white placeholder:text-slate-500"
            />
            <Button onClick={onSaveDraft} size="sm" className="bg-gradient-to-r from-[#00FF87] to-emerald-500 text-gray-900 hover:from-[#00FF87]/90 hover:to-emerald-500/90">
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        )}

        {drafts.length > 0 ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDrafts(!showDrafts)}
              className="mb-3 border-white/10 text-slate-300 hover:bg-white/5"
            >
              <FolderOpen className="w-4 h-4 mr-1" />
              {showDrafts ? "Hide" : "Show"} Saved Drafts ({drafts.length})
            </Button>
            {showDrafts && (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0e1a] border border-white/5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white truncate">
                        {draft.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {draft.transfers.length} transfer
                        {draft.transfers.length !== 1 ? "s" : ""} &bull;{" "}
                        {new Date(draft.savedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {draft.transfers
                          .map((t) => `${t.outName} → ${t.inName}`)
                          .join(", ")}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {draft.transfers.some((t) => t.playerInData) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onLoadDraft(draft)}
                          className="text-sky-400 hover:text-sky-300 border-white/10 hover:bg-white/5"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Load
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-500 self-center px-1">
                          Old draft
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteDraft(draft.id)}
                        className="text-rose-400 hover:text-rose-300 border-white/10 hover:bg-white/5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">
            No saved drafts yet. Make some transfers and save a draft.
          </p>
        )}
      </Card>
    </div>
  );
}
