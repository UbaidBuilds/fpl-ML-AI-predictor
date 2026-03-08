"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Repeat, AlertTriangle, Minus, Plus } from "lucide-react";

interface Props {
  remainingBank: number;
  freeTransfers: number;
  setFreeTransfers: (ft: number) => void;
  transferCount: number;
  hits: number;
  hitCost: number;
  selectedChip?: string | null;
}

export function BudgetBar({
  remainingBank,
  freeTransfers,
  setFreeTransfers,
  transferCount,
  hits,
  hitCost,
  selectedChip,
}: Props) {
  const noHitsChip = selectedChip === "wildcard" || selectedChip === "freehit";
  return (
    <Card className="p-4 bg-[#111827] border-white/5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="rounded-lg bg-emerald-900/20 border border-emerald-500/20 p-3">
          <Wallet className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <div
            className={`text-xl font-bold ${
              remainingBank < 0 ? "text-red-400" : "text-white"
            }`}
          >
            £{remainingBank.toFixed(1)}m
          </div>
          <div className="text-xs text-slate-400">Bank</div>
        </div>
        <div className="rounded-lg bg-sky-900/20 border border-sky-500/20 p-3">
          <Repeat className="w-5 h-5 text-sky-400 mx-auto mb-1" />
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 border-white/10 text-slate-300 hover:bg-white/5"
              onClick={() => setFreeTransfers(Math.max(1, freeTransfers - 1))}
              disabled={freeTransfers <= 1}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-xl font-bold text-white w-6 text-center">
              {freeTransfers}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 border-white/10 text-slate-300 hover:bg-white/5"
              onClick={() => setFreeTransfers(Math.min(5, freeTransfers + 1))}
              disabled={freeTransfers >= 5}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <div className="text-xs text-slate-400 mt-1">Free Transfers</div>
        </div>
        <div className="rounded-lg bg-[#00FF87]/5 border border-[#00FF87]/20 p-3">
          <div className="text-xl font-bold text-white">{transferCount}</div>
          <div className="text-xs text-slate-400">Transfers Made</div>
        </div>
        <div className={`rounded-lg p-3 ${noHitsChip ? "bg-emerald-900/20 border border-emerald-500/20" : hits > 0 ? "bg-rose-900/20 border border-rose-500/20" : "bg-[#0a0e1a] border border-white/5"}`}>
          {hits > 0 && !noHitsChip && (
            <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto mb-1" />
          )}
          <div
            className={`text-xl font-bold ${
              noHitsChip ? "text-emerald-400" : hits > 0 ? "text-rose-400" : "text-white"
            }`}
          >
            {noHitsChip ? "0" : hitCost > 0 ? `-${hitCost}` : "0"}
          </div>
          <div className="text-xs text-slate-400">
            {noHitsChip
              ? `No Hits (${selectedChip === "wildcard" ? "WC" : "FH"})`
              : `Hit Cost (${hits} hit${hits !== 1 ? "s" : ""})`}
          </div>
        </div>
      </div>
      {remainingBank < 0 && (
        <p className="text-xs text-red-400 mt-2 text-center">
          Over budget by £{Math.abs(remainingBank).toFixed(1)}m
        </p>
      )}
    </Card>
  );
}
