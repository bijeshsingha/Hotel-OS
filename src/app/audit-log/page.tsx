"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import {
  ScrollText,
  Search,
  Filter,
  Calendar,
  Download,
  Printer,
  Eye,
  RefreshCw,
  ArrowRight,
  Clock,
  User,
  DollarSign,
  Building,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  Copy,
  Check,
  FileText,
  SlidersHorizontal,
  Shield,
  Moon,
  Utensils,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

type AuditCategory =
  | "ALL"
  | "FINANCIAL"
  | "CASH_FLOW"
  | "FRONT_DESK"
  | "RESERVATIONS"
  | "NIGHT_AUDIT"
  | "ADMIN"
  | "POS_DINING";

interface AuditLog {
  id: string;
  organizationId: string;
  propertyId: string;
  actorId?: string | null;
  actorName?: string | null;
  effectiveActorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  beforeJson?: string | null;
  afterJson?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  occurredAt: string;
}

interface AuditStats {
  total: number;
  financial: number;
  cashFlow: number;
  frontDesk: number;
  admin: number;
  reservations: number;
  nightAudit: number;
}

export default function AuditLogPage() {
  const { activeProperty, refreshKey, triggerRefresh } = useHotel();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    total: 0,
    financial: 0,
    cashFlow: 0,
    frontDesk: 0,
    admin: 0,
    reservations: 0,
    nightAudit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AuditCategory>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<string>("ALL_TIME");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Inspector Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [rawJsonView, setRawJsonView] = useState(false);

  // Fetch Logs from upgraded API
  const fetchAuditLogs = async () => {
    if (!activeProperty) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        propertyId: activeProperty.id,
        limit: "250",
      });

      if (category !== "ALL") params.append("category", category);
      if (actionFilter !== "ALL") params.append("action", actionFilter);

      // Handle Date Presets
      const now = new Date();
      const baseDate = activeProperty?.businessDate ? new Date(activeProperty.businessDate) : now;
      if (datePreset === "TODAY") {
        const todayStr = activeProperty?.businessDate || now.toISOString().split("T")[0];
        params.append("startDate", todayStr);
        params.append("endDate", todayStr);
      } else if (datePreset === "YESTERDAY") {
        const yest = new Date(baseDate);
        yest.setDate(yest.getDate() - 1);
        const yestStr = yest.toISOString().split("T")[0];
        params.append("startDate", yestStr);
        params.append("endDate", yestStr);
      } else if (datePreset === "LAST_7_DAYS") {
        const past7 = new Date(baseDate);
        past7.setDate(past7.getDate() - 7);
        params.append("startDate", past7.toISOString().split("T")[0]);
      } else if (datePreset === "THIS_MONTH") {
        const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        params.append("startDate", firstDay.toISOString().split("T")[0]);
      } else if (datePreset === "CUSTOM") {
        if (customStartDate) params.append("startDate", customStartDate);
        if (customEndDate) params.append("endDate", customEndDate);
      }

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await fetch(`/api/v1/audit-logs?${params.toString()}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setLogs(data);
      } else if (data && Array.isArray(data.logs)) {
        setLogs(data.logs);
        if (data.stats) setStats(data.stats);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error("Audit log fetch error:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [activeProperty, refreshKey, category, actionFilter, datePreset, customStartDate, customEndDate]);

  // Client-side quick filter for instantaneous typing response
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.targetType.toLowerCase().includes(q) ||
        l.targetId.toLowerCase().includes(q) ||
        l.actorName?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q) ||
        l.afterJson?.toLowerCase().includes(q) ||
        l.beforeJson?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  // Distinct actions for dropdown
  const distinctActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  // Helper for action badges
  const getActionBadge = (action: string) => {
    switch (action) {
      case "PAYMENT_RECEIVE":
      case "DIRECT_INCOME_COLLECT":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
          dot: "bg-emerald-500",
          icon: <ArrowDownLeft className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />,
          label: action === "DIRECT_INCOME_COLLECT" ? "Direct Income" : "Payment Received",
        };
      case "REFUND_PAYOUT":
      case "DELETE_FOLIO_CHARGE":
      case "RESERVATION_CANCEL":
      case "ADMIN_DELETE_GRC":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
          dot: "bg-rose-500",
          icon: <ArrowUpRight className="h-3 w-3 text-rose-600 dark:text-rose-400" />,
          label: action.replace(/_/g, " "),
        };
      case "PAYMENT_EDIT":
      case "FOLIO_DISCOUNT_APPLIED":
      case "UPDATE_GRACE_PERIOD":
      case "ADMIN_UPDATE_GRC":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
          dot: "bg-amber-500",
          icon: <SlidersHorizontal className="h-3 w-3 text-amber-600 dark:text-amber-400" />,
          label: action.replace(/_/g, " "),
        };
      case "CHECK_IN":
      case "CHECK_OUT":
      case "ROOM_MOVE":
      case "STAY_ADD_ROOM":
      case "ROOM_STATE_CHANGE":
        return {
          bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
          dot: "bg-blue-500",
          icon: <Building className="h-3 w-3 text-blue-600 dark:text-blue-400" />,
          label: action.replace(/_/g, " "),
        };
      case "NIGHT_AUDIT_CLOSE":
      case "DAILY_MIDNIGHT_REPORT_GENERATED":
        return {
          bg: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60",
          dot: "bg-purple-500",
          icon: <Moon className="h-3 w-3 text-purple-600 dark:text-purple-400" />,
          label: action.replace(/_/g, " "),
        };
      case "EXPENSE_VOUCHER_CREATE":
        return {
          bg: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60",
          dot: "bg-orange-500",
          icon: <DollarSign className="h-3 w-3 text-orange-600 dark:text-orange-400" />,
          label: "Petty Cash Voucher",
        };
      case "RESERVATION_CREATE":
      case "RESERVATION_STATUS_CHANGE":
        return {
          bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
          dot: "bg-indigo-500",
          icon: <Calendar className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />,
          label: action.replace(/_/g, " "),
        };
      default:
        return {
          bg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
          dot: "bg-zinc-400 dark:bg-zinc-500",
          icon: <Shield className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />,
          label: action.replace(/_/g, " "),
        };
    }
  };

  // Helper to extract clean summary string for the table row
  const getEventSummary = (log: AuditLog) => {
    try {
      const after = log.afterJson ? JSON.parse(log.afterJson) : null;
      const before = log.beforeJson ? JSON.parse(log.beforeJson) : null;

      if (log.action === "PAYMENT_RECEIVE") {
        return `Received ₹${after?.amount?.toLocaleString("en-IN") || "0"} via ${after?.method || "CASH"} (${after?.receiptNo || "Receipt"})`;
      }
      if (log.action === "REFUND_PAYOUT") {
        return `Surplus Refund Payout: ₹${after?.amount?.toLocaleString("en-IN") || "0"} (${after?.receiptNo || "Receipt"})`;
      }
      if (log.action === "PAYMENT_EDIT") {
        return `Edited: ₹${before?.amount} (${before?.method}) → ₹${after?.amount} (${after?.method})`;
      }
      if (log.action === "EXPENSE_VOUCHER_CREATE") {
        return `Voucher ${after?.voucherNo || ""}: ₹${after?.totalAmount || after?.amount} to ${after?.payeeName || "Payee"} (${after?.category || "EXPENSE"})`;
      }
      if (log.action === "DIRECT_INCOME_COLLECT") {
        return `${after?.categoryLabel || after?.category || "Income"}: ₹${after?.amount} via ${after?.paymentMethod || "CASH"}`;
      }
      if (log.action === "CHECK_IN") {
        return `Guest: ${after?.guestName || "Guest"} | Rooms: ${after?.roomNumbers || "Assigned"} | GRC: ${after?.grcNo || "—"}`;
      }
      if (log.action === "CHECK_OUT") {
        return `Checked Out: Invoice ${after?.invoiceNo || "—"} | Total ₹${after?.totalAmount || 0} | Rooms Released: ${Array.isArray(after?.roomsReleased) ? after.roomsReleased.join(", ") : "—"}`;
      }
      if (log.action === "ROOM_MOVE") {
        return `Room Moved: ${before?.roomNumber || "Previous"} → ${after?.roomNumber || "New Room"}`;
      }
      if (log.action === "RESERVATION_CREATE") {
        return `New Booking ${after?.confirmationNo || ""}: ${after?.guestName || "Guest"} (${after?.roomCount || 1} Rooms, ₹${after?.totalAmount || 0})`;
      }
      if (log.action === "RESERVATION_STATUS_CHANGE" || log.action === "RESERVATION_CANCEL") {
        return `Booking ${after?.confirmationNo || log.targetId}: Status changed to ${after?.status || "UPDATED"}`;
      }
      if (log.action === "FOLIO_CHARGE_ADD" || log.action === "FOLIO_DISCOUNT_APPLIED") {
        return `${after?.chargeCode}: ${after?.description || "Charge"} (₹${after?.totalAmount || after?.unitAmount})`;
      }
      if (log.action === "DELETE_FOLIO_CHARGE") {
        return log.reason || "Voided charge/payment from folio";
      }
    } catch {}

    return log.reason || log.afterJson || log.beforeJson || "—";
  };

  // CSV Export
  const exportToCsv = () => {
    if (!filteredLogs.length) return;
    const headers = [
      "Timestamp",
      "Actor",
      "Action",
      "Target Type",
      "Target ID",
      "Reason",
      "Details / Payload",
      "IP Address",
    ];

    const rows = filteredLogs.map((l) => [
      `"${new Date(l.occurredAt).toLocaleString("en-IN")}"`,
      `"${l.actorName || l.actorId || "System"}"`,
      `"${l.action}"`,
      `"${l.targetType}"`,
      `"${l.targetId}"`,
      `"${(l.reason || "").replace(/"/g, '""')}"`,
      `"${(l.afterJson || l.beforeJson || "").replace(/"/g, '""')}"`,
      `"${l.ipAddress || "—"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `hotel_audit_log_${activeProperty?.code || "prop"}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable View
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-[1550px] mx-auto w-full text-zinc-900 dark:text-zinc-100 pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center">
              <ScrollText className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                  Compliance & Operations Audit Trail
                </h1>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                  Live & Tamper-Evident
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Statutory audit register for financial inflows, room operations, discounts, vouchers & administrative actions
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              triggerRefresh();
              fetchAuditLogs();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportToCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition shadow-2xs cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition shadow-2xs cursor-pointer"
            title="Print audit sheet"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* KPI Overview Summary Cards (Refined High-Contrast Architecture) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        {/* 1. Total Audited Events */}
        <div
          onClick={() => setCategory("ALL")}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            category === "ALL"
              ? "bg-zinc-100/90 dark:bg-zinc-800/90 border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-900/15 dark:ring-white/20 shadow-xs"
              : "bg-white dark:bg-[#111114] border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Total Audited Events
            </span>
            <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-zinc-900 dark:text-white">{stats.total}</div>
          <div className="text-[11px] mt-1 text-zinc-500 dark:text-zinc-400 font-medium">Complete operational footprint</div>
        </div>

        {/* 2. Financial & Billing */}
        <div
          onClick={() => setCategory("FINANCIAL")}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            category === "FINANCIAL"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/25 shadow-xs"
              : "bg-emerald-50/25 dark:bg-emerald-950/10 border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Financial & Billing
            </span>
            <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-zinc-900 dark:text-white">
            {stats.financial}
          </div>
          <div className="text-[11px] mt-1 text-emerald-700/80 dark:text-emerald-300/80 font-medium">
            Payments, refunds, edits & discounts
          </div>
        </div>

        {/* 3. Front Desk & Stays */}
        <div
          onClick={() => setCategory("FRONT_DESK")}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            category === "FRONT_DESK"
              ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/25 shadow-xs"
              : "bg-blue-50/25 dark:bg-blue-950/10 border-zinc-200/80 dark:border-zinc-800/80 hover:border-blue-300 dark:hover:border-blue-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Front Desk & Stays
            </span>
            <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-zinc-900 dark:text-white">
            {stats.frontDesk}
          </div>
          <div className="text-[11px] mt-1 text-blue-700/80 dark:text-blue-300/80 font-medium">
            Check-ins, check-outs, room moves
          </div>
        </div>

        {/* 4. Admin & Governance */}
        <div
          onClick={() => setCategory("ADMIN")}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
            category === "ADMIN"
              ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 dark:border-purple-500 ring-2 ring-purple-500/25 shadow-xs"
              : "bg-purple-50/25 dark:bg-purple-950/10 border-zinc-200/80 dark:border-zinc-800/80 hover:border-purple-300 dark:hover:border-purple-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Admin & Governance
            </span>
            <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-zinc-900 dark:text-white">
            {stats.admin}
          </div>
          <div className="text-[11px] mt-1 text-purple-700/80 dark:text-purple-300/80 font-medium">
            Master edits, GRC sync, security logins
          </div>
        </div>
      </div>

      {/* Category Pills Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 print:hidden scrollbar-none">
        {[
          { id: "ALL", label: "All Events", count: stats.total },
          { id: "FINANCIAL", label: "Financial & Billing", count: stats.financial },
          { id: "CASH_FLOW", label: "Cash In/Out & Expenses", count: stats.cashFlow },
          { id: "FRONT_DESK", label: "Front Desk & Stays", count: stats.frontDesk },
          { id: "RESERVATIONS", label: "Reservations", count: stats.reservations },
          { id: "NIGHT_AUDIT", label: "Night Audit", count: stats.nightAudit },
          { id: "ADMIN", label: "Admin & Security", count: stats.admin },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setCategory(tab.id as AuditCategory);
              setActionFilter("ALL");
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
              category === tab.id
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                : "bg-white dark:bg-[#111114] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200/80 dark:border-zinc-800/80"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                category === tab.id
                  ? "bg-white/20 dark:bg-zinc-950/20 text-white dark:text-zinc-950"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col gap-3 print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search receipt #, room #, guest, actor, or reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Date Range Selector (matching Revenue Ledger) */}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL_TIME">All Time (Master Audit)</option>
                <option value="TODAY">Today ({activeProperty?.businessDate || "Live"})</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="THIS_MONTH">This Month (MTD)</option>
                <option value="CUSTOM">Custom Date Range</option>
              </select>
            </div>

            {/* Specific Action Filter */}
            <div className="relative">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[180px] truncate"
              >
                <option value="ALL">All Actions</option>
                {distinctActions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 shrink-0 self-end lg:self-center">
            Showing <span className="font-semibold text-zinc-900 dark:text-white">{filteredLogs.length}</span> events
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
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
              >
                Clear dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-4 p-4 border-b border-zinc-400">
        <h1 className="text-xl font-bold">{activeProperty?.displayName || "Hotel"} - Official Audit Log Trail</h1>
        <p className="text-xs text-zinc-600">
          GSTIN: {activeProperty?.gstin || "N/A"} | Date of Export: {new Date().toLocaleString("en-IN")} | Total Events: {filteredLogs.length}
        </p>
      </div>

      {/* Main Audit Trail Table */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#111114] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 text-[10.5px] uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Actor / Staff</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Operation</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Entity</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Operational Summary / Impact</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap text-right print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
              {filteredLogs.map((log) => {
                const badge = getActionBadge(log.action);
                const summary = getEventSummary(log);

                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-zinc-50/90 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono text-zinc-900 dark:text-zinc-100 text-[11.5px] font-medium">
                        {new Date(log.occurredAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(log.occurredAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                          {(log.actorName || log.actorId || "S")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-100 text-xs">
                            {log.actorName || log.actorId || "System"}
                          </div>
                          {log.actorId && log.actorId !== log.actorName && (
                            <div className="text-[10px] font-mono text-zinc-400">{log.actorId}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${badge.bg}`}
                      >
                        {badge.icon}
                        <span className="truncate max-w-[140px]">{badge.label}</span>
                      </span>
                    </td>

                    {/* Target */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-zinc-700 dark:text-zinc-300 text-xs">{log.targetType}</div>
                      <div className="font-mono text-[10.5px] text-zinc-400 max-w-[120px] truncate" title={log.targetId}>
                        {log.targetId}
                      </div>
                    </td>

                    {/* Details / Summary */}
                    <td className="px-4 py-3 max-w-md">
                      <div className="text-xs text-zinc-800 dark:text-zinc-200 font-medium truncate" title={summary}>
                        {summary}
                      </div>
                      {log.reason && log.reason !== summary && (
                        <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 italic">
                          "{log.reason}"
                        </div>
                      )}
                    </td>

                    {/* Action Inspector Button */}
                    <td className="px-4 py-3 whitespace-nowrap text-right print:hidden">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                      >
                        <Eye className="h-3 w-3" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-zinc-400 dark:text-zinc-500">
                    <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No audit events match your criteria</p>
                    <p className="text-xs mt-1 text-zinc-400">Try resetting search filters or date range</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail Inspector Slide-over / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#141418] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl border ${getActionBadge(selectedLog.action).bg}`}
                >
                  {getActionBadge(selectedLog.action).icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                      {getActionBadge(selectedLog.action).label}
                    </h3>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase">
                      {selectedLog.action}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Recorded {new Date(selectedLog.occurredAt).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedLog(null);
                  setRawJsonView(false);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/70">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Actor / Staff</div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {selectedLog.actorName || "System"}
                  </div>
                  {selectedLog.actorId && (
                    <div className="text-[10px] font-mono text-zinc-400">{selectedLog.actorId}</div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Target Entity</div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {selectedLog.targetType}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 truncate" title={selectedLog.targetId}>
                    {selectedLog.targetId}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Network Origin</div>
                  <div className="font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {selectedLog.ipAddress || "Internal System"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Audit ID</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-mono text-[10px] text-zinc-500 truncate" title={selectedLog.id}>
                      {selectedLog.id.slice(-8)}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedLog.id);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 2000);
                      }}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Reason / Narration Callout */}
              {selectedLog.reason && (
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/40 text-blue-900 dark:text-blue-200">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Official Audit Reason / Narration
                  </div>
                  <div className="mt-1 font-medium">{selectedLog.reason}</div>
                </div>
              )}

              {/* Before vs After Diff / State Viewer */}
              {selectedLog.beforeJson && selectedLog.afterJson ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                    <span>State Comparison (Before vs. After)</span>
                    <span className="text-[10px] font-normal text-zinc-400">Field modifications tracked</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Before State */}
                    <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Previous Snapshot
                      </div>
                      <pre className="text-[11px] font-mono text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(JSON.parse(selectedLog.beforeJson), null, 2)}
                      </pre>
                    </div>

                    {/* After State */}
                    <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Updated State
                      </div>
                      <pre className="text-[11px] font-mono text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(JSON.parse(selectedLog.afterJson), null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : selectedLog.afterJson ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Event Payload / Parameters
                  </div>
                  <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
                    <pre className="text-[11px] font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(JSON.parse(selectedLog.afterJson), null, 2)}
                    </pre>
                  </div>
                </div>
              ) : selectedLog.beforeJson ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Deleted / Voided Record Snapshot
                  </div>
                  <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10">
                    <pre className="text-[11px] font-mono text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(JSON.parse(selectedLog.beforeJson), null, 2)}
                    </pre>
                  </div>
                </div>
              ) : null}

              {/* Collapsible Raw JSON for Technical Audit */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setRawJsonView(!rawJsonView)}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1"
                >
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${rawJsonView ? "rotate-90" : ""}`} />
                  {rawJsonView ? "Hide Raw Database Record" : "View Raw Immutable Audit JSON"}
                </button>

                {rawJsonView && (
                  <div className="mt-2 p-3 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[10.5px] overflow-x-auto relative">
                    <button
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2))}
                      className="absolute right-2 top-2 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy JSON
                    </button>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-mono">
                Property: {selectedLog.propertyId}
              </span>
              <button
                onClick={() => {
                  setSelectedLog(null);
                  setRawJsonView(false);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90 transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
