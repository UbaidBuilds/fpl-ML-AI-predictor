"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { playerApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { POSITION_COLORS } from "@/lib/constants";
import type { Player } from "@/lib/types";

const positionLetters: Record<string, string> = {
  GKP: "G",
  DEF: "D",
  MID: "M",
  FWD: "F",
};

interface PlayerSearchSelectProps {
  onSelect: (player: Player) => void;
  excludeIds: number[];
  disabled?: boolean;
  placeholder?: string;
}

export function PlayerSearchSelect({
  onSelect,
  excludeIds,
  disabled,
  placeholder = "Search for a player...",
}: PlayerSearchSelectProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: results, isLoading } = useQuery({
    queryKey: ["player-search", debouncedSearch],
    queryFn: () => playerApi.getAll({ search: debouncedSearch, per_page: 10 }),
    enabled: debouncedSearch.length >= 2,
  });

  const filteredResults =
    results?.data?.data?.filter((p) => !excludeIds.includes(p.id)) ?? [];

  const handleSelect = useCallback(
    (player: Player) => {
      onSelect(player);
      setSearch("");
      setDebouncedSearch("");
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }, []);

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    if (search.length >= 2) {
      setIsOpen(true);
    }
  }, [search]);

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedSearch]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
        <Input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="pl-10 h-12 bg-[#111827] border-white/10 text-white placeholder:text-slate-500"
          disabled={disabled}
        />
      </div>

      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] shadow-lg border border-white/10 rounded-lg z-40 max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-slate-400">Searching...</div>
          )}

          {!isLoading && filteredResults.length === 0 && debouncedSearch.length >= 2 && (
            <div className="px-4 py-3 text-sm text-slate-400">
              No players found
            </div>
          )}

          {filteredResults.map((player) => (
            <button
              key={player.id}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left min-h-[44px]"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(player);
              }}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0",
                  POSITION_COLORS[player.position as keyof typeof POSITION_COLORS]?.bg ?? "bg-slate-500"
                )}
              >
                {positionLetters[player.position] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {player.web_name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {player.team?.short_name ?? "?"} &bull; {player.position}
                </p>
              </div>
              <span className="text-sm text-slate-400 flex-shrink-0">
                &pound;{player.price}m
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
