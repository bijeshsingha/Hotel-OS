"use client";

import { reportCsv } from "@/lib/reports/report-export";

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
  ChevronDown,
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
  Copy,
  Check,
  Mail,
} from "lucide-react";
import { EmailReportModal } from "@/components/reports/email-report-modal";

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
  const [showAddOwnerPayoutModal, setShowAddOwnerPayoutModal] = useState(false);
  const [showPrintHandoverModal, setShowPrintHandoverModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
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
    category: "PAST_ROOM_SETTLEMENT",
    receiptDate: "",
    payerName: "",
    payerPhone: "",
    amount: "",
    paymentMethod: "CASH",
    grcNo: "",
    roomNumber: "",
    checkInDate: "",
    checkOutDate: "",
    stayDates: "",
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

  // Owner Payout Form State
  const [ownerPayoutForm, setOwnerPayoutForm] = useState({
    ownerName: "",
    amount: "",
    paymentMethod: "CASH",
    description: "Owner Cash Drawing / Profit Distribution",
    reference: "",
    notes: "",
  });
  const [ownerOptions, setOwnerOptions] = useState<{ propertyId: string; names: string[] } | null>(null);
  const configuredOwners = ownerOptions && ownerOptions.propertyId === activeProperty?.id ? ownerOptions.names : [];
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersLoadError, setOwnersLoadError] = useState<string | null>(null);
  const [ownersRetry, setOwnersRetry] = useState(0);
  const [isCustomOwner, setIsCustomOwner] = useState(false);
  const [customOwnerName, setCustomOwnerName] = useState("");
  const [ownerPayoutSubmitting, setOwnerPayoutSubmitting] = useState(false);
  const [ownerPayoutError, setOwnerPayoutError] = useState<string | null>(null);
  const [ownerPayoutSuccess, setOwnerPayoutSuccess] = useState<string | null>(null);

  const [datePreset, setDatePreset] = useState<string>("TODAY");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Reload the selected hotel's recipients whenever the payout form opens.
  // A failed/denied request must never masquerade as an empty saved list.
  useEffect(() => {
    if (!activeProperty?.id || !showAddOwnerPayoutModal) return;
    const propertyId = activeProperty.id;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    setOwnersLoading(true);
    setOwnersLoadError(null);
    setIsCustomOwner(false);
    setCustomOwnerName("");
    setOwnerPayoutForm(prev => ({ ...prev, ownerName: "" }));
    void (async () => {
      try {
        const response = await fetch(`/api/v1/reports/owner-payout-options?propertyId=${encodeURIComponent(propertyId)}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The saved owner list could not be loaded.");
        if (result.propertyId !== propertyId || !Array.isArray(result.owners) || result.owners.some((name: unknown) => typeof name !== "string")) throw new Error("The saved owner list could not be verified.");
        if (current) setOwnerOptions({ propertyId, names: result.owners });
      } catch (error) {
        if (current) {
          setOwnerOptions(null);
          setOwnersLoadError(controller.signal.aborted ? "Loading the owner list timed out. Please retry." : error instanceof Error ? error.message : "The saved owner list could not be loaded.");
        }
      } finally {
        clearTimeout(timer);
        if (current) setOwnersLoading(false);
      }
    })();
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [activeProperty?.id, refreshKey, showAddOwnerPayoutModal, ownersRetry]);

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
          openingBalance: cashDrawer.openingBalance ?? 0,
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
        const grc = (tx.grcNo || "").toLowerCase();

        if (
          !party.includes(q) &&
          !rec.includes(q) &&
          !ref.includes(q) &&
          !room.includes(q) &&
          !desc.includes(q) &&
          !kot.includes(q) &&
          !grc.includes(q)
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

  // Owner Payouts Summary
  const ownerPayoutsSummary = useMemo(() => {
    const list: any[] = data?.transactions || [];
    const payouts = list.filter(
      (tx) => tx.category === "OWNER_PAYOUT" || tx.type === "OWNER_PAYOUT"
    );
    const total = payouts.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const cashTotal = payouts
      .filter((tx) => tx.method === "CASH")
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    return {
      total,
      cashTotal,
      count: payouts.length,
    };
  }, [data]);

  // Handle Direct Income Submission
  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncomeError(null);
    setIncomeSuccess(null);

    if (!incomeForm.amount || isNaN(Number(incomeForm.amount)) || Number(incomeForm.amount) <= 0) {
      setIncomeError("Please enter a valid positive collection amount.");
      return;
    }

    if (incomeForm.category === "PAST_ROOM_SETTLEMENT") {
      if (!incomeForm.grcNo.trim()) {
        setIncomeError("Physical GRC Number is required for past room settlement.");
        return;
      }
      if (!incomeForm.payerName.trim()) {
        setIncomeError("Guest Name is required for past room settlement.");
        return;
      }
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

    const receiptDateToUse = incomeForm.receiptDate || selectedDate || activeProperty?.businessDate;
    const computedStayDates =
      incomeForm.stayDates ||
      (incomeForm.checkInDate && incomeForm.checkOutDate
        ? `${incomeForm.checkInDate} to ${incomeForm.checkOutDate}`
        : incomeForm.checkInDate || incomeForm.checkOutDate || "");

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
          grcNo: incomeForm.grcNo,
          roomNumber: incomeForm.roomNumber,
          checkInDate: incomeForm.checkInDate,
          checkOutDate: incomeForm.checkOutDate,
          stayDates: computedStayDates,
          kotNo: incomeForm.kotNo,
          clientType: incomeForm.clientType,
          companyName: incomeForm.companyName,
          gstin: incomeForm.gstin,
          billingAddress: incomeForm.billingAddress,
          reference: incomeForm.reference,
          notes: incomeForm.notes,
          receivedAt: receiptDateToUse ? `${receiptDateToUse}T${new Date().toTimeString().split(" ")[0]}` : undefined,
          createdByName: "Front Desk Cashier",
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to record collection");
      }

      setIncomeSuccess(`Receipt #${json.receiptNo || "Generated"} recorded successfully!`);
      setIncomeForm({
        category: "PAST_ROOM_SETTLEMENT",
        receiptDate: selectedDate || activeProperty?.businessDate || new Date().toISOString().split("T")[0],
        payerName: "",
        payerPhone: "",
        amount: "",
        paymentMethod: "CASH",
        grcNo: "",
        roomNumber: "",
        checkInDate: "",
        checkOutDate: "",
        stayDates: "",
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
          paidAt: (selectedDate || activeProperty?.businessDate)
            ? new Date(`${selectedDate || activeProperty?.businessDate}T12:00:00.000Z`).toISOString()
            : undefined,
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

  // Handle Owner Payout Submission
  const handleOwnerPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerPayoutError(null);
    setOwnerPayoutSuccess(null);

    if (!isCustomOwner && (ownersLoading || ownersLoadError || ownerOptions?.propertyId !== activeProperty?.id)) {
      setOwnerPayoutError("Load the saved owner list before selecting a recipient, or explicitly enter a name manually.");
      return;
    }
    if (!isCustomOwner && !configuredOwners.includes(ownerPayoutForm.ownerName)) {
      setOwnerPayoutError("Please choose an owner / partner for the selected hotel.");
      return;
    }
    const finalOwnerName = isCustomOwner
      ? customOwnerName.trim()
      : (ownerPayoutForm.ownerName || customOwnerName).trim();

    if (!finalOwnerName) {
      setOwnerPayoutError("Please select or enter the owner / partner name.");
      return;
    }
    if (!ownerPayoutForm.amount || isNaN(Number(ownerPayoutForm.amount)) || Number(ownerPayoutForm.amount) <= 0) {
      setOwnerPayoutError("Please enter a valid positive payout amount.");
      return;
    }

    setOwnerPayoutSubmitting(true);
    try {
      const res = await fetch("/api/v1/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          category: "OWNER_PAYOUT",
          payeeName: finalOwnerName,
          description: ownerPayoutForm.description || "Owner Payout / Cash Drawing",
          amount: Number(ownerPayoutForm.amount),
          taxAmount: 0,
          paymentMethod: ownerPayoutForm.paymentMethod,
          reference: ownerPayoutForm.reference || "Owner Drawing",
          notes: ownerPayoutForm.notes,
          businessDate: selectedDate || activeProperty?.businessDate,
          paidAt: (selectedDate || activeProperty?.businessDate)
            ? new Date(`${selectedDate || activeProperty?.businessDate}T12:00:00.000Z`).toISOString()
            : undefined,
          createdByName: "Front Desk Cashier / Owner Portal",
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to record owner payout");
      }

      setOwnerPayoutSuccess(`Owner Payout Voucher #${json.expense?.voucherNo || "Generated"} recorded successfully!`);
      setOwnerPayoutForm({
        ownerName: "",
        amount: "",
        paymentMethod: "CASH",
        description: "Owner Cash Drawing / Profit Distribution",
        reference: "",
        notes: "",
      });

      triggerRefresh();
      setTimeout(() => {
        setShowAddOwnerPayoutModal(false);
        setOwnerPayoutSuccess(null);
        loadLedgerData();
      }, 1000);
    } catch (err: any) {
      setOwnerPayoutError(err.message);
    } finally {
      setOwnerPayoutSubmitting(false);
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
      tx.recordId,
      `${tx.date} ${tx.time}`,
      tx.flow,
      tx.type,
      (tx.party || tx.payerName || tx.payeeName || ""),
      (tx.particulars || tx.description || ""),
      tx.method,
      (tx.reference || ""),
      tx.flow === "INFLOW" ? tx.amount : -tx.amount,
      tx.status || "CONFIRMED",
    ]);

    const url = URL.createObjectURL(new Blob([reportCsv(headers, rows)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${activeProperty?.code || "HOTEL"}_Cashier_Shift_Ledger_${selectedDate || "today"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full text-zinc-900 dark:text-zinc-100 pb-16">
      {/* Top Bar: Title & Primary Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 pb-3 print:hidden border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 ui-weight-medium ui-page-title">
            Shift Ledger
          </h1>
          {activeProperty?.displayName && (
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg ui-text-body">
              {activeProperty.displayName}
            </span>
          )}
          <span className="text-xs font-mono font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 ui-text-body ui-font-body">
            {selectedDate || activeProperty?.businessDate || "Live"}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Operations: Income, Expense, Payout */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/70">
            <button
              onClick={() => {
                setIncomeForm((prev) => ({
                  ...prev,
                  receiptDate: prev.receiptDate || selectedDate || activeProperty?.businessDate || new Date().toISOString().split("T")[0],
                }));
                setShowAddIncomeModal(true);
              }}
              className="h-8.5 px-3 rounded-lg text-xs font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ui-text-body ui-weight-medium ui-shadow-quiet ui-control ui-control-sized"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Income</span>
            </button>
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="h-8.5 px-3 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ui-text-body ui-weight-medium ui-shadow-quiet ui-control ui-control-sized"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Expense</span>
            </button>
            <button
              onClick={() => setShowAddOwnerPayoutModal(true)}
              className="h-8.5 px-3 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ui-text-body ui-shadow-quiet ui-control ui-control-sized"
            >
              <Building className="h-3.5 w-3.5 text-zinc-500" />
              <span>Payout</span>
            </button>
          </div>

          {/* Documents & Utilities */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPrintHandoverModal(true)}
              className="h-8.5 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 shadow-2xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ui-radius-control ui-text-body ui-shadow-quiet ui-surface ui-control ui-control-sized"
              title="Print Shift Handover Sheet" aria-label="Print Shift Handover Sheet"
            >
              <Printer className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Handover</span>
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              className="h-8.5 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 shadow-2xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ui-radius-control ui-text-body ui-shadow-quiet ui-surface ui-control ui-control-sized"
              title="Email Shift Report" aria-label="Email Shift Report"
            >
              <Mail className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Email</span>
            </button>
            <button
              onClick={exportLedgerCSV}
              className="h-8.5 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 shadow-2xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ui-radius-control ui-text-body ui-shadow-quiet ui-surface ui-control ui-control-sized"
              title="Export CSV" aria-label="Export CSV"
            >
              <Download className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Export</span>
            </button>
            <button
              onClick={() => {
                triggerRefresh();
                loadLedgerData();
              }}
              disabled={loading}
              className="h-8.5 w-8.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/80 shadow-2xs transition flex items-center justify-center cursor-pointer disabled:opacity-50 shrink-0 ui-radius-control ui-shadow-quiet ui-surface ui-control ui-control-sized"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-zinc-900 dark:text-zinc-100" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Shift Date Filter Bar */}
      <div className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col gap-2.5 print:hidden ui-radius-panel ui-shadow-quiet ui-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Selector Dropdown */}
            <div className="relative inline-flex items-center h-9 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition shadow-2xs ui-shadow-quiet">
              <div className="pl-3 pr-2 pointer-events-none text-zinc-400 dark:text-zinc-500 flex items-center">
                <Calendar className="h-4 w-4" />
              </div>
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
                className="h-full bg-transparent border-0 border-none outline-none ring-0 appearance-none font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 pl-0 pr-8 cursor-pointer focus:ring-0 ui-text-body ui-field"
              >
                <option value="TODAY">Today ({activeProperty?.businessDate || "Live"})</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="ALL_TIME">All Time</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
              <div className="absolute right-2.5 pointer-events-none text-zinc-400 dark:text-zinc-500 flex items-center">
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Quick Day Stepper */}
            {(datePreset === "TODAY" || datePreset === "YESTERDAY") && (
              <div className="inline-flex items-center h-9 p-0.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs ui-shadow-quiet">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="h-7.5 w-7.5 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition cursor-pointer ui-control"
                  title="Previous Day" aria-label="Previous Day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center px-1">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-7.5 bg-transparent border-0 border-none outline-none ring-0 text-xs sm:text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-0 cursor-pointer px-1 ui-text-body ui-font-body ui-weight-medium ui-field"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleNextDay}
                  className="h-7.5 w-7.5 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition cursor-pointer ui-control"
                  title="Next Day" aria-label="Next Day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Operating Window Note */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 dark:text-zinc-500 px-1 ui-text-body ui-font-body">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 " />
            <span>24h Audit Cycle</span>
          </div>
        </div>

        {/* Custom Date Range Card */}
        {datePreset === "CUSTOM" && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs   ui-text-body">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono text-xs ui-font-body ui-text-body">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-100 ui-font-body ui-text-body ui-field"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-mono text-xs ui-font-body ui-text-body">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-100 ui-font-body ui-text-body ui-field"
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
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer ml-2 ui-text-body ui-control"
              >
                Reset to Today
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Overview Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
        {/* Cash in Drawer Hero Card */}
        <div
          onClick={() => setOnlyCashDrawer(!onlyCashDrawer)}
          className={`p-4 sm:p-5 rounded-2xl border transition-colors cursor-pointer bg-white dark:bg-[#121215] shadow-xs  ui-radius-panel ui-shadow-quiet ui-surface ${
            onlyCashDrawer
              ? "border-blue-500 ring-2 ring-blue-500/20"
              : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ui-text-body">
              Cash in Drawer
            </span>
            <Banknote className="h-4 w-4 text-zinc-400" />
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold tracking-tight mt-2 tabular-nums  ui-weight-medium ${
              (data?.cashDrawer?.netCashHandover || 0) < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-zinc-950 dark:text-white"
            }`}
          >
            {formatINR(data?.cashDrawer?.netCashHandover || 0)}
          </div>
          <div className="text-xs mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1 font-mono text-zinc-500 dark:text-zinc-400 ui-text-body ui-font-body">
            <div className="flex items-center justify-between">
              <span>Float: <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{formatINR(data?.cashDrawer?.openingBalance || 0)}</strong></span>
              <span className="text-[11px] text-zinc-400 ui-text-meta">+{formatINR(data?.cashDrawer?.cashIn || 0)} · -{formatINR(data?.cashDrawer?.cashOut || 0)}</span>
            </div>
            {onlyCashDrawer && (
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-sans font-medium ui-text-meta">Filtered by drawer (click to clear)</div>
            )}
          </div>
        </div>

        {/* Total Inflows */}
        <div
          onClick={() => setFlowFilter(flowFilter === "INFLOW" ? "ALL" : "INFLOW")}
          className={`p-4 sm:p-5 rounded-2xl border transition-colors cursor-pointer bg-white dark:bg-[#121215] shadow-xs  ui-radius-panel ui-shadow-quiet ui-surface ${
            flowFilter === "INFLOW"
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ui-text-body">
              Total Inflow
            </span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white mt-2 tabular-nums ui-weight-medium">
            {formatINR(data?.totalCollections || 0)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 ui-text-body">
            {data?.collectionsCount || 0} receipts
          </div>
        </div>

        {/* Total Outflows */}
        <div
          onClick={() => {
            setCategoryFilter("ALL");
            setFlowFilter(flowFilter === "OUTFLOW" ? "ALL" : "OUTFLOW");
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition-colors cursor-pointer bg-white dark:bg-[#121215] shadow-xs  ui-radius-panel ui-shadow-quiet ui-surface ${
            flowFilter === "OUTFLOW" && categoryFilter === "ALL"
              ? "border-rose-500 ring-2 ring-rose-500/20"
              : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ui-text-body">
              Total Outflow
            </span>
            <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white mt-2 tabular-nums ui-weight-medium">
            {formatINR(data?.totalExpenses || 0)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between ui-text-body">
            <span>{data?.expensesCount || 0} vouchers</span>
            {ownerPayoutsSummary.total > 0 && (
              <span className="text-purple-600 dark:text-purple-400 font-semibold font-mono ui-font-body">
                Owner: {formatINR(ownerPayoutsSummary.total)}
              </span>
            )}
          </div>
        </div>

        {/* Net Shift Cash Flow */}
        <div className="p-4 sm:p-5 rounded-2xl border bg-white dark:bg-[#121215] border-zinc-200/80 dark:border-zinc-800 shadow-xs ui-radius-panel ui-shadow-quiet ui-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ui-text-body">
              Net Cash Flow
            </span>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold tracking-tight mt-2 tabular-nums  ui-weight-medium ${
              (data?.netCashFlow || 0) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatINR(data?.netCashFlow || 0)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 ui-text-body">
            Inflow − Outflow
          </div>
        </div>
      </div>

      {/* Digital Payment Channel Breakdown */}
      {data?.collectionsByMethod && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 shadow-xs print:hidden text-xs ui-radius-panel ui-shadow-quiet ui-text-body ui-surface">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-400 dark:text-zinc-500 text-xs mr-1 ui-text-body">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Channels:</span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono text-zinc-700 dark:text-zinc-300 ui-font-body">
            Cash <strong className="font-bold text-zinc-900 dark:text-white ml-1 ui-weight-medium">{formatINR(data.collectionsByMethod.CASH || 0)}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono text-zinc-700 dark:text-zinc-300 ui-font-body">
            UPI <strong className="font-bold text-zinc-900 dark:text-white ml-1 ui-weight-medium">{formatINR(data.collectionsByMethod.UPI || 0)}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono text-zinc-700 dark:text-zinc-300 ui-font-body">
            Card <strong className="font-bold text-zinc-900 dark:text-white ml-1 ui-weight-medium">{formatINR(data.collectionsByMethod.CARD || 0)}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono text-zinc-700 dark:text-zinc-300 ui-font-body">
            Bank <strong className="font-bold text-zinc-900 dark:text-white ml-1 ui-weight-medium">{formatINR(data.collectionsByMethod.BANK_TRANSFER || 0)}</strong>
          </span>
          {data.collectionsByMethod.DIRECT_BILL > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono text-zinc-700 dark:text-zinc-300 ui-font-body">
              BTC <strong className="font-bold text-zinc-900 dark:text-white ml-1 ui-weight-medium">{formatINR(data.collectionsByMethod.DIRECT_BILL)}</strong>
            </span>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 print:hidden ui-radius-panel ui-shadow-quiet ui-surface">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search transactions, guests, vouchers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 pl-9 pr-8 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors ui-radius-control ui-text-body ui-field" aria-label="Search transactions, guests, vouchers"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer ui-control"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Flow Filter Segmented Control */}
          <div className="inline-flex items-center h-9 p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-semibold shadow-2xs ui-text-body ui-shadow-quiet">
            <button
              onClick={() => {
                setFlowFilter("ALL");
                setCategoryFilter("ALL");
                setOnlyCashDrawer(false);
              }}
              className={`h-7.5 px-3 rounded-lg flex items-center transition cursor-pointer whitespace-nowrap shrink-0 ${
                flowFilter === "ALL" && categoryFilter === "ALL" && !onlyCashDrawer
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-xs ui-weight-medium ui-shadow-quiet"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              } ui-control`}
            >
              All
            </button>
            <button
              onClick={() => {
                setFlowFilter("INFLOW");
                setCategoryFilter("ALL");
                setOnlyCashDrawer(false);
              }}
              className={`h-7.5 px-3 rounded-lg flex items-center transition cursor-pointer whitespace-nowrap shrink-0 ${
                flowFilter === "INFLOW"
                  ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs ui-weight-medium ui-shadow-quiet"
                  : "text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
              } ui-control`}
            >
              Inflows
            </button>
            <button
              onClick={() => {
                setFlowFilter("OUTFLOW");
                setCategoryFilter("ALL");
                setOnlyCashDrawer(false);
              }}
              className={`h-7.5 px-3 rounded-lg flex items-center transition cursor-pointer whitespace-nowrap shrink-0 ${
                flowFilter === "OUTFLOW" && categoryFilter !== "OWNER_PAYOUT"
                  ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 font-bold shadow-xs ui-weight-medium ui-shadow-quiet"
                  : "text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
              } ui-control`}
            >
              Outflows
            </button>
            <button
              onClick={() => {
                setFlowFilter("OUTFLOW");
                setCategoryFilter(categoryFilter === "OWNER_PAYOUT" ? "ALL" : "OWNER_PAYOUT");
                setOnlyCashDrawer(false);
              }}
              className={`h-7.5 px-3 rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
                categoryFilter === "OWNER_PAYOUT"
                  ? "bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 font-bold shadow-xs ui-weight-medium ui-shadow-quiet"
                  : "text-zinc-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400"
              } ui-control`}
            >
              <Building className="h-3.5 w-3.5" />
              <span>Payouts</span>
            </button>
          </div>

          {/* Payment Method Dropdown */}
          <div className="relative inline-flex items-center h-9 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition shadow-2xs ui-shadow-quiet">
            <div className="pl-3 pr-2 pointer-events-none text-zinc-400 dark:text-zinc-500 flex items-center">
              <Filter className="h-3.5 w-3.5" />
            </div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-full bg-transparent border-0 border-none outline-none ring-0 appearance-none text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 pl-0 pr-8 cursor-pointer focus:ring-0 ui-text-body ui-field"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="DIRECT_BILL">Direct Bill</option>
              <option value="CHEQUE">Cheque</option>
            </select>
            <div className="absolute right-2.5 pointer-events-none text-zinc-400 dark:text-zinc-500 flex items-center">
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 shrink-0 ui-text-body ui-font-body">
          <span className="font-bold text-zinc-900 dark:text-white ui-weight-medium">{filteredTransactions.length}</span> entries
        </div>
      </div>

      {/* Main Ledger Entries Table */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden shadow-xs ui-radius-panel ui-shadow-quiet ui-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse ui-text-body ui-data-table">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold border-b border-zinc-200/80 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-xs ui-text-body">
              <tr>
                <th className="px-4 py-3.5 font-bold whitespace-nowrap ui-weight-medium">Voucher / Receipt</th>
                <th className="px-4 py-3.5 font-bold whitespace-nowrap ui-weight-medium">Time</th>
                <th className="px-4 py-3.5 font-bold whitespace-nowrap ui-weight-medium">Type & Flow</th>
                <th className="px-4 py-3.5 font-bold whitespace-nowrap ui-weight-medium">Party / Payee / Guest</th>
                <th className="px-4 py-3.5 font-bold whitespace-nowrap ui-weight-medium">Particulars & Category</th>
                <th className="px-4 py-3.5 font-bold whitespace-nowrap ui-weight-medium">Method</th>
                <th className="px-4 py-3.5 font-bold whitespace-nowrap text-right ui-weight-medium">Amount (INR)</th>
                <th className="px-4 py-3.5 font-bold whitespace-nowrap text-right print:hidden ui-weight-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
              {filteredTransactions.map((tx: any, idx: number) => {
                const isInflow = tx.flow === "INFLOW";

                return (
                  <tr
                    key={tx.id || `${tx.recordId}-${idx}`}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer group"
                  >
                    {/* Record / Voucher */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm ui-font-body ui-weight-medium ui-text-body">
                        {tx.recordId}
                      </div>
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3.5 font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-xs ui-font-body ui-text-body">
                      {tx.time}
                    </td>

                    {/* Type & Flow Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {tx.category === "OWNER_PAYOUT" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60 ui-text-body">
                          <Building className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          <span>OWNER PAYOUT</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border  ui-text-body ${
                            isInflow
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60"
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60"
                          }`}
                        >
                          {isInflow ? (
                            <>
                              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>+ RECEIPT</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                              <span>- EXPENSE</span>
                            </>
                          )}
                        </span>
                      )}
                    </td>

                    {/* Party / Payee / Guest */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm flex items-center gap-1.5 ui-weight-medium ui-text-body">
                        <span>{tx.party || tx.payerName || tx.payeeName || "Direct Guest"}</span>
                        {tx.grcNo && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ui-text-meta ui-font-body ui-weight-medium">
                            GRC #{tx.grcNo}
                          </span>
                        )}
                      </div>
                      {tx.companyName && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 ui-text-body">
                          {tx.companyName}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        {tx.roomNumber && tx.roomNumber !== "—" && tx.roomNumber !== "-" && (
                          <span className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400 ui-text-body ui-font-body">
                            Room {tx.roomNumber}
                          </span>
                        )}
                        {tx.reservationNo && <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{tx.reservationNo}</span>}
                        {tx.stayDates && (
                          <span className="text-[11px] font-mono text-zinc-400 ui-text-meta ui-font-body">
                            ({tx.stayDates})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Particulars & Category */}
                    <td className="px-4 py-3.5 max-w-sm">
                      <div className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 font-medium truncate ui-text-body" title={tx.particulars || tx.description}>
                        {tx.particulars || tx.description || "General entry"}
                      </div>
                      <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5 ui-text-body">
                        <span className={`uppercase tracking-wider font-semibold text-xs  ui-text-body ${tx.category === "OWNER_PAYOUT" ? "text-purple-600 dark:text-purple-400 font-bold ui-weight-medium" : ""}`}>
                          {tx.category === "OWNER_PAYOUT" ? "OWNER DRAWING / PAYOUT" : (tx.sourceLabel || tx.category?.replace(/_/g, " ") || "TRANSACTION")}
                        </span>
                        {tx.kotNo && (
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 ui-font-body ui-weight-medium">
                            {tx.kotNo}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Payment Method Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 ui-text-body ui-font-body">
                        {tx.method}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5 text-right font-mono font-black text-xs sm:text-sm whitespace-nowrap ui-font-body ui-weight-medium ui-text-body">
                      <span className={isInflow ? "text-emerald-700 dark:text-emerald-400" : tx.category === "OWNER_PAYOUT" ? "text-purple-700 dark:text-purple-400" : "text-rose-700 dark:text-rose-400"}>
                        {isInflow ? "+" : "-"}{formatINR(tx.amount)}
                      </span>
                    </td>

                    {/* Inspect Button */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap print:hidden">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition cursor-pointer ui-radius-control ui-text-body ui-control"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Details</span>
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
                    <p className="text-xs mt-1 text-zinc-400 ui-text-body">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4   duration-150">
          <div className="bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden ui-radius-panel ui-dialog-surface ui-surface">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    selectedTx.flow === "INFLOW"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : selectedTx.category === "OWNER_PAYOUT"
                      ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                  }`}
                >
                  {selectedTx.flow === "INFLOW" ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : selectedTx.category === "OWNER_PAYOUT" ? (
                    <Building className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white ui-weight-medium">
                    {selectedTx.recordId}
                  </h3>
                  <p className="text-xs text-zinc-500 ui-text-body">
                    {selectedTx.date} at {selectedTx.time}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer ui-control"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs ui-text-body">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/70">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 ui-text-meta">Total Amount</div>
                  <div
                    className={`text-xl font-mono font-black mt-0.5  ui-font-body ui-weight-medium ${
                      selectedTx.flow === "INFLOW"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : selectedTx.category === "OWNER_PAYOUT"
                        ? "text-purple-700 dark:text-purple-400"
                        : "text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {selectedTx.flow === "INFLOW" ? "+" : "-"}{formatINR(selectedTx.amount)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 ui-text-meta">Payment Mode</div>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 ui-text-body ui-font-body ui-weight-medium">
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

                {selectedTx.grcNo && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Physical GRC #:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 ui-font-body ui-weight-medium">GRC #{selectedTx.grcNo}</span>
                  </div>
                )}

                {selectedTx.payerPhone && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Guest / Contact Phone:</span>
                    <span className="font-mono text-zinc-900 dark:text-white ui-font-body">{selectedTx.payerPhone}</span>
                  </div>
                )}

                {selectedTx.reservationNo && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Reservation:</span>
                    <span className="font-mono text-zinc-900 dark:text-white">{selectedTx.reservationNo}</span>
                  </div>
                )}
                {selectedTx.stayDates && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Stay Period:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 ui-font-body">{selectedTx.stayDates}</span>
                  </div>
                )}

                {selectedTx.companyName && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Company Name:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{selectedTx.companyName}</span>
                  </div>
                )}

                {selectedTx.gstin && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">GSTIN:</span>
                    <span className="font-mono text-zinc-900 dark:text-white ui-font-body">{selectedTx.gstin}</span>
                  </div>
                )}

                {selectedTx.roomNumber && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Room Number:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 ui-font-body ui-weight-medium">Room {selectedTx.roomNumber}</span>
                  </div>
                )}

                {selectedTx.kotNo && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Kitchen Slip #:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 ui-font-body ui-weight-medium">{selectedTx.kotNo}</span>
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
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 ui-font-body">{selectedTx.reference}</span>
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90 transition cursor-pointer ui-radius-control ui-text-body ui-control"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Direct Income Modal */}
      {showAddIncomeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4   duration-150">
          <div className="bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ui-radius-panel ui-dialog-surface ui-surface">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white ui-weight-medium">
                    Record Direct Income / Collection
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5 ui-text-body">
                    Past Room Income, Banquet Advances, Bar Food Bills &amp; Walk-in Dining
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddIncomeModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ui-control"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleIncomeSubmit} className="p-5 overflow-y-auto space-y-4 text-xs ui-text-body">
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
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5 ui-text-meta ui-label">
                  Collection Channel / Category *
                </label>
                <select
                  value={incomeForm.category}
                  onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                  className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ui-radius-control ui-text-body ui-surface ui-field" aria-label="Collection Channel / Category"
                >
                  <option value="PAST_ROOM_SETTLEMENT">Past Room Income / Settlement (Physical GRC)</option>
                  <option value="BAR_FOOD_BILL">Bar Food Bill (Kitchen Food Orders Only)</option>
                  <option value="BANQUET_EVENT_ADVANCE">Banquet &amp; Event Advance Booking</option>
                  <option value="OUTSIDER_WALKIN_DINING">Direct Non-Resident Walk-In Dining</option>
                  <option value="MISC_OUTLET_REVENUE">Other Outlet / Ancillary Revenue</option>
                </select>

                {incomeForm.category === "PAST_ROOM_SETTLEMENT" && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1 ui-text-meta">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    For historical stays, past checkouts, or bookings settled against physical GRC register.
                  </p>
                )}
                {incomeForm.category === "BAR_FOOD_BILL" && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1 ui-text-meta">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Bar liquor is untracked. Only record food orders served to the bar counter.
                  </p>
                )}
              </div>

              {/* Mandatory Physical GRC & Guest Information for Past Room Settlement */}
              {incomeForm.category === "PAST_ROOM_SETTLEMENT" && (
                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider ui-text-meta ui-weight-medium">
                      Physical GRC &amp; Guest Details
                    </span>
                    <span className="text-[10.5px] text-emerald-700 dark:text-emerald-400 font-medium ui-text-meta">
                      Historical Stay
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-emerald-900 dark:text-emerald-300 uppercase mb-1 ui-text-meta ui-label">
                        Physical GRC Number *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. GRC-1042 / 508"
                        value={incomeForm.grcNo}
                        onChange={(e) => setIncomeForm({ ...incomeForm, grcNo: e.target.value })}
                        required
                        className="w-full h-8.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 ui-text-body ui-font-body ui-weight-medium ui-field" aria-label="Physical GRC Number"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-emerald-900 dark:text-emerald-300 uppercase mb-1 ui-text-meta ui-label">
                        Room Number (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 104, 201"
                        value={incomeForm.roomNumber}
                        onChange={(e) => setIncomeForm({ ...incomeForm, roomNumber: e.target.value })}
                        className="w-full h-8.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 ui-text-body ui-font-body ui-field" aria-label="Room Number (Optional)"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-emerald-900 dark:text-emerald-300 uppercase mb-1 ui-text-meta ui-label">
                        Guest Full Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amitav Sen"
                        value={incomeForm.payerName}
                        onChange={(e) => setIncomeForm({ ...incomeForm, payerName: e.target.value })}
                        required
                        className="w-full h-8.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 px-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 ui-text-body ui-field" aria-label="Guest Full Name"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-emerald-900 dark:text-emerald-300 uppercase mb-1 ui-text-meta ui-label">
                        Guest Mobile Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={incomeForm.payerPhone}
                        onChange={(e) => setIncomeForm({ ...incomeForm, payerPhone: e.target.value })}
                        className="w-full h-8.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 ui-text-body ui-font-body ui-field" aria-label="Guest Mobile Phone (Optional)"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-emerald-900 dark:text-emerald-300 uppercase mb-1 ui-text-meta ui-label">
                        Stay Check-In Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={incomeForm.checkInDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIncomeForm((prev) => {
                            const newDates = val && prev.checkOutDate ? `${val} to ${prev.checkOutDate}` : (val || prev.checkOutDate || "");
                            return { ...prev, checkInDate: val, stayDates: newDates };
                          });
                        }}
                        className="w-full h-8.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 ui-text-body ui-font-body ui-field" aria-label="Stay Check-In Date (Optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-emerald-900 dark:text-emerald-300 uppercase mb-1 ui-text-meta ui-label">
                        Stay Check-Out Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={incomeForm.checkOutDate}
                        min={incomeForm.checkInDate || undefined}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIncomeForm((prev) => {
                            const newDates = prev.checkInDate && val ? `${prev.checkInDate} to ${val}` : (val || prev.checkInDate || "");
                            return { ...prev, checkOutDate: val, stayDates: newDates };
                          });
                        }}
                        className="w-full h-8.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 ui-text-body ui-font-body ui-field" aria-label="Stay Check-Out Date (Optional)"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Date, Amount and Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                    Receipt Date *
                  </label>
                  <input
                    type="date"
                    value={incomeForm.receiptDate || selectedDate || activeProperty?.businessDate || ""}
                    onChange={(e) => setIncomeForm({ ...incomeForm, receiptDate: e.target.value })}
                    required
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 ui-radius-control ui-text-body ui-font-body ui-surface ui-field" aria-label="Receipt Date"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                    Amount Collected (INR) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1850"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    required
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 ui-radius-control ui-text-body ui-weight-medium ui-font-body ui-surface ui-field" aria-label="Amount Collected (INR)"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                    Payment Method *
                  </label>
                  <select
                    value={incomeForm.paymentMethod}
                    onChange={(e) => setIncomeForm({ ...incomeForm, paymentMethod: e.target.value })}
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100 ui-radius-control ui-text-body ui-surface ui-field" aria-label="Payment Method"
                  >
                    <option value="CASH">Cash (Drawer Till)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                  </select>
                </div>
              </div>

              {/* Conditional KOT input for Bar & Walk-in Dining */}
              {incomeForm.category !== "BANQUET_EVENT_ADVANCE" && incomeForm.category !== "PAST_ROOM_SETTLEMENT" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                      KOT / Kitchen Slip # (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KOT-104, KOT-882"
                      value={incomeForm.kotNo}
                      onChange={(e) => setIncomeForm({ ...incomeForm, kotNo: e.target.value })}
                      className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono ui-radius-control ui-text-body ui-font-body ui-surface ui-field" aria-label="KOT / Kitchen Slip # (Optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                      Guest / Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Table 4 / Mr. Sharma"
                      value={incomeForm.payerName}
                      onChange={(e) => setIncomeForm({ ...incomeForm, payerName: e.target.value })}
                      className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs ui-radius-control ui-text-body ui-surface ui-field" aria-label="Guest / Customer Name (Optional)"
                    />
                  </div>
                </div>
              )}

              {/* Mandatory Guest info & Corporate options for Banquet Advances */}
              {incomeForm.category === "BANQUET_EVENT_ADVANCE" && (
                <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-3">
                  <div className="text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider ui-text-meta ui-weight-medium">
                    Banquet Client & Event Specification
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-purple-900 dark:text-purple-300 uppercase mb-1 ui-text-meta ui-label">
                        Client / Host Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Barua"
                        value={incomeForm.payerName}
                        onChange={(e) => setIncomeForm({ ...incomeForm, payerName: e.target.value })}
                        required
                        className="w-full h-8.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-900 px-3 text-xs ui-text-body ui-field" aria-label="Client / Host Name"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-purple-900 dark:text-purple-300 uppercase mb-1 ui-text-meta ui-label">
                        Mobile Phone Number *
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={incomeForm.payerPhone}
                        onChange={(e) => setIncomeForm({ ...incomeForm, payerPhone: e.target.value })}
                        required
                        className="w-full h-8.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono ui-text-body ui-font-body ui-field" aria-label="Mobile Phone Number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-purple-900 dark:text-purple-300 uppercase mb-1 ui-text-meta ui-label">
                        Company Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Northeast Infotech Corp"
                        value={incomeForm.companyName}
                        onChange={(e) => setIncomeForm({ ...incomeForm, companyName: e.target.value })}
                        className="w-full h-8.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-900 px-3 text-xs ui-text-body ui-field" aria-label="Company Name (Optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-purple-900 dark:text-purple-300 uppercase mb-1 ui-text-meta ui-label">
                        Company GSTIN (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 18AAAAA0000A1Z5"
                        value={incomeForm.gstin}
                        onChange={(e) => setIncomeForm({ ...incomeForm, gstin: e.target.value.toUpperCase() })}
                        className="w-full h-8.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-900 px-3 text-xs font-mono uppercase ui-text-body ui-font-body ui-field" aria-label="Company GSTIN (Optional)"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reference */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                  Reference / Narration (Optional)
                </label>
                <input
                  type="text"
                  placeholder={
                    incomeForm.category === "PAST_ROOM_SETTLEMENT"
                      ? "e.g. Offline Balance Settlement / Bank UTR # / Register Folio Note"
                      : "e.g. Banquet Advance Deposit - Wedding Reception / UTR #"
                  }
                  value={incomeForm.reference}
                  onChange={(e) => setIncomeForm({ ...incomeForm, reference: e.target.value })}
                  className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs ui-radius-control ui-text-body ui-surface ui-field" aria-label="Reference / Narration (Optional)"
                />
              </div>

              <div className="p-4 -mx-5 -mb-5 mt-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddIncomeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ui-radius-control ui-text-body ui-control"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={incomeSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 ui-radius-control ui-text-body ui-control"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4   duration-150">
          <div className="bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ui-radius-panel ui-dialog-surface ui-surface">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white ui-weight-medium">
                    Record Petty Cash Voucher / Expense
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5 ui-text-body">
                    Disbursements for kitchen purchases, driver commissions, maintenance & staff advances
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ui-control"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-5 overflow-y-auto space-y-4 text-xs ui-text-body">
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
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                    Expense Category *
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100 ui-radius-control ui-text-body ui-surface ui-field" aria-label="Expense Category"
                  >
                    <option value="DRIVER_COMMISSION">Driver Commission</option>
                    <option value="OWNER_PAYOUT">👑 Owner Payout / Drawing</option>
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
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                    Payee / Vendor / Staff Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Guwahati Milk & Dairy"
                    value={expenseForm.payeeName}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payeeName: e.target.value })}
                    required
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs ui-radius-control ui-text-body ui-surface ui-field" aria-label="Payee / Vendor / Staff Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                    Amount Paid Out (INR) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1450"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 ui-radius-control ui-text-body ui-weight-medium ui-font-body ui-surface ui-field" aria-label="Amount Paid Out (INR)"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                    Disbursement Method *
                  </label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100 ui-radius-control ui-text-body ui-surface ui-field" aria-label="Disbursement Method"
                  >
                    <option value="CASH">Cash (From Drawer Till)</option>
                    <option value="UPI">UPI / QR Transfer</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                  Narration / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning milk & paneer supply for kitchen"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs ui-radius-control ui-text-body ui-surface ui-field" aria-label="Narration / Description"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                  Bill / Voucher / Invoice Ref (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bill #5120 / Slip"
                  value={expenseForm.reference}
                  onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                  className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs ui-radius-control ui-text-body ui-surface ui-field" aria-label="Bill / Voucher / Invoice Ref (Optional)"
                />
              </div>

              <div className="p-4 -mx-5 -mb-5 mt-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ui-radius-control ui-text-body ui-control"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50 ui-radius-control ui-text-body ui-control"
                >
                  {expenseSubmitting ? "Disbursing..." : "Disburse & Record Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Owner Payout Modal */}
      {showAddOwnerPayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4   duration-150">
          <div className="bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ui-radius-panel ui-dialog-surface ui-surface">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white ui-weight-medium">
                      Owner Payout / Cash Drawing
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase tracking-wider ui-text-meta ui-weight-medium">
                      Ownership
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 ui-text-body">
                    Disburse drawings, interim profit settlements or withdrawals to hotel ownership
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddOwnerPayoutModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer ui-control"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleOwnerPayoutSubmit} className="p-5 overflow-y-auto space-y-4 text-xs ui-text-body">
              {ownerPayoutError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {ownerPayoutError}
                </div>
              )}

              {ownerPayoutSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {ownerPayoutSuccess}
                </div>
              )}

              {/* Cash Drawer Position Realtime Monitor */}
              {ownerPayoutForm.paymentMethod === "CASH" && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] ui-text-meta">
                    <span className="text-zinc-500">Current Cash in Drawer Till:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white ui-font-body ui-weight-medium">
                      {formatINR(data?.cashDrawer?.netCashHandover || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] ui-text-meta">
                    <span className="text-zinc-500">Remaining After This Payout:</span>
                    <span
                      className={`font-mono font-bold  ui-font-body ui-weight-medium ${
                        (data?.cashDrawer?.netCashHandover || 0) - (Number(ownerPayoutForm.amount) || 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatINR((data?.cashDrawer?.netCashHandover || 0) - (Number(ownerPayoutForm.amount) || 0))}
                    </span>
                  </div>
                  {Number(ownerPayoutForm.amount) > (data?.cashDrawer?.netCashHandover || 0) && (
                    <div className="text-[10.5px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 pt-1 border-t border-rose-200/50 dark:border-rose-900/50 ui-text-meta">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Warning: Withdrawal amount exceeds current drawer cash position!</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                    Owner / Partner / Entity Name *
                  </label>
                  <p className="text-xs text-zinc-500 mb-2">Owners / partners for <strong className="font-medium text-zinc-700 dark:text-zinc-200">{activeProperty?.displayName}</strong></p>
                  {!isCustomOwner ? (
                    <div className="space-y-2">
                      <select
                        id="owner-payout-recipient"
                        aria-label="Owner / Partner / Entity Name"
                        value={ownerPayoutForm.ownerName}
                        disabled={ownersLoading || !!ownersLoadError}
                        onChange={e => {
                          if (e.target.value === "__CUSTOM__") { setIsCustomOwner(true); setCustomOwnerName(""); }
                          else setOwnerPayoutForm(prev => ({ ...prev, ownerName: e.target.value }));
                        }}
                        required
                        className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-60 ui-field"
                      >
                        <option value="">{ownersLoading ? "Loading saved owners…" : ownersLoadError ? "Owner list unavailable" : configuredOwners.length ? "Select an owner / partner" : "No owners saved for this hotel"}</option>
                        {configuredOwners.map(owner => <option key={owner} value={owner}>{owner}</option>)}
                        <option value="__CUSTOM__">Other — enter a name manually</option>
                      </select>
                      {!ownersLoading && !ownersLoadError && configuredOwners.length === 0 && <p className="text-xs text-zinc-600 dark:text-zinc-400">Owner lists are saved separately for each hotel. Add owners for this hotel in Admin → Hotel &amp; Property, or switch to the hotel where you saved them.</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input id="owner-payout-recipient" aria-label="Owner / Partner / Entity Name" type="text" required value={customOwnerName} onChange={e => setCustomOwnerName(e.target.value)} placeholder="Enter the recipient's full name" className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm ui-field" />
                      <button type="button" onClick={() => { setIsCustomOwner(false); setCustomOwnerName(""); setOwnerPayoutForm(prev => ({ ...prev, ownerName: "" })); }} className="text-xs font-medium text-purple-700 underline dark:text-purple-300">Choose from saved owners</button>
                    </div>
                  )}
                  {ownersLoading && <p role="status" className="mt-2 text-xs text-zinc-500">Loading the saved list for this hotel…</p>}
                  {ownersLoadError && <div role="alert" className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><p>{ownersLoadError}</p><div className="flex gap-3"><button type="button" onClick={() => setOwnersRetry(value => value + 1)} className="font-semibold underline">Retry owner list</button><button type="button" onClick={() => { setIsCustomOwner(true); setCustomOwnerName(""); }} className="underline">Enter a name manually</button></div></div>}

                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                    Disbursement Method *
                  </label>
                  <select
                    value={ownerPayoutForm.paymentMethod}
                    onChange={(e) => setOwnerPayoutForm({ ...ownerPayoutForm, paymentMethod: e.target.value })}
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 ui-radius-control ui-text-body ui-surface ui-field" aria-label="Disbursement Method"
                  >
                    <option value="CASH">Cash (From Drawer Till)</option>
                    <option value="UPI">UPI / QR Transfer</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT / IMPS</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                    Payout Amount (INR) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 15000"
                    value={ownerPayoutForm.amount}
                    onChange={(e) => setOwnerPayoutForm({ ...ownerPayoutForm, amount: e.target.value })}
                    required
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 ui-radius-control ui-text-body ui-weight-medium ui-font-body ui-surface ui-field" aria-label="Payout Amount (INR)"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                    Receipt / Voucher / Slip Ref (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Slip #OP-01 / UTR / Acknowledgment"
                    value={ownerPayoutForm.reference}
                    onChange={(e) => setOwnerPayoutForm({ ...ownerPayoutForm, reference: e.target.value })}
                    className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 ui-radius-control ui-text-body ui-surface ui-field" aria-label="Receipt / Voucher / Slip Ref (Optional)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                  Narration / Purpose of Drawing
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly owner cash drawing / Partner profit distribution"
                  value={ownerPayoutForm.description}
                  onChange={(e) => setOwnerPayoutForm({ ...ownerPayoutForm, description: e.target.value })}
                  className="w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 ui-radius-control ui-text-body ui-surface ui-field" aria-label="Narration / Purpose of Drawing"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 ui-text-meta ui-label">
                  Additional Notes (Private / Internal)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Collected personally by owner / Received via GPay to personal account"
                  value={ownerPayoutForm.notes}
                  onChange={(e) => setOwnerPayoutForm({ ...ownerPayoutForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none ui-radius-control ui-text-body ui-surface ui-field" aria-label="Additional Notes (Private / Internal)"
                />
              </div>

              <div className="p-4 -mx-5 -mb-5 mt-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddOwnerPayoutModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer ui-radius-control ui-text-body ui-control"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ownerPayoutSubmitting || (!isCustomOwner && (ownersLoading || !!ownersLoadError || !ownerPayoutForm.ownerName))}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition disabled:opacity-50 cursor-pointer shadow-xs ui-radius-control ui-text-body ui-shadow-quiet ui-control"
                >
                  {ownerPayoutSubmitting ? "Recording Payout..." : "Record Owner Payout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formal Shift Handover Printable Sheet Modal */}
      {showPrintHandoverModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4  ">
          <div className="bg-white text-zinc-900 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ui-radius-panel ui-dialog-surface">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between print:hidden">
              <h3 className="font-bold text-sm text-zinc-900 ui-weight-medium">Official Shift Handover Sheet Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 ui-text-body ui-control"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Sheet
                </button>
                <button onClick={() => setShowPrintHandoverModal(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 ui-control">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans ui-text-body">
              {/* Formal Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-base font-bold uppercase tracking-wider ui-weight-medium ui-section-title">{activeProperty?.displayName || "Hotel"}</h2>
                <p className="text-[11px] text-zinc-500 ui-text-meta">
                  Official Front Desk Cashier Shift Handover & Reconciliation Register
                </p>
                <p className="text-[10px] font-mono mt-1 text-zinc-600 ui-text-meta ui-font-body">
                  Business Date: {selectedDate} | Shift Audit Cutoff: 12:00 AM Midnight | Printed: {new Date().toLocaleString("en-IN")}
                </p>
              </div>

              {/* Summary Totals Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center p-3 bg-zinc-50 rounded-xl border">
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 font-semibold ui-text-meta">Total Collections</div>
                  <div className="font-mono font-bold text-emerald-700 text-sm ui-font-body ui-weight-medium">{formatINR(data?.totalCollections || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 font-semibold ui-text-meta">Operating Expenses</div>
                  <div className="font-mono font-bold text-rose-700 text-sm ui-font-body ui-weight-medium">{formatINR((data?.totalExpenses || 0) - ownerPayoutsSummary.total)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-purple-700 font-semibold ui-text-meta">👑 Owner Drawings</div>
                  <div className="font-mono font-bold text-purple-700 text-sm ui-font-body ui-weight-medium">{formatINR(ownerPayoutsSummary.total)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 font-semibold ui-text-meta">Net Shift Flow</div>
                  <div className="font-mono font-bold text-zinc-900 text-sm ui-font-body ui-weight-medium">{formatINR(data?.netCashFlow || 0)}</div>
                </div>
                <div className="bg-emerald-100/60 rounded-lg p-1 col-span-2 sm:col-span-1">
                  <div className="text-[10px] uppercase text-emerald-800 font-bold ui-text-meta ui-weight-medium">System Cash Handover</div>
                  <div className="font-mono font-black text-emerald-900 text-sm ui-font-body ui-weight-medium">{formatINR(data?.cashDrawer?.netCashHandover || 0)}</div>
                </div>
              </div>

              {/* Physical Cash Denomination Reconciliation Table */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 mb-2 ui-text-meta ui-weight-medium">
                  Physical Cash Drawer Denomination Count
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[500, 200, 100, 50, 20, 10].map((d) => (
                    <div key={d} className="p-2 border rounded-lg bg-zinc-50 text-center">
                      <div className="text-[10px] font-bold text-zinc-600 font-mono ui-text-meta ui-weight-medium ui-font-body">₹{d}</div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denominations[d] || ""}
                        onChange={(e) =>
                          setDenominations({ ...denominations, [d]: Math.max(0, parseInt(e.target.value) || 0) })
                        }
                        className="w-full text-center h-7 text-xs font-mono font-bold border rounded mt-1 bg-white ui-text-body ui-font-body ui-weight-medium ui-field"
                      />
                      <div className="text-[9.5px] font-mono text-zinc-500 mt-1 ui-text-meta ui-font-body">
                        = {formatINR((denominations[d] || 0) * d)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 mt-2 rounded-lg bg-zinc-100 font-mono ui-font-body">
                  <span className="font-semibold text-xs ui-text-body">Total Physical Cash Counted:</span>
                  <span className="font-black text-sm text-zinc-900 ui-weight-medium">{formatINR(totalPhysicalCashCounted)}</span>
                </div>

                <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-mono ui-text-meta ui-font-body">
                  <span className="text-zinc-500">Cash Drawer Variance (Physical vs System):</span>
                  <span
                    className={`font-bold  ui-weight-medium ${
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
                  <div className="text-[10px] font-semibold uppercase text-zinc-500 ui-text-meta">Outgoing Cashier</div>
                  <div className="text-xs font-bold text-zinc-800 mt-0.5 ui-text-body ui-weight-medium">Signature & Date</div>
                </div>
                <div className="border-t border-zinc-400 pt-1">
                  <div className="text-[10px] font-semibold uppercase text-zinc-500 ui-text-meta">Incoming Cashier</div>
                  <div className="text-xs font-bold text-zinc-800 mt-0.5 ui-text-body ui-weight-medium">Signature & Date</div>
                </div>
                <div className="border-t border-zinc-400 pt-1">
                  <div className="text-[10px] font-semibold uppercase text-zinc-500 ui-text-meta">Duty Manager / Auditor</div>
                  <div className="text-xs font-bold text-zinc-800 mt-0.5 ui-text-body ui-weight-medium">Approved & Sealed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Email Report Modal */}
      <EmailReportModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        defaultReportType="CASHIER_SHIFT"
        targetDate={selectedDate || activeProperty?.businessDate}
      />
    </div>
  );
}
