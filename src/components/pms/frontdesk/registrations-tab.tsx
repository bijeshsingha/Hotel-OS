"use client";

import React, { useState } from "react";
import { Search, X, FileText, ShieldCheck, Printer, Laptop, CheckCircle, Clock, PenLine } from "lucide-react";
import { isEffectiveSignature } from "@/lib/domain/grc-utils";

interface RegistrationsTabProps {
  registrations: any[];
  onReview: (reg: any) => void;
  onPrintGrc: (reg: any) => void;
}

export function RegistrationsTab({
  registrations,
  onReview,
  onPrintGrc,
}: RegistrationsTabProps) {
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "DESK" | "DIGITAL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_HOUSE" | "CHECKED_OUT" | "PENDING_REVIEW">("ALL");
  const [search, setSearch] = useState("");

  const isDigitalReg = (reg: any) => {
    const channel = (reg.referralChannel || "").toLowerCase();
    const notes = (reg.internalNotes || "").toLowerCase();
    const hasSignature = Boolean(reg.signatureDataUrl && isEffectiveSignature(reg.signatureDataUrl));
    return (
      hasSignature ||
      channel.includes("kiosk") ||
      channel.includes("self") ||
      channel.includes("online") ||
      notes.includes("digital")
    );
  };

  const formatCheckInDate = (val?: string | null, fallback?: any) => {
    const raw = val || fallback;
    if (!raw) return "N/A";

    if (typeof raw === "string" && /^\d{2}-\d{2}-\d{4}/.test(raw)) {
      const parts = raw.split(" ");
      const [d, m, y] = parts[0].split("-");
      const time = parts[1] || "";
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mIdx = parseInt(m, 10) - 1;
      const monthName = months[mIdx] || m;
      return `${d} ${monthName} ${y}${time ? ` at ${time}` : ""}`;
    }

    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(d);
      }
    } catch {}

    return String(raw);
  };

  const deskCount = registrations.filter((r) => !isDigitalReg(r)).length;
  const digitalCount = registrations.filter((r) => isDigitalReg(r)).length;

  const inHouseCount = registrations.filter((r) => r.status === "CHECKED_IN" || r.status === "IN_HOUSE").length;
  const checkedOutCount = registrations.filter((r) => r.status === "CHECKED_OUT").length;
  const pendingCount = registrations.filter((r) => r.status === "PENDING_REVIEW").length;

  const filtered = registrations.filter((reg) => {
    // 1. Source Filter
    const isDigital = isDigitalReg(reg);
    if (sourceFilter === "DESK" && isDigital) return false;
    if (sourceFilter === "DIGITAL" && !isDigital) return false;

    // 2. Status Filter
    if (statusFilter === "IN_HOUSE" && reg.status !== "CHECKED_IN" && reg.status !== "IN_HOUSE") return false;
    if (statusFilter === "CHECKED_OUT" && reg.status !== "CHECKED_OUT") return false;
    if (statusFilter === "PENDING_REVIEW" && reg.status !== "PENDING_REVIEW") return false;

    // 3. Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (reg.fullName || "").toLowerCase();
      const phone = (reg.mobilePhone || reg.alternatePhone || "").toLowerCase();
      const grc = (reg.registrationNo || "").toLowerCase();
      const room = (reg.assignedRoomNumber || reg.preAssignedRoom || "").toLowerCase();
      const city = (reg.city || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || grc.includes(q) || room.includes(q) || city.includes(q);
    }
    return true;
  });

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden space-y-4">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              Guest Registration Cards (GRC Register)
            </h2>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Front desk manual registration entries, legal GRC documentation, and guest profiles
          </p>
        </div>

        {/* Source Switcher: Desk Entries vs Digital Self Check-In */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSourceFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                sourceFilter === "ALL"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              All Records ({registrations.length})
            </button>
            <button
              onClick={() => setSourceFilter("DESK")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                sourceFilter === "DESK"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <span>Desk Entries</span>
              <span className="font-mono text-[11px] opacity-75">({deskCount})</span>
            </button>
            <button
              onClick={() => setSourceFilter("DIGITAL")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                sourceFilter === "DIGITAL"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <span>Digital Self Check-In</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold">
                {digitalCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Filters and Search */}
      <div className="px-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            All Statuses
          </button>
          <button
            onClick={() => setStatusFilter("IN_HOUSE")}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
              statusFilter === "IN_HOUSE"
                ? "bg-emerald-600 text-white font-bold"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Checked In ({inHouseCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter("CHECKED_OUT")}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
              statusFilter === "CHECKED_OUT"
                ? "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900 font-bold"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400"
            }`}
          >
            <span>Checked Out ({checkedOutCount})</span>
          </button>
          {pendingCount > 0 && (
            <button
              onClick={() => setStatusFilter("PENDING_REVIEW")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                statusFilter === "PENDING_REVIEW"
                  ? "bg-amber-500 text-white font-bold"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Pending Review ({pendingCount})</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest, mobile, GRC #, room..."
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notice for Digital Self Check-In if empty and selected */}
      {sourceFilter === "DIGITAL" && digitalCount === 0 && (
        <div className="mx-4 sm:mx-5 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs sm:text-sm text-blue-900 dark:text-blue-200 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Laptop className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Digital Self Check-In is currently in setup</span>
          </div>
          <p className="text-blue-800 dark:text-blue-300 text-xs">
            All current check-in records are manual front-desk entries. When the guest self-service kiosk or online check-in portal is activated, incoming self-registered guest submissions will appear in this tab for instant verification.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">GRC #</th>
              <th className="px-5 py-3.5">Guest Full Name</th>
              <th className="px-4 py-3.5">Contact Mobile</th>
              <th className="px-4 py-3.5">Room</th>
              <th className="px-4 py-3.5">Channel / Mode</th>
              <th className="px-4 py-3.5">Check-In Date</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-medium">
            {filtered.map((reg) => {
              const isPending = reg.status === "PENDING_REVIEW";
              const isCheckedIn = reg.status === "CHECKED_IN" || reg.status === "IN_HOUSE";
              const room = reg.assignedRoomNumber || reg.preAssignedRoom || "Unassigned";
              const isDigital = isDigitalReg(reg);

              return (
                <tr key={reg.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isPending
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
                          : isCheckedIn
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isPending ? "bg-amber-500" : isCheckedIn ? "bg-emerald-500" : "bg-zinc-400"
                        }`}
                      />
                      {isPending ? "Pending Review" : isCheckedIn ? "Checked In" : "Checked Out"}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-zinc-950 dark:text-zinc-50 font-bold text-sm">
                    {reg.registrationNo || `GRC-${reg.id.slice(-6).toUpperCase()}`}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-zinc-950 dark:text-zinc-50 font-semibold text-base leading-tight">
                      {reg.fullName || "Guest"}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isEffectiveSignature(reg.signatureDataUrl) ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="h-3 w-3" />
                          <span>Signed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                          <Clock className="h-3 w-3" />
                          <span>Unsigned</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-zinc-500 text-sm">{reg.mobilePhone || "N/A"}</td>
                  <td className="px-4 py-4 font-mono font-bold text-zinc-950 dark:text-zinc-50 text-base">
                    {room}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        isDigital
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400"
                      }`}
                    >
                      {isDigital ? "Digital Self Check-In" : "Front Desk Intake"}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-zinc-500 text-sm">
                    {formatCheckInDate(reg.arrivalDateTime, reg.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    {/* Real GRC Printable Modal Trigger */}
                    <button
                      onClick={() => onPrintGrc(reg)}
                      className="h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer select-none"
                      title="View Official Guest Registration Card"
                    >
                      <Printer className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                      <span>View GRC</span>
                    </button>

                    {/* Details or Review Modal */}
                    <button
                      onClick={() => onReview(reg)}
                      className={`h-8 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs select-none ${
                        isPending
                          ? "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900"
                          : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                      title={isPending ? "Review and Complete Check-In" : "View Record Details"}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>{isPending ? "Review" : "Details"}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center text-zinc-400 text-sm">
                  No guest registrations found matching this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
