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
  Clock,
  ChevronRight,
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
import { PageHeader, StatCard } from "@/components/ui";

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
    <div className="space-y-4 max-w-[1600px] mx-auto w-full">
      {/* Top Property Info Bar */}
      <PageHeader
        title={activeProperty?.displayName || "Hotel Management Dashboard"}
        description={`GSTIN: ${data.property?.gstin || "N/A"} • Property Code: ${activeProperty?.code || "DEFAULT"} • Multi-Property Portfolio`}
        badge="Live"
        badgeVariant="live"
        businessDate={activeProperty?.businessDate}
        metadata={
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 px-3 py-1.5 text-right shadow-xs shrink-0">
            <span className="text-zinc-400 text-[10px] block font-semibold uppercase">Audit Cutoff</span>
            <span className="font-bold font-mono text-xs text-amber-600 dark:text-amber-400">03:00 AM</span>
          </div>
        }
      />

      {/* Front Desk & Operations Launchpad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <a
          href="/pms"
          className="group p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all shadow-xs space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <BedDouble className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  PMS Room Rack
                </h3>
                <p className="text-xs text-zinc-500">
                  {kpis.totalRooms} Rooms Total • {kpis.inspectedRooms} Clean & Ready
                </p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Front Desk & Intake</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              Open Grid <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </a>

        <a
          href="/pms?tab=reservations"
          className="group p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all shadow-xs space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Calendar className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  Future Bookings
                </h3>
                <p className="text-xs text-zinc-500">Advance Room Reservations</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Create & Manage Bookings</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
              Bookings Suite <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </a>

        <a
          href="/order"
          className="group p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all shadow-xs space-y-2.5 sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <UtensilsCrossed className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                  In-Room Dining POS
                </h3>
                <p className="text-xs text-zinc-500">93 Menu Items Active</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Restaurant & Room Service</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              Open Menu <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </a>
      </div>

      {/* KPI Stats Grid (4 -> 2 -> 1 Responsive Reflow) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Occupancy % */}
        <StatCard
          label="Occupancy"
          value={`${kpis.occupancyPct}%`}
          subtext={`${kpis.inHouseStays} / ${kpis.totalRooms} rooms occupied`}
          icon={BedDouble}
          variant="blue"
          badge="+4.2%"
        />

        {/* RevPAR */}
        <StatCard
          label="RevPAR"
          value={formatINR(kpis.revpar)}
          subtext={`ADR: ${formatINR(kpis.adr)} / occupied`}
          icon={TrendingUp}
          variant="green"
        />

        {/* Total Day Revenue */}
        <StatCard
          label="Day Revenue"
          value={formatINR(kpis.grossRevenue)}
          subtext={`Room: ${formatINR(kpis.roomRevenue)} • F&B: ${formatINR(kpis.fbRevenue)}`}
          icon={DollarSign}
          variant="amber"
        />

        {/* Total Taxes & Outstanding */}
        <StatCard
          label="GST Collected"
          value={formatINR(kpis.totalTaxes)}
          subtext={`Folio Balances: ${formatINR(kpis.outstandingFolioBalance)}`}
          icon={Receipt}
          variant="default"
        />
      </div>

      {/* 14-Day Performance Trend Chart & Operational Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Revenue Trend (14 Days)</h2>
              <p className="text-xs text-zinc-500">Daily room and F&B progression</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Room
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> F&B
              </span>
            </div>
          </div>

          <div className="h-60 w-full pt-2">
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
                <CartesianGrid strokeDasharray="2 2" stroke="#71717a" opacity={0.15} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => val.slice(5)}
                  stroke="#71717a"
                  fontSize={11}
                />
                <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "0.75rem",
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

        {/* Operational Status */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Live Room Status</h2>
            <p className="text-xs text-zinc-500">Housekeeping and outlet metrics</p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">Clean & Inspected</span>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{kpis.inspectedRooms}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">Dirty / Cleaning</span>
              </div>
              <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{kpis.dirtyRooms}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">Out of Order</span>
              </div>
              <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">{kpis.outOfOrderRooms}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">Open Dining KOTs</span>
              </div>
              <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{kpis.openKots}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Property Overview */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Properties in Portfolio</h2>
            <p className="text-xs text-zinc-500">Brahmaputra Hospitality Pvt Ltd</p>
          </div>
          <span className="rounded-lg px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 uppercase tracking-wide">
            2 Properties
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {propertiesComparison.map((prop: any) => (
            <div
              key={prop.id}
              className={`rounded-2xl p-4 border transition flex flex-col justify-between shadow-xs ${
                prop.id === activeProperty?.id
                  ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-500/40"
                  : "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-zinc-400" />
                    {prop.name}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{prop.city} • Code: <span className="font-mono">{prop.code}</span></div>
                </div>
                {prop.id === activeProperty?.id ? (
                  <span className="rounded-md bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                    Selected
                  </span>
                ) : (
                  <span className="rounded-md bg-zinc-200/80 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:text-zinc-400">
                    Active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 text-center text-xs">
                <div>
                  <div className="text-[11px] text-zinc-500">Rooms</div>
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">{prop.totalRooms}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">In-House</div>
                  <div className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{prop.inHouseStays}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">Occupancy</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{prop.occupancyPct}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
