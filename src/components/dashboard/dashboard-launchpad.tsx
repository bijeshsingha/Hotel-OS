"use client";

import React from "react";
import Link from "next/link";
import { BedDouble, Calendar, UtensilsCrossed, ArrowUpRight } from "lucide-react";

interface DashboardLaunchpadProps {
  totalRooms: number;
  inspectedRooms: number;
}

export function DashboardLaunchpad({
  totalRooms,
  inspectedRooms,
}: DashboardLaunchpadProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Link
        href="/pms"
        className="group p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition flex items-center justify-between hover:shadow-xs"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              Front Desk Rack
            </div>
            <div className="text-sm text-zinc-500 font-mono mt-0.5">
              {inspectedRooms} of {totalRooms} rooms ready
            </div>
          </div>
        </div>
        <ArrowUpRight className="h-5 w-5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition" />
      </Link>

      <Link
        href="/pms?tab=reservations"
        className="group p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition flex items-center justify-between hover:shadow-xs"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              Reservations
            </div>
            <div className="text-sm text-zinc-500 mt-0.5">
              Advance bookings schedule
            </div>
          </div>
        </div>
        <ArrowUpRight className="h-5 w-5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition" />
      </Link>

      <Link
        href="/order"
        className="group p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition flex items-center justify-between hover:shadow-xs"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              Dining POS
            </div>
            <div className="text-sm text-zinc-500 mt-0.5">
              Restaurant and room service
            </div>
          </div>
        </div>
        <ArrowUpRight className="h-5 w-5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition" />
      </Link>
    </div>
  );
}
