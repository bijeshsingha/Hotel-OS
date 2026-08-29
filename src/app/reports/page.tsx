"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR } from "@/lib/gst/calculator";
import {
  BarChart3,
  Download,
  Users,
  DollarSign,
  UtensilsCrossed,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CreditCard,
  Building2,
  Calendar,
  Search,
  X,
  Plus,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Layers,
  Filter,
  Check,
  TrendingUp,
  TrendingDown,
  QrCode,
  Smartphone,
  Globe,
  Landmark,
  ShieldCheck,
  Tag,
  FileText,
  Banknote,
  Sparkles,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Activity,
  BedDouble,
  RefreshCw,
  Archive,
} from "lucide-react";

export default function ReportsPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [reportType, setReportType] = useState<
    "CASHIER_COLLECTIONS_EXPENSES" | "FRONT_OFFICE" | "REVENUE" | "FNB"
  >("CASHIER_COLLECTIONS_EXPENSES");

  // Date Filter State for 12 AM - 12 AM Cycle
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters for Collections & Expenses
  const [flowFilter, setFlowFilter] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Snapshotting & Modals
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Countdown to next 12 AM Midnight
  const [timeUntilMidnight, setTimeUntilMidnight] = useState("");

  // Add Expense Form state
  const [expenseForm, setExpenseForm] = useState({
    category: "DRIVER_COMMISSION",
    payeeName: "",
    description: "",
    amount: "",
    taxAmount: "0",
    paymentMethod: "CASH",
    reference: "",
    notes: "",
  });
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseSuccess, setExpenseSuccess] = useState<string | null>(null);

  // Initialize selectedDate to activeProperty.businessDate
  useEffect(() => {
    if (activeProperty?.businessDate && !selectedDate) {
      setSelectedDate(activeProperty.businessDate);
    }
  }, [activeProperty?.businessDate]);

  // Update Countdown to 12:00 AM Midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Next 12:00 AM midnight
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

  // Fetch Report Data
  const loadReportData = () => {
    if (!activeProperty) return;
    setLoading(true);
    const dateParam = selectedDate || activeProperty.businessDate;

    fetch(`/api/v1/reports?propertyId=${activeProperty.id}&type=${reportType}&date=${dateParam}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Report error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReportData();
  }, [activeProperty, reportType, selectedDate, refreshKey]);

  // Navigate Date
  const shiftDate = (days: number) => {
    const current = new Date(selectedDate || activeProperty?.businessDate || new Date().toISOString().split("T")[0]);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  // Quick Preset Handlers
  const handleSetToday = () => {
    if (activeProperty?.businessDate) {
      setSelectedDate(activeProperty.businessDate);
    }
  };

  const handleSetYesterday = () => {
    const base = new Date(activeProperty?.businessDate || new Date().toISOString().split("T")[0]);
    base.setDate(base.getDate() - 1);
    setSelectedDate(base.toISOString().split("T")[0]);
  };

  // Trigger 12 AM Midnight Snapshot
  const handleTriggerMidnightSnapshot = async () => {
    if (!activeProperty) return;
    setSnapshotLoading(true);
    setSnapshotMsg(null);
    try {
      const res = await fetch("/api/v1/reports/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty.id,
          businessDate: selectedDate || activeProperty.businessDate,
          actorId: "usr_manager",
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Snapshot failed");
      setSnapshotMsg(`✓ 12 AM Midnight Report for ${selectedDate || activeProperty.businessDate} archived!`);
      setTimeout(() => setSnapshotMsg(null), 4000);
      loadReportData();
    } catch (err: any) {
      setSnapshotMsg(`Error: ${err.message}`);
      setTimeout(() => setSnapshotMsg(null), 4000);
    } finally {
      setSnapshotLoading(false);
    }
  };

  // Handle Add Expense Submission
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    if (!expenseForm.payeeName.trim()) {
      setExpenseError("Please enter Payee Name / Vendor.");
      return;
    }
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      setExpenseError("Please enter a valid expense amount.");
      return;
    }
    if (!expenseForm.description.trim()) {
      setExpenseError("Please enter Description / Notes.");
      return;
    }

    setExpenseSubmitting(true);
    setExpenseError(null);
    try {
      const res = await fetch("/api/v1/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty.id,
          category: expenseForm.category,
          payeeName: expenseForm.payeeName.trim(),
          description: expenseForm.description.trim() || expenseForm.category.replace(/_/g, " "),
          amount: expenseForm.amount,
          taxAmount: expenseForm.taxAmount,
          paymentMethod: expenseForm.paymentMethod,
          reference: expenseForm.reference,
          notes: expenseForm.notes,
          createdByName: "Front Desk Cashier",
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to record expense");

      setExpenseSuccess(`Expense recorded! Voucher: ${result.expense.voucherNo}`);
      setExpenseForm({
        category: "DRIVER_COMMISSION",
        payeeName: "",
        description: "",
        amount: "",
        taxAmount: "0",
        paymentMethod: "CASH",
        reference: "",
        notes: "",
      });

      setTimeout(() => {
        setShowAddExpenseModal(false);
        setExpenseSuccess(null);
      }, 1200);

      loadReportData();
      refreshData();
    } catch (err: any) {
      setExpenseError(err.message);
    } finally {
      setExpenseSubmitting(false);
    }
  };

  // Filtered Transactions for Cashier Report
  const filteredCashierTransactions = useMemo(() => {
    const list = data?.allTransactions || data?.recentTransactions || [];
    return list.filter((tx: any) => {
      // 1. Flow Filter (Inflow / Outflow)
      if (flowFilter !== "ALL" && tx.flow !== flowFilter) return false;

      // 2. Method / Source Bifurcation Filter
      if (methodFilter === "ADVANCE") {
        if (tx.sourceCategory !== "ADVANCE_DEPOSIT") return false;
      } else if (methodFilter === "POS") {
        if (tx.sourceCategory !== "POS_RESTAURANT") return false;
      } else if (methodFilter === "OTA") {
        if (tx.sourceCategory !== "OTA_COLLECTION" && tx.method !== "OTA_VCC" && tx.method !== "DIRECT_BILL") return false;
      } else if (methodFilter === "FOLIO") {
        if (tx.sourceCategory !== "FOLIO_SETTLEMENT") return false;
      } else if (methodFilter !== "ALL") {
        if (tx.method !== methodFilter) return false;
      }

      // 3. Category Filter (for expenses)
      if (categoryFilter !== "ALL" && tx.category !== categoryFilter) return false;

      // 4. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const party = (tx.party || "").toLowerCase();
        const rec = (tx.recordId || "").toLowerCase();
        const ref = (tx.reference || "").toLowerCase();
        const room = (tx.roomNumber || "").toLowerCase();
        const desc = (tx.description || tx.particulars || "").toLowerCase();
        const src = (tx.sourceLabel || "").toLowerCase();

        if (
          !party.includes(q) &&
          !rec.includes(q) &&
          !ref.includes(q) &&
          !room.includes(q) &&
          !desc.includes(q) &&
          !src.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data, flowFilter, methodFilter, categoryFilter, searchQuery]);

  // Export CSV
  const exportCSV = () => {
    if (reportType === "CASHIER_COLLECTIONS_EXPENSES") {
      if (!filteredCashierTransactions.length) return;
      const headers = [
        "Record No / Voucher",
        "Timestamp",
        "Type (Inflow / Outflow)",
        "Party / Guest / Payee",
        "Room / Particulars",
        "Payment Method",
        "Reference / UTR",
        "Amount (INR)",
        "Status",
      ];
      const rows = filteredCashierTransactions.map((tx: any) => [
        tx.recordId,
        `${tx.date} ${tx.time}`,
        tx.flow,
        JSON.stringify(tx.party || ""),
        JSON.stringify(tx.particulars || ""),
        tx.method,
        JSON.stringify(tx.reference || ""),
        tx.netAmount,
        tx.status,
      ]);
      const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeProperty?.code}_Daily_Collections_Expenses_${selectedDate || new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      return;
    }

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
    a.download = `${activeProperty?.code}_${reportType}_Report_${selectedDate || new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const summary = data?.summary;
  const isToday = (selectedDate || activeProperty?.businessDate) === activeProperty?.businessDate;

  return (
    <div className="space-y-4 max-w-[1500px] mx-auto w-full text-zinc-900 dark:text-zinc-100 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Daily Operational & Manager Reporting
            </h1>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1 uppercase">
              <Moon className="h-3 w-3" /> 12 AM – 12 AM Midnight Cycle
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            24-hour midnight-to-midnight financial reconciliations, cash drawer balances & manager audits
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          {reportType === "CASHIER_COLLECTIONS_EXPENSES" && (
            <>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800/60 dark:hover:bg-rose-900/50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 transition shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Record Expense
              </button>
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition shadow-xs cursor-pointer"
              >
                <Printer className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /> Print Cashier Sheet
              </button>
            </>
          )}

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 px-4 py-2 text-xs font-semibold transition shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {snapshotMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {snapshotMsg}
        </div>
      )}

      {/* Date & Cycle Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs overflow-hidden">
            <button
              onClick={() => shiftDate(-1)}
              className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-white">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              <span>{selectedDate || activeProperty?.businessDate}</span>
            </div>
            <button
              onClick={() => shiftDate(1)}
              className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleSetToday}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                isToday
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
              }`}
            >
              Today (Active)
            </button>
            <button
              onClick={handleSetYesterday}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
            >
              Yesterday (Audited)
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-500 ml-1">
            <input
              type="date"
              value={selectedDate || activeProperty?.businessDate || ""}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* 12 AM Cycle Details & Countdown */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Cycle: <strong className="text-zinc-900 dark:text-white font-mono">00:00:00 – 23:59:59</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <Moon className="h-3.5 w-3.5 text-amber-500" />
            <span>Next Midnight Close in: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{timeUntilMidnight}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Report Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-3 flex-wrap">
        <button
          onClick={() => setReportType("CASHIER_COLLECTIONS_EXPENSES")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            reportType === "CASHIER_COLLECTIONS_EXPENSES"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
              : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          <Wallet className="h-4 w-4" /> Cashier Collections & Expenses
        </button>
        <button
          onClick={() => setReportType("FRONT_OFFICE")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            reportType === "FRONT_OFFICE"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
              : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          <BedDouble className="h-4 w-4" /> Front Desk Room Rack
        </button>
        <button
          onClick={() => setReportType("REVENUE")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            reportType === "REVENUE"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
              : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          <TrendingUp className="h-4 w-4" /> Revenue & Tax Ledger
        </button>
        <button
          onClick={() => setReportType("FNB")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            reportType === "FNB"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
              : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          <UtensilsCrossed className="h-4 w-4" /> F&B / Restaurant Dining
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CASHIER COLLECTIONS & EXPENSES LEDGER */}
      {/* ========================================================================= */}
      {reportType === "CASHIER_COLLECTIONS_EXPENSES" && (
        <div className="space-y-4">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase">Total Collections (Inflows)</span>
                  <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {formatINR(summary.totalCollections)}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {summary.collectionsCount} Total Receipts
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase">Total Expenses (Outflows)</span>
                  <ArrowUpRight className="h-4 w-4 text-rose-500" />
                </div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {formatINR(summary.totalExpenses)}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {summary.expensesCount} Total Vouchers
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase">Net Day Cash Flow</span>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <div
                  className={`text-xl font-black ${
                    summary.netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {formatINR(summary.netCashFlow)}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Collections minus Expenses
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800/60 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                    Cash in Drawer Handover
                  </span>
                  <Banknote className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-emerald-800 dark:text-emerald-300">
                  {formatINR(summary.cashDrawerPosition?.netCashInHand || 0)}
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                  Cash In: {formatINR(summary.cashDrawerPosition?.cashIn || 0)} | Cash Out: {formatINR(summary.cashDrawerPosition?.cashOut || 0)}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Controls */}
          <div className="flex flex-col md:flex-row items-center gap-2 p-3 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by receipt/voucher #, guest, payee, room, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={flowFilter}
                onChange={(e: any) => setFlowFilter(e.target.value)}
                className="text-xs rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-medium"
              >
                <option value="ALL">All Flows (In & Out)</option>
                <option value="INFLOW">Collections Only</option>
                <option value="OUTFLOW">Expenses Only</option>
              </select>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="text-xs rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-medium"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR</option>
                <option value="CARD">Cards</option>
                <option value="OTA">OTA / VCC</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ADVANCE">Advance Deposits</option>
                <option value="POS">Restaurant / POS</option>
                <option value="FOLIO">Folio Checkouts</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase font-mono">
                    <th className="pb-2">Voucher / Receipt</th>
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Party / Payee</th>
                    <th className="pb-2">Particulars</th>
                    <th className="pb-2">Method</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
                  {filteredCashierTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-400 text-xs font-sans">
                        No transactions match your search/filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCashierTransactions.map((tx: any) => {
                      const isExpense = tx.flow === "OUTFLOW" || tx.type === "EXPENSE";
                      return (
                        <tr key={tx.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                          <td className="py-2.5 font-bold text-zinc-900 dark:text-zinc-100">{tx.recordId}</td>
                          <td className="py-2.5 text-zinc-500">{tx.time}</td>
                          <td className="py-2.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                isExpense
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2.5 font-sans font-medium text-zinc-800 dark:text-zinc-200">{tx.party}</td>
                          <td className="py-2.5 font-sans text-zinc-500">{tx.particulars}</td>
                          <td className="py-2.5 text-zinc-600 dark:text-zinc-400">{tx.method}</td>
                          <td
                            className={`py-2.5 text-right font-bold ${
                              isExpense ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {isExpense
                              ? `-${formatINR(tx.totalAmount || tx.amount || Math.abs(tx.netAmount) || 0)}`
                              : `+${formatINR(tx.amount || tx.netAmount || 0)}`}
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FRONT OFFICE GUEST LEDGER */}
      {/* ========================================================================= */}
      {reportType === "FRONT_OFFICE" && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Guest Ledger Stays & Balances
            </h3>
            <span className="text-xs font-mono text-zinc-500">{data?.rows?.length || 0} stays</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase">
                  <th className="pb-2">Room</th>
                  <th className="pb-2">Guest Name</th>
                  <th className="pb-2">Arrival</th>
                  <th className="pb-2">Departure</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Folio Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {data?.rows?.map((row: any) => (
                  <tr key={row.stayId} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                    <td className="py-2.5 font-bold text-zinc-900 dark:text-zinc-100">{row.roomNumber}</td>
                    <td className="py-2.5 font-sans font-medium text-zinc-800 dark:text-zinc-200">{row.guestName}</td>
                    <td className="py-2.5 text-zinc-500">{row.arrival}</td>
                    <td className="py-2.5 text-zinc-500">{row.departure}</td>
                    <td className="py-2.5">
                      <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                      {formatINR(row.folioBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REVENUE & GST JOURNAL */}
      {/* ========================================================================= */}
      {reportType === "REVENUE" && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Revenue & GST Charge Breakdown
            </h3>
            <span className="text-xs font-mono text-zinc-500">{data?.rows?.length || 0} entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Charge Code</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Guest Name</th>
                  <th className="pb-2 text-right">Taxable</th>
                  <th className="pb-2 text-right">GST</th>
                  <th className="pb-2 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {data?.rows?.map((row: any) => (
                  <tr key={row.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                    <td className="py-2.5 text-zinc-500">{row.serviceDate}</td>
                    <td className="py-2.5 font-bold text-zinc-900 dark:text-zinc-100">{row.chargeCode}</td>
                    <td className="py-2.5 font-sans text-zinc-600 dark:text-zinc-400">{row.description}</td>
                    <td className="py-2.5 font-sans font-medium text-zinc-800 dark:text-zinc-200">{row.guestName}</td>
                    <td className="py-2.5 text-right text-zinc-700 dark:text-zinc-300">{formatINR(row.taxableAmount)}</td>
                    <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400">{formatINR(row.taxAmount)}</td>
                    <td className="py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">{formatINR(row.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: F&B SALES REPORT */}
      {/* ========================================================================= */}
      {reportType === "FNB" && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              F&B Orders & POS Sales
            </h3>
            <span className="text-xs font-mono text-zinc-500">{data?.rows?.length || 0} orders</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase">
                  <th className="pb-2">Order #</th>
                  <th className="pb-2">Outlet</th>
                  <th className="pb-2">Mode / Table</th>
                  <th className="pb-2">Items</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {data?.rows?.map((row: any) => (
                  <tr key={row.orderNo} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                    <td className="py-2.5 font-bold text-zinc-900 dark:text-zinc-100">{row.orderNo}</td>
                    <td className="py-2.5 font-sans font-medium text-zinc-800 dark:text-zinc-200">{row.outletName}</td>
                    <td className="py-2.5 text-zinc-500">{row.tableName} ({row.mode})</td>
                    <td className="py-2.5 text-zinc-600 dark:text-zinc-400">{row.itemCount} items</td>
                    <td className="py-2.5">
                      <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD EXPENSE */}
      {/* ========================================================================= */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="h-4 w-4 text-rose-500" /> Record Expense Voucher
              </h3>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {expenseError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                {expenseError}
              </div>
            )}
            {expenseSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                {expenseSuccess}
              </div>
            )}

            <form onSubmit={handleAddExpenseSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Expense Category <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    required
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-medium focus:border-rose-500 focus:outline-none"
                  >
                    <option value="DRIVER_COMMISSION">Driver Commission</option>
                    <option value="VENDOR_PAYMENT">Vendor Payment</option>
                    <option value="FB_PURCHASE">F&B Raw Materials</option>
                    <option value="MAINTENANCE">Maintenance & Repairs</option>
                    <option value="HOUSEKEEPING">Housekeeping Supplies</option>
                    <option value="PETTY_CASH">Petty Cash & Stationery</option>
                    <option value="STAFF_ADVANCE">Staff Advance</option>
                    <option value="UTILITIES">Utilities & Fuel</option>
                    <option value="GUEST_REFUND">Guest Refund</option>
                    <option value="OTHER">Other Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Payment Method <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    required
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-medium focus:border-rose-500 focus:outline-none"
                  >
                    <option value="CASH">Cash (From Drawer)</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Payee Name / Vendor <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Ramesh (Driver), Local Dairy, Electrician"
                  value={expenseForm.payeeName}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payeeName: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Amount (₹) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    required
                    min="0.01"
                    step="any"
                    type="number"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-mono font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                    Reference / Bill # <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Bill or Transaction Ref"
                    value={expenseForm.reference}
                    onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description / Notes <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Details of expense"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitting}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 font-bold shadow-xs transition cursor-pointer"
                >
                  {expenseSubmitting ? "Saving Voucher..." : "Record Expense Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRINTABLE CASHIER SUMMARY */}
      {/* ========================================================================= */}
      {showPrintModal && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-white text-zinc-950 p-6 shadow-2xl space-y-4 print:p-0 print:border-none font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 print:hidden">
              <span className="text-xs font-bold uppercase font-mono text-zinc-600">
                Official Cashier Daily Settlement Sheet
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Sheet
                </button>
                <button onClick={() => setShowPrintModal(false)} className="text-zinc-500 hover:text-zinc-900 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-zinc-300 pb-3">
                <div>
                  <h1 className="text-base font-black uppercase text-zinc-950">{activeProperty?.displayName}</h1>
                  <p className="text-[11px] text-zinc-600">{activeProperty?.legalName}</p>
                  <p className="font-mono text-[11px] text-zinc-700">
                    GSTIN: {activeProperty?.gstin || "N/A"} | State: {activeProperty?.stateCode || "18"}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-zinc-950">DAILY CASHIER AUDIT</div>
                  <div className="text-zinc-600 text-[11px]">Business Date: {selectedDate || activeProperty?.businessDate}</div>
                  <div className="text-zinc-600 text-[11px]">Printed: {new Date().toLocaleString()}</div>
                </div>
              </div>

              {/* Collections by Method & Source Bifurcation */}
              <div className="space-y-1.5">
                <h3 className="font-bold uppercase text-[11px] text-zinc-800 border-b pb-1">
                  1. Collections Inflow Bifurcation (Advances / Cash / UPI / OTA / POS / Folio)
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-mono">
                  <div>Advances & Pre-payments: <strong>{formatINR(summary.collectionsBySource?.ADVANCE_DEPOSIT || 0)}</strong></div>
                  <div>Cash Drawer Receipts: <strong>{formatINR(summary.collectionsByMethod?.CASH || 0)}</strong></div>
                  <div>UPI (GooglePay / PhonePe / QR): <strong>{formatINR(summary.collectionsByMethod?.UPI || 0)}</strong></div>
                  <div>Credit / Debit Cards (POS Machine): <strong>{formatINR(summary.collectionsByMethod?.CARD || 0)}</strong></div>
                  <div>OTA / Virtual Cards (MMT / Booking): <strong>{formatINR((summary.collectionsBySource?.OTA_COLLECTION || 0) + (summary.collectionsByMethod?.OTA_VCC || 0))}</strong></div>
                  <div>Restaurant / POS Outlet Sales: <strong>{formatINR(summary.collectionsBySource?.POS_RESTAURANT || 0)}</strong></div>
                  <div>Room Folio Checkout Settlements: <strong>{formatINR(summary.collectionsBySource?.FOLIO_SETTLEMENT || 0)}</strong></div>
                  <div>Bank Transfer / NEFT: <strong>{formatINR(summary.collectionsByMethod?.BANK_TRANSFER || 0)}</strong></div>
                </div>
                <div className="text-right font-mono font-bold text-xs pt-1 border-t">
                  Total Collections Inflow: {formatINR(summary.totalCollections)}
                </div>
              </div>

              {/* Expenses by Category */}
              <div className="space-y-1.5 pt-2">
                <h3 className="font-bold uppercase text-[11px] text-zinc-800 border-b pb-1">
                  2. Expenses Outflow Breakdown
                </h3>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>Driver Commissions: <strong>{formatINR(summary.expensesByCategory?.DRIVER_COMMISSION || 0)}</strong></div>
                  <div>Vendor Payments: <strong>{formatINR(summary.expensesByCategory?.VENDOR_PAYMENT || 0)}</strong></div>
                  <div>F&B Purchases: <strong>{formatINR(summary.expensesByCategory?.FB_PURCHASE || 0)}</strong></div>
                  <div>Maintenance & Repairs: <strong>{formatINR(summary.expensesByCategory?.MAINTENANCE || 0)}</strong></div>
                  <div>Petty Cash & Stationery: <strong>{formatINR(summary.expensesByCategory?.PETTY_CASH || 0)}</strong></div>
                </div>
                <div className="text-right font-mono font-bold text-xs pt-1 border-t">
                  Total Expenses Outflow: {formatINR(summary.totalExpenses)}
                </div>
              </div>

              {/* Cash Drawer Position */}
              <div className="bg-zinc-100 p-3 rounded-lg border border-zinc-300 space-y-1 font-mono text-xs">
                <div className="font-bold uppercase text-[11px] text-zinc-950">3. Physical Cash Drawer Position:</div>
                <div className="flex justify-between">
                  <span>Physical Cash Collected:</span>
                  <span>{formatINR(summary.cashDrawerPosition?.cashIn || 0)}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Less Physical Cash Paid Out:</span>
                  <span>-{formatINR(summary.cashDrawerPosition?.cashOut || 0)}</span>
                </div>
                <div className="flex justify-between font-black text-sm border-t border-zinc-400 pt-1">
                  <span>Net Physical Cash in Drawer to Handover:</span>
                  <span>{formatINR(summary.cashDrawerPosition?.netCashInHand || 0)}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-end text-[11px]">
                <div className="text-center">
                  <div className="w-40 border-b border-zinc-400 pb-6 text-zinc-400 italic">Front Desk Cashier</div>
                  <span className="font-bold">Handed Over By</span>
                </div>
                <div className="text-center">
                  <div className="w-40 border-b border-zinc-400 pb-6 text-zinc-400 italic">General Manager / Auditor</div>
                  <span className="font-bold">Verified & Received By</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
