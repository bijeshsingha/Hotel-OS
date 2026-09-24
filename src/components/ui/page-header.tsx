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
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
      <div className="space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          {Icon && (
            <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
            {title}
          </h1>
          {badge && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border flex items-center gap-1.5 shrink-0 ${
                badgeStyles[badgeVariant] || badgeStyles.neutral
              }`}
            >
              {badgeVariant === "live" && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-3xl">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap md:self-center">
        {metadata}
        {businessDate && (
          <div className="flex items-center gap-2.5 h-10 px-3.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-sm shrink-0 select-none">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <Calendar className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
              <span>Date</span>
            </span>
            <span className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-700" />
            <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {businessDate}
            </span>
          </div>
        )}
        {actions}
      </div>
    </div>
  );
}
