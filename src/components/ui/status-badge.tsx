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
      badge: "bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60",
      dot: "bg-blue-500",
    },
    green: {
      badge: "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60",
      dot: "bg-emerald-500",
    },
    amber: {
      badge: "bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
      dot: "bg-amber-500",
    },
    red: {
      badge: "bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60",
      dot: "bg-rose-500",
    },
    grey: {
      badge: "bg-zinc-100/90 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-zinc-700/80",
      dot: "bg-zinc-400 dark:bg-zinc-500",
    },
  };

  const v = variantStyles[variant] || variantStyles.grey;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border shrink-0 select-none ${sizeClasses} ${v.badge} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${v.dot}`} />}
      <span>{label}</span>
    </span>
  );
}
