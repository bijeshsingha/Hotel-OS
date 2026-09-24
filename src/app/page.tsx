"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/gst/calculator";
import {
  TrendingUp,
  BedDouble,
  DollarSign,
  Receipt,
  Building2,
  Mail,
  Coins,
  RefreshCw,
  PlusCircle,
  FileText,
  Moon,
  Wallet,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui";
import { useDashboardMetrics } from "@/lib/hooks/use-dashboard-metrics";
import { OperationalStatusStrip } from "@/components/dashboard/operational-status-strip";
import { PortfolioOverview } from "@/components/dashboard/portfolio-overview";
import { RevenueAnalyticsChart } from "@/components/dashboard/revenue-analytics-chart";
import { DrawerCashWidget } from "@/components/dashboard/drawer-cash-widget";
import { FrontDeskPulseCard } from "@/components/dashboard/frontdesk-pulse-card";
import { EmailReportModal } from "@/components/reports/email-report-modal";

export default function DashboardPage() {
  const { activeProperty, isInitialized, data, loading } = useDashboardMetrics();
  const [showEmailModal, setShowEmailModal] = useState(false);

  if (isInitialized === false) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <Building2 className="h-10 w-10 text-blue-500 mb-3" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">Setup Required</h2>
        <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
          No hotel property is configured yet. Redirecting to onboarding...
        </p>
        <a
          href="/onboarding"
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition"
        >
          Launch Onboarding
        </a>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <span>Loading executive metrics & operational pulse...</span>
        </div>
      </div>
    );
  }

  const {
    kpis,
    trendHistory,
    propertiesComparison,
    cashDrawerPosition,
    collectionsByMethod,
    hourlyCollections,
    arrivalsList,
    todayDepartures,
    urgentFolios,
  } = data;

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto w-full pb-16">
      
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <PageHeader
        title={activeProperty?.displayName || "Hotel Executive Command Center"}
        description={`GSTIN: ${data.property?.gstin || "N/A"} • Code: ${activeProperty?.code || "DEFAULT"}`}
        badge="Live Operations"
        badgeVariant="live"
        businessDate={activeProperty?.businessDate}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowEmailModal(true)}
              className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer active:scale-98"
            >
              <Mail className="h-4 w-4" />
              <span>Email Briefing</span>
            </button>

            <Link
              href="/night-audit/manager-audit"
              className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <Moon className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Midnight Audit</span>
            </Link>
          </div>
        }
        metadata={
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-2 text-right shrink-0">
            <span className="text-zinc-400 text-[10px] block font-bold uppercase tracking-wider">Audit Cutoff</span>
            <span className="font-bold font-mono text-sm text-amber-600 dark:text-amber-400">03:00 AM</span>
          </div>
        }
      />

      {/* 2. QUICK ACTION LAUNCHPAD */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-2 overflow-x-auto">
        <Link
          href="/pms"
          className="h-9 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-900 dark:text-zinc-100 text-xs font-bold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 shrink-0 transition"
        >
          <PlusCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>New Check-in / GRC</span>
        </Link>

        <Link
          href="/billing"
          className="h-9 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-zinc-900 dark:text-zinc-100 text-xs font-semibold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 shrink-0 transition"
        >
          <Receipt className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Guest Folios & Billing</span>
        </Link>

        <Link
          href="/cashier-shift"
          className="h-9 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-zinc-900 dark:text-zinc-100 text-xs font-semibold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 shrink-0 transition"
        >
          <Wallet className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>Cashier Till & Shift Handover</span>
        </Link>

        <Link
          href="/reports"
          className="h-9 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-zinc-900 dark:text-zinc-100 text-xs font-semibold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 shrink-0 transition"
        >
          <FileText className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span>Master Reports & Ledgers</span>
        </Link>

        <Link
          href="/housekeeping"
          className="h-9 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-zinc-900 dark:text-zinc-100 text-xs font-semibold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 shrink-0 transition"
        >
          <BedDouble className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          <span>Housekeeping Board</span>
        </Link>
      </div>

      {/* 3. 5 CORE FINANCIAL & OPERATIONAL STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Occupancy */}
        <StatCard
          label="Occupancy Rate"
          value={`${kpis.occupancyPct}%`}
          subtext={`${kpis.inHouseStays} / ${kpis.totalRooms} rooms occupied`}
          icon={BedDouble}
          variant="blue"
        />

        {/* RevPAR & ADR */}
        <StatCard
          label="RevPAR / ADR"
          value={formatINR(kpis.revpar)}
          subtext={`ADR: ${formatINR(kpis.adr)} per sold room`}
          icon={TrendingUp}
          variant="green"
        />

        {/* Gross Revenue Today */}
        <StatCard
          label="Today's Revenue"
          value={formatINR(kpis.grossRevenue)}
          subtext={`Room: ${formatINR(kpis.roomRevenue)} • F&B: ${formatINR(kpis.fbRevenue)}`}
          icon={DollarSign}
          variant="amber"
        />

        {/* Physical Cash Drawer Till */}
        <StatCard
          label="Cash Till In-Hand"
          value={formatINR(cashDrawerPosition?.netCashInHand || 0)}
          subtext={`Float: ${formatINR(cashDrawerPosition?.openingBalance || 0)}`}
          icon={Coins}
          variant="green"
        />

        {/* Folio Receivables */}
        <StatCard
          label="Unsettled Folios"
          value={formatINR(kpis.outstandingFolioBalance)}
          subtext={`GST Collected: ${formatINR(kpis.totalTaxes)}`}
          icon={Receipt}
          variant="red"
        />
      </div>

      {/* 4. MAIN ANALYTICS ROW (RECHARTS + CASH TILL + STATUS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left: Recharts Multi-View Analytics (8 Cols) */}
        <div className="lg:col-span-8 min-w-0">
          <RevenueAnalyticsChart
            trendHistory={trendHistory}
            collectionsByMethod={collectionsByMethod}
            hourlyCollections={hourlyCollections}
          />
        </div>

        {/* Right: Drawer Cash Widget & Room Sellability (4 Cols) */}
        <div className="lg:col-span-4 space-y-5 min-w-0">
          <DrawerCashWidget cashDrawerPosition={cashDrawerPosition} />
          
          <OperationalStatusStrip
            inspectedRooms={kpis.inspectedRooms}
            dirtyRooms={kpis.dirtyRooms}
            outOfOrderRooms={kpis.outOfOrderRooms}
            openKots={kpis.openKots}
          />
        </div>
      </div>

      {/* 5. OPERATIONS ROW: FRONT DESK PULSE & PORTFOLIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left: Front Desk Pulse (Arrivals, Departures, High Folio Dues) (8 Cols) */}
        <div className="lg:col-span-8 min-w-0">
          <FrontDeskPulseCard
            arrivalsToday={kpis.arrivalsToday}
            departuresToday={kpis.departuresToday}
            inHouseStays={kpis.inHouseStays}
            totalRooms={kpis.totalRooms}
            openKots={kpis.openKots}
            arrivalsList={arrivalsList}
            todayDepartures={todayDepartures}
            urgentFolios={urgentFolios}
          />
        </div>

        {/* Right: Multi-Property Portfolio Overview (4 Cols) */}
        <div className="lg:col-span-4 min-w-0">
          <PortfolioOverview
            propertiesComparison={propertiesComparison}
            activePropertyId={activeProperty?.id}
          />
        </div>
      </div>

      {/* EMAIL REPORT MODAL TRIGGER */}
      <EmailReportModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        defaultReportType="EXECUTIVE_FLASH"
        targetDate={activeProperty?.businessDate}
      />

    </div>
  );
}
