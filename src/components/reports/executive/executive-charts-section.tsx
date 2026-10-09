"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ExecutiveChartPoint } from "@/lib/domain/executive-report-service";
import { formatINR } from "@/lib/gst/calculator";

interface ExecutiveChartsSectionProps {
  dailyTrend: ExecutiveChartPoint[];
  revenueSplit: Array<{ name: string; value: number }>;
  collectionsByMethod: Array<{ name: string; value: number }>;
  receivablesAging: Array<{ name: string; count: number; amount: number }>;
}

const PIE_COLORS = ["#0f172a", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];

export const ExecutiveChartsSection: React.FC<ExecutiveChartsSectionProps> = ({
  dailyTrend,
  revenueSplit,
  collectionsByMethod,
  receivablesAging,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Daily Trend Chart (Area Chart) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Daily Financial Velocity: Revenue vs. Collections vs. Expenses
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparing earned billings, cash/online inflows, and operational outflows
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-slate-100" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Collections
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Expenses
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          {dailyTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No trend data available for selected dates.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorColl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatINR(Number(val)),
                    name === "totalRevenue"
                      ? "Earned Revenue"
                      : name === "collections"
                      ? "Collections Inflow"
                      : "Operating Expenses",
                  ]}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalRevenue"
                  stroke="#0f172a"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
                <Area
                  type="monotone"
                  dataKey="collections"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorColl)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorExp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Secondary Analytics Grid (Pie Charts + Aging Bar Chart) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Mix Donut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Earned Revenue Mix
          </h4>
          <div className="h-48 w-full">
            {revenueSplit.every((r) => r.value === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No revenue recorded in period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueSplit.filter((r) => r.value > 0)}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueSplit.map((entry, index) => (
                      <Cell
                        key={`rev-cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [formatINR(Number(v)), "Revenue"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-1 mt-2 text-[11px]">
            {revenueSplit.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatINR(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Collections by Method Donut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Collections Settlement
          </h4>
          <div className="h-48 w-full">
            {collectionsByMethod.every((c) => c.value === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No collections recorded in period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={collectionsByMethod.filter((c) => c.value > 0)}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {collectionsByMethod.map((entry, index) => (
                      <Cell
                        key={`coll-cell-${index}`}
                        fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [formatINR(Number(v)), "Collected"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-1 mt-2 text-[11px]">
            {collectionsByMethod.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[(idx + 2) % PIE_COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatINR(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Receivables Aging Bracket (Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Receivables Aging (&gt; ₹5k)
          </h4>
          <div className="h-48 w-full pt-1">
            {receivablesAging.every((a) => a.amount === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Zero overdue accounts &gt; ₹5,000
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receivablesAging} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                  <YAxis
                    fontSize={10}
                    stroke="#94a3b8"
                    tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatINR(Number(val)), "Outstanding"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                  <Bar dataKey="amount" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-1 mt-2 text-[11px]">
            {receivablesAging.map((b) => (
              <div key={b.name} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>{b.name} ({b.count} accounts)</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {formatINR(b.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
