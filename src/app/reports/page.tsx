"use client";

import React, { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";

export default function ReportsPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [reportType, setReportType] = useState<
    "CASHIER_COLLECTIONS_EXPENSES" | "FRONT_OFFICE" | "REVENUE" | "FNB"
  >("CASHIER_COLLECTIONS_EXPENSES");

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters for Collections & Expenses
  const [flowFilter, setFlowFilter] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

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

  const loadReportData = () => {
    if (!activeProperty) return;
    setLoading(true);
    fetch(`/api/v1/reports?propertyId=${activeProperty.id}&type=${reportType}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Report error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReportData();
  }, [activeProperty, reportType, refreshKey]);

  // Handle Add Expense Submission
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    if (!expenseForm.payeeName.trim() || !expenseForm.amount) {
      setExpenseError("Please fill in Payee Name and Amount.");
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
    if (!data?.allTransactions) return [];
    return data.allTransactions.filter((tx: any) => {
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
  }, [data?.allTransactions, flowFilter, methodFilter, categoryFilter, searchQuery]);

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
      a.download = `${activeProperty?.code}_Daily_Collections_Expenses_${new Date().toISOString().slice(0, 10)}.csv`;
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
    a.download = `${activeProperty?.code}_${reportType}_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const summary = data?.summary;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-[#111114] border border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              Financial & Operational Intelligence Reports
            </h1>
            <span className="rounded px-1.5 py-0.2 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40">
              AUDIT READY
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Daily cashier collections, petty expenses, guest ledgers & GST Rule 46 journals
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {reportType === "CASHIER_COLLECTIONS_EXPENSES" && (
            <>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/50 px-3 py-2 text-xs font-bold text-rose-300 transition shadow-sm"
              >
                <Plus className="h-4 w-4" /> Record Expense
              </button>
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition shadow-sm"
              >
                <Printer className="h-4 w-4" /> Print Cashier Sheet
              </button>
            </>
          )}

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 px-3 py-2 text-xs font-black transition shadow-sm"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Report Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-3 flex-wrap">
        <button
          onClick={() => setReportType("CASHIER_COLLECTIONS_EXPENSES")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
            reportType === "CASHIER_COLLECTIONS_EXPENSES"
              ? "bg-emerald-500 text-zinc-950 shadow-md"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-zinc-800/60"
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>Daily Collections & Expenses (D05)</span>
        </button>

        <button
          onClick={() => setReportType("FRONT_OFFICE")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            reportType === "FRONT_OFFICE"
              ? "bg-white text-zinc-950 shadow-md"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-zinc-800/60"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Guest Ledger (D02)</span>
        </button>

        <button
          onClick={() => setReportType("REVENUE")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            reportType === "REVENUE"
              ? "bg-white text-zinc-950 shadow-md"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-zinc-800/60"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Revenue & GST Journal (D03)</span>
        </button>

        <button
          onClick={() => setReportType("FNB")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            reportType === "FNB"
              ? "bg-white text-zinc-950 shadow-md"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-zinc-800/60"
          }`}
        >
          <UtensilsCrossed className="h-4 w-4" />
          <span>F&B Sales Report (D04)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. DAILY COLLECTIONS & EXPENSES TAB CONTENT */}
      {/* ========================================================================= */}
      {reportType === "CASHIER_COLLECTIONS_EXPENSES" && (
        <div className="space-y-4">
          {/* Top 4 Executive KPI Stat Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Total Collections */}
              <div className="rounded-2xl border border-emerald-900/50 bg-[#0d1612] p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                    <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                    Total Collections
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                    {summary.collectionsCount} Receipts
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  {formatINR(summary.totalCollections)}
                </div>
                <div className="pt-1.5 border-t border-emerald-950 text-[10px] font-mono text-zinc-300 flex flex-wrap gap-x-2.5 gap-y-1">
                  <span>UPI: <strong className="text-white">{formatINR(summary.collectionsByMethod?.UPI || 0)}</strong></span>
                  <span>CASH: <strong className="text-white">{formatINR(summary.collectionsByMethod?.CASH || 0)}</strong></span>
                  <span>CARD: <strong className="text-white">{formatINR(summary.collectionsByMethod?.CARD || 0)}</strong></span>
                </div>
              </div>

              {/* Card 2: Total Expenses */}
              <div className="rounded-2xl border border-rose-900/50 bg-[#170e10] p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase font-bold text-rose-400 flex items-center gap-1.5">
                    <ArrowUpRight className="h-4 w-4 text-rose-400" />
                    Total Expenses
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                    {summary.expensesCount} Vouchers
                  </span>
                </div>
                <div className="text-2xl font-black text-rose-400 font-mono tracking-tight">
                  {formatINR(summary.totalExpenses)}
                </div>
                <div className="pt-1.5 border-t border-rose-950 text-[10px] font-mono text-zinc-300 flex flex-wrap gap-x-2.5 gap-y-1">
                  <span>F&B: <strong className="text-white">{formatINR(summary.expensesByCategory?.FB_PURCHASE || 0)}</strong></span>
                  <span>MNT: <strong className="text-white">{formatINR(summary.expensesByCategory?.MAINTENANCE || 0)}</strong></span>
                  <span>Petty: <strong className="text-white">{formatINR(summary.expensesByCategory?.PETTY_CASH || 0)}</strong></span>
                </div>
              </div>

              {/* Card 3: Net Cash Flow */}
              <div className="rounded-2xl border border-blue-900/50 bg-[#0e131b] p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase font-bold text-blue-400 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                    Net Day Cash Flow
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Inflows - Outflows</span>
                </div>
                <div className="text-2xl font-black text-blue-300 font-mono tracking-tight">
                  {formatINR(summary.netCashFlow)}
                </div>
                <div className="pt-1.5 border-t border-blue-950 text-[10px] font-mono text-zinc-400">
                  Bank & Digital + Physical Cash Net
                </div>
              </div>

              {/* Card 4: Physical Cash Drawer In Hand */}
              <div className="rounded-2xl border border-amber-900/50 bg-[#16130d] p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-amber-400" />
                    Cash Drawer (In Hand)
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Physical Cash</span>
                </div>
                <div className="text-2xl font-black text-amber-300 font-mono tracking-tight">
                  {formatINR(summary.cashDrawerPosition?.netCashInHand || 0)}
                </div>
                <div className="pt-1.5 border-t border-amber-950 text-[10px] font-mono text-zinc-300 flex justify-between">
                  <span>Cash In: {formatINR(summary.cashDrawerPosition?.cashIn || 0)}</span>
                  <span>Cash Out: {formatINR(summary.cashDrawerPosition?.cashOut || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Collection Inflow Bifurcation Strip (Advances / Cash / UPI / Cards / OTA / POS / Folio) */}
          {summary && (
            <div className="rounded-2xl border border-zinc-800 bg-[#111114] p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Collection Inflow Bifurcation (Advances / Cash / UPI / OTA / POS / Folio)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  Click any tile to filter transactions
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs">
                {/* 1. Advances & Pre-payments */}
                <button
                  type="button"
                  onClick={() => {
                    setFlowFilter("INFLOW");
                    setMethodFilter(methodFilter === "ADVANCE" ? "ALL" : "ADVANCE");
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between space-y-1 ${
                    methodFilter === "ADVANCE"
                      ? "bg-emerald-950/60 border-emerald-500 shadow-md"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">1. Advances</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <div className="text-sm font-black font-mono text-white">
                    {formatINR(summary.collectionsBySource?.ADVANCE_DEPOSIT || 0)}
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono truncate">GRC / Kiosk Deposits</div>
                </button>

                {/* 2. Cash Drawer Inflow */}
                <button
                  type="button"
                  onClick={() => {
                    setFlowFilter("INFLOW");
                    setMethodFilter(methodFilter === "CASH" ? "ALL" : "CASH");
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between space-y-1 ${
                    methodFilter === "CASH"
                      ? "bg-emerald-950/60 border-emerald-500 shadow-md"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">2. Cash Drawer</span>
                    <Banknote className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="text-sm font-black font-mono text-white">
                    {formatINR(summary.collectionsByMethod?.CASH || 0)}
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono truncate">Physical Currency</div>
                </button>

                {/* 3. UPI / QR / GooglePay */}
                <button
                  type="button"
                  onClick={() => {
                    setFlowFilter("INFLOW");
                    setMethodFilter(methodFilter === "UPI" ? "ALL" : "UPI");
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between space-y-1 ${
                    methodFilter === "UPI"
                      ? "bg-emerald-950/60 border-emerald-500 shadow-md"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">3. UPI / QR</span>
                    <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="text-sm font-black font-mono text-white">
                    {formatINR(summary.collectionsByMethod?.UPI || 0)}
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono truncate">GPay / PhonePe / QR</div>
                </button>

                {/* 4. Cards / POS Terminal */}
                <button
                  type="button"
                  onClick={() => {
                    setFlowFilter("INFLOW");
                    setMethodFilter(methodFilter === "CARD" ? "ALL" : "CARD");
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between space-y-1 ${
                    methodFilter === "CARD"
                      ? "bg-emerald-950/60 border-emerald-500 shadow-md"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">4. Cards / EDC</span>
                    <CreditCard className="h-3.5 w-3.5 text-sky-400" />
                  </div>
                  <div className="text-sm font-black font-mono text-white">
                    {formatINR(summary.collectionsByMethod?.CARD || 0)}
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono truncate">POS Machine Swipes</div>
                </button>

                {/* 5. OTA / Virtual Cards (VCC) */}
                <button
                  type="button"
                  onClick={() => {
                    setFlowFilter("INFLOW");
                    setMethodFilter(methodFilter === "OTA" ? "ALL" : "OTA");
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between space-y-1 ${
                    methodFilter === "OTA"
                      ? "bg-emerald-950/60 border-emerald-500 shadow-md"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">5. OTA / VCC</span>
                    <Globe className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div className="text-sm font-black font-mono text-white">
                    {formatINR((summary.collectionsBySource?.OTA_COLLECTION || 0) + (summary.collectionsByMethod?.OTA_VCC || 0))}
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono truncate">MMT / Booking / VCC</div>
                </button>

                {/* 6. Restaurant / POS Direct Sales */}
                <button
                  type="button"
                  onClick={() => {
                    setFlowFilter("INFLOW");
                    setMethodFilter(methodFilter === "POS" ? "ALL" : "POS");
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between space-y-1 ${
                    methodFilter === "POS"
                      ? "bg-emerald-950/60 border-emerald-500 shadow-md"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">6. POS / F&B</span>
                    <UtensilsCrossed className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="text-sm font-black font-mono text-white">
                    {formatINR(summary.collectionsBySource?.POS_RESTAURANT || 0)}
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono truncate">Direct Outlet Sales</div>
                </button>

                {/* 7. Room Folio Settlements */}
                <button
                  type="button"
                  onClick={() => {
                    setFlowFilter("INFLOW");
                    setMethodFilter(methodFilter === "FOLIO" ? "ALL" : "FOLIO");
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between space-y-1 ${
                    methodFilter === "FOLIO"
                      ? "bg-emerald-950/60 border-emerald-500 shadow-md"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">7. Folio Settle</span>
                    <Building2 className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <div className="text-sm font-black font-mono text-white">
                    {formatINR(summary.collectionsBySource?.FOLIO_SETTLEMENT || 0)}
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono truncate">Room Checkout Bills</div>
                </button>
              </div>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-2xl bg-[#111114] border border-zinc-800">
            {/* Flow Type Tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setFlowFilter("ALL")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  flowFilter === "ALL"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                All Records ({data?.allTransactions?.length || 0})
              </button>
              <button
                onClick={() => setFlowFilter("INFLOW")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                  flowFilter === "INFLOW"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                <span>Collections ({data?.collections?.length || 0})</span>
              </button>
              <button
                onClick={() => setFlowFilter("OUTFLOW")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                  flowFilter === "OUTFLOW"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-rose-400" />
                <span>Expenses ({data?.expenses?.length || 0})</span>
              </button>
            </div>

            {/* Dropdowns & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Payment Method / Bifurcation Filter */}
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 font-bold focus:outline-none focus:border-zinc-500 font-mono"
              >
                <option value="ALL">All Methods & Sources</option>
                <option value="ADVANCE">📥 Advances & Pre-payments</option>
                <option value="CASH">💵 Cash Drawer Inflow</option>
                <option value="UPI">📱 UPI (GooglePay / PhonePe / QR)</option>
                <option value="CARD">💳 Cards (POS Machine / EDC)</option>
                <option value="OTA">🌐 OTA / Channel / VCC</option>
                <option value="POS">🍽️ Restaurant / POS Direct Sales</option>
                <option value="FOLIO">🏨 Room Folio Settlements</option>
                <option value="BANK_TRANSFER">🏦 Bank Transfer / NEFT</option>
              </select>

              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search guest, payee, receipt #, UTR..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 rounded-xl bg-zinc-900 border border-zinc-700 pl-8 pr-7 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1.5 text-zinc-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-2xl border border-zinc-800 bg-[#111114] overflow-hidden shadow-sm">
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-zinc-400" />
                <h2 className="text-xs font-bold text-white">
                  Chronological Collection & Expense Journal
                </h2>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {filteredCashierTransactions.length} records matching filter
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Receipt / Voucher</th>
                    <th className="p-3">Time & Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Party / Guest / Payee</th>
                    <th className="p-3">Particulars / Source</th>
                    <th className="p-3">Method & Reference</th>
                    <th className="p-3 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {filteredCashierTransactions.map((tx: any, idx: number) => {
                    const isInflow = tx.flow === "INFLOW";
                    return (
                      <tr key={`cashier-tx-${tx.flow}-${tx.recordId || tx.id || idx}-${idx}`} className="hover:bg-zinc-900/40 transition">
                        {/* 1. Receipt / Voucher */}
                        <td className="p-3 font-mono font-bold">
                          <span
                            className={
                              isInflow
                                ? "text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded"
                                : "text-rose-400 bg-rose-950/40 border border-rose-800/40 px-1.5 py-0.5 rounded"
                            }
                          >
                            {tx.recordId}
                          </span>
                        </td>

                        {/* 2. Time & Date */}
                        <td className="p-3 font-mono text-zinc-300 text-[11px]">
                          <div>{tx.time}</div>
                          <div className="text-[10px] text-zinc-500">{tx.date}</div>
                        </td>

                        {/* 3. Type (Inflow / Outflow) */}
                        <td className="p-3">
                          {isInflow ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              <ArrowDownLeft className="h-3 w-3 text-emerald-400" />
                              COLLECTION
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                              <ArrowUpRight className="h-3 w-3 text-rose-400" />
                              EXPENSE
                            </span>
                          )}
                        </td>

                        {/* 4. Party / Guest / Payee */}
                        <td className="p-3 font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-zinc-500" />
                            <span>{tx.party}</span>
                          </div>
                        </td>

                        {/* 5. Particulars & Source Badge */}
                        <td className="p-3 text-zinc-300 text-[11px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {tx.sourceLabel && isInflow && (
                              <span className="rounded px-1.5 py-0.2 text-[9px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                                {tx.sourceLabel}
                              </span>
                            )}
                            <span>{tx.particulars}</span>
                          </div>
                        </td>

                        {/* 6. Method & Reference */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-200 border border-zinc-700">
                              {tx.method}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[140px]" title={tx.reference}>
                              {tx.reference}
                            </span>
                          </div>
                        </td>

                        {/* 7. Amount */}
                        <td className="p-3 text-right font-mono font-black text-xs sm:text-sm tabular-nums">
                          {isInflow ? (
                            <span className="text-emerald-400">+{formatINR(tx.amount)}</span>
                          ) : (
                            <span className="text-rose-400">-{formatINR(tx.totalAmount)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredCashierTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono text-xs">
                        No transactions found for the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FRONT OFFICE GUEST LEDGER (D02) */}
      {/* ========================================================================= */}
      {reportType === "FRONT_OFFICE" && (
        <div className="rounded-2xl border border-zinc-800 bg-[#111114] overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xs font-bold text-white">Front Office In-House Guest Ledger</h2>
            <span className="text-xs text-zinc-400 font-mono">{data?.rows?.length || 0} in-house stays</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-3">Guest</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Arrival</th>
                  <th className="p-3">Departure</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Folio Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data?.rows?.map((r: any, idx: number) => (
                  <tr key={`guest-stay-${r.stayId || idx}-${idx}`} className="hover:bg-zinc-900/40 transition">
                    <td className="p-3 font-bold text-white">{r.guestName}</td>
                    <td className="p-3 text-zinc-400 font-mono text-[11px]">{r.phone || "—"}</td>
                    <td className="p-3 font-mono font-bold text-zinc-200">Room {r.roomNumber}</td>
                    <td className="p-3 text-zinc-400 font-mono text-[11px]">{r.arrival}</td>
                    <td className="p-3 text-zinc-400 font-mono text-[11px]">{r.departure}</td>
                    <td className="p-3">
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-black text-rose-400 text-right tabular-nums">
                      {formatINR(r.folioBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REVENUE & GST JOURNAL (D03) */}
      {/* ========================================================================= */}
      {reportType === "REVENUE" && (
        <div className="rounded-2xl border border-zinc-800 bg-[#111114] overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xs font-bold text-white">Revenue & GST Transaction Journal</h2>
            <span className="text-xs text-zinc-400 font-mono">{data?.rows?.length || 0} entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">SAC Code / Charge</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Guest</th>
                  <th className="p-3 text-right">Taxable (₹)</th>
                  <th className="p-3 text-right">GST (₹)</th>
                  <th className="p-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data?.rows?.map((r: any, idx: number) => (
                  <tr key={`rev-entry-${r.id || idx}-${idx}`} className="hover:bg-zinc-900/40 transition">
                    <td className="p-3 font-mono text-zinc-400 text-[11px]">{r.serviceDate}</td>
                    <td className="p-3 font-mono font-bold text-zinc-300">{r.chargeCode}</td>
                    <td className="p-3 text-zinc-200">{r.description}</td>
                    <td className="p-3 font-bold text-white">{r.guestName}</td>
                    <td className="p-3 font-mono text-zinc-300 text-right tabular-nums">
                      {formatINR(r.taxableAmount)}
                    </td>
                    <td className="p-3 font-mono text-blue-400 text-right tabular-nums">
                      {formatINR(r.taxAmount)}
                    </td>
                    <td className="p-3 font-mono font-bold text-white text-right tabular-nums">
                      {formatINR(r.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. F&B SALES REPORT (D04) */}
      {/* ========================================================================= */}
      {reportType === "FNB" && (
        <div className="rounded-2xl border border-zinc-800 bg-[#111114] overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xs font-bold text-white">F&B Outlet Sales & Tickets</h2>
            <span className="text-xs text-zinc-400 font-mono">{data?.rows?.length || 0} tickets</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-3">Order No</th>
                  <th className="p-3">Outlet</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Table / Room</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data?.rows?.map((r: any, idx: number) => (
                  <tr key={`fnb-order-${r.orderNo || idx}-${idx}`} className="hover:bg-zinc-900/40 transition">
                    <td className="p-3 font-mono font-bold text-amber-400">{r.orderNo}</td>
                    <td className="p-3 font-bold text-white">{r.outletName}</td>
                    <td className="p-3">
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
                        {r.mode}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-300 font-mono">{r.tableName}</td>
                    <td className="p-3 font-mono text-zinc-300">{r.itemCount} items</td>
                    <td className="p-3">
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-500 font-mono text-[11px]">{r.createdAt?.slice(0, 16).replace("T", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD PETTY EXPENSE */}
      {/* ========================================================================= */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-700 bg-[#121215] p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-rose-400">
                  Daily Hotel Expense Outflow
                </span>
                <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                  Record Petty Expense / Vendor Payout
                </h2>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="h-8 w-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {expenseError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{expenseError}</span>
              </div>
            )}

            {expenseSuccess && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{expenseSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddExpenseSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Expense Head / Category *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white font-bold focus:outline-none focus:border-white"
                  >
                    <option value="VENDOR_PAYMENT">Vendor / Supplier Payment (Dairy, Mandi, Provisions)</option>
                    <option value="STAFF_ADVANCE">Staff Advance / Salary / Allowance</option>
                    <option value="DRIVER_COMMISSION">Driver Commission (Auto / Cab / Travel Agent)</option>
                    <option value="PETTY_CASH">Petty Cash (Tea, Printing, Stationery)</option>
                    <option value="FB_PURCHASE">F&B Kitchen Purchases & Raw Provisions</option>
                    <option value="MAINTENANCE">Maintenance & Repairs (AC, Plumb, Electric)</option>
                    <option value="HOUSEKEEPING">Housekeeping Supplies & Laundry</option>
                    <option value="UTILITIES">Utilities & Generator Fuel / Diesel</option>
                    <option value="GUEST_REFUND">Guest Security Deposit Refund</option>
                    <option value="OTHER">Other Operational Expense</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Payment Method *</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white font-bold focus:outline-none focus:border-white"
                  >
                    <option value="CASH">Cash Drawer Outflow</option>
                    <option value="UPI">UPI (QR / GooglePay)</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Bank Cheque</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Payee Name */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  {expenseForm.category === "DRIVER_COMMISSION"
                    ? "Driver / Agent Name & Vehicle No *"
                    : expenseForm.category === "VENDOR_PAYMENT"
                    ? "Vendor / Supplier Company Name *"
                    : expenseForm.category === "STAFF_ADVANCE"
                    ? "Staff Member Name & Department *"
                    : expenseForm.category === "FB_PURCHASE"
                    ? "Market Vendor / Provision Supplier Name *"
                    : expenseForm.category === "MAINTENANCE"
                    ? "Technician / Contractor / Agency Name *"
                    : expenseForm.category === "HOUSEKEEPING"
                    ? "Laundry Vendor / Supplier Name *"
                    : expenseForm.category === "UTILITIES"
                    ? "Utility / Fuel Vendor Name *"
                    : expenseForm.category === "GUEST_REFUND"
                    ? "Guest Name & Room No *"
                    : "Payee / Recipient Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    expenseForm.category === "DRIVER_COMMISSION"
                      ? "e.g. Raju Das (Cab #AS-01-EB-4491)"
                      : expenseForm.category === "VENDOR_PAYMENT"
                      ? "e.g. Paltan Bazaar Dairy / Metro Supplies"
                      : expenseForm.category === "STAFF_ADVANCE"
                      ? "e.g. Rahul Sharma (Front Desk / Housekeeping)"
                      : expenseForm.category === "FB_PURCHASE"
                      ? "e.g. Guwahati Sabji Mandi / Assam Poultry"
                      : expenseForm.category === "MAINTENANCE"
                      ? "e.g. Electrician Ratul / Daikin AC Service"
                      : expenseForm.category === "HOUSEKEEPING"
                      ? "e.g. Guwahati Express Laundry / Linen Store"
                      : expenseForm.category === "UTILITIES"
                      ? "e.g. Indian Oil Fuel Station / APDCL Electricity"
                      : expenseForm.category === "GUEST_REFUND"
                      ? "e.g. Anup Dey (Room 104)"
                      : "e.g. Reception Stationery / Daily Refreshments"
                  }
                  value={expenseForm.payeeName}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payeeName: e.target.value })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                />
              </div>

              {/* Dynamic Description / Narration */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Description / Narration</label>
                <input
                  type="text"
                  placeholder={
                    expenseForm.category === "DRIVER_COMMISSION"
                      ? "e.g. Airport pickup guest referral commission"
                      : expenseForm.category === "VENDOR_PAYMENT"
                      ? "e.g. Monthly milk & dairy supply bill"
                      : expenseForm.category === "STAFF_ADVANCE"
                      ? "e.g. Advance against monthly salary"
                      : expenseForm.category === "FB_PURCHASE"
                      ? "e.g. 5kg Paneer + 10L Milk for Restaurant Kitchen"
                      : expenseForm.category === "MAINTENANCE"
                      ? "e.g. Room 204 AC capacitor repair & gas refill"
                      : expenseForm.category === "HOUSEKEEPING"
                      ? "e.g. 80 Bed sheets + pillow covers laundry"
                      : expenseForm.category === "UTILITIES"
                      ? "e.g. 50L Diesel for Generator backup"
                      : expenseForm.category === "GUEST_REFUND"
                      ? "e.g. Security deposit balance refund on checkout"
                      : "e.g. 2 Paper reams + printer ink cartridge"
                  }
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                />
              </div>

              {/* Amount & Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Reference / UTR / Bill No</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI/MANDI/9942 or Bill #81"
                    value={expenseForm.reference}
                    onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="rounded-xl px-4 py-2 text-zinc-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitting}
                  className="rounded-xl bg-rose-500 hover:bg-rose-400 text-zinc-950 px-5 py-2 font-black text-xs shadow-lg transition flex items-center gap-1.5 active:scale-95"
                >
                  {expenseSubmitting ? "Saving Voucher..." : "Record Expense Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRINTABLE CASHIER SUMMARY (RULE 46) */}
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
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Sheet
                </button>
                <button onClick={() => setShowPrintModal(false)} className="text-zinc-500 hover:text-zinc-900">
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
                  <div className="text-zinc-600 text-[11px]">Business Date: {activeProperty?.businessDate}</div>
                  <div className="text-zinc-600 text-[11px]">Printed: {new Date().toLocaleString()}</div>
                </div>
              </div>

              {/* Collections by Method & Source Bifurcation */}
              <div className="space-y-1.5">
                <h3 className="font-bold uppercase text-[11px] text-zinc-800 border-b pb-1">
                  1. Collections Inflow Bifurcation (Advances / Cash / UPI / OTA / POS / Folio)
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
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
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>F&B Purchases: <strong>{formatINR(summary.expensesByCategory?.FB_PURCHASE || 0)}</strong></div>
                  <div>Maintenance & Repairs: <strong>{formatINR(summary.expensesByCategory?.MAINTENANCE || 0)}</strong></div>
                  <div>Housekeeping & Laundry: <strong>{formatINR(summary.expensesByCategory?.HOUSEKEEPING || 0)}</strong></div>
                  <div>Petty Cash & Stationery: <strong>{formatINR(summary.expensesByCategory?.PETTY_CASH || 0)}</strong></div>
                  <div>Utilities & Fuel: <strong>{formatINR(summary.expensesByCategory?.UTILITIES || 0)}</strong></div>
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
