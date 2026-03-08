"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MetricTooltipProps {
  explanation: string;
  className?: string;
}

export function MetricTooltip({ explanation, className }: MetricTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors",
            className
          )}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{explanation}</TooltipContent>
    </Tooltip>
  );
}

export const METRIC_EXPLANATIONS = {
  xPts: "AI-predicted points for the next gameweek based on form, fixtures, and historical performance.",
  confidence: "How certain the AI is about this prediction. Higher means more reliable.",
  form: "Average points per match over the last 30 days.",
  ownership: "Percentage of all FPL managers who currently own this player.",
  fixtureDifficulty: "Fixture difficulty: green = easy, yellow = medium, red = hard.",
  currentXI: "Total predicted points for your current starting lineup, including captain bonus.",
  optimalXI: "Total predicted points if you play the AI-recommended best lineup.",
  improvement: "Extra points you could gain by switching to the recommended lineup.",
} as const;
