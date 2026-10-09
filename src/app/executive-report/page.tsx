"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import { PageHeader } from "@/components/ui";
import { formatINR } from "@/lib/gst/calculator";
import {
  TrendingUp,
  BarChart3,
  Receipt,
  Wallet,
  Building2,
  Calendar,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Mail,
  Printer,
  ShieldAlert,
  ArrowRightLeft,
  ChevronRight,
  Info,
  DollarSign,
  Users,
  BedDouble,
  CheckCircle2,
} from "lucide-react";
import {
  ExecutiveReportResult,
  OutstandingRoomAccount,
  FutureBookingAdvance,
} from "@/lib/domain/executive-report-service";
import {
  ExecutiveDateBar,
  DatePreset,
} from "@/components/reports/executive/executive-date-bar";
import { ExecutiveKpiCard } from "@/components/reports/executive/executive-kpi-card";
import {
  ExecutiveDrillDownModal,
  DrillDownConfig,
} from "@/components/reports/executive/executive-drill-down-modal";
import { ExecutiveRevenueCollections } from "@/components/reports/executive/executive-revenue-collections";
import { ExecutiveReceivablesTable } from "@/components/reports/executive/executive-receivables-table";
import { ExecutiveAdvancesTable } from "@/components/reports/executive/executive-advances-table";
import { ExecutiveExpenseSection } from "@/components/reports/executive/executive-expense-section";
import { ExecutiveCashReconciliation } from "@/components/reports/executive/executive-cash-reconciliation";
import { ExecutiveChartsSection } from "@/components/reports/executive/executive-charts-section";
import { ExecutiveEmailModal } from "@/components/reports/executive/executive-email-modal";

export default function ExecutiveReportPage() {
  const { activeProperty, availableProperties, switchProperty, refreshKey } = useHotel();

  // Date controls state
  const [preset, setPreset] = useState<DatePreset>("TODAY");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Report data & loading states
  const [report, setReport] = useState<ExecutiveReportResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "REVENUE" | "RECEIVABLES" | "ADVANCES" | "EXPENSES" | "CASH"
  >("OVERVIEW");

  // Drill-down modal state
  const [drillDownConfig, setDrillDownConfig] = useState<DrillDownConfig | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState<boolean>(false);

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);

  // Helper to format Date to YYYY-MM-DD
  const formatDateString = (d: Date): string => {
    return d.toISOString().split("T")[0];
  };

  // Initialize date range based on active property's business date
  useEffect(() => {
    const todayStr =
      activeProperty?.businessDate || new Date().toISOString().split("T")[0];

    if (!startDate && !endDate) {
      setStartDate(todayStr);
      setEndDate(todayStr);
    }
  }, [activeProperty?.businessDate]);

  // Handle Preset Changes
  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
    const baseDateStr =
      activeProperty?.businessDate || new Date().toISOString().split("T")[0];
    const base = new Date(baseDateStr);

    if (newPreset === "TODAY") {
      setStartDate(baseDateStr);
      setEndDate(baseDateStr);
    } else if (newPreset === "YESTERDAY") {
      const yesterday = new Date(base);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = formatDateString(yesterday);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (newPreset === "LAST_7_DAYS") {
      const sevenDaysAgo = new Date(base);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      setStartDate(formatDateString(sevenDaysAgo));
      setEndDate(baseDateStr);
    } else if (newPreset === "LAST_30_DAYS") {
      const thirtyDaysAgo = new Date(base);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      setStartDate(formatDateString(thirtyDaysAgo));
      setEndDate(baseDateStr);
    }
  };

  // Stepper: -1 (Previous Day) or +1 (Next Day)
  const handleStepDate = (direction: -1 | 1) => {
    setPreset("CUSTOM");
    const currentStart = new Date(startDate || new Date());
    const currentEnd = new Date(endDate || new Date());

    currentStart.setDate(currentStart.getDate() + direction);
    currentEnd.setDate(currentEnd.getDate() + direction);

    setStartDate(formatDateString(currentStart));
    setEndDate(formatDateString(currentEnd));
  };

  // Custom date range change
  const handleCustomDateChange = (start: string, end: string) => {
    setPreset("CUSTOM");
    setStartDate(start);
    setEndDate(end);
  };

  // Fetch report data from API
  const fetchReport = useCallback(async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      if (activeProperty?.id) {
        params.set("propertyId", activeProperty.id);
      }

      const res = await fetch(`/api/v1/reports/executive?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load executive report data");
      }

      setReport(json.data);
    } catch (err: any) {
      console.error("Executive report fetch error:", err);
      setErrorMessage(
        err?.message || "Failed to load executive report. Please check server connectivity."
      );
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, activeProperty?.id]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [fetchReport, refreshKey]);

  // Export Excel action
  const handleExportExcel = () => {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    if (activeProperty?.id) {
      params.set("propertyId", activeProperty.id);
    }
    window.location.href = `/api/v1/reports/executive/export-excel?${params.toString()}`;
  };

  // Drill-down launcher helper
  const openDrillDown = (config: DrillDownConfig) => {
    setDrillDownConfig(config);
    setIsDrillDownOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-3 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-4">
        <PageHeader
          title="Executive Daily Report"
          description="Operational management audit, financial performance, collections, high balances, and cash drawer reconciliation"
        />
      </div>

      {/* Date Controls & Action Dock */}
      <ExecutiveDateBar
        preset={preset}
        startDate={startDate}
        endDate={endDate}
        onPresetChange={handlePresetChange}
        onCustomDateChange={handleCustomDateChange}
        onStepDate={handleStepDate}
        isLoading={isLoading}
        onRefresh={fetchReport}
        onExportExcel={handleExportExcel}
        onOpenEmailModal={() => setIsEmailModalOpen(true)}
        activeProperty={activeProperty}
        availableProperties={availableProperties}
        onSwitchProperty={switchProperty}
      />

      {/* Error state */}
      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
              Report Generation Error
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={fetchReport}
              className="mt-2 text-xs font-semibold text-rose-800 dark:text-rose-200 underline hover:no-underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !report && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg" />
            <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg" />
          </div>
        </div>
      )}

      {/* Report Content */}
      {report && (
        <div className="space-y-6">
          {/* Top Operational Status Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Operational Surplus */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Net Operational Surplus
              </span>
              <div
                className={`text-lg sm:text-xl font-bold mt-1 ${
                  report.insights.netOperationalSurplus >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatINR(report.insights.netOperationalSurplus)}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Earned Revenue minus Expenses
              </span>
            </div>

            {/* Upcoming Arrivals */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Expected Arrivals (48h)
              </span>
              <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {report.insights.upcomingArrivalsNext48h} Bookings
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Incoming check-in pipeline
              </span>
            </div>

            {/* Upcoming Departures */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Expected Departures (48h)
              </span>
              <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {report.insights.upcomingDeparturesNext48h} Stays
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Upcoming front desk checkouts
              </span>
            </div>

            {/* Cancellations */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Cancellations
              </span>
              <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {report.insights.cancellationsCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Cancelled in period
              </span>
            </div>

            {/* Overdue Checked-Out Folios */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Overdue Checked-Out
              </span>
              <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {report.insights.overdueCheckedOutCount} Folios
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Unsettled post-departure
              </span>
            </div>
          </div>

          {/* Section 2: Executive Summary KPI Cards (Clickable Drill-Downs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Occupancy Rate */}
            <ExecutiveKpiCard
              title="Occupancy Rate"
              comparison={report.summary.occupancyPct}
              isPercentage
              subtitle={`${report.summary.roomsSold.current} of ${report.summary.availableRoomNights} room-nights`}
              drillDownLabel="Click to inspect rooms sold"
              onClick={() =>
                openDrillDown({
                  title: "Rooms Occupied in Period",
                  subtitle: `Total rooms sold: ${report.summary.roomsSold.current} across ${report.filter.startDate} to ${report.filter.endDate}`,
                  columns: [
                    { key: "roomNumber", header: "Room" },
                    { key: "guestName", header: "Primary Guest" },
                    { key: "stayDates", header: "Stay Dates" },
                    { key: "status", header: "Status" },
                    {
                      key: "balanceDue",
                      header: "Balance Due",
                      align: "right",
                      render: (r) => formatINR(r.balanceDue),
                    },
                  ],
                  rows: report.highReceivables.accounts,
                  totalLabel: "Occupied Rooms Count",
                  totalValue: `${report.summary.roomsSold.current} rooms`,
                })
              }
            />

            {/* 2. Average Daily Rate (ADR) */}
            <ExecutiveKpiCard
              title="Average Daily Rate (ADR)"
              comparison={report.summary.adr}
              isCurrency
              subtitle="Room revenue ÷ rooms sold"
              drillDownLabel="Click to view ADR details"
              onClick={() =>
                openDrillDown({
                  title: "ADR Departmental Calculation",
                  subtitle: `ADR = ${formatINR(report.summary.roomRevenue.current)} Room Rev ÷ ${
                    report.summary.roomsSold.current || 1
                  } Rooms Sold = ${formatINR(report.summary.adr.current)}`,
                  columns: [
                    { key: "name", header: "Metric Component" },
                    { key: "value", header: "Figure", align: "right" },
                  ],
                  rows: [
                    {
                      name: "Earned Room Revenue (Tariff)",
                      value: formatINR(report.summary.roomRevenue.current),
                    },
                    {
                      name: "Occupied Room Nights (Rooms Sold)",
                      value: `${report.summary.roomsSold.current} nights`,
                    },
                    {
                      name: "Resulting Average Daily Rate (ADR)",
                      value: formatINR(report.summary.adr.current),
                    },
                  ],
                })
              }
            />

            {/* 3. RevPAR */}
            <ExecutiveKpiCard
              title="RevPAR"
              comparison={report.summary.revpar}
              isCurrency
              subtitle="Room revenue ÷ available rooms"
              drillDownLabel="Click to view RevPAR details"
              onClick={() =>
                openDrillDown({
                  title: "RevPAR Metric Calculation",
                  subtitle: `RevPAR = ${formatINR(report.summary.roomRevenue.current)} Room Rev ÷ ${
                    report.summary.availableRoomNights
                  } Available Rooms = ${formatINR(report.summary.revpar.current)}`,
                  columns: [
                    { key: "name", header: "Component" },
                    { key: "value", header: "Figure", align: "right" },
                  ],
                  rows: [
                    {
                      name: "Total Room Revenue",
                      value: formatINR(report.summary.roomRevenue.current),
                    },
                    {
                      name: "Total Available Room Nights",
                      value: `${report.summary.availableRoomNights} rooms`,
                    },
                    {
                      name: "Resulting RevPAR",
                      value: formatINR(report.summary.revpar.current),
                    },
                  ],
                })
              }
            />

            {/* 4. In-House Guests */}
            <ExecutiveKpiCard
              title="In-House Guests"
              comparison={report.summary.inHouseGuestsCount}
              subtitle={`${report.summary.checkInAdults} Adults, ${report.summary.checkInChildren} Children`}
              drillDownLabel="Click to view guest roster"
              onClick={() =>
                openDrillDown({
                  title: "In-House Guests & Stays",
                  subtitle: `Current active occupied rooms: ${report.summary.inHouseRoomsCount}`,
                  columns: [
                    { key: "roomNumber", header: "Room" },
                    { key: "guestName", header: "Guest Name" },
                    { key: "phone", header: "Phone" },
                    { key: "stayDates", header: "Stay Dates" },
                    { key: "status", header: "Status" },
                  ],
                  rows: report.highReceivables.accounts.filter((a) => a.status === "IN_HOUSE"),
                  totalLabel: "Active In-House Stays",
                  totalValue: `${report.summary.inHouseRoomsCount} rooms`,
                })
              }
            />

            {/* 5. Total Earned Revenue */}
            <ExecutiveKpiCard
              title="Total Earned Revenue"
              comparison={report.summary.totalRevenue}
              isCurrency
              subtitle="Room, Dining & Services (Accrual)"
              drillDownLabel="Click to inspect revenue categories"
              onClick={() => setActiveTab("REVENUE")}
            />

            {/* 6. Total Collections */}
            <ExecutiveKpiCard
              title="Total Money Collected"
              comparison={report.summary.totalCollections}
              isCurrency
              subtitle="All cashier receipts & online inflows"
              drillDownLabel="Click to inspect collections register"
              onClick={() => setActiveTab("REVENUE")}
            />

            {/* 7. Operating Expenses */}
            <ExecutiveKpiCard
              title="Operating Expenses"
              comparison={report.summary.totalExpenses}
              isCurrency
              reverseColorPolarity
              subtitle={`${formatINR(report.expenses.cashExpenses)} Cash, ${formatINR(
                report.expenses.nonCashExpenses
              )} Online`}
              drillDownLabel="Click to inspect expense vouchers"
              onClick={() => setActiveTab("EXPENSES")}
            />

            {/* 8. High Receivables Alert (> ₹5,000) */}
            <ExecutiveKpiCard
              title="Receivables > ₹5,000"
              comparison={report.summary.roomsOver5kCount}
              reverseColorPolarity
              subtitle={`${formatINR(
                report.highReceivables.totalOverThresholdAmount
              )} across ${report.highReceivables.totalOverThresholdCount} folios`}
              drillDownLabel="Click to inspect high receivables"
              onClick={() => setActiveTab("RECEIVABLES")}
            />
          </div>

          {/* Navigation Tabs for In-Depth Sections */}
          <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 sm:gap-2 overflow-x-auto pt-2 print:hidden">
            <button
              type="button"
              onClick={() => setActiveTab("OVERVIEW")}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "OVERVIEW"
                  ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Overview & Analytics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("REVENUE")}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "REVENUE"
                  ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Revenue & Collections
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("RECEIVABLES")}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "RECEIVABLES"
                  ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Receivables (&gt; ₹5,000) ({report.highReceivables.totalOverThresholdCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ADVANCES")}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "ADVANCES"
                  ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Future Advances ({report.futureAdvances.items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("EXPENSES")}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "EXPENSES"
                  ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Operating Expenses
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("CASH")}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === "CASH"
                  ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Cash Drawer Reconciliation
            </button>
          </div>

          {/* Tab Views */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-6">
              <ExecutiveChartsSection
                dailyTrend={report.charts.dailyTrend}
                revenueSplit={report.charts.revenueSplit}
                collectionsByMethod={report.charts.collectionsByMethod}
                receivablesAging={report.charts.receivablesAging}
              />
              <ExecutiveCashReconciliation data={report.cashReconciliation} />
            </div>
          )}

          {activeTab === "REVENUE" && (
            <ExecutiveRevenueCollections data={report.revenueAndCollections} />
          )}

          {activeTab === "RECEIVABLES" && (
            <ExecutiveReceivablesTable
              accounts={report.highReceivables.accounts}
              totalOverThresholdAmount={report.highReceivables.totalOverThresholdAmount}
              totalOverThresholdCount={report.highReceivables.totalOverThresholdCount}
              threshold={report.highReceivables.threshold}
              totalOutstandingAllRooms={report.highReceivables.totalOutstandingAllRooms}
            />
          )}

          {activeTab === "ADVANCES" && (
            <ExecutiveAdvancesTable
              items={report.futureAdvances.items}
              receivedInPeriod={report.futureAdvances.receivedInPeriod}
              totalUnappliedHeld={report.futureAdvances.totalUnappliedHeld}
            />
          )}

          {activeTab === "EXPENSES" && (
            <ExecutiveExpenseSection data={report.expenses} />
          )}

          {activeTab === "CASH" && (
            <ExecutiveCashReconciliation data={report.cashReconciliation} />
          )}
        </div>
      )}

      {/* Drill Down Modal */}
      <ExecutiveDrillDownModal
        isOpen={isDrillDownOpen}
        onClose={() => setIsDrillDownOpen(false)}
        config={drillDownConfig}
      />

      {/* Email Report Modal */}
      <ExecutiveEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        report={report}
      />
    </div>
  );
}
