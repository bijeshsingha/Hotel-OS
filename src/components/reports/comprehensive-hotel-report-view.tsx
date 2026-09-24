"use client";

import React, { useState } from "react";
import {
  Building2,
  Calendar,
  Printer,
  Mail,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BedDouble,
  Users,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";
import { ComprehensiveHotelReport, AdminModificationRecord } from "@/lib/domain/comprehensive-report-service";
import { PrintableComprehensiveReport } from "./printable-comprehensive-report";
import { EmailReportModal } from "./email-report-modal";

interface ComprehensiveHotelReportViewProps {
  report: ComprehensiveHotelReport;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function ComprehensiveHotelReportView({
  report,
  selectedDate,
  onDateChange,
  onRefresh,
  loading = false,
}: ComprehensiveHotelReportViewProps) {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>("ALL");
  const [auditSearch, setAuditSearch] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { property, money, rooms, adminModifications } = report;

  // Filter admin logs
  const filteredAuditLogs = adminModifications.records.filter((rec) => {
    if (auditCategoryFilter !== "ALL" && rec.category !== auditCategoryFilter) {
      return false;
    }
    if (!auditSearch.trim()) return true;
    const query = auditSearch.toLowerCase();
    return (
      rec.actionLabel.toLowerCase().includes(query) ||
      rec.summary.toLowerCase().includes(query) ||
      rec.actorName.toLowerCase().includes(query) ||
      rec.targetId.toLowerCase().includes(query)
    );
  });

  const getCategoryBadgeClass = (category: AdminModificationRecord["category"]) => {
    switch (category) {
      case "FINANCIAL_ADJUSTMENT":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "ROOM_OPERATION":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "GRC_RECORD":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "SYSTEM_AUDIT":
        return "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800";
      case "ADMIN_CONFIG":
      default:
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* EXECUTIVE CONTROL BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                {property.displayName}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {property.code}
              </span>
            </div>
            <p className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
              <span>GSTIN: <span className="font-mono font-semibold">{property.gstin || "N/A"}</span></span>
              <span>&bull;</span>
              <span>Selected in <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[11px]">.env</code></span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Business Date Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <span className="text-zinc-500 font-medium">Date:</span>
            <input
              type="date"
              value={selectedDate || report.reportDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent font-mono font-bold text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="h-9 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Mail className="h-3.5 w-3.5 text-blue-500" />
            <span>Email Report</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm active:scale-98"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / PDF Sheet</span>
          </button>
        </div>
      </div>

      {/* TOP 5 METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Gross Revenue */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold uppercase">
            <span>Gross Revenue</span>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
            {formatINR(money.grossRevenue)}
          </div>
          <div className="text-[11px] text-zinc-500">
            Room: {formatINR(money.roomRevenue)} &bull; F&B: {formatINR(money.fbRevenue)}
          </div>
        </div>

        {/* Collections */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-200/80 dark:border-emerald-900/30 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-400 font-semibold uppercase">
            <span>Collections</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
            {formatINR(money.totalCollections)}
          </div>
          <div className="text-[11px] text-emerald-600/80">
            {money.collectionsCount} total payments received
          </div>
        </div>

        {/* Occupancy */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-blue-200/80 dark:border-blue-900/30 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-400 font-semibold uppercase">
            <span>Occupancy Rate</span>
            <BedDouble className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-700 dark:text-blue-300">
            {rooms.occupancyPct}%
          </div>
          <div className="text-[11px] text-blue-600/80">
            {rooms.occupiedRooms} occupied / {rooms.totalRooms} rooms
          </div>
        </div>

        {/* Drawer Float In Hand */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50/50 dark:from-teal-950/20 dark:to-emerald-950/10 border border-teal-200/80 dark:border-teal-800/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-teal-800 dark:text-teal-300 font-semibold uppercase">
            <span>Till Cash In-Hand</span>
            <Wallet className="h-4 w-4 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-teal-800 dark:text-teal-200">
            {formatINR(money.cashDrawer.netCashInHand)}
          </div>
          <div className="text-[11px] text-teal-700/80 dark:text-teal-400">
            Physical desk drawer total
          </div>
        </div>

        {/* Admin Modifications */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-purple-200/80 dark:border-purple-900/30 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-purple-800 dark:text-purple-400 font-semibold uppercase">
            <span>Admin Mods</span>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-purple-700 dark:text-purple-300">
            {adminModifications.totalModificationsCount}
          </div>
          <div className="text-[11px] text-purple-600/80">
            Modifications logged today
          </div>
        </div>
      </div>

      {/* SECTION 1: DAILY MONEY & FINANCIAL POSITION */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600" />
              <span>1. Daily Money & Financial Position</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Inflows, disbursements, cash drawer reconciliation, and taxes for {report.reportDate}
            </p>
          </div>
          <div className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            Net Day Cash Flow: <span className={money.netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatINR(money.netCashFlow)}</span>
          </div>
        </div>

        {/* 2-Column Tables: Collections vs Expenses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Collections by Payment Method */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-zinc-50 dark:bg-zinc-800/80 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 block">
                    Mode of Payments
                  </span>
                  <span className="text-[10px] text-zinc-500">Real customer tenders &amp; settled inflows</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                    {formatINR(money.totalCollections)}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-semibold">{money.collectionsCount} receipts</span>
                </div>
              </div>

              <table className="w-full text-xs">
                <tbody>
                  {[
                    { mode: "CASH", label: "CASH", desc: "Front desk & outlet cash inflow" },
                    { mode: "UPI", label: "UPI", desc: "Direct QR & VPA transfers" },
                    { mode: "BTC", label: "BTC", desc: "Bill to Company / Corporate Direct Bill", badge: "Direct Bill" },
                    { mode: "CARD", label: "CARD", desc: "POS debit/credit & OTA virtual cards" },
                    { mode: "BANK_TRANSFER", label: "BANK TRANSFER", desc: "NEFT / RTGS / IMPS account wire" },
                    { mode: "CHEQUE", label: "CHEQUE", desc: "Bank clearance instrument" },
                  ].map(({ mode, label, desc, badge }) => {
                    const amount = (money.collectionsByMethod as Record<string, number | undefined>)[mode] || 0;
                    if (mode === "CHEQUE" && amount === 0) return null;

                    return (
                      <tr key={mode} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{label}</span>
                            {badge && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                                {badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-500">{desc}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                          {formatINR(amount)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Any other dynamically present non-internal modes */}
                  {Object.entries(money.collectionsByMethod || {})
                    .filter(([m, amt]) => !["CASH", "UPI", "BTC", "CARD", "BANK_TRANSFER", "CHEQUE", "OUTSTANDING", "TRANSFER", "ADVANCE_ALLOCATION"].includes(m) && (amt || 0) > 0)
                    .map(([method, amount]) => (
                      <tr key={method} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-2.5 font-bold text-zinc-900 dark:text-zinc-100">
                          {method.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                          {formatINR(amount || 0)}
                        </td>
                      </tr>
                    ))}

                  {/* OUTSTANDING ROW */}
                  <tr className="border-t-2 border-amber-200/70 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-amber-900 dark:text-amber-200">OUTSTANDING</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                          Pending Dues
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                        Unsettled folio receivables currently due across all stays
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">
                      {formatINR(money.collectionsByMethod.OUTSTANDING || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Internal Transfers Reconciled Section */}
            {money.internalTransfers && (money.internalTransfers.transferredDueToMaster > 0 || money.internalTransfers.advanceAllocatedFromPool > 0) && (
              <div className="px-4 py-2.5 bg-zinc-50/80 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Reconciled Internal Ledger Movements</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                  {money.internalTransfers.transferredDueToMaster > 0 && (
                    <span>
                      Transferred Due to Master: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{formatINR(money.internalTransfers.transferredDueToMaster)}</strong>
                    </span>
                  )}
                  {money.internalTransfers.transferredDueToMaster > 0 && money.internalTransfers.advanceAllocatedFromPool > 0 && (
                    <span className="text-zinc-400">&bull;</span>
                  )}
                  {money.internalTransfers.advanceAllocatedFromPool > 0 && (
                    <span>
                      Allocated from Advance Pool: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{formatINR(money.internalTransfers.advanceAllocatedFromPool)}</strong>
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Internal room-to-master ledger reallocations are tracked separately to prevent double-counting.
                </div>
              </div>
            )}
          </div>

          {/* Expenses by Category */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="bg-zinc-50 dark:bg-zinc-800/80 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Expenses & Payouts by Category
              </span>
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                -{formatINR(money.totalExpenses)}
              </span>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(money.expensesByCategory).filter(([_, amt]) => amt > 0).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-zinc-400">
                      No expense vouchers recorded on this business date.
                    </td>
                  </tr>
                ) : (
                  Object.entries(money.expensesByCategory).filter(([_, amt]) => amt > 0).map(([cat, amount]) => (
                    <tr key={cat} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-2.5 font-semibold text-zinc-700 dark:text-zinc-300">
                        {cat.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{formatINR(amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Physical Cash Drawer Reconciliation Box */}
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-300">
              Front Desk Physical Cash Drawer (Till) Position
            </span>
            <span className="text-[11px] text-zinc-500">Opening Base Configured: {formatINR(property.openingCashBalance)}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-500 text-[11px] block">1. Starting Drawer Float</span>
              <span className="text-sm font-mono font-bold text-zinc-900 dark:text-white mt-0.5 block">{formatINR(money.cashDrawer.openingBalance)}</span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <span className="text-emerald-700 dark:text-emerald-400 text-[11px] block">+ 2. Cash Inflow Today</span>
              <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 block">+{formatINR(money.cashDrawer.cashIn)}</span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <span className="text-rose-700 dark:text-rose-400 text-[11px] block">- 3. Cash Outflow Today</span>
              <span className="text-sm font-mono font-bold text-rose-700 dark:text-rose-300 mt-0.5 block">-{formatINR(money.cashDrawer.cashOut)}</span>
            </div>

            <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
              <span className="text-teal-800 dark:text-teal-300 text-[11px] font-bold block">= Physical Cash In Till</span>
              <span className="text-base font-mono font-black text-teal-800 dark:text-teal-200 mt-0.5 block">{formatINR(money.cashDrawer.netCashInHand)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: DAILY ROOMS & OPERATIONS */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-blue-600" />
              <span>2. Daily Room Inventory & PMS Performance</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Inventory breakdown, housekeeping status, rate realization, and in-house guest roster
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
              {rooms.roomStates.inspected} Inspected
            </span>
            <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
              {rooms.roomStates.clean} Clean
            </span>
            <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
              {rooms.roomStates.dirty} Dirty
            </span>
            <span className="px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
              {rooms.roomStates.maintenance} Out of Order
            </span>
          </div>
        </div>

        {/* Operational Flow Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
            <span className="text-zinc-500 text-[11px] block font-semibold">Average Daily Rate (ADR)</span>
            <span className="text-lg font-mono font-bold text-zinc-900 dark:text-white mt-1 block">{formatINR(rooms.adr)}</span>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
            <span className="text-zinc-500 text-[11px] block font-semibold">RevPAR</span>
            <span className="text-lg font-mono font-bold text-zinc-900 dark:text-white mt-1 block">{formatINR(rooms.revpar)}</span>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
            <span className="text-zinc-500 text-[11px] block font-semibold">In-House Headcount</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-white mt-1 block">{rooms.inHouseGuestsCount} Guests</span>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
            <span className="text-zinc-500 text-[11px] block font-semibold">Desk Flow Today</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-white mt-1 block">{rooms.arrivalsToday} Arr &bull; {rooms.departuresToday} Dep</span>
          </div>
        </div>

        {/* In-House Guest Roster */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="bg-zinc-50 dark:bg-zinc-800/80 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
            <span>Current In-House Guest Roster ({rooms.inHouseRoster.length} Stays)</span>
            <span className="text-[11px] text-zinc-500 font-normal">Active Room Folios</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-100/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-500">
                  <th className="px-3.5 py-2 text-left">Room</th>
                  <th className="px-3.5 py-2 text-left">Primary Guest</th>
                  <th className="px-3.5 py-2 text-left">Check-In</th>
                  <th className="px-3.5 py-2 text-left">Departure</th>
                  <th className="px-3.5 py-2 text-right">Charges</th>
                  <th className="px-3.5 py-2 text-right">Paid</th>
                  <th className="px-3.5 py-2 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {rooms.inHouseRoster.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                      No in-house guests recorded on this business date.
                    </td>
                  </tr>
                ) : (
                  rooms.inHouseRoster.map((r) => (
                    <tr key={r.stayId} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {r.roomNumber}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-zinc-900 dark:text-white">{r.guestName}</div>
                        <div className="text-[10px] text-zinc-500">{r.phone}</div>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-zinc-600 dark:text-zinc-400">{r.checkInDate}</td>
                      <td className="px-3.5 py-2.5 font-mono text-zinc-600 dark:text-zinc-400">{r.expectedDeparture}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-semibold">{formatINR(r.totalCharges)}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{formatINR(r.totalPaid)}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold">
                        <span className={r.balanceDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}>
                          {formatINR(r.balanceDue)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: MANAGEMENT & ADMIN MODIFICATIONS AUDIT TRAIL */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              <span>3. Management & Admin Modifications Trail</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Audit log of changes made through admin portal (rate changes, opening cash balance, GRC edits, room moves)
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            {filteredAuditLogs.length} Events Logged
          </span>
        </div>

        {/* Filter Controls for Audit Logs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {["ALL", "FINANCIAL_ADJUSTMENT", "ADMIN_CONFIG", "ROOM_OPERATION", "GRC_RECORD", "SYSTEM_AUDIT"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setAuditCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  auditCategoryFilter === cat
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {cat === "ALL" ? "All Categories" : cat.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Search modification, staff, or ID..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-xs">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">
                  <th className="px-4 py-2.5 text-left w-24">Time</th>
                  <th className="px-4 py-2.5 text-left">Action & Summary</th>
                  <th className="px-4 py-2.5 text-left w-36">Authorized Actor</th>
                  <th className="px-4 py-2.5 text-right w-24">Diff Snapshot</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                      No admin modifications match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((rec) => {
                    const isExpanded = expandedLogId === rec.id;
                    const hasDiff = rec.before || rec.after;

                    return (
                      <React.Fragment key={rec.id}>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                          <td className="px-4 py-3 font-mono text-[11px] text-zinc-500 align-top">
                            {rec.timeFormatted}
                          </td>
                          <td className="px-4 py-3 align-top space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadgeClass(rec.category)}`}>
                                {rec.actionLabel}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {rec.targetType}: {rec.targetId}
                              </span>
                            </div>
                            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                              {rec.summary}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top font-semibold text-zinc-700 dark:text-zinc-300">
                            {rec.actorName}
                          </td>
                          <td className="px-4 py-3 align-top text-right">
                            {hasDiff ? (
                              <button
                                type="button"
                                onClick={() => setExpandedLogId(isExpanded ? null : rec.id)}
                                className="px-2 py-1 rounded text-[10px] font-bold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isExpanded ? "Hide" : "View"}</span>
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                            ) : (
                              <span className="text-zinc-400 text-[10px]">No diff</span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Before/After JSON Diff */}
                        {isExpanded && hasDiff && (
                          <tr className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800">
                            <td colSpan={4} className="p-4 space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                  <div className="font-bold text-zinc-500 uppercase text-[10px] mb-1">State Before</div>
                                  <pre className="overflow-x-auto whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                                    {rec.before ? JSON.stringify(rec.before, null, 2) : "None"}
                                  </pre>
                                </div>
                                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                  <div className="font-bold text-zinc-500 uppercase text-[10px] mb-1">State After</div>
                                  <pre className="overflow-x-auto whitespace-pre-wrap text-emerald-700 dark:text-emerald-400">
                                    {rec.after ? JSON.stringify(rec.after, null, 2) : "None"}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PRINTABLE MODAL */}
      <PrintableComprehensiveReport
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        report={report}
        onEmailClick={() => {
          setShowPrintModal(false);
          setShowEmailModal(true);
        }}
      />

      {/* EMAIL MODAL */}
      <EmailReportModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        defaultReportType="COMPREHENSIVE_AUDIT"
        targetDate={selectedDate || report.reportDate}
      />
    </div>
  );
}
