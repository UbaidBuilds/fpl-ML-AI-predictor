"use client";

import { Crown, Users, Wand2, Zap } from "lucide-react";

const CHIPS = [
  {
    key: "3xc",
    label: "TC",
    fullLabel: "Triple Captain",
    icon: Crown,
    activeClass: "bg-yellow-500/20 border-yellow-500/50 text-yellow-300",
    iconColor: "text-yellow-400",
  },
  {
    key: "bboost",
    label: "BB",
    fullLabel: "Bench Boost",
    icon: Users,
    activeClass: "bg-sky-500/20 border-sky-500/50 text-sky-300",
    iconColor: "text-sky-400",
  },
  {
    key: "wildcard",
    label: "WC",
    fullLabel: "Wildcard",
    icon: Wand2,
    activeClass: "bg-[#00FF87]/15 border-[#00FF87]/50 text-[#00FF87]",
    iconColor: "text-[#00FF87]",
  },
  {
    key: "freehit",
    label: "FH",
    fullLabel: "Free Hit",
    icon: Zap,
    activeClass: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
    iconColor: "text-emerald-400",
  },
] as const;

interface Props {
  selectedChip: string | null;
  onSelectChip: (chip: string | null) => void;
  apiActiveChip?: string | null;
}

export function ChipSelector({ selectedChip, onSelectChip, apiActiveChip }: Props) {
  const isFromApi = apiActiveChip != null && apiActiveChip === selectedChip;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">
        Chips
      </span>
      {CHIPS.map((chip) => {
        const Icon = chip.icon;
        const isActive = selectedChip === chip.key;
        const isApiChip = apiActiveChip === chip.key;
        const noPointsImpact = chip.key === "wildcard" || chip.key === "freehit";

        return (
          <button
            key={chip.key}
            onClick={() => {
              if (isApiChip) return; // Can't deselect API-active chip
              onSelectChip(isActive ? null : chip.key);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 ${
              isActive
                ? `${chip.activeClass} shadow-sm scale-105`
                : "bg-[#111827] border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/5"
            } ${isApiChip ? "cursor-default" : "cursor-pointer"}`}
            title={`${chip.fullLabel}${isApiChip ? " (active on FPL)" : ""}${noPointsImpact ? " — no points impact" : ""}`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? chip.iconColor : "text-slate-500"}`} />
            <span>{chip.label}</span>
            {isApiChip && (
              <span className="text-[9px] font-normal opacity-70 ml-0.5">LIVE</span>
            )}
            {isActive && noPointsImpact && (
              <span className="text-[9px] font-normal opacity-60 ml-0.5">0 hits</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
