"use client";

import React from "react";

export type StatusVariant = "blue" | "green" | "amber" | "red" | "grey";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  label,
  variant = "grey",
  dot = false,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const variantStyles: Record<StatusVariant, { badge: string; dot: string }> = {
    blue: {
      badge: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
      dot: "bg-blue-500",
    },
    green: {
      badge: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
      dot: "bg-emerald-500",
    },
    amber: {
      badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
      dot: "bg-amber-500",
    },
    red: {
      badge: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
      dot: "bg-rose-500",
    },
    grey: {
      badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
      dot: "bg-zinc-400",
    },
  };

  const v = variantStyles[variant] || variantStyles.grey;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg font-bold font-mono border uppercase tracking-wider shrink-0 select-none ${sizeClasses} ${v.badge} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${v.dot}`} />}
      <span>{label}</span>
    </span>
  );
}
