"use client";

import React, { useEffect, useState } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR } from "@/lib/gst/calculator";
import {
  TrendingUp,
  BedDouble,
  DollarSign,
  UtensilsCrossed,
  Receipt,
  AlertTriangle,
  Sparkles,
  Building2,
  Calendar,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const { activeProperty, refreshKey } = useHotel();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProperty) return;
    setLoading(true);
    fetch(`/api/v1/dashboard?propertyId=${activeProperty.id}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Dashboard error:", err))
      .finally(() => setLoading(false));
  }, [activeProperty, refreshKey]);

  if (loading || !data) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <span>Loading operational metrics...</span>
        </div>
      </div>
    );
  }

  const { kpis, trendHistory, propertiesComparison } = data;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Property Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-[#111114] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-zinc-100">
              {activeProperty?.displayName}
            </h1>
            <span className="rounded px-2 py-0.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              LIVE
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            GSTIN: {data.property.gstin || "N/A"} • Code: {activeProperty?.code}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="rounded-md bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-right">
            <span className="text-zinc-500 text-[10px] block">BUSINESS DATE</span>
            <span className="font-medium text-zinc-200">{activeProperty?.businessDate}</span>
          </div>
          <div className="rounded-md bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-right">
            <span className="text-zinc-500 text-[10px] block">AUDIT CUTOFF</span>
            <span className="font-medium text-amber-400">03:00 AM</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Occupancy % */}
        <div className="p-3.5 rounded-lg bg-[#111114] border border-zinc-800 hover:border-zinc-700 transition">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Occupancy</span>
            <BedDouble className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-100 font-mono tabular-nums">{kpis.occupancyPct}%</span>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center">
              <ArrowUpRight className="h-3 w-3" /> +4.2%
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 font-mono">
            {kpis.inHouseStays} / {kpis.totalRooms} rooms occupied
          </div>
        </div>

        {/* RevPAR */}
        <div className="p-3.5 rounded-lg bg-[#111114] border border-zinc-800 hover:border-zinc-700 transition">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">RevPAR</span>
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-100 font-mono tabular-nums">{formatINR(kpis.revpar)}</span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 font-mono">
            ADR: <span className="text-zinc-300">{formatINR(kpis.adr)}</span>
          </div>
        </div>

        {/* Total Day Revenue */}
        <div className="p-3.5 rounded-lg bg-[#111114] border border-zinc-800 hover:border-zinc-700 transition">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Day Revenue</span>
            <DollarSign className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-100 font-mono tabular-nums">{formatINR(kpis.grossRevenue)}</span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
            <span>Room: {formatINR(kpis.roomRevenue)}</span>
            <span>F&B: {formatINR(kpis.fbRevenue)}</span>
          </div>
        </div>

        {/* Total Taxes & Folios */}
        <div className="p-3.5 rounded-lg bg-[#111114] border border-zinc-800 hover:border-zinc-700 transition">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">GST Collected</span>
            <Receipt className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-100 font-mono tabular-nums">{formatINR(kpis.totalTaxes)}</span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 font-mono">
            Folio Balances: <span className="text-rose-400">{formatINR(kpis.outstandingFolioBalance)}</span>
          </div>
        </div>
      </div>

      {/* 14-Day Performance Trend Chart & Operational Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 p-4 rounded-lg bg-[#111114] border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Revenue Trend (14 Days)</h2>
              <p className="text-[11px] text-zinc-500">Daily room and F&B progression</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Room
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> F&B
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
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
                <CartesianGrid strokeDasharray="2 2" stroke="#27272a" opacity={0.6} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => val.slice(5)}
                  stroke="#71717a"
                  fontSize={10}
                  fontFamily="JetBrains Mono"
                />
                <YAxis stroke="#71717a" fontSize={10} fontFamily="JetBrains Mono" tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "0.375rem",
                    fontSize: "11px",
                    fontFamily: "JetBrains Mono",
                    color: "#f4f4f5",
                  }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]}
                />
                <Area
                  type="monotone"
                  dataKey="ROOM_REVENUE"
                  name="Room Rev"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorRoom)"
                />
                <Area
                  type="monotone"
                  dataKey="FB_REVENUE"
                  name="F&B Rev"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorFb)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Status */}
        <div className="p-4 rounded-lg bg-[#111114] border border-zinc-800 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Live Status</h2>
            <p className="text-[11px] text-zinc-500">Room and outlet status</p>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-md bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-zinc-300">Clean & Inspected</span>
              </div>
              <span className="font-semibold text-emerald-400 tabular-nums">{kpis.inspectedRooms}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-zinc-300">Dirty / Cleaning</span>
              </div>
              <span className="font-semibold text-amber-400 tabular-nums">{kpis.dirtyRooms}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-zinc-300">Out of Order</span>
              </div>
              <span className="font-semibold text-rose-400 tabular-nums">{kpis.outOfOrderRooms}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-zinc-300">Open KOTs</span>
              </div>
              <span className="font-semibold text-blue-400 tabular-nums">{kpis.openKots}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Property Overview */}
      <div className="p-4 rounded-lg bg-[#111114] border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Properties in Portfolio</h2>
            <p className="text-[11px] text-zinc-500 font-mono">Brahmaputra Hospitality Pvt Ltd</p>
          </div>
          <span className="rounded px-2 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
            2 PROPERTIES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {propertiesComparison.map((prop: any) => (
            <div
              key={prop.id}
              className={`rounded-md p-3 border transition flex flex-col justify-between ${
                prop.id === activeProperty?.id
                  ? "bg-zinc-900/80 border-blue-500/40"
                  : "bg-zinc-900/30 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-xs text-zinc-100 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                    {prop.name}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{prop.city} • Code: {prop.code}</div>
                </div>
                {prop.id === activeProperty?.id ? (
                  <span className="rounded bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 text-[9px] font-mono text-blue-400">
                    SELECTED
                  </span>
                ) : (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[9px] font-mono text-zinc-400">
                    ACTIVE
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-zinc-800/80 text-center font-mono text-xs">
                <div>
                  <div className="text-[10px] text-zinc-500">Rooms</div>
                  <div className="font-semibold text-zinc-200 tabular-nums">{prop.totalRooms}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">In-House</div>
                  <div className="font-semibold text-blue-400 tabular-nums">{prop.inHouseStays}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Occupancy</div>
                  <div className="font-semibold text-emerald-400 tabular-nums">{prop.occupancyPct}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
