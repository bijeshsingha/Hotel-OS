"use client";

import React, { useState } from "react";
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
import { TrendingUp, PieChart as PieIcon, BarChart3, Clock, DollarSign, Wallet } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";

interface RevenueAnalyticsChartProps {
  trendHistory: any[];
  collectionsByMethod?: Record<string, number>;
  hourlyCollections?: Array<{ hour: string; amount: number }>;
}

const METHOD_COLORS: Record<string, string> = {
  UPI: "#10b981", // Emerald
  CASH: "#f59e0b", // Amber
  CARD: "#3b82f6", // Blue
  OTA_VCC: "#8b5cf6", // Purple
  BANK_TRANSFER: "#06b6d4", // Cyan
  DIRECT_BILL: "#ec4899", // Pink
};

export function RevenueAnalyticsChart({
  trendHistory,
  collectionsByMethod = {},
  hourlyCollections = [],
}: RevenueAnalyticsChartProps) {
  const [activeView, setActiveView] = useState<"TREND" | "PAYMENT_MODES" | "HOURLY">("TREND");

  // Transform collectionsByMethod into PieChart data
  const paymentModeData = Object.entries(collectionsByMethod)
    .filter(([_, val]) => val > 0)
    .map(([method, amount]) => ({
      name: method.replace(/_/g, " "),
      methodKey: method,
      value: amount,
    }));

  const totalModeCollections = paymentModeData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
      
      {/* HEADER & VIEW SELECTOR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/60 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Financial Intelligence & Velocity
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeView === "TREND" && "14-day chronological room tariff and F&B intake progression"}
            {activeView === "PAYMENT_MODES" && "Channel breakdown of today's collections"}
            {activeView === "HOURLY" && "Hourly transaction velocity throughout the 24-hour cycle"}
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveView("TREND")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeView === "TREND"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>14-Day Trend</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView("PAYMENT_MODES")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeView === "PAYMENT_MODES"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <PieIcon className="h-3.5 w-3.5" />
            <span>Payment Modes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView("HOURLY")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeView === "HOURLY"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Hourly Flow</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: 14-DAY AREA REVENUE TREND */}
      {activeView === "TREND" && (
        <div className="space-y-2">
          <div className="flex items-center justify-end gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Room Tariff
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Restaurant & F&B
            </span>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRoom" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#71717a" opacity={0.15} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => (typeof val === "string" ? val.slice(5) : val)}
                  stroke="#71717a"
                  fontSize={11}
                />
                <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                    color: "#f4f4f5",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  }}
                  formatter={(value: any, name: any) => [`₹${Number(value).toLocaleString("en-IN")}`, name]}
                />
                <Area
                  type="monotone"
                  dataKey="ROOM_REVENUE"
                  name="Room Tariff"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRoom)"
                />
                <Area
                  type="monotone"
                  dataKey="FB_REVENUE"
                  name="F&B Food & Beverage"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorFb)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* VIEW 2: PAYMENT CHANNELS DONUT */}
      {activeView === "PAYMENT_MODES" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center min-h-[256px]">
          <div className="md:col-span-6 h-60 w-full relative flex items-center justify-center">
            {paymentModeData.length === 0 ? (
              <div className="text-center text-xs text-zinc-400">No collections recorded today</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentModeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentModeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={METHOD_COLORS[entry.methodKey] || "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#3f3f46",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "#f4f4f5",
                    }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Collected"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Center Metric */}
            {paymentModeData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Total</span>
                <span className="text-sm font-extrabold font-mono text-zinc-900 dark:text-white">
                  {formatINR(totalModeCollections)}
                </span>
              </div>
            )}
          </div>

          {/* Legend and Percentages */}
          <div className="md:col-span-6 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Settlement Channels Share
            </h3>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {paymentModeData.length === 0 ? (
                <p className="text-xs text-zinc-400">Waiting for today&apos;s settlements...</p>
              ) : (
                paymentModeData.map((item, idx) => {
                  const pct = totalModeCollections > 0 ? Math.round((item.value / totalModeCollections) * 100) : 0;
                  const color = METHOD_COLORS[item.methodKey] || "#64748b";
                  return (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-zinc-900 dark:text-white">{formatINR(item.value)}</span>
                        <span className="text-[10px] text-zinc-400 bg-zinc-200/60 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded font-bold">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: HOURLY TRANSACTION VELOCITY */}
      {activeView === "HOURLY" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-zinc-500">24-Hour Intake Intensity</span>
            <span className="text-blue-600 dark:text-blue-400">Peak Front Desk Transaction Periods</span>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyCollections} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#71717a" opacity={0.15} />
                <XAxis dataKey="hour" stroke="#71717a" fontSize={10} interval={2} />
                <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                    color: "#f4f4f5",
                  }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Collections"]}
                />
                <Bar dataKey="amount" name="Collections" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
