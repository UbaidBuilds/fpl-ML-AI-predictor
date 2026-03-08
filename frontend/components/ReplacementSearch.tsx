"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { playerApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, User, AlertTriangle } from "lucide-react";
import type { Player } from "@/lib/types";
import { POSITION_COLORS } from "@/lib/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: "GKP" | "DEF" | "MID" | "FWD";
  maxPrice: number;
  excludeFplIds: number[];
  onSelect: (player: Player) => void;
}

export function ReplacementSearch({
  open,
  onOpenChange,
  position,
  maxPrice,
  excludeFplIds,
  onSelect,
}: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setDebouncedSearch("");
    }
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ["replacementSearch", position, debouncedSearch],
    queryFn: () =>
      playerApi.getAll({
        position,
        search: debouncedSearch || undefined,
        sort: "form",
        dir: "desc",
        per_page: 50,
      }),
    enabled: open,
  });

  const players =
    data?.data.data
      .filter(
        (p) => !excludeFplIds.includes(p.fpl_id) && p.status === "a"
      )
      .sort((a, b) => {
        const aOver = parseFloat(a.price) > maxPrice;
        const bOver = parseFloat(b.price) > maxPrice;
        if (aOver !== bOver) return aOver ? 1 : -1;
        return parseFloat(b.form) - parseFloat(a.form);
      }) ?? [];

  const handleSelect = useCallback(
    (player: Player) => {
      onSelect(player);
      onOpenChange(false);
    },
    [onSelect, onOpenChange]
  );

  const posColor = POSITION_COLORS[position];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col bg-[#111827] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Find Replacement ({position})</DialogTitle>
          <DialogDescription className="text-slate-400">
            Budget: {"\u00A3"}{maxPrice.toFixed(1)}m available
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#0a0e1a] border-white/10 text-white placeholder:text-slate-500"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 -mx-1 px-1 min-h-0 max-h-[50vh]">
          {isLoading ? (
            <div className="text-center text-slate-500 py-8 text-sm">
              Searching players...
            </div>
          ) : players.length === 0 ? (
            <div className="text-center text-slate-500 py-8 text-sm">
              No available players found
            </div>
          ) : (
            <div className="space-y-1">
              {players.map((player) => {
                const isOverBudget = parseFloat(player.price) > maxPrice;
                const overBy = Math.round((parseFloat(player.price) - maxPrice) * 10) / 10;
                const playerPosColor = POSITION_COLORS[player.position as keyof typeof POSITION_COLORS];
                return (
                  <button
                    key={player.fpl_id}
                    onClick={() => handleSelect(player)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
                      isOverBudget
                        ? "hover:bg-red-900/20 bg-red-900/10"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${playerPosColor?.bg ?? "bg-gray-500"} flex items-center justify-center flex-shrink-0`}
                    >
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate">
                        {player.web_name}
                      </div>
                      <div className={`text-xs ${isOverBudget ? "text-red-400" : "text-slate-400"}`}>
                        {player.team?.short_name ?? "?"} &bull; {"\u00A3"}{player.price}m
                        {isOverBudget && (
                          <span className="ml-1 font-semibold">
                            (over by {"\u00A3"}{overBy.toFixed(1)}m)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {isOverBudget && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 mb-0.5 ml-auto" />
                      )}
                      <div className="text-sm font-bold text-white">
                        {player.form}
                      </div>
                      <div className="text-xs text-slate-500">
                        {player.total_points} pts
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
