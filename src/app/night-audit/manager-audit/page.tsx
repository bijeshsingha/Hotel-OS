"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR } from "@/lib/gst/calculator";
import {
  Moon,
  Calendar,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BedDouble,
  Activity,
  Wallet,
  Tag,
  Printer,
  X,
  RotateCcw,
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export default function DailyManagerAuditPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState("");

  // Sync date with active property if available
  useEffect(() => {
    if (activeProperty?.businessDate) {
      setSelectedDate(activeProperty.businessDate);
    }
  }, [activeProperty?.businessDate]);

  // Update Countdown to next 12:00 AM Midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diffMs = midnight.getTime() - now.getTime();
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeUntilMidnight(
          `${hours.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`
        );
      } else {
        setTimeUntilMidnight("00h 00m 00s");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Daily Midnight Manager Report
  const loadDailyReport = async () => {
    if (!activeProperty?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/reports/daily?propertyId=${activeProperty.id}&date=${selectedDate}`
      );
      const reportData = await res.json();
      setData(reportData);
    } catch (err) {
      console.error("Failed to load daily manager report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyReport();
  }, [activeProperty?.id, selectedDate, refreshKey]);

  // Handle Quick Date Change
  const handleDateShift = (deltaDays: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + deltaDays);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // Archive / Lock 12 AM Snapshot
  const handleArchiveSnapshot = async () => {
    if (!activeProperty?.id) return;
    if (
      !confirm(
        `Archive & Lock 12 AM Midnight Snapshot for ${selectedDate}?\n\nThis permanently logs the daily audit state to compliance records.`
      )
    )
      return;

    setIsArchiving(true);
    try {
      const res = await fetch("/api/v1/reports/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty.id,
          businessDate: selectedDate,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to archive snapshot");
      alert(`✓ ${resData.message || "Daily Manager Audit archived successfully!"}`);
      await loadDailyReport();
    } catch (err: any) {
      alert(`Error archiving audit: ${err.message}`);
    } finally {
      setIsArchiving(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!data) return;
    const lines = [
      ["HOTEL OS - DAILY MANAGER AUDIT REPORT (12 AM - 12 AM)"],
      [`Property: ${activeProperty?.displayName} (${activeProperty?.code})`],
      [`Audit Date: ${data.reportDate}`],
      [`Generated At: ${new Date().toLocaleString()}`],
      [],
      ["FINANCIAL SUMMARY"],
      ["Metric", "Amount (INR)"],
      ["Gross Billed Revenue", data.financialSummary?.grossRevenue || 0],
      ["Room Tariff Revenue", data.financialSummary?.roomRevenue || 0],
      ["F&B Restaurant Revenue", data.financialSummary?.fbRevenue || 0],
      ["Other Service Revenue", data.financialSummary?.otherRevenue || 0],
      ["Taxable Amount", data.financialSummary?.taxableAmount || 0],
      ["Total Tax (CGST+SGST)", data.financialSummary?.totalTax || 0],
      ["Total Collections (Inflow)", data.financialSummary?.totalCollections || 0],
      ["Total Expenses (Outflow)", data.financialSummary?.totalExpenses || 0],
      ["Net Cash Flow", data.financialSummary?.netCashFlow || 0],
      ["Net Cash in Hand (Drawer)", data.financialSummary?.cashDrawerPosition?.netCashInHand || 0],
      [],
      ["PMS OPERATIONAL METRICS"],
      ["Total Rooms", data.pmsMetrics?.totalRooms || 0],
      ["Rooms Sold", data.pmsMetrics?.roomsSold || 0],
      ["Occupancy %", `${data.pmsMetrics?.occupancyPct || 0}%`],
      ["ADR", data.pmsMetrics?.adr || 0],
      ["RevPAR", data.pmsMetrics?.revpar || 0],
      ["In-House Guests", data.pmsMetrics?.inHouseGuestsCount || 0],
      ["Check-Ins Today", data.pmsMetrics?.checkInsCount || 0],
      ["Check-Outs Today", data.pmsMetrics?.checkOutsCount || 0],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + lines.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Manager_Audit_${activeProperty?.code || "HOTEL"}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto w-full text-zinc-900 dark:text-zinc-100 pb-16">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-9 w-9 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Moon className="h-5 w-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900 dark:text-white">
              Daily Manager Audit
            </h1>
            <span className="rounded-lg px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 font-mono uppercase tracking-wider">
              12 AM – 12 AM Midnight Cycle
            </span>
          </div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">
            Comprehensive financial close, cashier drawer reconciliation, PMS KPI flash & tax ledgers
          </p>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Next Midnight Countdown */}
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2 shadow-xs">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="font-medium text-zinc-500">Rolls in:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{timeUntilMidnight}</strong>
          </div>

          {/* Quick Date Selector */}
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 shadow-xs">
            <button
              onClick={() => handleDateShift(-1)}
              className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold px-2 py-1 text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
            />
            <button
              onClick={() => handleDateShift(1)}
              className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Print Official Report Button */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="h-10 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Official 12 AM Audit</span>
          </button>

          {/* Archive / Lock Snapshot Button */}
          <button
            onClick={handleArchiveSnapshot}
            disabled={isArchiving}
            className="h-10 px-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Archive and lock 12 AM snapshot"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>{isArchiving ? "Archiving..." : "Archive Snapshot"}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="h-10 px-3.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 transition shadow-xs cursor-pointer"
            title="Export CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs under Night Audit */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <Link
          href="/night-audit"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition"
        >
          <ShieldCheck className="h-4 w-4 text-zinc-400" />
          <span>Night Audit & Day Close</span>
        </Link>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
          <Moon className="h-4 w-4" />
          <span>Daily Manager Audit (12 AM – 12 AM)</span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 text-center text-xs font-semibold text-zinc-400 animate-pulse bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 rounded-3xl">
          Calculating 12 AM – 12 AM financial reconciliation & PMS metrics for {selectedDate}...
        </div>
      ) : data ? (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* 1. TOP 4 FINANCIAL & CASH HANDOVER KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Gross Billed Revenue */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Gross Billed Revenue</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                {formatINR(data.financialSummary?.grossRevenue || 0)}
              </div>
              <div className="text-xs text-zinc-500 space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 font-mono">
                <div className="flex justify-between">
                  <span>Room Tariff:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{formatINR(data.financialSummary?.roomRevenue || 0)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>F&B Dining:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{formatINR(data.financialSummary?.fbRevenue || 0)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>GST (CGST+SGST):</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(data.financialSummary?.totalTax || 0)}</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Total Collections (Inflows) */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Collections (Inflow)</span>
                <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <ArrowDownLeft className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                {formatINR(data.financialSummary?.totalCollections || 0)}
              </div>
              <div className="text-xs text-zinc-500 space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 font-mono">
                <div className="flex justify-between">
                  <span>UPI & QR:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{formatINR(data.collectionsByMethod?.UPI || 0)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Cash Receipts:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{formatINR(data.collectionsByMethod?.CASH || 0)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Card & OTA VCC:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {formatINR((data.collectionsByMethod?.CARD || 0) + (data.collectionsByMethod?.OTA_VCC || 0))}
                  </strong>
                </div>
              </div>
            </div>

            {/* Card 3: Total Expenses (Outflows) */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Expenses (Outflow)</span>
                <div className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ArrowUpRight className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                {formatINR(data.financialSummary?.totalExpenses || 0)}
              </div>
              <div className="text-xs text-zinc-500 space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 font-mono">
                <div className="flex justify-between">
                  <span>Cash Paid Out:</span>
                  <strong className="text-rose-600 dark:text-rose-400">
                    {formatINR(data.financialSummary?.cashDrawerPosition?.cashOut || 0)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Bank & Online Paid:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {formatINR(
                      (data.financialSummary?.totalExpenses || 0) -
                        (data.financialSummary?.cashDrawerPosition?.cashOut || 0)
                    )}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Net Cash Flow:</span>
                  <strong className={data.financialSummary?.netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"}>
                    {formatINR(data.financialSummary?.netCashFlow || 0)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Card 4: Cash Drawer Handover */}
            <div className="p-5 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800/50 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Physical Cash in Hand
                </span>
                <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Banknote className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 tracking-tight">
                {formatINR(data.financialSummary?.cashDrawerPosition?.netCashInHand || 0)}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1 pt-2 border-t border-emerald-200 dark:border-emerald-800/60 font-mono">
                <div className="flex justify-between">
                  <span>Cash In (Receipts):</span>
                  <strong>+{formatINR(data.financialSummary?.cashDrawerPosition?.cashIn || 0)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Cash Out (Expenses):</span>
                  <strong className="text-rose-600">-{formatINR(data.financialSummary?.cashDrawerPosition?.cashOut || 0)}</strong>
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans italic pt-0.5">
                  Reconciled for 12 AM cashier shift handover
                </div>
              </div>
            </div>
          </div>

          {/* 2. PMS OPERATIONAL PERFORMANCE METRICS */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-indigo-500" />
                PMS Operational Performance Metrics (12 AM – 12 AM)
              </h3>
              <div className="text-xs font-mono text-zinc-500">
                Total Rooms: <strong className="text-zinc-800 dark:text-zinc-200">{data.pmsMetrics?.totalRooms}</strong> | Available: <strong className="text-zinc-800 dark:text-zinc-200">{data.pmsMetrics?.availableRooms}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider">Occupancy %</div>
                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {data.pmsMetrics?.occupancyPct}%
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  {data.pmsMetrics?.roomsSold} / {data.pmsMetrics?.totalRooms} Rooms Sold
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider">ADR (Avg Daily Rate)</div>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {formatINR(data.pmsMetrics?.adr || 0)}
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  Room Rev / Rooms Sold
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider">RevPAR</div>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {formatINR(data.pmsMetrics?.revpar || 0)}
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  Room Rev / Total Rooms
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider">Guest Flow</div>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {data.pmsMetrics?.inHouseGuestsCount} In-House
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  +{data.pmsMetrics?.checkInsCount} In / -{data.pmsMetrics?.checkOutsCount} Out
                </div>
              </div>
            </div>
          </div>

          {/* 3. 24-HOUR (12 AM TO 12 AM) ACTIVITY TIMELINE CHART */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                24-Hour (12 AM – 12 AM) Activity Timeline
              </h3>
              <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-md bg-blue-500" />
                  <span>Collections</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-md bg-emerald-500" />
                  <span>Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-md bg-rose-500" />
                  <span>Expenses</span>
                </div>
              </div>
            </div>

            {/* 24 Hourly Columns */}
            <div className="pt-4 pb-2 overflow-x-auto">
              <div className="min-w-[650px] grid grid-cols-24 gap-1.5 items-end h-36 border-b border-zinc-200 dark:border-zinc-800 pb-1">
                {data.hourlyActivity?.map((b: any, idx: number) => {
                  const maxVal = Math.max(
                    ...data.hourlyActivity.map((x: any) => Math.max(x.collections, x.revenue, x.expenses, 100))
                  );
                  const colHeight = Math.min(100, Math.max(4, (b.collections / maxVal) * 100));
                  const revHeight = Math.min(100, Math.max(4, (b.revenue / maxVal) * 100));
                  const expHeight = Math.min(100, Math.max(4, (b.expenses / maxVal) * 100));

                  const hasActivity = b.collections > 0 || b.revenue > 0 || b.expenses > 0;

                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col z-20 bg-zinc-950 text-white rounded-xl p-2.5 text-[10px] whitespace-nowrap shadow-2xl font-mono border border-zinc-800">
                        <span className="font-bold text-zinc-200">{b.hourLabel}</span>
                        <span className="text-blue-400">Collections: {formatINR(b.collections)}</span>
                        <span className="text-emerald-400">Revenue: {formatINR(b.revenue)}</span>
                        <span className="text-rose-400">Expenses: {formatINR(b.expenses)}</span>
                      </div>

                      <div className="flex items-end gap-0.5 w-full justify-center h-full">
                        {b.collections > 0 && (
                          <div
                            style={{ height: `${colHeight}%` }}
                            className="w-1.5 sm:w-2 bg-blue-500 rounded-t-xs transition-all"
                          />
                        )}
                        {b.revenue > 0 && (
                          <div
                            style={{ height: `${revHeight}%` }}
                            className="w-1.5 sm:w-2 bg-emerald-500 rounded-t-xs transition-all"
                          />
                        )}
                        {b.expenses > 0 && (
                          <div
                            style={{ height: `${expHeight}%` }}
                            className="w-1.5 sm:w-2 bg-rose-500 rounded-t-xs transition-all"
                          />
                        )}
                        {!hasActivity && (
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="min-w-[650px] grid grid-cols-24 gap-1.5 text-[9px] font-mono text-zinc-400 text-center pt-2">
                {data.hourlyActivity?.map((b: any, idx: number) => (
                  <div key={idx} className={idx % 3 === 0 ? "font-bold text-zinc-700 dark:text-zinc-300" : "hidden sm:block"}>
                    {idx % 3 === 0 ? b.hourLabel.replace(" ", "") : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. INFLOW CHANNELS & OUTFLOW CATEGORIES MATRIX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Collections Breakdown */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  Collections Inflow Channels
                </h3>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  {formatINR(data.financialSummary?.totalCollections || 0)}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-600 dark:text-zinc-400">Advance Deposits & Pre-bookings</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatINR(data.collectionsBySource?.ADVANCE_DEPOSIT || 0)}
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-600 dark:text-zinc-400">Room Folio Settlements</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatINR(data.collectionsBySource?.FOLIO_SETTLEMENT || 0)}
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-600 dark:text-zinc-400">POS Restaurant Direct</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatINR(data.collectionsBySource?.POS_RESTAURANT || 0)}
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-600 dark:text-zinc-400">OTA Channels & VCC</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatINR(data.collectionsBySource?.OTA_COLLECTION || 0)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Expenses Breakdown */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="h-4 w-4 text-rose-500" />
                  Expenses Outflow Categories
                </h3>
                <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                  {formatINR(data.financialSummary?.totalExpenses || 0)}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-600 dark:text-zinc-400">Driver Commissions</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatINR(data.expensesByCategory?.DRIVER_COMMISSION || 0)}
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-600 dark:text-zinc-400">Vendor Payments & Purchases</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatINR(data.expensesByCategory?.VENDOR_PAYMENT || 0)}
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-600 dark:text-zinc-400">F&B Raw Materials</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatINR(data.expensesByCategory?.FB_PURCHASE || 0)}
                  </strong>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-600 dark:text-zinc-400">Maintenance & Petty Cash</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatINR(
                      (data.expensesByCategory?.MAINTENANCE || 0) +
                        (data.expensesByCategory?.PETTY_CASH || 0)
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* 5. FULL DAY TRANSACTION AUDIT LEDGER */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Full Audit Trail for {data.reportDate} (00:00 – 23:59)
              </h3>
              <span className="text-xs font-mono text-zinc-500">
                {data.recentTransactions?.length || 0} total records
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 uppercase font-mono text-[10.5px]">
                  <tr>
                    <th className="px-3.5 py-2.5 font-bold">Time</th>
                    <th className="px-3.5 py-2.5 font-bold">Type</th>
                    <th className="px-3.5 py-2.5 font-bold">Description / Ref</th>
                    <th className="px-3.5 py-2.5 font-bold">Method</th>
                    <th className="px-3.5 py-2.5 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
                  {data.recentTransactions?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 font-sans">
                        No transactions recorded during this 12 AM – 12 AM cycle.
                      </td>
                    </tr>
                  ) : (
                    data.recentTransactions?.map((t: any, idx: number) => {
                      const isExpense = t.type === "EXPENSE";
                      return (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <td className="px-3.5 py-2 text-zinc-500">{t.time}</td>
                          <td className="px-3.5 py-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                isExpense
                                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                  : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                              }`}
                            >
                              {t.type}
                            </span>
                          </td>
                          <td className="px-3.5 py-2 text-zinc-900 dark:text-zinc-100 font-sans font-medium">
                            {t.description}
                          </td>
                          <td className="px-3.5 py-2 text-zinc-600 dark:text-zinc-400">{t.method}</td>
                          <td
                            className={`px-3.5 py-2 text-right font-bold ${
                              isExpense ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {isExpense ? `-${formatINR(t.amount)}` : `+${formatINR(t.amount)}`}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL A4 PRINTABLE 12 AM - 12 AM DAILY MANAGER AUDIT REPORT */}
      {/* ========================================================================= */}
      {showPrintModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-700 bg-white text-zinc-950 p-6 shadow-2xl space-y-4 print:p-0 print:border-none font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 print:hidden">
              <span className="text-xs font-bold uppercase font-mono text-zinc-600 flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-600" />
                Official 12 AM Midnight Daily Manager Audit Report
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition shadow-xs cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Report
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-zinc-500 hover:text-zinc-900 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Print Body */}
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-zinc-300 pb-3">
                <div>
                  <h1 className="text-base font-black uppercase text-zinc-950">{activeProperty?.displayName}</h1>
                  <p className="text-[11px] text-zinc-600">{activeProperty?.legalName}</p>
                  <p className="font-mono text-[11px] text-zinc-700">
                    GSTIN: {activeProperty?.gstin || "N/A"} | State Code: {activeProperty?.stateCode || "18"}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-zinc-950">DAILY MANAGER AUDIT</div>
                  <div className="text-zinc-600 text-[11px]">Audit Date: {data.reportDate}</div>
                  <div className="text-zinc-600 text-[11px]">Cycle: 00:00:00 – 23:59:59 (12 AM - 12 AM)</div>
                  <div className="text-zinc-600 text-[11px]">Printed: {new Date().toLocaleString()}</div>
                </div>
              </div>

              {/* Financial Revenue & Tax Breakdown */}
              <div className="space-y-1.5">
                <h3 className="font-bold uppercase text-[11px] text-zinc-800 border-b pb-1">
                  1. Revenue & GST Breakdown (Taxable vs Taxes)
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
                  <div>Room Tariff Revenue: <strong>{formatINR(data.financialSummary?.roomRevenue || 0)}</strong></div>
                  <div>F&B Restaurant Revenue: <strong>{formatINR(data.financialSummary?.fbRevenue || 0)}</strong></div>
                  <div>Other Service Revenue: <strong>{formatINR(data.financialSummary?.otherRevenue || 0)}</strong></div>
                  <div>Taxable Subtotal: <strong>{formatINR(data.financialSummary?.taxableAmount || 0)}</strong></div>
                  <div>CGST Collected: <strong>{formatINR(data.financialSummary?.cgstAmount || 0)}</strong></div>
                  <div>SGST Collected: <strong>{formatINR(data.financialSummary?.sgstAmount || 0)}</strong></div>
                </div>
                <div className="text-right font-mono font-bold text-xs pt-1 border-t">
                  Gross Billed Revenue: {formatINR(data.financialSummary?.grossRevenue || 0)}
                </div>
              </div>

              {/* Collections & Cashier Handover */}
              <div className="space-y-1.5 pt-2">
                <h3 className="font-bold uppercase text-[11px] text-zinc-800 border-b pb-1">
                  2. Collections & Cash Drawer Position
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
                  <div>Cash Collected (Inflow): <strong>{formatINR(data.financialSummary?.cashDrawerPosition?.cashIn || 0)}</strong></div>
                  <div>UPI / QR Collections: <strong>{formatINR(data.collectionsByMethod?.UPI || 0)}</strong></div>
                  <div>Card & POS Collections: <strong>{formatINR(data.collectionsByMethod?.CARD || 0)}</strong></div>
                  <div>OTA / VCC Settlements: <strong>{formatINR((data.collectionsByMethod?.OTA_VCC || 0) + (data.collectionsBySource?.OTA_COLLECTION || 0))}</strong></div>
                  <div>Total Expenses Paid Out: <strong className="text-rose-700">{formatINR(data.financialSummary?.totalExpenses || 0)}</strong></div>
                  <div>Cash Paid Out: <strong className="text-rose-700">-{formatINR(data.financialSummary?.cashDrawerPosition?.cashOut || 0)}</strong></div>
                </div>
              </div>

              {/* Cash in Hand Callout */}
              <div className="bg-zinc-100 p-3 rounded-xl border border-zinc-300 font-mono text-xs space-y-1">
                <div className="flex justify-between font-black text-sm">
                  <span>Net Physical Cash in Hand to Handover:</span>
                  <span className="text-zinc-950 font-black">{formatINR(data.financialSummary?.cashDrawerPosition?.netCashInHand || 0)}</span>
                </div>
                <p className="text-[10px] text-zinc-600 font-sans">
                  Total physical cash collected minus cash paid out during 12 AM – 12 AM operational window.
                </p>
              </div>

              {/* PMS Summary */}
              <div className="space-y-1.5 pt-2">
                <h3 className="font-bold uppercase text-[11px] text-zinc-800 border-b pb-1">
                  3. PMS Operations & Occupancy Summary
                </h3>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div>Occupancy: <strong>{data.pmsMetrics?.occupancyPct}%</strong></div>
                  <div>Rooms Sold: <strong>{data.pmsMetrics?.roomsSold} / {data.pmsMetrics?.totalRooms}</strong></div>
                  <div>ADR: <strong>{formatINR(data.pmsMetrics?.adr || 0)}</strong></div>
                  <div>RevPAR: <strong>{formatINR(data.pmsMetrics?.revpar || 0)}</strong></div>
                  <div>Check-Ins: <strong>{data.pmsMetrics?.checkInsCount}</strong></div>
                  <div>Check-Outs: <strong>{data.pmsMetrics?.checkOutsCount}</strong></div>
                </div>
              </div>

              {/* Signature Blocks */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs border-t border-zinc-300 font-mono">
                <div>
                  <div className="w-44 mx-auto border-b border-zinc-400 pb-8 text-zinc-400 italic">Night Auditor / Cashier</div>
                  <div className="font-bold mt-1">Prepared By</div>
                </div>
                <div>
                  <div className="w-44 mx-auto border-b border-zinc-400 pb-8 text-zinc-400 italic">General Manager / Owner</div>
                  <div className="font-bold mt-1">Verified & Approved By</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
