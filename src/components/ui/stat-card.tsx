"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "blue" | "green" | "amber" | "red";
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = "default",
  badge,
  onClick,
  className = "",
}: StatCardProps) {
  const variantClasses: Record<string, { card: string; iconBg: string; text: string }> = {
    default: {
      card: "bg-white dark:bg-[#121215] border-zinc-200/80 dark:border-zinc-800",
      iconBg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
      text: "text-zinc-950 dark:text-zinc-50",
    },
    blue: {
      card: "bg-white dark:bg-[#121215] border-blue-200 dark:border-blue-900/50",
      iconBg: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
      text: "text-blue-600 dark:text-blue-400",
    },
    green: {
      card: "bg-white dark:bg-[#121215] border-emerald-200 dark:border-emerald-900/50",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    amber: {
      card: "bg-white dark:bg-[#121215] border-amber-200 dark:border-amber-900/50",
      iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
      text: "text-amber-600 dark:text-amber-400",
    },
    red: {
      card: "bg-white dark:bg-[#121215] border-rose-200 dark:border-rose-900/50",
      iconBg: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400",
      text: "text-rose-600 dark:text-rose-400",
    },
  };

  const v = variantClasses[variant] || variantClasses.default;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 space-y-2 transition-all ${
        onClick ? "cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
          {label}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span className="rounded-full px-2 py-0.5 text-xs font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {badge}
            </span>
          )}
          {Icon && (
            <div className={`p-2 rounded-xl ${v.iconBg}`}>
              <Icon className="h-4.5 w-4.5" />
            </div>
          )}
        </div>
      </div>

      <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums text-zinc-950 dark:text-zinc-50">
        {value}
      </div>

      {subtext && (
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
}
