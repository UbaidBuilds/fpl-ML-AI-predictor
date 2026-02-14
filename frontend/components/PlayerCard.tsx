"use client";

import { motion } from "framer-motion";
import { TrendingUp, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { POSITION_COLORS, POSITION_LABELS } from "@/lib/constants";
import Link from "next/link";
import type { Player } from "@/lib/types";

export function PlayerCard({ player }: { player: Player }) {
  const posLabel = POSITION_LABELS[player.position] ?? player.position;
  const posColor = POSITION_COLORS[player.position as keyof typeof POSITION_COLORS]?.bg ?? "bg-slate-500";

  return (
    <Link href={`/player/${player.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-6 bg-[#111827] hover:bg-[#1a1f2e] border-white/5 hover:border-[#00FF87]/20 transition-all cursor-pointer card-glow">
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-full ${posColor} flex items-center justify-center flex-shrink-0`}
            >
              <User className="w-7 h-7 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">
                    {player.web_name}
                  </h3>
                  <p className="text-sm text-slate-400 truncate">
                    {player.team?.name ?? "Unknown"}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-2 flex-shrink-0">
                  {posLabel}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-[#00FF87] font-bold stat-number">
                    £{player.price}m
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-500">Form:</span>
                  <span className="font-semibold text-white stat-number">
                    {player.form}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Pts:</span>
                  <span className="font-semibold text-white stat-number">
                    {player.total_points}
                  </span>
                </div>
                {player.selected_by_percent && Number(player.selected_by_percent) > 0 && (
                  <div>
                    <span className="text-slate-500">Own:</span>
                    <span className="font-semibold text-slate-300 stat-number">
                      {player.selected_by_percent}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </Link>
  );
}
