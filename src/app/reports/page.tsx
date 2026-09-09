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
  ArrowRightLeft,
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
  ExternalLink,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { apiCache } from "@/lib/cache/api-cache";
import { PageHeader, StatCard, SegmentedControl } from "@/components/ui";

export default function ReportsPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [reportType, setReportType] = useState<
    "ROOM_TRANSFERS" | "FINAL_BILLS" | "CASHIER_COLLECTIONS_EXPENSES" | "EXPENSES" | "FRONT_OFFICE" | "REVENUE" | "FNB"
  >("ROOM_TRANSFERS");

  // Date Filter State for 12 AM - 12 AM Cycle
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters for Cashier Collections & Expenses
  const [flowFilter, setFlowFilter] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Filters for Dedicated Expense Register Tab
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>("ALL");
  const [expenseMethodFilter, setExpenseMethodFilter] = useState<string>("ALL");

  // Filters for Room Transfers Tab
  const [transferSearch, setTransferSearch] = useState("");
  const [transferDateRange, setTransferDateRange] = useState<"ALL_TIME" | "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "CUSTOM">("ALL_TIME");
  const [transferCustomStart, setTransferCustomStart] = useState("");
  const [transferCustomEnd, setTransferCustomEnd] = useState("");
  const [transferRoomFilter, setTransferRoomFilter] = useState("ALL");
  const [transferStatusFilter, setTransferStatusFilter] = useState<"ALL" | "CURRENTLY_OCCUPIED" | "CHECKED_OUT">("ALL");

  // Filters for Final Bills Tab
  const [billSearch, setBillSearch] = useState("");
  const [billDateRange, setBillDateRange] = useState<"ALL_TIME" | "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "CUSTOM">("ALL_TIME");
  const [billCustomStart, setBillCustomStart] = useState("");
  const [billCustomEnd, setBillCustomEnd] = useState("");
  const [billStatusFilter, setBillStatusFilter] = useState<"ALL" | "SETTLED" | "IN_HOUSE" | "OPEN">("ALL");
  const [billMethodFilter, setBillMethodFilter] = useState<string>("ALL");

  // Filters for Kitchen & Dining Orders Tab
  const [kotSearch, setKotSearch] = useState("");
  const [kotDestinationFilter, setKotDestinationFilter] = useState("ALL");
  const [kotSettlementFilter, setKotSettlementFilter] = useState("ALL");

  // Modals & Printable Sheets
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showExpensesPrintModal, setShowExpensesPrintModal] = useState(false);
  const [showTransfersPrintModal, setShowTransfersPrintModal] = useState(false);
  const [showFinalBillsPrintModal, setShowFinalBillsPrintModal] = useState(false);
  const [showKotPrintModal, setShowKotPrintModal] = useState(false);

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

  // Add Direct Income Form state (Restaurant extra collections: Bar Food, Banquet Advance, Walk-In Dining)
  const [incomeForm, setIncomeForm] = useState({
    category: "BAR_FOOD_BILL",
    payerName: "",
    payerPhone: "",
    amount: "",
    paymentMethod: "CASH",
    kotNo: "",
    clientType: "INDIVIDUAL", // "INDIVIDUAL" | "COMPANY"
    companyName: "",
    gstin: "",
    billingAddress: "",
    eventDetails: "",
    reference: "",
    notes: "",
  });
  const [incomeSubmitting, setIncomeSubmitting] = useState(false);
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [incomeSuccess, setIncomeSuccess] = useState<string | null>(null);

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

  // Global Escape key listener to close reports modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAddExpenseModal(false);
        setShowAddIncomeModal(false);
        setShowPrintModal(false);
        setShowExpensesPrintModal(false);
        setShowTransfersPrintModal(false);
        setShowFinalBillsPrintModal(false);
        setShowKotPrintModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch Report Data with SWR (0ms instant render from cache)
  const loadReportData = async (forceFresh = false) => {
    if (!activeProperty) return;
    const dateParam = selectedDate || activeProperty.businessDate;
    const reportUrl = `/api/v1/reports?propertyId=${activeProperty.id}&type=${reportType}&date=${dateParam}`;

    if (!forceFresh) {
      const cached = apiCache.get(reportUrl);
      if (cached) {
        setData(cached);
      } else {
        setLoading(true);
      }
    }

    try {
      const d = await apiCache.swrFetch(reportUrl, undefined, (cached) => {
        setData(cached);
      });
      setData(d);
    } catch (err) {
      console.error("Report error:", err);
    } finally {
      setLoading(false);
    }
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
          generatedBy: "System Operator",
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to snapshot report");
      setSnapshotMsg(`Midnight Snapshot finalized successfully! Summary ID: ${result.summary?.id?.slice(-6) || "Done"}`);
      await loadReportData(true);
      await refreshData();
      setTimeout(() => setSnapshotMsg(null), 5000);
    } catch (err: any) {
      alert(`Snapshot error: ${err.message}`);
    } finally {
      setSnapshotLoading(false);
    }
  };

  // Handle Add Expense Submit
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    setExpenseSubmitting(true);
    setExpenseError(null);
    setExpenseSuccess(null);

    try {
      const targetBusinessDate = selectedDate || activeProperty.businessDate;
      const res = await fetch("/api/v1/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty.id,
          category: expenseForm.category,
          payeeName: expenseForm.payeeName,
          description: expenseForm.description,
          amount: Number(expenseForm.amount),
          taxAmount: Number(expenseForm.taxAmount || 0),
          paymentMethod: expenseForm.paymentMethod,
          reference: expenseForm.reference,
          notes: expenseForm.notes,
          businessDate: targetBusinessDate,
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

      apiCache.invalidate("reports");
      await loadReportData(true);
      await refreshData();

      setTimeout(() => {
        setShowAddExpenseModal(false);
        setExpenseSuccess(null);
      }, 800);
    } catch (err: any) {
      setExpenseError(err.message);
    } finally {
      setExpenseSubmitting(false);
    }
  };

  // Handle Add Direct Income Submit (Bar Food, Banquet, Walk-in Dining)
  const handleAddIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;

    // Validate Banquet requirements
    if (incomeForm.category === "BANQUET_EVENT_ADVANCE") {
      if (!incomeForm.payerName.trim()) {
        setIncomeError("Guest / Client Contact Person name is mandatory for Banquet Advances.");
        return;
      }
      if (!incomeForm.payerPhone.trim()) {
        setIncomeError("Contact Mobile Number is mandatory for Banquet Advances.");
        return;
      }
      if (incomeForm.clientType === "COMPANY" && !incomeForm.companyName.trim()) {
        setIncomeError("Company Name is mandatory for Corporate Banquet bookings.");
        return;
      }
    }

    setIncomeSubmitting(true);
    setIncomeError(null);
    setIncomeSuccess(null);

    try {
      const res = await fetch("/api/v1/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty.id,
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
          eventDetails: incomeForm.eventDetails,
          reference: incomeForm.reference,
          notes: incomeForm.notes,
          receivedAt: selectedDate ? new Date(`${selectedDate}T12:00:00Z`).toISOString() : undefined,
          createdByName: "Front Desk Cashier",
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to record direct income");

      setIncomeSuccess(`Direct collection recorded! Receipt: ${result.receiptNo}`);
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
        eventDetails: "",
        reference: "",
        notes: "",
      });

      apiCache.invalidate("reports");
      await loadReportData(true);
      await refreshData();

      setTimeout(() => {
        setShowAddIncomeModal(false);
        setIncomeSuccess(null);
      }, 1800);
    } catch (err: any) {
      setIncomeError(err.message);
    } finally {
      setIncomeSubmitting(false);
    }
  };

  // Filtered Expense Vouchers for Dedicated Expense Register Tab
  const filteredExpenseVouchers = useMemo(() => {
    const list: any[] = data?.expenses || [];
    return list.filter((exp: any) => {
      if (expenseCategoryFilter !== "ALL" && exp.category !== expenseCategoryFilter) return false;
      if (expenseMethodFilter !== "ALL" && exp.method !== expenseMethodFilter) return false;
      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase().trim();
        const vNo = (exp.voucherNo || "").toLowerCase();
        const payee = (exp.payeeName || "").toLowerCase();
        const desc = (exp.description || "").toLowerCase();
        const ref = (exp.reference || "").toLowerCase();
        const auth = (exp.authorizedBy || "").toLowerCase();
        const cat = (exp.category || "").toLowerCase();
        if (
          !vNo.includes(q) &&
          !payee.includes(q) &&
          !desc.includes(q) &&
          !ref.includes(q) &&
          !auth.includes(q) &&
          !cat.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [data?.expenses, expenseCategoryFilter, expenseMethodFilter, expenseSearch]);

  // Dedicated Expense KPIs
  const expenseKPIs = useMemo(() => {
    const expenses: any[] = data?.expenses || [];
    const totalOutflow = expenses.reduce((sum: number, e: any) => sum + (e.totalAmount || e.amount || 0), 0);
    const cashOutflow = expenses
      .filter((e: any) => e.method === "CASH")
      .reduce((sum: number, e: any) => sum + (e.totalAmount || e.amount || 0), 0);
    const upiOutflow = expenses
      .filter((e: any) => e.method === "UPI")
      .reduce((sum: number, e: any) => sum + (e.totalAmount || e.amount || 0), 0);
    const bankOutflow = expenses
      .filter((e: any) => e.method === "BANK_TRANSFER")
      .reduce((sum: number, e: any) => sum + (e.totalAmount || e.amount || 0), 0);

    const catMap: Record<string, number> = {};
    expenses.forEach((e: any) => {
      catMap[e.category] = (catMap[e.category] || 0) + (e.totalAmount || e.amount || 0);
    });
    let topCat = "None";
    let topCatAmt = 0;
    Object.entries(catMap).forEach(([cat, amt]) => {
      if (amt > topCatAmt) {
        topCat = cat;
        topCatAmt = amt;
      }
    });

    return {
      totalOutflow,
      totalCount: expenses.length,
      cashOutflow,
      upiOutflow,
      bankOutflow,
      topCategory: topCat.replace(/_/g, " "),
      topCategoryAmount: topCatAmt,
    };
  }, [data?.expenses]);

  // Filtered Transactions for Cashier Report
  const filteredCashierTransactions = useMemo(() => {
    const list = data?.allTransactions || data?.recentTransactions || [];
    return list.filter((tx: any) => {
      if (flowFilter !== "ALL" && tx.flow !== flowFilter) return false;
      if (methodFilter === "ADVANCE") {
        if (tx.sourceCategory !== "ADVANCE_DEPOSIT" && tx.sourceCategory !== "BANQUET_ADVANCE") return false;
      } else if (methodFilter === "POS") {
        if (tx.sourceCategory !== "POS_RESTAURANT" && tx.sourceCategory !== "BAR_BEVERAGE" && tx.sourceCategory !== "MISC_OUTLET") return false;
      } else if (methodFilter === "OTA") {
        if (tx.sourceCategory !== "OTA_COLLECTION" && tx.method !== "OTA_VCC" && tx.method !== "DIRECT_BILL") return false;
      } else if (methodFilter === "FOLIO") {
        if (tx.sourceCategory !== "FOLIO_SETTLEMENT") return false;
      } else if (methodFilter !== "ALL") {
        if (tx.method !== methodFilter) return false;
      }

      if (categoryFilter !== "ALL" && tx.category !== categoryFilter) return false;

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

  // Filtered Room Transfers
  const filteredTransfers = useMemo(() => {
    const list: any[] = data?.transfers || [];
    return list.filter((t) => {
      // 1. Status Filter
      if (transferStatusFilter !== "ALL" && t.currentRoomStatus !== transferStatusFilter) {
        return false;
      }

      // 2. Room Filter
      if (transferRoomFilter !== "ALL") {
        if (t.fromRoomNumber !== transferRoomFilter && t.toRoomNumber !== transferRoomFilter) {
          return false;
        }
      }

      // 3. Date Range Filter
      if (transferDateRange !== "ALL_TIME" && t.transferDate) {
        const txDate = new Date(t.transferDate);
        const now = new Date();
        const todayStr = (activeProperty?.businessDate || now.toISOString().split("T")[0]);

        if (transferDateRange === "TODAY") {
          const tDateStr = txDate.toISOString().split("T")[0];
          if (tDateStr !== todayStr) return false;
        } else if (transferDateRange === "YESTERDAY") {
          const y = new Date(todayStr);
          y.setDate(y.getDate() - 1);
          const yStr = y.toISOString().split("T")[0];
          const tDateStr = txDate.toISOString().split("T")[0];
          if (tDateStr !== yStr) return false;
        } else if (transferDateRange === "LAST_7_DAYS") {
          const past7 = new Date();
          past7.setDate(past7.getDate() - 7);
          if (txDate < past7) return false;
        } else if (transferDateRange === "THIS_MONTH") {
          if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (transferDateRange === "CUSTOM") {
          if (transferCustomStart && txDate < new Date(transferCustomStart)) return false;
          if (transferCustomEnd) {
            const end = new Date(transferCustomEnd);
            end.setHours(23, 59, 59, 999);
            if (txDate > end) return false;
          }
        }
      }

      // 4. Search Filter
      if (transferSearch.trim()) {
        const q = transferSearch.toLowerCase().trim();
        const name = (t.guestName || "").toLowerCase();
        const phone = (t.phone || "").toLowerCase();
        const grc = (t.grcNo || "").toLowerCase();
        const fromR = (t.fromRoomNumber || "").toLowerCase();
        const toR = (t.toRoomNumber || "").toLowerCase();
        const reason = (t.moveReason || "").toLowerCase();

        if (
          !name.includes(q) &&
          !phone.includes(q) &&
          !grc.includes(q) &&
          !fromR.includes(q) &&
          !toR.includes(q) &&
          !reason.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data, transferStatusFilter, transferRoomFilter, transferDateRange, transferCustomStart, transferCustomEnd, transferSearch, activeProperty?.businessDate]);

  // Filtered Final Bills
  const filteredFinalBills = useMemo(() => {
    const list: any[] = data?.bills || [];
    return list.filter((b) => {
      // 1. Status Filter
      if (billStatusFilter !== "ALL") {
        if (billStatusFilter === "SETTLED" && b.settlementStatus !== "SETTLED") return false;
        if (billStatusFilter === "IN_HOUSE" && b.stayStatus !== "IN_HOUSE") return false;
        if (billStatusFilter === "OPEN" && b.balance <= 0) return false;
      }

      // 2. Payment Method Filter
      if (billMethodFilter !== "ALL") {
        if (billMethodFilter === "SPLIT") {
          if (!b.paymentMethod.startsWith("SPLIT")) return false;
        } else if (!b.paymentMethod.includes(billMethodFilter)) {
          return false;
        }
      }

      // 3. Date Range Filter (based on check-out or check-in date)
      if (billDateRange !== "ALL_TIME") {
        const dateToCheck = new Date(b.checkOutDate || b.checkInDate);
        const now = new Date();
        const todayStr = (activeProperty?.businessDate || now.toISOString().split("T")[0]);

        if (billDateRange === "TODAY") {
          const bDateStr = dateToCheck.toISOString().split("T")[0];
          if (bDateStr !== todayStr) return false;
        } else if (billDateRange === "YESTERDAY") {
          const y = new Date(todayStr);
          y.setDate(y.getDate() - 1);
          const yStr = y.toISOString().split("T")[0];
          const bDateStr = dateToCheck.toISOString().split("T")[0];
          if (bDateStr !== yStr) return false;
        } else if (billDateRange === "LAST_7_DAYS") {
          const past7 = new Date();
          past7.setDate(past7.getDate() - 7);
          if (dateToCheck < past7) return false;
        } else if (billDateRange === "THIS_MONTH") {
          if (dateToCheck.getMonth() !== now.getMonth() || dateToCheck.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (billDateRange === "CUSTOM") {
          if (billCustomStart && dateToCheck < new Date(billCustomStart)) return false;
          if (billCustomEnd) {
            const end = new Date(billCustomEnd);
            end.setHours(23, 59, 59, 999);
            if (dateToCheck > end) return false;
          }
        }
      }

      // 4. Search Filter
      if (billSearch.trim()) {
        const q = billSearch.toLowerCase().trim();
        const inv = (b.invoiceNo || "").toLowerCase();
        const name = (b.guestName || "").toLowerCase();
        const phone = (b.phone || "").toLowerCase();
        const grc = (b.grcNo || "").toLowerCase();
        const rooms = (b.roomDisplay || "").toLowerCase();
        const comp = (b.companyName || "").toLowerCase();
        const gstin = (b.gstin || "").toLowerCase();

        if (
          !inv.includes(q) &&
          !name.includes(q) &&
          !phone.includes(q) &&
          !grc.includes(q) &&
          !rooms.includes(q) &&
          !comp.includes(q) &&
          !gstin.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data, billStatusFilter, billMethodFilter, billDateRange, billCustomStart, billCustomEnd, billSearch, activeProperty?.businessDate]);

  // Filtered Kitchen Orders & Dining Sales
  const filteredKitchenOrders = useMemo(() => {
    const list: any[] = data?.rows || [];
    if (reportType !== "FNB") return list;
    return list.filter((o) => {
      if (kotDestinationFilter !== "ALL" && o.destinationCategory !== kotDestinationFilter) {
        return false;
      }
      if (kotSettlementFilter !== "ALL" && o.settlementType !== kotSettlementFilter) {
        return false;
      }
      if (kotSearch.trim()) {
        const q = kotSearch.toLowerCase().trim();
        const ord = (o.orderNo || "").toLowerCase();
        const kot = (o.kotNumbers || "").toLowerCase();
        const dest = (o.destinationLabel || "").toLowerCase();
        const guest = (o.guestName || "").toLowerCase();
        const room = (o.roomNo || "").toLowerCase();
        const items = (o.itemsSummary || "").toLowerCase();
        if (
          !ord.includes(q) &&
          !kot.includes(q) &&
          !dest.includes(q) &&
          !guest.includes(q) &&
          !room.includes(q) &&
          !items.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [data, reportType, kotDestinationFilter, kotSettlementFilter, kotSearch]);

  // Distinct room numbers for filter dropdown
  const allDistinctRooms = useMemo(() => {
    const set = new Set<string>();
    if (data?.transfers) {
      for (const t of data.transfers) {
        if (t.fromRoomNumber && t.fromRoomNumber !== "—") set.add(t.fromRoomNumber);
        if (t.toRoomNumber && t.toRoomNumber !== "—") set.add(t.toRoomNumber);
      }
    }
    return Array.from(set).sort();
  }, [data]);

  // Export CSV Handlers
  const exportRoomTransfersCSV = () => {
    if (!filteredTransfers.length) {
      alert("No transfer records to export.");
      return;
    }
    const headers = [
      "Transfer ID",
      "Transfer Date & Time",
      "GRC No",
      "Guest Name",
      "Mobile Phone",
      "From Room",
      "From Room Type",
      "To Room",
      "To Room Type",
      "Move Reason",
      "Rate Handling",
      "Agreed Tariff (INR)",
      "Duration in Previous Room",
      "Stay Status",
      "Current Status",
    ];

    const rows = filteredTransfers.map((t) => [
      t.transferId,
      t.formattedDate || t.transferDate,
      t.grcNo,
      JSON.stringify(t.guestName || ""),
      t.phone,
      t.fromRoomNumber,
      JSON.stringify(t.fromRoomType || ""),
      t.toRoomNumber,
      JSON.stringify(t.toRoomType || ""),
      JSON.stringify(t.moveReason || ""),
      t.rateHandling,
      t.agreedRate || "0",
      t.durationText,
      t.stayStatus,
      t.currentRoomStatus,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProperty?.code || "HOTEL"}_Room_Transfers_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportFinalBillsCSV = () => {
    if (!filteredFinalBills.length) {
      alert("No billing records to export.");
      return;
    }
    const headers = [
      "Invoice No",
      "Folio ID",
      "GRC No",
      "Guest Name",
      "Mobile Phone",
      "Company Name",
      "GSTIN",
      "Rooms Occupied",
      "Check-In Date",
      "Check-Out Date",
      "Total Nights",
      "Stay Status",
      "Base Room Tariff (INR)",
      "Extra Pax Charges (INR)",
      "F&B Charges (INR)",
      "Other Services (INR)",
      "Taxable Value (INR)",
      "CGST (INR)",
      "SGST (INR)",
      "Total GST (INR)",
      "Gross Total Bill (INR)",
      "Amount Paid (INR)",
      "Payment Method",
      "Balance Due (INR)",
      "Settlement Status",
    ];

    const rows = filteredFinalBills.map((b) => [
      b.invoiceNo,
      b.folioId,
      b.grcNo,
      JSON.stringify(b.guestName || ""),
      b.phone,
      JSON.stringify(b.companyName || ""),
      JSON.stringify(b.gstin || ""),
      JSON.stringify(b.roomDisplay || ""),
      new Date(b.checkInDate).toISOString().split("T")[0],
      new Date(b.checkOutDate).toISOString().split("T")[0],
      b.nights,
      b.stayStatus,
      b.roomTariff,
      b.extraPax,
      b.fnbCharges,
      b.otherCharges,
      b.taxableAmount,
      b.totalCgst,
      b.totalSgst,
      b.totalTax,
      b.grossTotal,
      b.totalPaid,
      JSON.stringify(b.paymentMethod || ""),
      b.balance,
      b.settlementStatus,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProperty?.code || "HOTEL"}_Final_Bills_Master_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportCashierCSV = () => {
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
      tx.amount,
      tx.status,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProperty?.code}_Cashier_Report_${selectedDate || new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportKitchenOrdersCSV = () => {
    if (!filteredKitchenOrders.length) {
      alert("No kitchen order records to export.");
      return;
    }
    const headers = [
      "Order No",
      "KOT Numbers",
      "Date",
      "Time",
      "Destination Category",
      "Destination Detail",
      "Room Number",
      "Guest / Receiver",
      "Dishes Ordered",
      "Item Count",
      "Taxable Value (INR)",
      "CGST 2.5% (INR)",
      "SGST 2.5% (INR)",
      "Total GST 5% (INR)",
      "Gross Total (INR)",
      "Settlement Channel",
      "Order Status",
    ];

    const rows = filteredKitchenOrders.map((o: any) => [
      o.orderNo,
      JSON.stringify(o.kotNumbers || ""),
      o.dateFormatted,
      o.timeFormatted,
      o.destinationCategory,
      JSON.stringify(o.destinationLabel || ""),
      o.roomNo,
      JSON.stringify(o.guestName || ""),
      JSON.stringify(o.itemsSummary || ""),
      o.itemCount,
      o.taxableAmount,
      o.cgst,
      o.sgst,
      o.totalTax,
      o.totalAmount,
      o.settlementType,
      o.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProperty?.code || "HOTEL"}_Kitchen_Orders_Report_${selectedDate || new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const exportExpensesCSV = () => {
    if (!filteredExpenseVouchers.length) {
      alert("No expense records to export for this view.");
      return;
    }
    const headers = [
      "Voucher No",
      "Date",
      "Time",
      "Category",
      "Payee / Vendor",
      "Description",
      "Net Amount (INR)",
      "Tax Amount (INR)",
      "Total Paid (INR)",
      "Payment Mode",
      "Reference",
      "Status",
      "Authorized By",
    ];
    const rows = filteredExpenseVouchers.map((e: any) => [
      `"${e.voucherNo}"`,
      `"${e.date}"`,
      `"${e.time}"`,
      `"${e.category}"`,
      `"${(e.payeeName || "").replace(/"/g, '""')}"`,
      `"${(e.description || "").replace(/"/g, '""')}"`,
      e.amount,
      e.taxAmount || 0,
      e.totalAmount || e.amount,
      `"${e.method}"`,
      `"${(e.reference || "").replace(/"/g, '""')}"`,
      `"${e.status}"`,
      `"${(e.authorizedBy || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProperty?.code || "HOTEL"}_Expenses_Register_${selectedDate || new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const summary = data?.summary;
  const isToday = (selectedDate || activeProperty?.businessDate) === activeProperty?.businessDate;

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto w-full text-zinc-900 dark:text-zinc-100 pb-16">
      {/* Top Banner */}
      <PageHeader
        title="Reports, Audits & Master Exports"
        description="Comprehensive dynamic logs for room transfers, settled final bills, cashier sheets & operational registers"
        icon={BarChart3}
        badge="Live Dynamic Database Sync"
        badgeVariant="info"
        businessDate={activeProperty?.businessDate}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {reportType === "ROOM_TRANSFERS" && (
              <>
                <button
                  onClick={() => setShowTransfersPrintModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition shadow-xs cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /> Print Transfer Log
                </button>
                <button
                  onClick={exportRoomTransfersCSV}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Export Transfers CSV
                </button>
              </>
            )}

            {reportType === "FINAL_BILLS" && (
              <>
                <button
                  onClick={() => setShowFinalBillsPrintModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition shadow-xs cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /> Print Bills Register
                </button>
                <button
                  onClick={exportFinalBillsCSV}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Export Final Bills CSV
                </button>
              </>
            )}

            {reportType === "CASHIER_COLLECTIONS_EXPENSES" && (
              <>
                <button
                  onClick={() => setShowAddIncomeModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:hover:bg-emerald-900/50 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 transition shadow-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Record Direct Income
                </button>
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
                <button
                  onClick={exportCashierCSV}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 px-4 py-2 text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              </>
            )}

            {reportType === "EXPENSES" && (
              <>
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Record Expense
                </button>
                <button
                  onClick={() => setShowExpensesPrintModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition shadow-xs cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /> Print Expense Register
                </button>
                <button
                  onClick={exportExpensesCSV}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 px-4 py-2 text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Export Expenses CSV
                </button>
              </>
            )}

            {reportType === "FNB" && (
              <>
                <button
                  onClick={() => setShowAddIncomeModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:hover:bg-emerald-900/50 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 transition shadow-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Record Direct Income
                </button>
                <button
                  onClick={() => setShowKotPrintModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition shadow-xs cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /> Print Kitchen Log
                </button>
                <button
                  onClick={exportKitchenOrdersCSV}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Export Kitchen CSV
                </button>
              </>
            )}

            <button
              onClick={() => loadReportData(true)}
              className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        }
      />

      {snapshotMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {snapshotMsg}
        </div>
      )}

      {/* Main Report Navigation Tabs (Full Width Segmented Control) */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <SegmentedControl
          value={reportType}
          onChange={(val) => setReportType(val as any)}
          options={[
            { value: "ROOM_TRANSFERS", label: "Room Transfers & Moves", icon: ArrowRightLeft },
            { value: "FINAL_BILLS", label: "Final Bills & Invoices", icon: Receipt },
            { value: "CASHIER_COLLECTIONS_EXPENSES", label: "Cashier Shift Sheet", icon: Wallet },
            { value: "EXPENSES", label: "Expense Register", icon: ArrowUpRight },
            { value: "FRONT_OFFICE", label: "Front Desk Room Rack", icon: BedDouble },
            { value: "REVENUE", label: "Revenue & Tax Ledger", icon: TrendingUp },
            { value: "FNB", label: "Kitchen & Dining Collections", icon: UtensilsCrossed },
          ]}
        />
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ROOM TRANSFERS & MOVES AUDIT REPORT */}
      {/* ========================================================================= */}
      {reportType === "ROOM_TRANSFERS" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Room Moves</span>
                <ArrowRightLeft className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                {data?.totalCount ?? filteredTransfers.length}
              </div>
              <div className="text-[11px] text-zinc-500">Historical & active guest room transfers</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Active In-House Transferred
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-800 dark:text-emerald-300">
                {data?.inHouseCount ?? filteredTransfers.filter((t) => t.currentRoomStatus === "CURRENTLY_OCCUPIED").length}
              </div>
              <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400 font-mono">
                Currently residing in upgraded/moved room
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Rooms Involved</span>
                <Building2 className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                {allDistinctRooms.length}
              </div>
              <div className="text-[11px] text-zinc-500 truncate">
                {allDistinctRooms.length > 0 ? `Rooms: ${allDistinctRooms.join(", ")}` : "No transfers"}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Latest Transfer</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {filteredTransfers[0] ? `${filteredTransfers[0].guestName} (${filteredTransfers[0].fromRoomNumber} ➔ ${filteredTransfers[0].toRoomNumber})` : "None"}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                {filteredTransfers[0]?.formattedDate || "No transfers recorded"}
              </div>
            </div>
          </div>

          {/* Filters Bar for Room Transfers */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Guest Name, Mobile, GRC #, From Room, To Room, Move Reason..."
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Scope Filter */}
              <div className="flex items-center gap-1.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-2.5 h-9 rounded-lg text-xs font-medium">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={transferDateRange}
                  onChange={(e: any) => setTransferDateRange(e.target.value)}
                  className="bg-transparent border-none text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                >
                  <option value="ALL_TIME">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="YESTERDAY">Yesterday</option>
                  <option value="LAST_7_DAYS">Last 7 Days</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="CUSTOM">Custom Date Range</option>
                </select>
              </div>

              {transferDateRange === "CUSTOM" && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={transferCustomStart}
                    onChange={(e) => setTransferCustomStart(e.target.value)}
                    className="text-xs h-9 px-2.5 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 font-mono text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-zinc-400 text-xs">to</span>
                  <input
                    type="date"
                    value={transferCustomEnd}
                    onChange={(e) => setTransferCustomEnd(e.target.value)}
                    className="text-xs h-9 px-2.5 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              )}

              {/* Room Filter */}
              <select
                value={transferRoomFilter}
                onChange={(e) => setTransferRoomFilter(e.target.value)}
                className="text-xs h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="ALL">All Rooms</option>
                {allDistinctRooms.map((r) => (
                  <option key={r} value={r}>
                    Room {r}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={transferStatusFilter}
                onChange={(e: any) => setTransferStatusFilter(e.target.value)}
                className="text-xs h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="CURRENTLY_OCCUPIED">In-House Active</option>
                <option value="CHECKED_OUT">Checked Out</option>
              </select>

              {(transferSearch || transferRoomFilter !== "ALL" || transferStatusFilter !== "ALL" || transferDateRange !== "ALL_TIME") && (
                <button
                  onClick={() => {
                    setTransferSearch("");
                    setTransferRoomFilter("ALL");
                    setTransferStatusFilter("ALL");
                    setTransferDateRange("ALL_TIME");
                    setTransferCustomStart("");
                    setTransferCustomEnd("");
                  }}
                  className="h-9 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Transfers Audit Table Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-zinc-100">
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Room Transfer Audit Trail ({filteredTransfers.length} records)</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-500 font-normal">
                Showing newest room moves first
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Transfer Time</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">GRC No.</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Primary Guest</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Transfer Route</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Duration in Old Room</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Move Reason & Rate</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-mono">
                  {filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500 font-sans">
                        <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 text-zinc-400 opacity-50" />
                        <p className="font-bold text-sm">No room transfers match the selected filters.</p>
                        <p className="text-xs text-zinc-400 mt-1">Try expanding your date range or clearing search criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransfers.map((t) => (
                      <tr key={t.transferId} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                          <span className="font-semibold block font-sans text-xs text-zinc-900 dark:text-zinc-100">
                            {t.formattedDate || new Date(t.transferDate).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                            {new Date(t.transferDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                            {t.grcNo}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-medium font-sans text-zinc-900 dark:text-white block">
                            {t.guestName}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {t.phone}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-sans">
                          <div className="flex items-center gap-2">
                            <div className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
                              <span className="font-semibold font-mono text-xs">Room {t.fromRoomNumber}</span>
                              <span className="block text-[10px] text-zinc-500">{t.fromRoomType}</span>
                            </div>

                            <span className="text-zinc-400 font-bold">→</span>

                            <div className="px-2.5 py-1 rounded-md bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                              <span className="font-semibold font-mono text-xs">Room {t.toRoomNumber}</span>
                              <span className="block text-[10px] opacity-80">{t.toRoomType}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono">
                            {t.durationText}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-sans max-w-xs">
                          <p className="text-zinc-800 dark:text-zinc-200 font-medium text-xs truncate" title={t.moveReason}>
                            {t.moveReason}
                          </p>
                          <span className="text-[10px] font-mono text-zinc-500 block">
                            Rate: {t.rateHandling} {t.agreedRate > 0 ? `(₹${t.agreedRate}/nt)` : ""}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {t.currentRoomStatus === "CURRENTLY_OCCUPIED" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 font-medium text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              IN-HOUSE (ROOM {t.toRoomNumber})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 font-medium text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                              CHECKED OUT
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/billing?stayId=${t.stayId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 font-medium text-[11px] text-zinc-800 dark:text-zinc-200 transition font-sans shadow-xs"
                          >
                            <span>Open Folio</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FINAL BILLS & INVOICES MASTER LIST */}
      {/* ========================================================================= */}
      {reportType === "FINAL_BILLS" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Bills Logged</span>
                <Receipt className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                {data?.summary?.totalBills ?? filteredFinalBills.length}
              </div>
              <div className="text-[11px] text-zinc-500">Master tax folios & invoices</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Gross Billed</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatINR(data?.summary?.totalGrossRevenue ?? filteredFinalBills.reduce((s, b) => s + b.grossTotal, 0))}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">Total guest charges posted</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Collected</span>
                <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                {formatINR(data?.summary?.totalCollected ?? filteredFinalBills.reduce((s, b) => s + b.totalPaid, 0))}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">Advances + Settlements</div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                  Outstanding Balance
                </span>
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black font-mono text-rose-700 dark:text-rose-300">
                {formatINR(data?.summary?.totalOutstandingBalance ?? filteredFinalBills.reduce((s, b) => s + Math.max(0, b.balance), 0))}
              </div>
              <div className="text-[11px] text-rose-700/80 dark:text-rose-400 font-mono">
                Unsettled / In-House ledgers
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total GST Tax</span>
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {formatINR(data?.summary?.totalTaxCollected ?? filteredFinalBills.reduce((s, b) => s + b.totalTax, 0))}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">CGST + SGST statutory tax</div>
            </div>
          </div>

          {/* Filters Bar for Final Bills */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Invoice #, Guest Name, Mobile, GRC #, Room(s), Company, GSTIN..."
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Scope Filter */}
              <div className="flex items-center gap-1.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-2.5 h-9 rounded-lg text-xs font-medium">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={billDateRange}
                  onChange={(e: any) => setBillDateRange(e.target.value)}
                  className="bg-transparent border-none text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                >
                  <option value="ALL_TIME">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="YESTERDAY">Yesterday</option>
                  <option value="LAST_7_DAYS">Last 7 Days</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="CUSTOM">Custom Date Range</option>
                </select>
              </div>

              {billDateRange === "CUSTOM" && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={billCustomStart}
                    onChange={(e) => setBillCustomStart(e.target.value)}
                    className="text-xs h-9 px-2.5 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 font-mono text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-zinc-400 text-xs">to</span>
                  <input
                    type="date"
                    value={billCustomEnd}
                    onChange={(e) => setBillCustomEnd(e.target.value)}
                    className="text-xs h-9 px-2.5 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              )}

              {/* Status Filter */}
              <select
                value={billStatusFilter}
                onChange={(e: any) => setBillStatusFilter(e.target.value)}
                className="text-xs h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="ALL">All Bill Statuses</option>
                <option value="SETTLED">Settled / Closed</option>
                <option value="IN_HOUSE">In-House Active</option>
                <option value="OPEN">Open Balance</option>
              </select>

              {/* Payment Method Filter */}
              <select
                value={billMethodFilter}
                onChange={(e) => setBillMethodFilter(e.target.value)}
                className="text-xs h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR</option>
                <option value="CARD">Card</option>
                <option value="DIRECT_BILL">Direct Bill / Company</option>
                <option value="SPLIT">Split Payments</option>
              </select>

              {(billSearch || billStatusFilter !== "ALL" || billMethodFilter !== "ALL" || billDateRange !== "ALL_TIME") && (
                <button
                  onClick={() => {
                    setBillSearch("");
                    setBillStatusFilter("ALL");
                    setBillMethodFilter("ALL");
                    setBillDateRange("ALL_TIME");
                    setBillCustomStart("");
                    setBillCustomEnd("");
                  }}
                  className="h-9 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Final Bills Data Table */}
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-zinc-100">
              <span className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Master Final Bills & Tax Invoices ({filteredFinalBills.length} records)</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-500 font-normal">
                Includes full GST and SAC charge bifurcations
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Invoice / Folio</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">GRC No.</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Guest / Company</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Room(s) Stayed</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Nights</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Room Tariff</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">F&B / Extra</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Tax (GST)</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Gross Total</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Paid</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Balance</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-mono">
                  {filteredFinalBills.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-zinc-500 font-sans">
                        <Receipt className="h-8 w-8 mx-auto mb-2 text-zinc-400 opacity-50" />
                        <p className="font-bold text-sm">No billing records match the selected filters.</p>
                        <p className="text-xs text-zinc-400 mt-1">Try clearing search filters or changing the date scope.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredFinalBills.map((b) => (
                      <tr key={b.stayId} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold font-mono text-zinc-900 dark:text-white block text-xs">
                            {b.invoiceNo}
                          </span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                            {new Date(b.checkOutDate).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-[11px]">
                            {b.grcNo}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-sans">
                          <span className="font-medium text-zinc-900 dark:text-white block text-xs">
                            {b.guestName}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                            <span>{b.phone}</span>
                            {b.companyName && b.companyName !== "—" && (
                              <span className="text-blue-600 dark:text-blue-400 font-medium font-sans truncate max-w-[120px]">
                                • {b.companyName}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-sans">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 font-mono text-xs font-medium">
                            {b.roomDisplay}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-xs">
                            {b.nights} nt{b.nights > 1 ? "s" : ""}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100 font-mono tabular-nums font-medium whitespace-nowrap">
                          {formatINR(b.roomTariff)}
                        </td>

                        <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 font-mono tabular-nums font-medium whitespace-nowrap">
                          {formatINR(b.fnbCharges + b.extraPax + b.otherCharges)}
                        </td>

                        <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400 font-mono tabular-nums font-medium whitespace-nowrap">
                          {formatINR(b.totalTax)}
                        </td>

                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-semibold text-xs whitespace-nowrap">
                          {formatINR(b.grossTotal)}
                        </td>

                        <td className="px-4 py-3 text-right text-zinc-800 dark:text-zinc-200 font-mono tabular-nums font-medium whitespace-nowrap">
                          {formatINR(b.totalPaid)}
                        </td>

                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                          <span className={b.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                            {formatINR(b.balance)}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap font-sans">
                          {b.settlementStatus === "SETTLED" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 font-medium text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              SETTLED
                            </span>
                          ) : b.stayStatus === "IN_HOUSE" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50/80 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50 font-medium text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              IN-HOUSE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50/80 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50 font-medium text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              OPEN BALANCE
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/billing?stayId=${b.stayId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 font-medium text-[11px] text-emerald-800 dark:text-emerald-300 transition font-sans shadow-xs"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View Bill / Folio</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CASHIER COLLECTIONS & EXPENSES LEDGER */}
      {/* ========================================================================= */}
      {reportType === "CASHIER_COLLECTIONS_EXPENSES" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase">Total Collections (Inflows)</span>
                  <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
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
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
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
                  className={`text-xl font-black font-mono ${
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
                <div className="text-xl font-black text-emerald-800 dark:text-emerald-300 font-mono">
                  {formatINR(summary.cashDrawerPosition?.netCashInHand || 0)}
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                  Cash In: {formatINR(summary.cashDrawerPosition?.cashIn || 0)} | Cash Out: {formatINR(summary.cashDrawerPosition?.cashOut || 0)}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Controls */}
          <div className="flex flex-col md:flex-row items-center gap-2 p-3.5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by receipt/voucher #, guest, payee, room, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <select
                value={flowFilter}
                onChange={(e: any) => setFlowFilter(e.target.value)}
                className="text-xs h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="ALL">All Flows (In & Out)</option>
                <option value="INFLOW">Collections Only</option>
                <option value="OUTFLOW">Expenses Only</option>
              </select>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="text-xs h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
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
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Voucher / Receipt</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Time</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Party / Payee</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Particulars</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Method</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-mono">
                  {filteredCashierTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400 dark:text-zinc-500 font-sans">
                        No financial transactions recorded for this business date.
                      </td>
                    </tr>
                  ) : (
                    filteredCashierTransactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {tx.recordId}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">{tx.time}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {tx.flow === "INFLOW" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 font-medium text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              RECEIPT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50/80 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 font-medium text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              EXPENSE
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-sans font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {tx.party}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-sans max-w-sm truncate">
                          {tx.particulars}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium font-sans">
                            {tx.method}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                            tx.flow === "INFLOW" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {tx.flow === "INFLOW" ? "+" : "-"}
                          {formatINR(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: EXPENSE REGISTER & OUTFLOW AUDIT */}
      {/* ========================================================================= */}
      {reportType === "EXPENSES" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Expenses (Outflows)</span>
                <ArrowUpRight className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                {formatINR(expenseKPIs.totalOutflow)}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                {expenseKPIs.totalCount} Total Vouchers Recorded
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                  Cash In Drawer Impact
                </span>
                <Banknote className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black font-mono text-rose-800 dark:text-rose-300">
                {formatINR(expenseKPIs.cashOutflow)}
              </div>
              <div className="text-[11px] text-rose-700/80 dark:text-rose-400 font-mono">
                Direct petty cash & drawer payments
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">UPI & Bank Outflows</span>
                <Landmark className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {formatINR(expenseKPIs.upiOutflow + expenseKPIs.bankOutflow)}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                UPI: {formatINR(expenseKPIs.upiOutflow)} • Bank: {formatINR(expenseKPIs.bankOutflow)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Top Expense Category</span>
                <Tag className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {expenseKPIs.topCategory}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                {expenseKPIs.topCategoryAmount > 0 ? `${formatINR(expenseKPIs.topCategoryAmount)} Total Spent` : "No expenses recorded"}
              </div>
            </div>
          </div>

          {/* Filters Bar for Expenses */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Voucher #, Payee, Description, Reference, Category..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="text-xs h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="DRIVER_COMMISSION">Driver Commission</option>
                <option value="VENDOR_PAYMENT">Vendor / Supplier</option>
                <option value="STAFF_ADVANCE">Staff Advance / Salary</option>
                <option value="FB_PURCHASE">F&B Raw Materials</option>
                <option value="MAINTENANCE">Maintenance & Repairs</option>
                <option value="HOUSEKEEPING">Housekeeping & Linen</option>
                <option value="PETTY_CASH">Petty Cash Operational</option>
                <option value="UTILITIES">Utilities & Power</option>
                <option value="GUEST_REFUND">Guest Refund</option>
                <option value="OTHER">Other Expense</option>
              </select>

              {/* Payment Method Filter */}
              <select
                value={expenseMethodFilter}
                onChange={(e) => setExpenseMethodFilter(e.target.value)}
                className="text-xs h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="ALL">All Payment Modes</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="CHEQUE">Cheque</option>
              </select>

              {(expenseSearch || expenseCategoryFilter !== "ALL" || expenseMethodFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setExpenseSearch("");
                    setExpenseCategoryFilter("ALL");
                    setExpenseMethodFilter("ALL");
                  }}
                  className="h-9 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}

              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="h-9 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Record Expense</span>
              </button>
            </div>
          </div>

          {/* Expense Records Data Table */}
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-zinc-100">
              <span className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span>Operational Expense Register ({filteredExpenseVouchers.length} vouchers)</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-500 font-normal">
                Filtered Outflows: {formatINR(filteredExpenseVouchers.reduce((s: number, e: any) => s + (e.totalAmount || e.amount || 0), 0))}
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Voucher #</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Date & Time</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Category</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Payee / Vendor</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Narration / Particulars</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Mode</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Reference</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Amount</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Staff / Auth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-mono">
                  {filteredExpenseVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-zinc-500 font-sans">
                        <ArrowUpRight className="h-8 w-8 mx-auto mb-2 text-zinc-400 opacity-50" />
                        <p className="font-bold text-sm">No expense vouchers found.</p>
                        <p className="text-xs text-zinc-400 mt-1">Click "+ Record Expense" to create a new expense voucher.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenseVouchers.map((e: any) => (
                      <tr key={e.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-bold font-mono text-zinc-900 dark:text-white block text-xs">
                            {e.voucherNo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">
                          {e.date} {e.time}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-sans">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-[11px]">
                            {e.category.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-sans font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                          {e.payeeName}
                        </td>
                        <td className="px-4 py-3 font-sans text-zinc-600 dark:text-zinc-400 max-w-sm truncate">
                          {e.description}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium font-sans">
                            {e.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[11px] font-mono">
                          {e.reference || "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatINR(e.totalAmount || e.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-sans">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 font-medium text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {e.status || "PAID"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap font-sans text-[11px]">
                          {e.authorizedBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FRONT DESK ROOM RACK */}
      {/* ========================================================================= */}
      {reportType === "FRONT_OFFICE" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-semibold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Front Office Room Occupancy ({data?.totalRooms ?? 0} Total Inventory)
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                Occupancy: {data?.occupancyRate ?? "0%"} ({data?.occupiedRooms ?? 0} Rooms In-House)
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Room</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Occupancy</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Housekeeping</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Guest</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Stay Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-mono">
                  {(data?.rows || []).map((r: any) => (
                    <tr key={r.number} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        Room {r.number}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 font-sans whitespace-nowrap">{r.roomType}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            r.occupancyStatus === "OCCUPIED"
                              ? "bg-blue-50/80 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50"
                              : "bg-emerald-50/80 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              r.occupancyStatus === "OCCUPIED" ? "bg-blue-500" : "bg-emerald-500"
                            }`}
                          />
                          {r.occupancyStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            r.housekeepingStatus === "CLEAN"
                              ? "bg-emerald-50/80 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                              : "bg-amber-50/80 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              r.housekeepingStatus === "CLEAN" ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {r.housekeepingStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-sans font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {r.guestName}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">{r.stayId || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REVENUE & TAX LEDGER */}
      {/* ========================================================================= */}
      {reportType === "REVENUE" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-semibold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Posted Folio Entries & Tax Journal
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Charge Code</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Description</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Guest</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Taxable</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Tax</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-mono">
                  {(data?.rows || []).map((e: any) => (
                    <tr key={e.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">{e.serviceDate}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{e.chargeCode}</td>
                      <td className="px-4 py-3 font-sans text-zinc-700 dark:text-zinc-300 max-w-sm truncate">{e.description}</td>
                      <td className="px-4 py-3 font-sans font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{e.guestName}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-medium whitespace-nowrap">{formatINR(e.taxableAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{formatINR(e.taxAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatINR(e.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: KITCHEN ORDERS & DINING COLLECTIONS */}
      {/* ========================================================================= */}
      {reportType === "FNB" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Kitchen Orders</span>
                <UtensilsCrossed className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                {data?.summary?.totalOrdersCount ?? filteredKitchenOrders.length}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                {data?.summary?.totalKotsFired ?? 0} KOTs • {data?.summary?.totalItemsPrepared ?? 0} Dishes Prepared
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Gross F&B Collections
                </span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-800 dark:text-emerald-300">
                {formatINR(data?.summary?.grossCollection ?? 0)}
              </div>
              <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400 font-mono">
                Base: {formatINR(data?.summary?.taxableSales ?? 0)} • GST 5%: {formatINR(data?.summary?.gstCollected ?? 0)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                  Room Folio Transferred
                </span>
                <BedDouble className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black font-mono text-blue-800 dark:text-blue-300">
                {formatINR(data?.summary?.folioPostedAmount ?? 0)}
              </div>
              <div className="text-[11px] text-blue-700/80 dark:text-blue-400 font-mono">
                Billed to in-house guest rooms
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                  Direct Counter Settle
                </span>
                <Wallet className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black font-mono text-purple-800 dark:text-purple-300">
                {formatINR(data?.summary?.directSettledAmount ?? 0)}
              </div>
              <div className="text-[11px] text-purple-700/80 dark:text-purple-400 font-mono">
                Cash, UPI & Card collections
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center gap-2 p-3.5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Order #, KOT #, destination, room, guest, dish..."
                value={kotSearch}
                onChange={(e) => setKotSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <select
                value={kotDestinationFilter}
                onChange={(e) => setKotDestinationFilter(e.target.value)}
                className="text-xs h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="ALL">All Destinations</option>
                <option value="ROOM_SERVICE">Room Service</option>
                <option value="TABLE_DINE_IN">Dine-In Tables</option>
                <option value="BAR_LOUNGE">Bar Lounge</option>
                <option value="TAKEAWAY">Takeaways / Other</option>
              </select>

              <select
                value={kotSettlementFilter}
                onChange={(e) => setKotSettlementFilter(e.target.value)}
                className="text-xs h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                <option value="ALL">All Settlements</option>
                <option value="POSTED_TO_ROOM">Posted to Room Folio</option>
                <option value="DIRECT_PAID">Direct Paid / Settled</option>
                <option value="UNSETTLED">Unsettled / Open</option>
              </select>
            </div>
          </div>

          {/* Kitchen Orders Table */}
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-semibold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Kitchen Orders & Collections Register ({filteredKitchenOrders.length} Records)
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                GST SAC 996331 (5% Composite Food & Beverage Supply)
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Order / KOT #</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Time</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Destination</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Guest / Payee</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Dishes Ordered</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Taxable</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">GST (5%)</th>
                    <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Total Bill</th>
                    <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-mono">
                  {filteredKitchenOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-zinc-400 dark:text-zinc-500 font-sans">
                        No kitchen orders or dining sales recorded for this date.
                      </td>
                    </tr>
                  ) : (
                    filteredKitchenOrders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          <div>{o.orderNo}</div>
                          <div className="text-[10px] font-normal text-amber-600 dark:text-amber-400">{o.kotNumbers}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">{o.timeFormatted}</td>
                        <td className="px-4 py-3 font-sans whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                              o.destinationCategory === "ROOM_SERVICE"
                                ? "bg-blue-50/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/50"
                                : o.destinationCategory === "BAR_LOUNGE"
                                ? "bg-purple-50/80 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/50"
                                : o.destinationCategory === "TAKEAWAY"
                                ? "bg-amber-50/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50"
                                : "bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
                            }`}
                          >
                            {o.destinationLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-sans font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {o.guestName}
                        </td>
                        <td className="px-4 py-3 font-sans text-zinc-700 dark:text-zinc-300 max-w-xs truncate" title={o.itemsSummary}>
                          {o.itemsSummary}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-medium whitespace-nowrap">{formatINR(o.taxableAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{formatINR(o.totalTax)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatINR(o.totalAmount)}</td>
                        <td className="px-4 py-3 text-center font-sans whitespace-nowrap">
                          {o.settlementType === "POSTED_TO_ROOM" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50/80 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50 text-[11px] font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              Room Folio
                            </span>
                          ) : o.settlementType === "DIRECT_PAID" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 text-[11px] font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Paid Settle
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 text-[11px] font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                              Open Ticket
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD EXPENSE VOUCHER */}
      {/* ========================================================================= */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-rose-500" />
                Record Cash/Bank Expense Voucher
              </h3>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {expenseError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-xs font-semibold text-rose-800 dark:text-rose-300">
                {expenseError}
              </div>
            )}

            {expenseSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                {expenseSuccess}
              </div>
            )}

            <form onSubmit={handleAddExpenseSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 font-bold mb-1">Expense Category *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="DRIVER_COMMISSION">Driver Commission</option>
                    <option value="VENDOR_PAYMENT">Vendor Payment</option>
                    <option value="FB_PURCHASE">F&B Raw Materials / Dairy</option>
                    <option value="MAINTENANCE">Maintenance & Repairs</option>
                    <option value="PETTY_CASH">Petty Cash / Supplies</option>
                    <option value="SALARY_ADVANCE">Staff Salary Advance</option>
                    <option value="REFUND">Guest Cash Refund</option>
                    <option value="OTHER">Other Outflow</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-500 font-bold mb-1">Payment Method *</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="CASH">Physical Cash Drawer</option>
                    <option value="UPI">UPI / GooglePay</option>
                    <option value="BANK_TRANSFER">Bank Account / IMPS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 font-bold mb-1">Payee / Vendor Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Raju Driver, Local Dairy"
                    value={expenseForm.payeeName}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payeeName: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 font-bold mb-1">Amount (INR) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-mono font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 font-bold mb-1">Description / Particulars *</label>
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
      {/* MODAL: RECORD DIRECT NON-ROOM INCOME (BAR, BANQUET, WALK-IN DINING) */}
      {/* ========================================================================= */}
      {showAddIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                    Record Direct Collection / Income
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Interim manual register for Bar, Banquet advances & Walk-in dining
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddIncomeModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {incomeError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{incomeError}</span>
              </div>
            )}

            {incomeSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{incomeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddIncomeSubmit} className="space-y-3.5 text-xs">
              {/* Income Category Dropdown */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                  Collection Source / Category *
                </label>
                <select
                  required
                  value={incomeForm.category}
                  onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="BAR_FOOD_BILL">Bar Food Orders (Kitchen Food Bill)</option>
                  <option value="BANQUET_EVENT_ADVANCE">Banquet & Event Advance Deposit</option>
                  <option value="OUTSIDER_WALKIN_DINING">Direct Non-Resident Walk-In Dining</option>
                  <option value="MISC_OUTLET_REVENUE">Ancillary & Other Outlet Collections</option>
                </select>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                  {incomeForm.category === "BAR_FOOD_BILL" && "Direct collection for food dispatched from kitchen to Bar/Lounge. (Bar liquor & drinks sales are not tracked in Hotel OS)."}
                  {incomeForm.category === "BANQUET_EVENT_ADVANCE" && "Advance deposits or hall bookings. Client contact is mandatory; supports corporate GST details."}
                  {incomeForm.category === "OUTSIDER_WALKIN_DINING" && "Direct food bill settlement for outside walk-in dining guests without room folio settlement."}
                  {incomeForm.category === "MISC_OUTLET_REVENUE" && "Bakery, pool counter, merchandise, or miscellaneous counter sales."}
                </p>
              </div>

              {/* Special Banquet Corporate / Individual Toggle & Details */}
              {incomeForm.category === "BANQUET_EVENT_ADVANCE" && (
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> Client / Booking Type
                    </span>
                    <div className="flex rounded-lg bg-zinc-200 dark:bg-zinc-800 p-0.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setIncomeForm({ ...incomeForm, clientType: "INDIVIDUAL" })}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          incomeForm.clientType === "INDIVIDUAL"
                            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                        }`}
                      >
                        Individual Host
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncomeForm({ ...incomeForm, clientType: "COMPANY" })}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          incomeForm.clientType === "COMPANY"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                        }`}
                      >
                        Corporate / Company
                      </button>
                    </div>
                  </div>

                  {incomeForm.clientType === "COMPANY" && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1 text-[11px]">
                            Company / Organization Name *
                          </label>
                          <input
                            required={incomeForm.clientType === "COMPANY"}
                            type="text"
                            placeholder="e.g. Tata Consultancy Services Ltd"
                            value={incomeForm.companyName}
                            onChange={(e) => setIncomeForm({ ...incomeForm, companyName: e.target.value })}
                            className="w-full rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1 text-[11px]">
                            Company GSTIN (15 Digits)
                          </label>
                          <input
                            type="text"
                            maxLength={15}
                            placeholder="e.g. 18AABCT1332L1Z1"
                            value={incomeForm.gstin}
                            onChange={(e) => setIncomeForm({ ...incomeForm, gstin: e.target.value.toUpperCase() })}
                            className="w-full rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 font-mono text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none uppercase"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1 text-[11px]">
                            Company Billing Address
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. GS Road, Guwahati, Assam - 781005"
                            value={incomeForm.billingAddress}
                            onChange={(e) => setIncomeForm({ ...incomeForm, billingAddress: e.target.value })}
                            className="w-full rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1 text-[11px]">
                            Event / Function Details
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Annual Conference & Gala Dinner"
                            value={incomeForm.eventDetails}
                            onChange={(e) => setIncomeForm({ ...incomeForm, eventDetails: e.target.value })}
                            className="w-full rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Guest / Party Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                    {incomeForm.category === "BANQUET_EVENT_ADVANCE"
                      ? "Contact Person / Host Name *"
                      : "Guest / Party Name (Optional)"}
                  </label>
                  <input
                    required={incomeForm.category === "BANQUET_EVENT_ADVANCE"}
                    type="text"
                    placeholder={
                      incomeForm.category === "BANQUET_EVENT_ADVANCE"
                        ? "e.g. Mr. Rajesh Sharma (Host)"
                        : incomeForm.category === "BAR_FOOD_BILL"
                        ? "e.g. Bar Table 4, Counter Guest"
                        : "e.g. Walk-In Guest (Optional)"
                    }
                    value={incomeForm.payerName}
                    onChange={(e) => setIncomeForm({ ...incomeForm, payerName: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                    {incomeForm.category === "BANQUET_EVENT_ADVANCE"
                      ? "Contact Mobile Number *"
                      : "Contact Mobile (Optional)"}
                  </label>
                  <input
                    required={incomeForm.category === "BANQUET_EVENT_ADVANCE"}
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={incomeForm.payerPhone}
                    onChange={(e) => setIncomeForm({ ...incomeForm, payerPhone: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* KOT Number & Reference / Slip (Only for F&B Dining and Bar Outlets, hidden for Banquet) */}
              {incomeForm.category !== "BANQUET_EVENT_ADVANCE" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1 flex items-center gap-1">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      <span>KOT / Kitchen Slip # (Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KOT-104, KOT-42"
                      value={incomeForm.kotNo}
                      onChange={(e) => setIncomeForm({ ...incomeForm, kotNo: e.target.value })}
                      className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                      Bill / POS Slip / UTR # (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Slip #8812, UTR 29384"
                      value={incomeForm.reference}
                      onChange={(e) => setIncomeForm({ ...incomeForm, reference: e.target.value })}
                      className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Amount and Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                    Collected Amount (INR) *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 1500"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={incomeForm.paymentMethod}
                    onChange={(e) => setIncomeForm({ ...incomeForm, paymentMethod: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="CASH">Cash (Drawer Handover)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  </select>
                </div>
              </div>

              {/* Narration and Notes */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                  Narration / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional billing details, guest requests, or event schedule..."
                  value={incomeForm.notes}
                  onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddIncomeModal(false)}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={incomeSubmitting}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {incomeSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Recording Receipt...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Record Collection & Issue Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE EXPENSE REGISTER SHEET */}
      {/* ========================================================================= */}
      {showExpensesPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-2xl border border-zinc-700 bg-white text-zinc-950 p-6 shadow-2xl space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <span className="text-xs font-bold uppercase font-mono text-zinc-600">
                Official Operational Expense Register
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Expense Sheet
                </button>
                <button onClick={() => setShowExpensesPrintModal(false)} className="text-zinc-500 hover:text-zinc-900 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-zinc-300 pb-3">
                <div>
                  <h1 className="text-base font-black uppercase text-zinc-950">{activeProperty?.displayName || "Hotel Ambarish Grand Residency"}</h1>
                  <p className="text-[11px] text-zinc-600">{activeProperty?.legalName}</p>
                  <p className="font-mono text-[11px] text-zinc-700">
                    GSTIN: {activeProperty?.gstin || "N/A"} | State: {activeProperty?.stateCode || "18"}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-zinc-950">EXPENSE REGISTER & CASH OUTFLOWS</div>
                  <div className="text-zinc-600 text-[11px]">Business Date: {selectedDate || activeProperty?.businessDate}</div>
                  <div className="text-zinc-600 text-[11px]">Printed: {new Date().toLocaleString()}</div>
                  <div className="font-bold text-rose-700 text-sm mt-1">
                    Total Outflows: {formatINR(expenseKPIs.totalOutflow)} ({filteredExpenseVouchers.length} Vouchers)
                  </div>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold text-zinc-600 uppercase font-mono">
                    <th className="p-2">Voucher #</th>
                    <th className="p-2">Time</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Payee / Vendor</th>
                    <th className="p-2">Particulars</th>
                    <th className="p-2">Mode</th>
                    <th className="p-2">Reference</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono text-[11px]">
                  {filteredExpenseVouchers.map((e: any) => (
                    <tr key={e.id}>
                      <td className="p-2 font-bold">{e.voucherNo}</td>
                      <td className="p-2">{e.time}</td>
                      <td className="p-2 font-sans">{e.category.replace(/_/g, " ")}</td>
                      <td className="p-2 font-sans font-medium">{e.payeeName}</td>
                      <td className="p-2 font-sans">{e.description}</td>
                      <td className="p-2">{e.method}</td>
                      <td className="p-2">{e.reference || "—"}</td>
                      <td className="p-2 text-right font-bold text-rose-700">{formatINR(e.totalAmount || e.amount)}</td>
                      <td className="p-2 font-sans">{e.authorizedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 flex justify-between items-end text-[11px]">
                <div className="text-center">
                  <div className="w-40 border-b border-zinc-400 pb-6 text-zinc-400 italic">Front Desk Cashier</div>
                  <span className="font-bold">Disbursed By</span>
                </div>
                <div className="text-center">
                  <div className="w-40 border-b border-zinc-400 pb-6 text-zinc-400 italic">Duty Manager / Auditor</div>
                  <span className="font-bold">Audited & Approved By</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRINTABLE TRANSFERS SHEET */}
      {/* ========================================================================= */}
      {showTransfersPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl border border-zinc-700 bg-white text-zinc-950 p-6 shadow-2xl space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <span className="text-xs font-bold uppercase font-mono text-zinc-600">
                Official Room Transfers Audit Register
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Sheet
                </button>
                <button onClick={() => setShowTransfersPrintModal(false)} className="text-zinc-500 hover:text-zinc-900 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-zinc-300 pb-3">
                <div>
                  <h1 className="text-base font-black uppercase text-zinc-950">{activeProperty?.displayName || "Hotel Ambarish Grand Residency"}</h1>
                  <p className="text-[11px] text-zinc-600">{activeProperty?.legalName}</p>
                  <p className="font-mono text-[11px] text-zinc-700">
                    GSTIN: {activeProperty?.gstin || "N/A"} | State: {activeProperty?.stateCode || "18"}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-zinc-950">ROOM TRANSFERS AUDIT</div>
                  <div className="text-zinc-600 text-[11px]">Printed: {new Date().toLocaleString()}</div>
                  <div className="text-zinc-600 text-[11px]">Total Transfers: {filteredTransfers.length}</div>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold text-zinc-600 uppercase font-mono">
                    <th className="p-2">Transfer Time</th>
                    <th className="p-2">GRC #</th>
                    <th className="p-2">Guest Name & Phone</th>
                    <th className="p-2">From Room</th>
                    <th className="p-2">To Room</th>
                    <th className="p-2">Duration</th>
                    <th className="p-2">Move Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono text-[11px]">
                  {filteredTransfers.map((t) => (
                    <tr key={t.transferId}>
                      <td className="p-2">{t.formattedDate}</td>
                      <td className="p-2 font-bold">{t.grcNo}</td>
                      <td className="p-2 font-sans font-medium">{t.guestName} ({t.phone})</td>
                      <td className="p-2 font-bold text-rose-700">Room {t.fromRoomNumber}</td>
                      <td className="p-2 font-bold text-emerald-700">Room {t.toRoomNumber}</td>
                      <td className="p-2">{t.durationText}</td>
                      <td className="p-2 font-sans">{t.moveReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 flex justify-between items-end text-[11px]">
                <div className="text-center">
                  <div className="w-40 border-b border-zinc-400 pb-6 text-zinc-400 italic">Front Desk Executive</div>
                  <span className="font-bold">Prepared By</span>
                </div>
                <div className="text-center">
                  <div className="w-40 border-b border-zinc-400 pb-6 text-zinc-400 italic">Duty Manager / Auditor</div>
                  <span className="font-bold">Verified By</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRINTABLE FINAL BILLS MASTER SHEET */}
      {/* ========================================================================= */}
      {showFinalBillsPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-2xl border border-zinc-700 bg-white text-zinc-950 p-6 shadow-2xl space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <span className="text-xs font-bold uppercase font-mono text-zinc-600">
                Official Final Bills & Tax Invoice Register
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Register
                </button>
                <button onClick={() => setShowFinalBillsPrintModal(false)} className="text-zinc-500 hover:text-zinc-900 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-zinc-300 pb-3">
                <div>
                  <h1 className="text-base font-black uppercase text-zinc-950">{activeProperty?.displayName || "Hotel Ambarish Grand Residency"}</h1>
                  <p className="text-[11px] text-zinc-600">{activeProperty?.legalName}</p>
                  <p className="font-mono text-[11px] text-zinc-700">
                    GSTIN: {activeProperty?.gstin || "N/A"} | State: {activeProperty?.stateCode || "18"}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-zinc-950">TAX INVOICE MASTER REGISTER</div>
                  <div className="text-zinc-600 text-[11px]">Printed: {new Date().toLocaleString()}</div>
                  <div className="text-zinc-600 text-[11px]">Total Bills: {filteredFinalBills.length}</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 bg-zinc-100 p-2.5 rounded font-mono text-xs">
                <div>Total Gross: <strong>{formatINR(filteredFinalBills.reduce((s, b) => s + b.grossTotal, 0))}</strong></div>
                <div>Total Tax (GST): <strong>{formatINR(filteredFinalBills.reduce((s, b) => s + b.totalTax, 0))}</strong></div>
                <div>Total Paid: <strong>{formatINR(filteredFinalBills.reduce((s, b) => s + b.totalPaid, 0))}</strong></div>
                <div>Outstanding: <strong>{formatINR(filteredFinalBills.reduce((s, b) => s + Math.max(0, b.balance), 0))}</strong></div>
              </div>

              <table className="w-full text-left text-[11px] border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold text-zinc-600 uppercase font-mono">
                    <th className="p-2">Invoice #</th>
                    <th className="p-2">GRC #</th>
                    <th className="p-2">Guest / Company</th>
                    <th className="p-2">Room(s)</th>
                    <th className="p-2 text-right">Taxable</th>
                    <th className="p-2 text-right">GST</th>
                    <th className="p-2 text-right">Gross Total</th>
                    <th className="p-2 text-right">Paid</th>
                    <th className="p-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono">
                  {filteredFinalBills.map((b) => (
                    <tr key={b.stayId}>
                      <td className="p-2 font-bold">{b.invoiceNo}</td>
                      <td className="p-2">{b.grcNo}</td>
                      <td className="p-2 font-sans font-medium">{b.guestName}</td>
                      <td className="p-2">{b.roomDisplay}</td>
                      <td className="p-2 text-right">{formatINR(b.taxableAmount)}</td>
                      <td className="p-2 text-right text-indigo-700">{formatINR(b.totalTax)}</td>
                      <td className="p-2 text-right font-bold text-emerald-800">{formatINR(b.grossTotal)}</td>
                      <td className="p-2 text-right">{formatINR(b.totalPaid)}</td>
                      <td className="p-2 text-right font-bold text-rose-700">{formatINR(b.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 flex justify-between items-end text-[11px]">
                <div className="text-center">
                  <div className="w-40 border-b border-zinc-400 pb-6 text-zinc-400 italic">Cashier / Billing Desk</div>
                  <span className="font-bold">Prepared By</span>
                </div>
                <div className="text-center">
                  <div className="w-40 border-b border-zinc-400 pb-6 text-zinc-400 italic">Financial Auditor</div>
                  <span className="font-bold">Audited By</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PRINTABLE CASHIER SUMMARY */}
      {/* ========================================================================= */}
      {showPrintModal && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-white text-zinc-950 p-6 shadow-2xl space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
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
                  <h1 className="text-base font-black uppercase text-zinc-950">{activeProperty?.displayName || "Hotel Ambarish Grand Residency"}</h1>
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

      {/* ========================================================================= */}
      {/* MODAL 5: PRINTABLE KITCHEN ORDERS & DINING REGISTER */}
      {/* ========================================================================= */}
      {showKotPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl border border-zinc-700 bg-white text-zinc-950 p-6 shadow-2xl space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <span className="text-xs font-bold uppercase font-mono text-zinc-600">
                Official Kitchen & Dining Collections Register
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Sheet
                </button>
                <button onClick={() => setShowKotPrintModal(false)} className="text-zinc-500 hover:text-zinc-900 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-zinc-300 pb-3">
                <div>
                  <h1 className="text-base font-black uppercase text-zinc-950">{activeProperty?.displayName || "Hotel Ambarish Grand Residency"}</h1>
                  <p className="text-[11px] text-zinc-600">{activeProperty?.legalName}</p>
                  <p className="font-mono text-[11px] text-zinc-700">
                    GSTIN: {activeProperty?.gstin || "N/A"} | State: {activeProperty?.stateCode || "18"}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-zinc-950">KITCHEN & RESTAURANT REGISTER</div>
                  <div className="text-zinc-600 text-[11px]">Business Date: {selectedDate || activeProperty?.businessDate}</div>
                  <div className="text-zinc-600 text-[11px]">Printed: {new Date().toLocaleString()}</div>
                </div>
              </div>

              {/* Summary Numbers */}
              <div className="grid grid-cols-4 gap-2 bg-zinc-100 p-2.5 rounded font-mono text-xs">
                <div>Total Orders: <strong>{data?.summary?.totalOrdersCount ?? filteredKitchenOrders.length}</strong></div>
                <div>Dishes Prepared: <strong>{data?.summary?.totalItemsPrepared ?? 0}</strong></div>
                <div>Gross Sales: <strong>{formatINR(data?.summary?.grossCollection ?? 0)}</strong></div>
                <div>GST 5%: <strong>{formatINR(data?.summary?.gstCollected ?? 0)}</strong></div>
              </div>

              <table className="w-full text-left text-[11px] border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold text-zinc-600 uppercase font-mono">
                    <th className="p-2">Order #</th>
                    <th className="p-2">KOT #</th>
                    <th className="p-2">Time</th>
                    <th className="p-2">Destination</th>
                    <th className="p-2">Guest / Payee</th>
                    <th className="p-2">Dishes Ordered</th>
                    <th className="p-2 text-right">Taxable</th>
                    <th className="p-2 text-right">GST (5%)</th>
                    <th className="p-2 text-right">Gross Total</th>
                    <th className="p-2 text-center">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono">
                  {filteredKitchenOrders.map((o: any) => (
                    <tr key={o.id}>
                      <td className="p-2 font-bold">{o.orderNo}</td>
                      <td className="p-2 text-orange-700">{o.kotNumbers}</td>
                      <td className="p-2 text-zinc-600">{o.timeFormatted}</td>
                      <td className="p-2 font-sans font-medium">{o.destinationLabel}</td>
                      <td className="p-2 font-sans">{o.guestName}</td>
                      <td className="p-2 font-sans max-w-xs truncate">{o.itemsSummary}</td>
                      <td className="p-2 text-right">{formatINR(o.taxableAmount)}</td>
                      <td className="p-2 text-right text-indigo-700">{formatINR(o.totalTax)}</td>
                      <td className="p-2 text-right font-bold text-emerald-800">{formatINR(o.totalAmount)}</td>
                      <td className="p-2 text-center font-sans text-[10px]">
                        {o.settlementType === "POSTED_TO_ROOM" ? "Room Folio" : o.settlementType === "DIRECT_PAID" ? "Paid" : "Open"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 flex justify-between items-end text-[11px]">
                <div className="text-center">
                  <div className="w-40 border-b border-zinc-400 pb-6 text-zinc-400 italic">Chef / F&B Captain</div>
                  <span className="font-bold">Prepared By</span>
                </div>
                <div className="text-center">
                  <div className="w-40 border-b border-zinc-400 pb-6 text-zinc-400 italic">Front Desk / Auditor</div>
                  <span className="font-bold">Audited By</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
