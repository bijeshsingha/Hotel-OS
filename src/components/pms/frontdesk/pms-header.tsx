"use client";

import React from "react";
import { Plus, UserPlus } from "lucide-react";

interface PmsHeaderProps {
  propertyName?: string;
  businessDate?: string;
  metrics: {
    total: number;
    occupied: number;
    vacantClean: number;
    vacantDirty: number;
    outOfOrder: number;
    occPercent: number;
    totalPax: number;
  };
  onNewReservation: () => void;
  onGrcCheckIn: () => void;
}

export function PmsHeader({
  propertyName,
  businessDate,
  metrics,
  onNewReservation,
  onGrcCheckIn,
}: PmsHeaderProps) {
  return (
    <div className="space-y-6 pb-6 border-b border-zinc-200/80 dark:border-zinc-800">
      {/* Top Bar: Title & Primary Front Office Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
              Front Desk
            </h1>
            {propertyName && (
              <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-0.5 rounded-lg">
                {propertyName}
              </span>
            )}
            {businessDate && (
              <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                Audit Date: {businessDate}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time room rack, resident guest directory, and front office management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNewReservation}
            className="h-10 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Booking</span>
          </button>

          <button
            onClick={onGrcCheckIn}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>GRC Check-In</span>
          </button>
        </div>
      </div>

      {/* Operational Metrics: Open, unboxed layout with massive readable typography */}
      <div className="flex flex-wrap items-center gap-6 sm:gap-12 pt-1">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Occupancy
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-zinc-950 dark:text-zinc-50">
              {metrics.occPercent}%
            </span>
            <span className="text-sm font-medium text-zinc-400">
              ({metrics.occupied}/{metrics.total})
            </span>
          </div>
        </div>

        <div className="h-10 w-px bg-zinc-200/80 dark:bg-zinc-800 hidden sm:block" />

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Vacant Ready
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            {metrics.vacantClean}
          </div>
        </div>

        <div className="h-10 w-px bg-zinc-200/80 dark:bg-zinc-800 hidden sm:block" />

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Turnover Dirty
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
            {metrics.vacantDirty}
          </div>
        </div>

        <div className="h-10 w-px bg-zinc-200/80 dark:bg-zinc-800 hidden sm:block" />

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Out of Order
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
            {metrics.outOfOrder}
          </div>
        </div>

        <div className="h-10 w-px bg-zinc-200/80 dark:bg-zinc-800 hidden sm:block" />

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            In-House Guests
          </span>
          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-zinc-950 dark:text-zinc-50">
            {metrics.totalPax} <span className="text-sm font-semibold font-sans text-zinc-400">Pax</span>
          </div>
        </div>
      </div>
    </div>
  );
}
