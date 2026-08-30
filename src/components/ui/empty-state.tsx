"use client";

import React from "react";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ComponentType<{ className?: string }>;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-[#111114]/50 p-8 sm:p-12 text-center space-y-3 max-w-md mx-auto my-6 ${className}`}
    >
      <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 mx-auto flex items-center justify-center">
        <Icon className="h-6 w-6" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {(onAction || onSecondaryAction) && (
        <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
          {onSecondaryAction && secondaryActionLabel && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}

          {onAction && actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {ActionIcon && <ActionIcon className="h-3.5 w-3.5" />}
              <span>{actionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
