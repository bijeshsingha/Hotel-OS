"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface RevenueTrendChartProps {
  trendHistory: any[];
}

export function RevenueTrendChart({ trendHistory }: RevenueTrendChartProps) {
  return (
    <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200/70 dark:border-zinc-800/70 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Revenue Progression (14 Days)
          </h2>
          <p className="text-xs text-zinc-500">
            Daily room tariff and F&B intake
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Room
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> F&B
          </span>
        </div>
      </div>

      <div className="h-60 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRoom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorFb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="#71717a" opacity={0.15} />
            <XAxis
              dataKey="date"
              tickFormatter={(val) => (typeof val === "string" ? val.slice(5) : val)}
              stroke="#71717a"
              fontSize={11}
            />
            <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                borderColor: "#3f3f46",
                borderRadius: "0.5rem",
                fontSize: "12px",
                color: "#f4f4f5",
              }}
              formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]}
            />
            <Area
              type="monotone"
              dataKey="ROOM_REVENUE"
              name="Room Rev"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRoom)"
            />
            <Area
              type="monotone"
              dataKey="FB_REVENUE"
              name="F&B Rev"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorFb)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
