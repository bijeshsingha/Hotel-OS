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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-lg bg-[#111114] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Moon className="h-4 w-4 text-zinc-400" />
              Night Audit & Day Close
            </h1>
            <span className="rounded px-1.5 py-0.2 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
              N01–N04
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Pre-close checklist, room charge posting & date rollover
          </p>
        </div>

        <div className="rounded-md bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 font-mono flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-zinc-400" />
          <span>Operational Date: <strong className="text-zinc-100">{activeProperty?.businessDate}</strong></span>
        </div>
      </div>

      {/* Stepper Progress */}
      <div className="grid grid-cols-3 gap-2.5">
        <div
          className={`flex items-center gap-2.5 p-2.5 rounded-md border text-xs transition ${
            step === 1
              ? "bg-zinc-800 border-zinc-700 text-zinc-100"
              : step > 1
              ? "bg-zinc-900/60 border-zinc-800 text-emerald-400"
              : "bg-zinc-900/30 border-zinc-800/60 text-zinc-600"
          }`}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 font-mono text-[11px] font-medium">
            1
          </div>
          <div>
            <div className="font-medium">Pre-Audit Checks</div>
            <div className="text-[10px] text-zinc-500">Verify open items</div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2.5 p-2.5 rounded-md border text-xs transition ${
            step === 2 || step === 3
              ? "bg-zinc-800 border-zinc-700 text-zinc-100"
              : step > 3
              ? "bg-zinc-900/60 border-zinc-800 text-emerald-400"
              : "bg-zinc-900/30 border-zinc-800/60 text-zinc-600"
          }`}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 font-mono text-[11px] font-medium">
            2
          </div>
          <div>
            <div className="font-medium">Room Charges</div>
            <div className="text-[10px] text-zinc-500">Post nightly tariffs</div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2.5 p-2.5 rounded-md border text-xs transition ${
            step === 4
              ? "bg-zinc-800 border-zinc-700 text-emerald-400"
              : "bg-zinc-900/30 border-zinc-800/60 text-zinc-600"
          }`}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 font-mono text-[11px] font-medium">
            3
          </div>
          <div>
            <div className="font-medium">Close Day</div>
            <div className="text-[10px] text-zinc-500">Advance business date</div>
          </div>
        </div>
      </div>

      {/* STEP 1: AUDIT CHECKLIST */}
      {step === 1 && (
        <div className="p-4 rounded-lg bg-[#111114] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs">
            <div>
              <h2 className="font-semibold text-zinc-200">Operational Verification</h2>
              <p className="text-zinc-500 text-[11px]">System state before closing operational day</p>
            </div>
            <button
              onClick={loadChecklist}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              <RotateCcw className="h-3 w-3" /> Re-check
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="rounded-md bg-zinc-900 p-3 border border-zinc-800 flex items-start justify-between">
              <div className="space-y-0.5">
                <div className="font-medium text-zinc-200">Pending Arrivals</div>
                <div className="text-[11px] text-zinc-500">Confirmed bookings not checked in</div>
              </div>
              <span
                className={`rounded px-1.5 py-0.2 text-[10px] ${
                  checklist?.openArrivalsCount === 0
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {checklist?.openArrivalsCount || 0} Pending
              </span>
            </div>

            <div className="rounded-md bg-zinc-900 p-3 border border-zinc-800 flex items-start justify-between">
              <div className="space-y-0.5">
                <div className="font-medium text-zinc-200">Due-out Departures</div>
                <div className="text-[11px] text-zinc-500">Stays scheduled for departure</div>
              </div>
              <span
                className={`rounded px-1.5 py-0.2 text-[10px] ${
                  checklist?.openDeparturesCount === 0
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {checklist?.openDeparturesCount || 0} Open
              </span>
            </div>

            <div className="rounded-md bg-zinc-900 p-3 border border-zinc-800 flex items-start justify-between">
              <div className="space-y-0.5">
                <div className="font-medium text-zinc-200">Open Kitchen KOTs</div>
                <div className="text-[11px] text-zinc-500">Unsettled restaurant orders</div>
              </div>
              <span
                className={`rounded px-1.5 py-0.2 text-[10px] ${
                  checklist?.openKotsCount === 0
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {checklist?.openKotsCount || 0} Open
              </span>
            </div>

            <div className="rounded-md bg-zinc-900 p-3 border border-zinc-800 flex items-start justify-between">
              <div className="space-y-0.5">
                <div className="font-medium text-zinc-200">Eligible Stays for Tariff</div>
                <div className="text-[11px] text-zinc-500">In-house stays to bill nightly rate</div>
              </div>
              <span className="rounded bg-zinc-800 text-zinc-300 px-1.5 py-0.2 text-[10px]">
                {checklist?.unpostedStaysCount || 0} Stays
              </span>
            </div>
          </div>

          {checklist?.warnings?.length > 0 && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-300 space-y-1">
              <div className="font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Warnings:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200">
                {checklist.warnings.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 px-4 py-1.5 text-xs font-medium transition"
            >
              Proceed to Room Charges <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: POST ROOM CHARGES */}
      {(step === 2 || step === 3) && (
        <div className="p-4 rounded-lg bg-[#111114] border border-zinc-800 space-y-4">
          <div className="pb-2 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-100">Post Nightly Room Charges (SAC 996311)</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Calculates GST and posts nightly room tariff to active guest folios
            </p>
          </div>

          <div className="rounded-md bg-zinc-900 p-3 border border-zinc-800 text-xs text-zinc-400 space-y-1 font-mono">
            <div>• Target Service Date: <span className="text-zinc-200">{activeProperty?.businessDate}</span></div>
            <div>• Idempotency: Unique key per stay and date to prevent duplicates.</div>
          </div>

          {postingResults.length > 0 && (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-1.5 text-xs text-emerald-300 font-mono">
              <div className="font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Charges Posted
              </div>
              <div className="space-y-0.5 text-[11px]">
                {postingResults.map((r, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>Room {r.roomNumber || "Stay"}</span>
                    <span className="tabular-nums">{r.status === "ALREADY_POSTED" ? "Already Posted" : formatINR(r.totalPosted)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Back
            </button>

            {step === 2 ? (
              <button
                onClick={handlePostCharges}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 px-4 py-1.5 text-xs font-medium transition disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" /> Post Charges Now
              </button>
            ) : (
              <button
                onClick={handleCloseDay}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 px-4 py-1.5 text-xs font-medium transition disabled:opacity-50"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Close Day & Advance Date
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 4 && closeResult && (
        <div className="p-6 rounded-lg bg-[#111114] border border-zinc-800 space-y-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mx-auto">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Operational Date {closeResult.closedDate} Closed
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Advanced to <strong className="text-emerald-400">{closeResult.nextBusinessDate}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono max-w-xl mx-auto">
            <div className="rounded-md bg-zinc-900 p-2.5 border border-zinc-800">
              <div className="text-zinc-500 text-[10px]">ROOMS SOLD</div>
              <div className="font-semibold text-zinc-200 mt-0.5 tabular-nums">{closeResult.summary.roomsSold}</div>
            </div>
            <div className="rounded-md bg-zinc-900 p-2.5 border border-zinc-800">
              <div className="text-zinc-500 text-[10px]">OCCUPANCY</div>
              <div className="font-semibold text-emerald-400 mt-0.5 tabular-nums">{closeResult.summary.occupancyPct}%</div>
            </div>
            <div className="rounded-md bg-zinc-900 p-2.5 border border-zinc-800">
              <div className="text-zinc-500 text-[10px]">ROOM REV</div>
              <div className="font-semibold text-zinc-200 mt-0.5 tabular-nums">{formatINR(closeResult.summary.roomRevenue)}</div>
            </div>
            <div className="rounded-md bg-zinc-900 p-2.5 border border-zinc-800">
              <div className="text-zinc-500 text-[10px]">TOTAL GST</div>
              <div className="font-semibold text-zinc-200 mt-0.5 tabular-nums">{formatINR(closeResult.summary.totalTaxes)}</div>
            </div>
          </div>

          <button
            onClick={() => {
              setStep(1);
              setCloseResult(null);
            }}
            className="rounded-md bg-zinc-100 hover:bg-white text-zinc-950 px-4 py-1.5 text-xs font-medium transition"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
