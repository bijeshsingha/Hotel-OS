"use client";

import React from "react";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string | number;
  badgeVariant?: "blue" | "green" | "amber" | "red" | "grey";
  icon?: React.ComponentType<{ className?: string }>;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  className = "",
}: SegmentedControlProps<T>) {
  const badgeColors: Record<string, string> = {
    blue: "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300",
    green: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300",
    red: "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300",
    grey: "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300",
  };

  return (
    <div
      className={`inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/90 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 max-w-full overflow-x-auto ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const Icon = opt.icon;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer select-none ${
              size === "sm" ? "px-2.5 py-1 text-xs min-h-[34px]" : "px-3.5 py-1.5 text-xs min-h-[40px]"
            } ${
              isActive
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />}
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold font-mono ${
                  opt.badgeVariant
                    ? badgeColors[opt.badgeVariant]
                    : isActive
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
