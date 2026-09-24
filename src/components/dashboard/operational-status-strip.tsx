"use client";

import React from "react";
import { CheckCircle2, RotateCcw, AlertTriangle, UtensilsCrossed } from "lucide-react";

interface OperationalStatusStripProps {
  inspectedRooms: number;
  dirtyRooms: number;
  outOfOrderRooms: number;
  openKots: number;
}

export function OperationalStatusStrip({
  inspectedRooms,
  dirtyRooms,
  outOfOrderRooms,
  openKots,
}: OperationalStatusStripProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 space-y-4">
      <div>
        <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
          Live Operational Status
        </h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Housekeeping turnarounds and kitchen service queues
        </p>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 pt-1">
        <div className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm">
              Clean and Inspected
            </span>
          </div>
          <span className="font-mono font-bold text-xl text-emerald-600 dark:text-emerald-400">
            {inspectedRooms}
          </span>
        </div>

        <div className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm">
              Dirty / In Turnover
            </span>
          </div>
          <span className="font-mono font-bold text-xl text-amber-600 dark:text-amber-400">
            {dirtyRooms}
          </span>
        </div>

        <div className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm">
              Out of Order (Maintenance)
            </span>
          </div>
          <span className="font-mono font-bold text-xl text-rose-600 dark:text-rose-400">
            {outOfOrderRooms}
          </span>
        </div>

        <div className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-2.5">
            <UtensilsCrossed className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm">
              Active Dining KOTs
            </span>
          </div>
          <span className="font-mono font-bold text-xl text-blue-600 dark:text-blue-400">
            {openKots}
          </span>
        </div>
      </div>
    </div>
  );
}
