"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { myTeamApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import {
  Zap,
  Trophy,
  Crown,
  TrendingUp,
  ArrowRight,
  Search,
  LayoutDashboard,
  BarChart3,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { MyTeamResponse } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [teamId, setTeamId] = useState(user?.fpl_team_id?.toString() ?? "");

  const mutation = useMutation({
    mutationFn: (id: number) => myTeamApi.load(id),
  });

  const data = mutation.data?.data as MyTeamResponse | undefined;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center border-white/10 max-w-md">
          <Zap className="w-10 h-10 text-[#00FF87] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-slate-400 mb-6">Sign in to access your dashboard.</p>
          <Link href="/login">
            <Button className="bg-[#00FF87] text-[#0a0e1a] hover:bg-[#00e676] font-bold">
              Login
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-1">Dashboard</h1>
            <p className="text-slate-400">Welcome back, {user.name}</p>
          </div>

          {/* Team ID Input */}
          {!data && (
            <Card className="p-6 border-white/10 mb-8">
              <h2 className="text-sm font-medium text-slate-400 mb-3">Load your FPL team</h2>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Enter your FPL Team ID"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="pl-10 bg-[#0a0e1a] border-white/10"
                  />
                </div>
                <Button
                  className="bg-[#00FF87] text-[#0a0e1a] hover:bg-[#00e676] font-bold"
                  disabled={!teamId || mutation.isPending}
                  onClick={() => mutation.mutate(parseInt(teamId, 10))}
                >
                  {mutation.isPending ? "Loading..." : "Load Team"}
                </Button>
              </div>
              {mutation.isError && (
                <div className="mt-3">
                  <ErrorState
                    message="Failed to load team. Check your Team ID and try again."
                    onRetry={() => mutation.mutate(parseInt(teamId, 10))}
                  />
                </div>
              )}
            </Card>
          )}

          {/* Loading */}
          {mutation.isPending && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          )}

          {/* Dashboard Widgets */}
          {data && (
            <>
              {/* Team Info */}
              <Card className="p-6 border-white/10 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00FF87] to-emerald-500 flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#0a0e1a]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{data.team_info.team_name}</h2>
                    <p className="text-slate-400 text-sm">{data.team_info.manager_name}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm text-slate-500">Gameweek {data.team_info.gameweek}</p>
                    <button
                      onClick={() => { mutation.reset(); }}
                      className="text-xs text-slate-500 hover:text-[#00FF87] transition-colors"
                    >
                      Change team
                    </button>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {/* Total Points */}
                <DashboardCard
                  icon={Trophy}
                  label="Total Points"
                  value={data.team_info.overall_points.toString()}
                  accent="amber"
                  sublabel={`Rank: ${data.team_info.overall_rank?.toLocaleString() ?? "N/A"}`}
                />

                {/* Predicted Points */}
                <DashboardCard
                  icon={Zap}
                  label="GW Prediction"
                  value={data.analysis.current_xi_predicted.toFixed(1)}
                  accent="green"
                  sublabel={`Best lineup: ${data.analysis.optimal_xi_predicted.toFixed(1)}`}
                />

                {/* Captain Pick */}
                <DashboardCard
                  icon={Crown}
                  label="AI Captain Pick"
                  value={
                    data.squad.find(
                      (e) => e.player.fpl_id === data.analysis.optimal_captain_fpl_id
                    )?.player.web_name ?? "—"
                  }
                  accent="amber"
                  sublabel="Highest predicted points"
                />

                {/* Improvement */}
                <DashboardCard
                  icon={TrendingUp}
                  label="Points Available"
                  value={
                    data.analysis.points_improvement > 0
                      ? `+${data.analysis.points_improvement.toFixed(1)}`
                      : "0"
                  }
                  accent={data.analysis.points_improvement > 0 ? "green" : "slate"}
                  sublabel={
                    data.analysis.points_improvement > 0
                      ? "Switch to best lineup"
                      : "Lineup is already optimal"
                  }
                />
              </div>

              {/* Quick Actions */}
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <QuickAction href="/my-team" icon={LayoutDashboard} label="View Full Team" />
                <QuickAction href="/captain-picker" icon={Crown} label="Captain Picker" />
                <QuickAction href="/compare" icon={BarChart3} label="Compare Players" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  icon: Icon,
  label,
  value,
  accent,
  sublabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: "green" | "amber" | "slate" | "blue";
  sublabel?: string;
}) {
  const accentColors = {
    green: "text-[#00FF87] border-[#00FF87]/20",
    amber: "text-amber-400 border-amber-400/20",
    slate: "text-slate-400 border-white/5",
    blue: "text-sky-400 border-sky-400/20",
  };

  return (
    <Card className={`p-5 border-white/10 hover:${accentColors[accent].split(" ")[1]} transition-colors`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${accentColors[accent].split(" ")[0]}`} />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className={`text-2xl font-black ${accentColors[accent].split(" ")[0]} stat-number`}>
        {value}
      </div>
      {sublabel && (
        <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
      )}
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link href={href}>
      <Card className="p-4 border-white/10 hover:border-[#00FF87]/20 transition-colors cursor-pointer group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-slate-400 group-hover:text-[#00FF87] transition-colors" />
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
              {label}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-[#00FF87] transition-colors" />
        </div>
      </Card>
    </Link>
  );
}
