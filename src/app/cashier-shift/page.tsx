"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR } from "@/lib/gst/calculator";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Printer,
  Download,
  RefreshCw,
  Search,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Receipt,
  CreditCard,
  QrCode,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Eye,
  Filter,
  Layers,
  Banknote,
  UtensilsCrossed,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";

export default function CashierShiftPage() {
  const { activeProperty, refreshKey, triggerRefresh } = useHotel();

  // Selected Date State (Defaults to activeProperty.businessDate or Today)
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Ledger Filter States
  const [flowFilter, setFlowFilter] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyCashDrawer, setOnlyCashDrawer] = useState(false);

  // Modals
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showPrintHandoverModal, setShowPrintHandoverModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [copiedTxId, setCopiedTxId] = useState(false);

  // Denominations for Handover Sheet
  const [denominations, setDenominations] = useState<Record<number, number>>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });

  // Income Form State
  const [incomeForm, setIncomeForm] = useState({
    category: "BAR_FOOD_BILL",
    payerName: "",
    payerPhone: "",
    amount: "",
    paymentMethod: "CASH",
    kotNo: "",
    clientType: "INDIVIDUAL",
    companyName: "",
    gstin: "",
    billingAddress: "",
    reference: "",
    notes: "",
  });
  const [incomeSubmitting, setIncomeSubmitting] = useState(false);
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [incomeSuccess, setIncomeSuccess] = useState<string | null>(null);

  // Expense Form State
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

  const [datePreset, setDatePreset] = useState<string>("TODAY");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Initialize selectedDate
  useEffect(() => {
    if (activeProperty?.businessDate && !selectedDate) {
      setSelectedDate(activeProperty.businessDate);
    } else if (!selectedDate) {
      setSelectedDate(new Date().toISOString().split("T")[0]);
    }
  }, [activeProperty]);

  // Load Shift Ledger Data
  const loadLedgerData = async () => {
    if (!activeProperty?.id) return;
    setLoading(true);
    try {
      let dateQuery = "";
      const now = new Date();
      const baseDate = activeProperty?.businessDate ? new Date(activeProperty.businessDate) : now;

      if (datePreset === "TODAY") {
        dateQuery = `&date=${selectedDate || activeProperty?.businessDate || now.toISOString().split("T")[0]}`;
      } else if (datePreset === "YESTERDAY") {
        const y = new Date(baseDate);
        y.setDate(y.getDate() - 1);
        dateQuery = `&date=${y.toISOString().split("T")[0]}`;
      } else if (datePreset === "LAST_7_DAYS") {
        const past7 = new Date(baseDate);
        past7.setDate(past7.getDate() - 7);
        dateQuery = `&startDate=${past7.toISOString().split("T")[0]}&endDate=${baseDate.toISOString().split("T")[0]}`;
      } else if (datePreset === "THIS_MONTH") {
        const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        dateQuery = `&startDate=${firstDay.toISOString().split("T")[0]}&endDate=${baseDate.toISOString().split("T")[0]}`;
      } else if (datePreset === "CUSTOM") {
        if (customStartDate && customEndDate) {
          dateQuery = `&startDate=${customStartDate}&endDate=${customEndDate}`;
        } else if (customStartDate) {
          dateQuery = `&date=${customStartDate}`;
        }
      } else if (datePreset === "ALL_TIME") {
        dateQuery = "";
      }

      const url = `/api/v1/reports?propertyId=${activeProperty.id}&type=CASHIER_COLLECTIONS_EXPENSES${dateQuery}`;
      const res = await fetch(url);
      const json = await res.json();
      const summary = json.summary || {};
      const cashDrawer = summary.cashDrawerPosition || {
        cashIn: 0,
        cashOut: 0,
        netCashInHand: 0,
      };
      setData({
        ...json,
        totalCollections: summary.totalCollections ?? json.totalCollections ?? 0,
        collectionsCount: summary.collectionsCount ?? json.collectionsCount ?? 0,
        totalExpenses: summary.totalExpenses ?? json.totalExpenses ?? 0,
        expensesCount: summary.expensesCount ?? json.expensesCount ?? 0,
        netCashFlow: summary.netCashFlow ?? json.netCashFlow ?? 0,
        cashDrawer: {
          netCashHandover: cashDrawer.netCashInHand ?? 0,
          cashIn: cashDrawer.cashIn ?? 0,
          cashOut: cashDrawer.cashOut ?? 0,
        },
        collectionsByMethod: summary.collectionsByMethod || {},
        transactions: json.allTransactions || json.recentTransactions || json.transactions || [],
      });
    } catch (err) {
      console.error("Failed to load shift ledger:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, [activeProperty?.id, selectedDate, datePreset, customStartDate, customEndDate, refreshKey]);

  // Date Stepper Handlers
  const handlePrevDay = () => {
    if (!selectedDate) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleJumpToToday = () => {
    const today = activeProperty?.businessDate || new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    const list: any[] = data?.transactions || [];
    return list.filter((tx) => {
      if (onlyCashDrawer && tx.method !== "CASH") return false;
      if (flowFilter === "INFLOW" && tx.flow !== "INFLOW") return false;
      if (flowFilter === "OUTFLOW" && tx.flow !== "OUTFLOW") return false;
      if (methodFilter !== "ALL" && tx.method !== methodFilter) return false;
      if (categoryFilter !== "ALL" && tx.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const party = (tx.party || tx.payerName || tx.payeeName || "").toLowerCase();
        const rec = (tx.recordId || "").toLowerCase();
        const ref = (tx.reference || "").toLowerCase();
        const room = (tx.roomNumber || "").toLowerCase();
        const desc = (tx.description || tx.particulars || "").toLowerCase();
        const kot = (tx.kotNo || "").toLowerCase();

        if (
          !party.includes(q) &&
          !rec.includes(q) &&
          !ref.includes(q) &&
          !room.includes(q) &&
          !desc.includes(q) &&
          !kot.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data, flowFilter, methodFilter, categoryFilter, searchQuery, onlyCashDrawer]);

  // Physical Cash Count Calculation
  const totalPhysicalCashCounted = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [denom, count]) => {
      return sum + Number(denom) * Number(count || 0);
    }, 0);
  }, [denominations]);

  const cashDrawerVariance = useMemo(() => {
    const expected = data?.cashDrawer?.netCashHandover || 0;
    return totalPhysicalCashCounted - expected;
  }, [totalPhysicalCashCounted, data]);

  // Handle Direct Income Submission
  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncomeError(null);
    setIncomeSuccess(null);

    if (!incomeForm.amount || isNaN(Number(incomeForm.amount)) || Number(incomeForm.amount) <= 0) {
      setIncomeError("Please enter a valid positive collection amount.");
      return;
    }

    if (incomeForm.category === "BANQUET_EVENT_ADVANCE") {
      if (!incomeForm.payerName.trim()) {
        setIncomeError("Guest / Contact Name is required for Banquet & Event Advances.");
        return;
      }
      if (!incomeForm.payerPhone.trim()) {
        setIncomeError("Guest Mobile Phone is required for Banquet & Event Advances.");
        return;
      }
    }

    setIncomeSubmitting(true);
    try {
      const res = await fetch("/api/v1/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          category: incomeForm.category,
          payerName: incomeForm.payerName,
          payerPhone: incomeForm.payerPhone,
          amount: Number(incomeForm.amount),
          paymentMethod: incomeForm.paymentMethod,
          kotNo: incomeForm.kotNo,
          clientType: incomeForm.clientType,
          companyName: incomeForm.companyName,
          gstin: incomeForm.gstin,
          billingAddress: incomeForm.billingAddress,
          reference: incomeForm.reference,
          notes: incomeForm.notes,
          receivedAt: selectedDate ? `${selectedDate}T${new Date().toTimeString().split(" ")[0]}` : undefined,
          createdByName: "Front Desk Cashier",
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to record collection");
      }

      setIncomeSuccess(`Receipt #${json.receiptNo || "Generated"} recorded successfully!`);
      setIncomeForm({
        category: "BAR_FOOD_BILL",
        payerName: "",
        payerPhone: "",
        amount: "",
        paymentMethod: "CASH",
        kotNo: "",
        clientType: "INDIVIDUAL",
        companyName: "",
        gstin: "",
        billingAddress: "",
        reference: "",
        notes: "",
      });

      triggerRefresh();
      setTimeout(() => {
        setShowAddIncomeModal(false);
        setIncomeSuccess(null);
        loadLedgerData();
      }, 1000);
    } catch (err: any) {
      setIncomeError(err.message);
    } finally {
      setIncomeSubmitting(false);
    }
  };

  // Handle Expense Voucher Submission
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);
    setExpenseSuccess(null);

    if (!expenseForm.payeeName.trim()) {
      setExpenseError("Please enter the Payee / Vendor / Staff name.");
      return;
    }
    if (!expenseForm.amount || isNaN(Number(expenseForm.amount)) || Number(expenseForm.amount) <= 0) {
      setExpenseError("Please enter a valid expense amount.");
      return;
    }

    setExpenseSubmitting(true);
    try {
      const res = await fetch("/api/v1/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          category: expenseForm.category,
          payeeName: expenseForm.payeeName,
          description: expenseForm.description,
          amount: Number(expenseForm.amount),
          taxAmount: Number(expenseForm.taxAmount || 0),
          paymentMethod: expenseForm.paymentMethod,
          reference: expenseForm.reference,
          notes: expenseForm.notes,
          businessDate: selectedDate || activeProperty?.businessDate,
          createdByName: "Front Desk Cashier",
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to record expense");
      }

      setExpenseSuccess(`Voucher #${json.expense?.voucherNo || "Generated"} created successfully!`);
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

      triggerRefresh();
      setTimeout(() => {
        setShowAddExpenseModal(false);
        setExpenseSuccess(null);
        loadLedgerData();
      }, 1000);
    } catch (err: any) {
      setExpenseError(err.message);
    } finally {
      setExpenseSubmitting(false);
    }
  };

  // Export CSV
  const exportLedgerCSV = () => {
    if (!filteredTransactions.length) return;
    const headers = [
      "Voucher / Receipt",
      "Timestamp",
      "Flow",
      "Type",
      "Party / Payee / Guest",
      "Particulars / Details",
      "Method",
      "Reference",
      "Amount (INR)",
      "Status",
    ];

    const rows = filteredTransactions.map((tx: any) => [
      `"${tx.recordId}"`,
      `"${tx.date} ${tx.time}"`,
      `"${tx.flow}"`,
      `"${tx.type}"`,
      `"${(tx.party || tx.payerName || tx.payeeName || "").replace(/"/g, '""')}"`,
      `"${(tx.particulars || tx.description || "").replace(/"/g, '""')}"`,
      `"${tx.method}"`,
      `"${(tx.reference || "").replace(/"/g, '""')}"`,
      tx.flow === "INFLOW" ? tx.amount : -tx.amount,
      `"${tx.status || "CONFIRMED"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${activeProperty?.code || "HOTEL"}_Cashier_Shift_Ledger_${selectedDate || "today"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto w-full text-zinc-900 dark:text-zinc-100 pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                  Cashier Shift Entry Ledger
                </h1>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                  Active Shift & Till Reconciler
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Front office operational entry ledger for dining income, petty cash vouchers, folio receipts & physical drawer handover
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddIncomeModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Record Income
          </button>
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Record Expense
          </button>
          <button
            onClick={() => setShowPrintHandoverModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition shadow-2xs cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-zinc-500" />
            Shift Handover Sheet
          </button>
          <button
            onClick={exportLedgerCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-zinc-500" />
            Export CSV
          </button>
          <button
            onClick={() => {
              triggerRefresh();
              loadLedgerData();
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50"
            title="Refresh Shift Ledger"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Shift Date Filter Bar (matching Revenue Ledger UX) */}
      <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col gap-3 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Selector Dropdown */}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <select
                value={datePreset}
                onChange={(e) => {
                  const val = e.target.value;
                  setDatePreset(val);
                  if (val === "TODAY") {
                    setSelectedDate(activeProperty?.businessDate || new Date().toISOString().split("T")[0]);
                  } else if (val === "YESTERDAY") {
                    const baseDate = activeProperty?.businessDate ? new Date(activeProperty.businessDate) : new Date();
                    const y = new Date(baseDate);
                    y.setDate(y.getDate() - 1);
                    setSelectedDate(y.toISOString().split("T")[0]);
                  }
                }}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="TODAY">Today's Shift ({activeProperty?.businessDate || "Live"})</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="THIS_MONTH">This Month (MTD)</option>
                <option value="ALL_TIME">All Time (Master Ledger)</option>
                <option value="CUSTOM">Custom Date Range</option>
              </select>
            </div>

            {/* Quick Day Stepper (Active for Daily Auditing) */}
            {(datePreset === "TODAY" || datePreset === "YESTERDAY") && (
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                <button
                  onClick={handlePrevDay}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                  title="Previous Business Day"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                />
                <button
                  onClick={handleNextDay}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                  title="Next Business Day"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Operating Window Note */}
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Audit Cycle: 12:00 AM – 12:00 AM Midnight
          </div>
        </div>

        {/* Custom Date Range Card (matching Revenue Ledger) */}
        {datePreset === "CUSTOM" && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono text-[11px]">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono text-[11px]">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-900 dark:text-zinc-100"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                  setDatePreset("TODAY");
                  setSelectedDate(activeProperty?.businessDate || new Date().toISOString().split("T")[0]);
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
              >
                Reset to Today
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Overview Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        {/* Cash in Drawer Hero Card */}
        <div
          onClick={() => setOnlyCashDrawer(!onlyCashDrawer)}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            onlyCashDrawer
              ? "bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400"
              : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 hover:border-emerald-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                onlyCashDrawer ? "text-white" : "text-emerald-800 dark:text-emerald-300"
              }`}
            >
              Cash In Drawer Handover
            </span>
            <Banknote
              className={`h-4 w-4 ${onlyCashDrawer ? "text-white" : "text-emerald-600 dark:text-emerald-400"}`}
            />
          </div>
          <div
            className={`text-2xl font-black font-mono mt-2 ${
              onlyCashDrawer ? "text-white" : "text-emerald-900 dark:text-emerald-100"
            }`}
          >
            {formatINR(data?.cashDrawer?.netCashHandover || 0)}
          </div>
          <div
            className={`text-[11px] mt-1 flex items-center justify-between font-mono ${
              onlyCashDrawer ? "text-emerald-100" : "text-emerald-700/80 dark:text-emerald-400"
            }`}
          >
            <span>In: {formatINR(data?.cashDrawer?.cashIn || 0)}</span>
            <span>Out: {formatINR(data?.cashDrawer?.cashOut || 0)}</span>
          </div>
          <div className="text-[10px] mt-1.5 opacity-80 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {onlyCashDrawer ? "Filtering Cash in Drawer (Click to reset)" : "Click to isolate physical cash entries"}
          </div>
        </div>

        {/* Total Inflows */}
        <div
          onClick={() => setFlowFilter(flowFilter === "INFLOW" ? "ALL" : "INFLOW")}
          className={`p-4 rounded-xl border transition cursor-pointer bg-white dark:bg-[#111114] ${
            flowFilter === "INFLOW"
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Inflows (Income & Receipts)
            </span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-zinc-900 dark:text-white mt-2">
            {formatINR(data?.totalCollections || 0)}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            {data?.collectionsCount || 0} Total Receipts Collected
          </div>
        </div>

        {/* Total Outflows */}
        <div
          onClick={() => setFlowFilter(flowFilter === "OUTFLOW" ? "ALL" : "OUTFLOW")}
          className={`p-4 rounded-xl border transition cursor-pointer bg-white dark:bg-[#111114] ${
            flowFilter === "OUTFLOW"
              ? "border-rose-500 ring-2 ring-rose-500/20"
              : "border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Total Outflows (Expenses & Payouts)
            </span>
            <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-black font-mono text-zinc-900 dark:text-white mt-2">
            {formatINR(data?.totalExpenses || 0)}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            {data?.expensesCount || 0} Total Vouchers Paid Out
          </div>
        </div>

        {/* Net Shift Cash Flow */}
        <div className="p-4 rounded-xl border bg-white dark:bg-[#111114] border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Net Day Cash Flow
            </span>
            <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div
            className={`text-2xl font-black font-mono mt-2 ${
              (data?.netCashFlow || 0) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatINR(data?.netCashFlow || 0)}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Gross Collections minus Total Expenses
          </div>
        </div>
      </div>

      {/* Digital Payment Channel Breakdown Chips */}
      {data?.collectionsByMethod && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 print:hidden text-xs">
          <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">
            Inflow Channels:
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-zinc-800 dark:text-zinc-200">
            Cash: <strong>{formatINR(data.collectionsByMethod.CASH || 0)}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-emerald-700 dark:text-emerald-300">
            UPI: <strong>{formatINR(data.collectionsByMethod.UPI || 0)}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-blue-700 dark:text-blue-300">
            Card: <strong>{formatINR(data.collectionsByMethod.CARD || 0)}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-purple-700 dark:text-purple-300">
            Bank Transfer: <strong>{formatINR(data.collectionsByMethod.BANK_TRANSFER || 0)}</strong>
          </span>
          {data.collectionsByMethod.DIRECT_BILL > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-amber-700 dark:text-amber-300">
              BTC: <strong>{formatINR(data.collectionsByMethod.DIRECT_BILL)}</strong>
            </span>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search voucher #, receipt #, guest, payee, room, UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 pl-9 pr-8 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Flow Filter Pills */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
            <button
              onClick={() => {
                setFlowFilter("ALL");
                setOnlyCashDrawer(false);
              }}
              className={`px-2.5 py-1 rounded-md transition ${
                flowFilter === "ALL" && !onlyCashDrawer
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-semibold shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              All Flows
            </button>
            <button
              onClick={() => {
                setFlowFilter("INFLOW");
                setOnlyCashDrawer(false);
              }}
              className={`px-2.5 py-1 rounded-md transition ${
                flowFilter === "INFLOW"
                  ? "bg-emerald-600 text-white font-semibold shadow-2xs"
                  : "text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
              }`}
            >
              Inflows (+)
            </button>
            <button
              onClick={() => {
                setFlowFilter("OUTFLOW");
                setOnlyCashDrawer(false);
              }}
              className={`px-2.5 py-1 rounded-md transition ${
                flowFilter === "OUTFLOW"
                  ? "bg-rose-600 text-white font-semibold shadow-2xs"
                  : "text-rose-700 dark:text-rose-400 hover:text-rose-800"
              }`}
            >
              Outflows (-)
            </button>
          </div>

          {/* Payment Method Dropdown */}
          <div className="relative">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 pr-8 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer appearance-none"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="CASH">Cash Only</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
              <option value="DIRECT_BILL">Direct Bill (BTC)</option>
              <option value="CHEQUE">Cheque</option>
            </select>
            <Filter className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
          Showing <span className="font-semibold text-zinc-900 dark:text-white">{filteredTransactions.length}</span> entries
        </div>
      </div>

      {/* Main Ledger Entries Table */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#111114] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 text-[10.5px] uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Voucher / Receipt</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Time</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Type & Flow</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Party / Payee / Guest</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Particulars & Category</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Method</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Amount (INR)</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap text-right print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
              {filteredTransactions.map((tx: any, idx: number) => {
                const isInflow = tx.flow === "INFLOW";

                return (
                  <tr
                    key={tx.id || `${tx.recordId}-${idx}`}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer group"
                  >
                    {/* Record / Voucher */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-[11.5px]">
                        {tx.recordId}
                      </div>
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">
                      {tx.time}
                    </td>

                    {/* Type & Flow Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isInflow
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
                        }`}
                      >
                        {isInflow ? (
                          <>
                            <ArrowDownLeft className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>+ RECEIPT</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                            <span>- EXPENSE</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Party / Payee / Guest */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 text-xs">
                        {tx.party || tx.payerName || tx.payeeName || "Direct Guest"}
                      </div>
                      {tx.companyName && (
                        <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                          {tx.companyName}
                        </div>
                      )}
                      {tx.roomNumber && (
                        <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                          Room {tx.roomNumber}
                        </div>
                      )}
                    </td>

                    {/* Particulars & Category */}
                    <td className="px-4 py-3 max-w-sm">
                      <div className="text-xs text-zinc-800 dark:text-zinc-200 font-medium truncate" title={tx.particulars || tx.description}>
                        {tx.particulars || tx.description || "General entry"}
                      </div>
                      <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                        <span className="uppercase tracking-wider font-semibold text-[9.5px]">
                          {tx.sourceLabel || tx.category?.replace(/_/g, " ") || "TRANSACTION"}
                        </span>
                        {tx.kotNo && (
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                            {tx.kotNo}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Payment Method Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                        {tx.method}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right font-mono font-black text-xs whitespace-nowrap">
                      <span className={isInflow ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                        {isInflow ? "+" : "-"}{formatINR(tx.amount)}
                      </span>
                    </td>

                    {/* Inspect Button */}
                    <td className="px-4 py-3 text-right whitespace-nowrap print:hidden">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                      >
                        <Eye className="h-3 w-3" />
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-zinc-400 dark:text-zinc-500">
                    <Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No transactions recorded for this date & filter</p>
                    <p className="text-xs mt-1 text-zinc-400">
                      Use the "+ Record Income" or "+ Record Expense" buttons above to post ledger entries
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Inspector Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    selectedTx.flow === "INFLOW"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                  }`}
                >
                  {selectedTx.flow === "INFLOW" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                    {selectedTx.recordId}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {selectedTx.date} at {selectedTx.time}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/70">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total Amount</div>
                  <div
                    className={`text-xl font-mono font-black mt-0.5 ${
                      selectedTx.flow === "INFLOW"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {selectedTx.flow === "INFLOW" ? "+" : "-"}{formatINR(selectedTx.amount)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Payment Mode</div>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {selectedTx.method}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Party / Payee:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {selectedTx.party || selectedTx.payerName || selectedTx.payeeName || "Direct Guest"}
                  </span>
                </div>

                {selectedTx.companyName && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Company Name:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{selectedTx.companyName}</span>
                  </div>
                )}

                {selectedTx.gstin && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">GSTIN:</span>
                    <span className="font-mono text-zinc-900 dark:text-white">{selectedTx.gstin}</span>
                  </div>
                )}

                {selectedTx.roomNumber && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Room Number:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">Room {selectedTx.roomNumber}</span>
                  </div>
                )}

                {selectedTx.kotNo && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Kitchen Slip #:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{selectedTx.kotNo}</span>
                  </div>
                )}

                <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Particulars:</span>
                  <span className="text-zinc-800 dark:text-zinc-200 text-right max-w-[280px]">
                    {selectedTx.particulars || selectedTx.description}
                  </span>
                </div>

                {selectedTx.reference && selectedTx.reference !== "—" && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Reference / UTR:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">{selectedTx.reference}</span>
                  </div>
                )}

                <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Recorded By:</span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {selectedTx.receivedBy || selectedTx.authorizedBy || "Front Desk Cashier"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90 transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Direct Income Modal */}
      {showAddIncomeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                    Record Direct Income / Non-Resident Collection
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Restaurant Food Orders, Bar Food Bills, Banquet Advances & Walk-in Dining
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddIncomeModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleIncomeSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {incomeError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {incomeError}
                </div>
              )}

              {incomeSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {incomeSuccess}
                </div>
              )}

              {/* Revenue Channel Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Collection Channel / Category *
                </label>
                <select
                  value={incomeForm.category}
                  onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                  className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="BAR_FOOD_BILL">Bar Food Bill (Kitchen Food Orders Only)</option>
                  <option value="BANQUET_EVENT_ADVANCE">Banquet & Event Advance Booking</option>
                  <option value="OUTSIDER_WALKIN_DINING">Direct Non-Resident Walk-In Dining</option>
                  <option value="MISC_OUTLET_REVENUE">Other Outlet / Ancillary Revenue</option>
                </select>

                {incomeForm.category === "BAR_FOOD_BILL" && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3 shrink-0" />
                    Bar liquor is untracked. Only record food orders served to the bar counter.
                  </p>
                )}
              </div>

              {/* Amount and Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    Amount Collected (INR) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1850"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    required
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={incomeForm.paymentMethod}
                    onChange={(e) => setIncomeForm({ ...incomeForm, paymentMethod: e.target.value })}
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="CASH">Cash (Drawer Till)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  </select>
                </div>
              </div>

              {/* Conditional KOT input for Bar & Walk-in Dining */}
              {incomeForm.category !== "BANQUET_EVENT_ADVANCE" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                      KOT / Kitchen Slip # (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KOT-104, KOT-882"
                      value={incomeForm.kotNo}
                      onChange={(e) => setIncomeForm({ ...incomeForm, kotNo: e.target.value })}
                      className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                      Guest / Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Table 4 / Mr. Sharma"
                      value={incomeForm.payerName}
                      onChange={(e) => setIncomeForm({ ...incomeForm, payerName: e.target.value })}
                      className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Mandatory Guest info & Corporate options for Banquet Advances */}
              {incomeForm.category === "BANQUET_EVENT_ADVANCE" && (
                <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-3">
                  <div className="text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                    Banquet Client & Event Specification
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-purple-900 dark:text-purple-300 uppercase mb-1">
                        Client / Host Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Barua"
                        value={incomeForm.payerName}
                        onChange={(e) => setIncomeForm({ ...incomeForm, payerName: e.target.value })}
                        required
                        className="w-full h-8.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-900 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-purple-900 dark:text-purple-300 uppercase mb-1">
                        Mobile Phone Number *
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={incomeForm.payerPhone}
                        onChange={(e) => setIncomeForm({ ...incomeForm, payerPhone: e.target.value })}
                        required
                        className="w-full h-8.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-purple-900 dark:text-purple-300 uppercase mb-1">
                        Company Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Northeast Infotech Corp"
                        value={incomeForm.companyName}
                        onChange={(e) => setIncomeForm({ ...incomeForm, companyName: e.target.value })}
                        className="w-full h-8.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-900 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-purple-900 dark:text-purple-300 uppercase mb-1">
                        Company GSTIN (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 18AAAAA0000A1Z5"
                        value={incomeForm.gstin}
                        onChange={(e) => setIncomeForm({ ...incomeForm, gstin: e.target.value.toUpperCase() })}
                        className="w-full h-8.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reference */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Reference / Narration (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Banquet Advance Deposit - Wedding Reception / UTR #"
                  value={incomeForm.reference}
                  onChange={(e) => setIncomeForm({ ...incomeForm, reference: e.target.value })}
                  className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs"
                />
              </div>

              <div className="p-4 -mx-5 -mb-5 mt-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddIncomeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={incomeSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                >
                  {incomeSubmitting ? "Recording..." : "Record Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                    Record Petty Cash Voucher / Expense
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Disbursements for kitchen purchases, driver commissions, maintenance & staff advances
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {expenseError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {expenseError}
                </div>
              )}

              {expenseSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {expenseSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="DRIVER_COMMISSION">Driver Commission</option>
                    <option value="FB_PURCHASE">Kitchen / F&B Provisions</option>
                    <option value="MAINTENANCE">Repairs & Maintenance</option>
                    <option value="HOUSEKEEPING">Housekeeping Supplies</option>
                    <option value="PETTY_CASH">General Petty Cash</option>
                    <option value="STAFF_ADVANCE">Staff Salary Advance</option>
                    <option value="VENDOR_PAYMENT">Vendor / Supplier Payment</option>
                    <option value="UTILITIES">Utilities / Fuel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    Payee / Vendor / Staff Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Guwahati Milk & Dairy"
                    value={expenseForm.payeeName}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payeeName: e.target.value })}
                    required
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    Amount Paid Out (INR) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1450"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    Disbursement Method *
                  </label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="CASH">Cash (From Drawer Till)</option>
                    <option value="UPI">UPI / QR Transfer</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Narration / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning milk & paneer supply for kitchen"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Bill / Voucher / Invoice Ref (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bill #5120 / Slip"
                  value={expenseForm.reference}
                  onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                  className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs"
                />
              </div>

              <div className="p-4 -mx-5 -mb-5 mt-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50"
                >
                  {expenseSubmitting ? "Disbursing..." : "Disburse & Record Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formal Shift Handover Printable Sheet Modal */}
      {showPrintHandoverModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white text-zinc-900 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between print:hidden">
              <h3 className="font-bold text-sm text-zinc-900">Official Shift Handover Sheet Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Sheet
                </button>
                <button onClick={() => setShowPrintHandoverModal(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Formal Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-base font-bold uppercase tracking-wider">{activeProperty?.displayName || "Hotel"}</h2>
                <p className="text-[11px] text-zinc-500">
                  Official Front Desk Cashier Shift Handover & Reconciliation Register
                </p>
                <p className="text-[10px] font-mono mt-1 text-zinc-600">
                  Business Date: {selectedDate} | Shift Audit Cutoff: 12:00 AM Midnight | Printed: {new Date().toLocaleString("en-IN")}
                </p>
              </div>

              {/* Summary Totals Grid */}
              <div className="grid grid-cols-4 gap-2 text-center p-3 bg-zinc-50 rounded-xl border">
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 font-semibold">Total Collections</div>
                  <div className="font-mono font-bold text-emerald-700 text-sm">{formatINR(data?.totalCollections || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 font-semibold">Total Expenses</div>
                  <div className="font-mono font-bold text-rose-700 text-sm">{formatINR(data?.totalExpenses || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 font-semibold">Net Shift Flow</div>
                  <div className="font-mono font-bold text-zinc-900 text-sm">{formatINR(data?.netCashFlow || 0)}</div>
                </div>
                <div className="bg-emerald-100/60 rounded-lg p-1">
                  <div className="text-[10px] uppercase text-emerald-800 font-bold">System Cash Handover</div>
                  <div className="font-mono font-black text-emerald-900 text-sm">{formatINR(data?.cashDrawer?.netCashHandover || 0)}</div>
                </div>
              </div>

              {/* Physical Cash Denomination Reconciliation Table */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-2">
                  Physical Cash Drawer Denomination Count
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[500, 200, 100, 50, 20, 10].map((d) => (
                    <div key={d} className="p-2 border rounded-lg bg-zinc-50 text-center">
                      <div className="text-[10px] font-bold text-zinc-600 font-mono">₹{d}</div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denominations[d] || ""}
                        onChange={(e) =>
                          setDenominations({ ...denominations, [d]: Math.max(0, parseInt(e.target.value) || 0) })
                        }
                        className="w-full text-center h-7 text-xs font-mono font-bold border rounded mt-1 bg-white"
                      />
                      <div className="text-[9.5px] font-mono text-zinc-500 mt-1">
                        = {formatINR((denominations[d] || 0) * d)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 mt-2 rounded-lg bg-zinc-100 font-mono">
                  <span className="font-semibold text-xs">Total Physical Cash Counted:</span>
                  <span className="font-black text-sm text-zinc-900">{formatINR(totalPhysicalCashCounted)}</span>
                </div>

                <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-mono">
                  <span className="text-zinc-500">Cash Drawer Variance (Physical vs System):</span>
                  <span
                    className={`font-bold ${
                      cashDrawerVariance === 0
                        ? "text-emerald-700"
                        : cashDrawerVariance > 0
                        ? "text-blue-700"
                        : "text-rose-700"
                    }`}
                  >
                    {cashDrawerVariance === 0
                      ? "₹0.00 (Balanced)"
                      : `${cashDrawerVariance > 0 ? "+" : ""}${formatINR(cashDrawerVariance)}`}
                  </span>
                </div>
              </div>

              {/* Formal Sign-off Lines */}
              <div className="grid grid-cols-3 gap-6 pt-10 border-t text-center">
                <div className="border-t border-zinc-400 pt-1">
                  <div className="text-[10px] font-semibold uppercase text-zinc-500">Outgoing Cashier</div>
                  <div className="text-xs font-bold text-zinc-800 mt-0.5">Signature & Date</div>
                </div>
                <div className="border-t border-zinc-400 pt-1">
                  <div className="text-[10px] font-semibold uppercase text-zinc-500">Incoming Cashier</div>
                  <div className="text-xs font-bold text-zinc-800 mt-0.5">Signature & Date</div>
                </div>
                <div className="border-t border-zinc-400 pt-1">
                  <div className="text-[10px] font-semibold uppercase text-zinc-500">Duty Manager / Auditor</div>
                  <div className="text-xs font-bold text-zinc-800 mt-0.5">Approved & Sealed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
