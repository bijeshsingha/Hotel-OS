"use client";

import React from "react";
import { Building2 } from "lucide-react";

interface PortfolioOverviewProps {
  propertiesComparison: any[];
  activePropertyId?: string;
}

export function PortfolioOverview({
  propertiesComparison,
  activePropertyId,
}: PortfolioOverviewProps) {
  if (!propertiesComparison || propertiesComparison.length === 0) return null;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
            Properties in Portfolio
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Multi-property occupancy & capacity overview
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-400 font-semibold">
          {propertiesComparison.length} {propertiesComparison.length === 1 ? "Property" : "Properties"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {propertiesComparison.map((prop) => {
          const isSelected = prop.id === activePropertyId;

          return (
            <div
              key={prop.id}
              className={`p-5 rounded-2xl border transition-all ${
                isSelected
                  ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900/60"
                  : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                    <Building2 className="h-4.5 w-4.5 text-zinc-400" />
                    {prop.name}
                  </div>
                  <div className="text-sm text-zinc-500 mt-1">
                    {prop.city} • Code: <span className="font-mono font-semibold">{prop.code}</span>
                  </div>
                </div>
                {isSelected ? (
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/80 px-2.5 py-1 rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-zinc-500 bg-zinc-200/70 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
                    Standby
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-3.5 border-t border-zinc-200/60 dark:border-zinc-800/60 text-center">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Rooms</div>
                  <div className="font-bold font-mono text-lg text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {prop.totalRooms}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">In-House</div>
                  <div className="font-bold font-mono text-lg text-blue-600 dark:text-blue-400 mt-0.5">
                    {prop.inHouseStays}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Occupancy</div>
                  <div className="font-bold font-mono text-lg text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {prop.occupancyPct}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
