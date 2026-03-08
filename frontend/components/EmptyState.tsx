"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <Icon className="w-12 h-12 text-slate-600 mb-4" />
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm">{description}</p>
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Link href={action.href}>
              <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" onClick={action.onClick} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
