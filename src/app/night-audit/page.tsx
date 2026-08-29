"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR } from "@/lib/gst/calculator";
import {
  Moon,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Clock,
  BarChart3,
  FileText,
} from "lucide-react";

export default function NightAuditPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [checklist, setChecklist] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [postingResults, setPostingResults] = useState<any[]>([]);
  const [closeResult, setCloseResult] = useState<any | null>(null);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState("");

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

  const loadChecklist = async () => {
    if (!activeProperty) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/night-audit/checks?propertyId=${activeProperty.id}`);
      const data = await res.json();
      setChecklist(data);
    } catch (err) {
      console.error("Night audit check error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklist();
  }, [activeProperty, refreshKey]);

  const handlePostCharges = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/night-audit/post-room-charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: activeProperty?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Charge posting failed");

      setPostingResults(data.results || []);
      setStep(3);
      await loadChecklist();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseDay = async () => {
    if (!confirm(`Close operational date ${activeProperty?.businessDate} and advance to next date?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/night-audit/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: activeProperty?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Night audit close failed");

      setCloseResult(data);
      setStep(4);
      await refreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInstantDayClose = async () => {
    if (
      !confirm(
        `⚡ Manual Day Close & Shift Rollover:\n\nClose operational date (${activeProperty?.businessDate}) immediately and advance to the next day?\n\nThis will post pending room charges and update reports.`
      )
    )
      return;

    setActionLoading(true);
    try {
      // 1. Post any unposted room charges first
      await fetch("/api/v1/night-audit/post-room-charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: activeProperty?.id }),
      });

      // 2. Close operational day
      const res = await fetch("/api/v1/night-audit/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: activeProperty?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Day close failed");

      setCloseResult(data);
      setStep(4);
      await refreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1500px] mx-auto w-full text-zinc-900 dark:text-zinc-100">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Moon className="h-4.5 w-4.5 text-indigo-500 dark:text-indigo-400" />
              Night Audit & Day Close
            </h1>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 uppercase">
              12 AM – 12 AM Day Cycle
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pre-close verification, room tariff posting & immediate business date rollover
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2 shadow-xs">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <span>Operational Date: <strong className="text-zinc-900 dark:text-white font-mono font-bold">{activeProperty?.businessDate}</strong></span>
          </div>

          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-xs">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Next Midnight: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{timeUntilMidnight}</strong></span>
          </div>

          {/* Instant Anytime Day Close Button */}
          <button
            onClick={handleInstantDayClose}
            disabled={actionLoading}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
            title="Front Desk can hit Day Close at any time to advance date"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{actionLoading ? "Closing Day..." : "⚡ Hit Day Close Now"}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs under Night Audit */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
          <ShieldCheck className="h-4 w-4" />
          <span>Night Audit & Day Close</span>
        </div>
        <Link
          href="/night-audit/manager-audit"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition"
        >
          <Moon className="h-4 w-4 text-indigo-500" />
          <span>Daily Manager Audit (12 AM – 12 AM)</span>
        </Link>
      </div>

      {/* Stepper Progress */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-xs transition shadow-xs ${
            step === 1
              ? "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold"
              : step > 1
              ? "bg-emerald-50 dark:bg-zinc-900/60 border-emerald-300 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400"
              : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200/80 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-600"
          }`}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] font-bold">
            1
          </div>
          <div>
            <div className="font-bold text-zinc-900 dark:text-white">Pre-Audit Checks</div>
            <div className="text-[11px] text-zinc-500">Verify open items</div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-xs transition shadow-xs ${
            step === 2 || step === 3
              ? "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold"
              : step > 3
              ? "bg-emerald-50 dark:bg-zinc-900/60 border-emerald-300 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400"
              : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200/80 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-600"
          }`}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] font-bold">
            2
          </div>
          <div>
            <div className="font-bold text-zinc-900 dark:text-white">Room Charges</div>
            <div className="text-[11px] text-zinc-500">Post nightly tariffs</div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-xs transition shadow-xs ${
            step === 4
              ? "bg-emerald-50 dark:bg-zinc-800 border-emerald-300 dark:border-zinc-700 text-emerald-700 dark:text-emerald-400 font-bold"
              : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200/80 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-600"
          }`}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] font-bold">
            3
          </div>
          <div>
            <div className="font-bold text-zinc-900 dark:text-white">Close Day</div>
            <div className="text-[11px] text-zinc-500">Advance business date</div>
          </div>
        </div>
      </div>

      {/* STEP 1: AUDIT CHECKLIST */}
      {step === 1 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 text-xs">
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-sm">Operational Verification (12 AM – 12 AM Cycle)</h2>
              <p className="text-zinc-500 text-xs mt-0.5">System state before closing operational day {activeProperty?.businessDate}</p>
            </div>
            <button
              onClick={loadChecklist}
              className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-semibold cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Re-check
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/70 p-3.5 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between shadow-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-900 dark:text-white">Pending Arrivals</div>
                <div className="text-xs text-zinc-500">Confirmed bookings not checked in</div>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  checklist?.openArrivalsCount === 0
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                }`}
              >
                {checklist?.openArrivalsCount || 0} Pending
              </span>
            </div>

            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/70 p-3.5 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between shadow-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-900 dark:text-white">Pending Departures</div>
                <div className="text-xs text-zinc-500">Guests due-out today</div>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  checklist?.openDeparturesCount === 0
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                }`}
              >
                {checklist?.openDeparturesCount || 0} Pending
              </span>
            </div>

            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/70 p-3.5 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between shadow-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-900 dark:text-white">Open POS Orders / KOTs</div>
                <div className="text-xs text-zinc-500">Unsettled restaurant tickets</div>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  checklist?.openKotsCount === 0
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                }`}
              >
                {checklist?.openKotsCount || 0} Open
              </span>
            </div>

            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/70 p-3.5 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between shadow-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-900 dark:text-white">Unposted Room Tariffs</div>
                <div className="text-xs text-zinc-500">In-house stays needing daily post</div>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  checklist?.unpostedStaysCount === 0
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
                }`}
              >
                {checklist?.unpostedStaysCount || 0} Stays
              </span>
            </div>
          </div>

          {checklist?.warnings?.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Attention Required:
              </div>
              <ul className="text-xs text-amber-800 dark:text-amber-300 list-disc list-inside space-y-0.5">
                {checklist.warnings.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-5 py-2 text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              Proceed to Room Charges <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 & 3: CHARGES & CLOSE */}
      {(step === 2 || step === 3) && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-xs">
          <div>
            <h2 className="font-bold text-zinc-900 dark:text-white text-sm">
              {step === 2 ? "Nightly Room Charges" : "Close Operational Day"}
            </h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              {step === 2
                ? `Post room charges with GST Rule 46 calculation for ${activeProperty?.businessDate}`
                : `Finalize all accounts, snapshot 12 AM reports and roll forward business date`}
            </p>
          </div>

          {step === 3 && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Room charges posted successfully!
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {postingResults.length} rooms billed. Ready to close operational day {activeProperty?.businessDate}.
              </p>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(1)}
              className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
            >
              Back
            </button>

            {step === 2 ? (
              <button
                onClick={handlePostCharges}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-5 py-2 text-xs font-semibold transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <Play className="h-4 w-4" /> Post Charges Now
              </button>
            ) : (
              <button
                onClick={handleCloseDay}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 text-xs font-semibold transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" /> Close Day & Advance Date
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 4 && closeResult && (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 space-y-5 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Operational Date {closeResult.closedDate} Closed
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Advanced to <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{closeResult.nextBusinessDate}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs max-w-xl mx-auto">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="text-zinc-500 text-[11px] uppercase font-semibold">Rooms Sold</div>
              <div className="font-bold text-zinc-900 dark:text-white mt-1 text-base tabular-nums">{closeResult.summary.roomsSold}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="text-zinc-500 text-[11px] uppercase font-semibold">Occupancy</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-1 text-base tabular-nums">{closeResult.summary.occupancyPct}%</div>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="text-zinc-500 text-[11px] uppercase font-semibold">Room Rev</div>
              <div className="font-bold text-zinc-900 dark:text-white mt-1 text-base tabular-nums">{formatINR(closeResult.summary.roomRevenue)}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="text-zinc-500 text-[11px] uppercase font-semibold">Total GST</div>
              <div className="font-bold text-zinc-900 dark:text-white mt-1 text-base tabular-nums">{formatINR(closeResult.summary.totalTaxes)}</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/night-audit/manager-audit"
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-xs font-semibold transition shadow-xs"
            >
              <BarChart3 className="h-4 w-4" /> View 12 AM Daily Manager Report
            </Link>

            <button
              onClick={() => {
                setStep(1);
                setCloseResult(null);
              }}
              className="rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-5 py-2.5 text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
