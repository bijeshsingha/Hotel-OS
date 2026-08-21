"use client";

import React, { useEffect, useState } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR } from "@/lib/gst/calculator";
import {
  BarChart3,
  Download,
  Users,
  DollarSign,
  UtensilsCrossed,
} from "lucide-react";

export default function ReportsPage() {
  const { activeProperty, refreshKey } = useHotel();
  const [reportType, setReportType] = useState<"FRONT_OFFICE" | "REVENUE" | "FNB">("FRONT_OFFICE");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProperty) return;
    setLoading(true);
    fetch(`/api/v1/reports?propertyId=${activeProperty.id}&type=${reportType}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Report error:", err))
      .finally(() => setLoading(false));
  }, [activeProperty, reportType, refreshKey]);

  const exportCSV = () => {
    if (!data?.rows || data.rows.length === 0) return;
    const headers = Object.keys(data.rows[0]);
    const csvRows = [
      headers.join(","),
      ...data.rows.map((row: any) =>
        headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProperty?.code}_${reportType}_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-lg bg-[#111114] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-zinc-400" />
              Operational & Financial Reports
            </h1>
            <span className="rounded px-1.5 py-0.2 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
              D02–D05
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Guest ledgers, revenue journals & CSV data exports
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 px-3 py-1.5 text-xs font-medium transition"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setReportType("FRONT_OFFICE")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            reportType === "FRONT_OFFICE"
              ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Guest Ledger (D02)
        </button>
        <button
          onClick={() => setReportType("REVENUE")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            reportType === "REVENUE"
              ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" /> Revenue & GST (D03)
        </button>
        <button
          onClick={() => setReportType("FNB")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            reportType === "FNB"
              ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          <UtensilsCrossed className="h-3.5 w-3.5" /> F&B Sales (D04)
        </button>
      </div>

      {/* Reports Table */}
      <div className="rounded-lg border border-zinc-800 bg-[#111114] overflow-hidden">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-200">
            {reportType === "FRONT_OFFICE" && "Front Office Guest Ledger"}
            {reportType === "REVENUE" && "Revenue & GST Transaction Journal"}
            {reportType === "FNB" && "F&B Outlet Sales Report"}
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            {data?.rows?.length || 0} rows
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportType === "FRONT_OFFICE" && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-2.5">Guest</th>
                  <th className="p-2.5">Phone</th>
                  <th className="p-2.5">Room</th>
                  <th className="p-2.5">Arrival</th>
                  <th className="p-2.5">Departure</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Folio Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data?.rows?.map((r: any) => (
                  <tr key={r.stayId} className="hover:bg-zinc-900/30 transition">
                    <td className="p-2.5 font-medium text-zinc-200">{r.guestName}</td>
                    <td className="p-2.5 text-zinc-500 font-mono text-[11px]">{r.phone || "—"}</td>
                    <td className="p-2.5 font-mono text-zinc-300">Room {r.roomNumber}</td>
                    <td className="p-2.5 text-zinc-400 font-mono text-[11px]">{r.arrival}</td>
                    <td className="p-2.5 text-zinc-400 font-mono text-[11px]">{r.departure}</td>
                    <td className="p-2.5">
                      <span className="rounded px-1.5 py-0.2 text-[9px] font-mono bg-zinc-800 text-zinc-300">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono font-medium text-rose-400 text-right tabular-nums">
                      {formatINR(r.folioBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === "REVENUE" && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Guest</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5">Code</th>
                  <th className="p-2.5 text-right">Taxable</th>
                  <th className="p-2.5 text-right">GST</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data?.rows?.map((r: any) => (
                  <tr key={r.id} className="hover:bg-zinc-900/30 transition">
                    <td className="p-2.5 font-mono text-zinc-500 text-[11px]">{r.serviceDate}</td>
                    <td className="p-2.5 font-medium text-zinc-200">{r.guestName}</td>
                    <td className="p-2.5 text-zinc-300">{r.description}</td>
                    <td className="p-2.5 font-mono text-blue-400 text-[11px]">{r.chargeCode}</td>
                    <td className="p-2.5 font-mono text-right tabular-nums">{formatINR(r.taxableAmount)}</td>
                    <td className="p-2.5 font-mono text-right text-zinc-400 tabular-nums">{formatINR(r.taxAmount)}</td>
                    <td className="p-2.5 font-mono font-medium text-emerald-400 text-right tabular-nums">
                      {formatINR(r.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === "FNB" && (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-2.5">Order #</th>
                  <th className="p-2.5">Outlet</th>
                  <th className="p-2.5">Mode</th>
                  <th className="p-2.5">Table</th>
                  <th className="p-2.5">Items</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data?.rows?.map((r: any) => (
                  <tr key={r.orderNo} className="hover:bg-zinc-900/30 transition">
                    <td className="p-2.5 font-mono font-medium text-blue-400">{r.orderNo}</td>
                    <td className="p-2.5 font-medium text-zinc-200">{r.outletName}</td>
                    <td className="p-2.5 text-zinc-400 font-mono text-[11px]">{r.mode}</td>
                    <td className="p-2.5 text-zinc-300">{r.tableName}</td>
                    <td className="p-2.5 font-mono text-zinc-400">{r.itemCount} items</td>
                    <td className="p-2.5">
                      <span className="rounded px-1.5 py-0.2 text-[9px] font-mono bg-zinc-800 text-zinc-300">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
