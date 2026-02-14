"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { playerApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerCard } from "@/components/PlayerCard";
import { EmptyState } from "@/components/EmptyState";
import type { PlayerQueryParams } from "@/lib/types";

const POSITIONS = [
  { label: "All", value: "" },
  { label: "GK", value: "GKP" },
  { label: "DEF", value: "DEF" },
  { label: "MID", value: "MID" },
  { label: "FWD", value: "FWD" },
];

export default function PlayersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [position, setPosition] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const params: PlayerQueryParams = {
    sort: "total_points",
    dir: "desc",
    per_page: 24,
    page,
  };
  if (debouncedSearch) params.search = debouncedSearch;
  if (position) params.position = position;

  const { data, isLoading } = useQuery({
    queryKey: ["players", params],
    queryFn: () => playerApi.getAll(params),
  });

  const players = data?.data.data ?? [];
  const currentPage = data?.data.current_page ?? 1;
  const lastPage = data?.data.last_page ?? 1;
  const total = data?.data.total ?? 0;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
            Players
          </h1>
          <p className="text-slate-400">
            Browse and discover Premier League players
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-14 text-lg bg-[#111827] border-white/10"
          />
        </div>

        {/* Position Filters */}
        <div className="flex justify-center gap-2 mb-8">
          {POSITIONS.map((pos) => (
            <Button
              key={pos.value}
              variant={position === pos.value ? "default" : "outline"}
              size="sm"
              className={
                position === pos.value
                  ? "bg-[#00FF87] text-[#0a0e1a] hover:bg-[#00e676] font-bold"
                  : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
              }
              onClick={() => {
                setPosition(pos.value);
                setPage(1);
              }}
            >
              {pos.label}
            </Button>
          ))}
        </div>

        {/* Total count */}
        {!isLoading && (
          <p className="text-center text-sm text-slate-500 mb-6">
            {total} players found
          </p>
        )}

        {/* Players Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No players found"
            description="Try adjusting your search or position filter."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
            >
              Previous
            </Button>
            <span className="text-sm text-slate-500">
              Page {currentPage} of {lastPage}
            </span>
            <Button
              variant="outline"
              disabled={currentPage >= lastPage}
              onClick={() => setPage((p) => p + 1)}
              className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
