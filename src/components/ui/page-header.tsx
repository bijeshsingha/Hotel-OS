"use client";

import React from "react";
import { Calendar } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "live" | "neutral" | "success" | "warning" | "danger" | "info";
  businessDate?: string;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  badgeVariant = "live",
  businessDate,
  metadata,
  actions,
}: PageHeaderProps) {
  const badgeStyles: Record<string, string> = {
    live: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
    success: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
    warning: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
    danger: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20",
    info: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
    neutral: "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          {Icon && (
            <div className="h-7 w-7 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {title}
          </h1>
          {badge && (
            <span
              className={`rounded-md px-2 py-0.5 text-[10.5px] font-bold border uppercase tracking-wide flex items-center gap-1 shrink-0 ${
                badgeStyles[badgeVariant] || badgeStyles.neutral
              }`}
            >
              {badgeVariant === "live" && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-3xl">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap md:self-center">
        {metadata}
        {businessDate && (
          <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-zinc-50/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 text-xs shadow-2xs shrink-0 select-none">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <Calendar className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
              <span>Business Date</span>
            </span>
            <span className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-700" />
            <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {businessDate}
            </span>
          </div>
        )}
        {actions}
      </div>
    </div>
  );
}
