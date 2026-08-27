"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";

export default function NightAuditPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [checklist, setChecklist] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [postingResults, setPostingResults] = useState<any[]>([]);
  const [closeResult, setCloseResult] = useState<any | null>(null);

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

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Moon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              Night Audit & Day Close
            </h1>
            <span className="rounded px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-semibold">
              N01–N04
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Pre-close checklist, room charge posting & date rollover
          </p>
        </div>

        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-2 shadow-xs">
          <Calendar className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          <span>Operational Date: <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{activeProperty?.businessDate}</strong></span>
        </div>
      </div>

      {/* Stepper Progress */}
      <div className="grid grid-cols-3 gap-2.5">
        <div
          className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs transition shadow-xs ${
            step === 1
              ? "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold"
              : step > 1
              ? "bg-emerald-50 dark:bg-zinc-900/60 border-emerald-300 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400"
              : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-600"
          }`}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] font-bold">
            1
          </div>
          <div>
            <div className="font-bold">Pre-Audit Checks</div>
            <div className="text-[10px] text-zinc-500">Verify open items</div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs transition shadow-xs ${
            step === 2 || step === 3
              ? "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold"
              : step > 3
              ? "bg-emerald-50 dark:bg-zinc-900/60 border-emerald-300 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400"
              : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-600"
          }`}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] font-bold">
            2
          </div>
          <div>
            <div className="font-bold">Room Charges</div>
            <div className="text-[10px] text-zinc-500">Post nightly tariffs</div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs transition shadow-xs ${
            step === 4
              ? "bg-emerald-50 dark:bg-zinc-800 border-emerald-300 dark:border-zinc-700 text-emerald-700 dark:text-emerald-400 font-bold"
              : "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-600"
          }`}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] font-bold">
            3
          </div>
          <div>
            <div className="font-bold">Close Day</div>
            <div className="text-[10px] text-zinc-500">Advance business date</div>
          </div>
        </div>
      </div>

      {/* STEP 1: AUDIT CHECKLIST */}
      {step === 1 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 text-xs">
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-zinc-200 text-sm">Operational Verification</h2>
              <p className="text-zinc-500 text-xs mt-0.5">System state before closing operational day</p>
            </div>
            <button
              onClick={loadChecklist}
              className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-semibold cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Re-check
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border border-zinc-200 dark:border-zinc-800 flex items-start justify-between shadow-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-zinc-900 dark:text-zinc-200">Pending Arrivals</div>
                <div className="text-[11px] text-zinc-500">Confirmed bookings not checked in</div>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  checklist?.openArrivalsCount === 0
                    ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                }`}
              >
                {checklist?.openArrivalsCount || 0} Pending
              </span>
            </div>

            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border border-zinc-200 dark:border-zinc-800 flex items-start justify-between shadow-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-zinc-900 dark:text-zinc-200">Due-out Departures</div>
                <div className="text-[11px] text-zinc-500">Stays scheduled for departure</div>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  checklist?.openDeparturesCount === 0
                    ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                }`}
              >
                {checklist?.openDeparturesCount || 0} Open
              </span>
            </div>

            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border border-zinc-200 dark:border-zinc-800 flex items-start justify-between shadow-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-zinc-900 dark:text-zinc-200">Open Kitchen KOTs</div>
                <div className="text-[11px] text-zinc-500">Unsettled restaurant orders</div>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  checklist?.openKotsCount === 0
                    ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                }`}
              >
                {checklist?.openKotsCount || 0} Open
              </span>
            </div>

            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border border-zinc-200 dark:border-zinc-800 flex items-start justify-between shadow-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-zinc-900 dark:text-zinc-200">Eligible Stays for Tariff</div>
                <div className="text-[11px] text-zinc-500">In-house stays to bill nightly rate</div>
              </div>
              <span className="rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-bold">
                {checklist?.unpostedStaysCount || 0} Stays
              </span>
            </div>
          </div>

          {checklist?.warnings?.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Warnings:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 dark:text-amber-200">
                {checklist.warnings.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Proceed to Room Charges <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: POST ROOM CHARGES */}
      {(step === 2 || step === 3) && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
          <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Post Nightly Room Charges (SAC 996311)</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Calculates GST and posts nightly room tariff to active guest folios
            </p>
          </div>

          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-1 font-mono shadow-xs">
            <div>• Target Service Date: <span className="text-zinc-900 dark:text-zinc-200 font-bold">{activeProperty?.businessDate}</span></div>
            <div>• Idempotency: Unique key per stay and date to prevent duplicates.</div>
          </div>

          {postingResults.length > 0 && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3.5 space-y-2 text-xs text-emerald-900 dark:text-emerald-300 font-mono">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Charges Posted
              </div>
              <div className="space-y-1 text-xs">
                {postingResults.map((r, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>Room {r.roomNumber || "Stay"}</span>
                    <span className="tabular-nums font-bold">{r.status === "ALREADY_POSTED" ? "Already Posted" : formatINR(r.totalPosted)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
            >
              Back
            </button>

            {step === 2 ? (
              <button
                onClick={handlePostCharges}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-5 py-2 text-xs font-bold transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <Play className="h-4 w-4" /> Post Charges Now
              </button>
            ) : (
              <button
                onClick={handleCloseDay}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 text-xs font-bold transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" /> Close Day & Advance Date
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 4 && closeResult && (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 space-y-5 text-center shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Operational Date {closeResult.closedDate} Closed
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              Advanced to <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{closeResult.nextBusinessDate}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono max-w-xl mx-auto">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-zinc-500 text-[10px] uppercase font-bold">ROOMS SOLD</div>
              <div className="font-bold text-zinc-900 dark:text-zinc-200 mt-1 text-sm tabular-nums">{closeResult.summary.roomsSold}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-zinc-500 text-[10px] uppercase font-bold">OCCUPANCY</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-1 text-sm tabular-nums">{closeResult.summary.occupancyPct}%</div>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-zinc-500 text-[10px] uppercase font-bold">ROOM REV</div>
              <div className="font-bold text-zinc-900 dark:text-zinc-200 mt-1 text-sm tabular-nums">{formatINR(closeResult.summary.roomRevenue)}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-zinc-500 text-[10px] uppercase font-bold">TOTAL GST</div>
              <div className="font-bold text-zinc-900 dark:text-zinc-200 mt-1 text-sm tabular-nums">{formatINR(closeResult.summary.totalTaxes)}</div>
            </div>
          </div>

          <button
            onClick={() => {
              setStep(1);
              setCloseResult(null);
            }}
            className="rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-6 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
