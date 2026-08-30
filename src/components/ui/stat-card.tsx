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
      card: "bg-white dark:bg-[#111114] border-zinc-200/80 dark:border-zinc-800/80",
      iconBg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
      text: "text-zinc-900 dark:text-white",
    },
    blue: {
      card: "bg-white dark:bg-[#111114] border-blue-200 dark:border-blue-900/50",
      iconBg: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
      text: "text-blue-600 dark:text-blue-400",
    },
    green: {
      card: "bg-white dark:bg-[#111114] border-emerald-200 dark:border-emerald-900/50",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    amber: {
      card: "bg-white dark:bg-[#111114] border-amber-200 dark:border-amber-900/50",
      iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
      text: "text-amber-600 dark:text-amber-400",
    },
    red: {
      card: "bg-white dark:bg-[#111114] border-rose-200 dark:border-rose-900/50",
      iconBg: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400",
      text: "text-rose-600 dark:text-rose-400",
    },
  };

  const v = variantClasses[variant] || variantClasses.default;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-4 shadow-xs space-y-1.5 transition-all ${v.card} ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className="rounded-md px-1.5 py-0.5 text-[9.5px] font-bold font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {badge}
            </span>
          )}
          {Icon && (
            <div className={`h-7 w-7 rounded-xl flex items-center justify-center ${v.iconBg}`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      <div className={`text-2xl font-bold font-mono tracking-tight ${v.text}`}>
        {value}
      </div>

      {subtext && (
        <p className="text-[11.5px] text-zinc-500 truncate font-mono">
          {subtext}
        </p>
      )}
    </div>
  );
}
