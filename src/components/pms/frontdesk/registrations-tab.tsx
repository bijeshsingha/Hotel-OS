"use client";

import React, { useState } from "react";
import { Search, X, FileText, ShieldCheck } from "lucide-react";

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
  const [filter, setFilter] = useState<"ALL" | "PENDING_REVIEW" | "CHECKED_IN">("ALL");
  const [search, setSearch] = useState("");

  const filtered = registrations.filter((reg) => {
    if (filter === "PENDING_REVIEW" && reg.status !== "PENDING_REVIEW") return false;
    if (filter === "CHECKED_IN" && reg.status !== "CHECKED_IN") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (reg.fullName || "").toLowerCase();
      const phone = (reg.mobilePhone || "").toLowerCase();
      const grc = (reg.registrationNo || "").toLowerCase();
      const room = (reg.assignedRoomNumber || reg.preAssignedRoom || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || grc.includes(q) || room.includes(q);
    }
    return true;
  });

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden space-y-4">
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              Digital Guest Registrations
            </h2>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Review online kiosk submissions, verify ID & signature, and fulfill check-in
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filter === "ALL"
                ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold shadow-xs"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            All ({registrations.length})
          </button>
          <button
            onClick={() => setFilter("PENDING_REVIEW")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filter === "PENDING_REVIEW"
                ? "bg-amber-500 text-white font-bold shadow-xs"
                : "text-amber-700 dark:text-amber-400 hover:text-amber-900"
            }`}
          >
            Pending ({registrations.filter((r) => r.status === "PENDING_REVIEW").length})
          </button>
          <button
            onClick={() => setFilter("CHECKED_IN")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filter === "CHECKED_IN"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "text-emerald-700 dark:text-emerald-400 hover:text-emerald-900"
            }`}
          >
            Checked In ({registrations.filter((r) => r.status === "CHECKED_IN").length})
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name, mobile, registration #, room..."
            className="w-full h-10 pl-9.5 pr-8 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">GRC #</th>
              <th className="px-5 py-3.5">Guest Full Name</th>
              <th className="px-4 py-3.5">Contact Mobile</th>
              <th className="px-4 py-3.5">Room</th>
              <th className="px-4 py-3.5">Date</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-medium">
            {filtered.slice(0, 50).map((reg) => {
              const isPending = reg.status === "PENDING_REVIEW";
              const room = reg.assignedRoomNumber || reg.preAssignedRoom || "Unassigned";
              return (
                <tr key={reg.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                        isPending
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isPending ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                      {isPending ? "Pending Review" : "Checked In"}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-zinc-950 dark:text-zinc-50 font-bold text-sm">
                    {reg.registrationNo || `GRC-${reg.id.slice(-6).toUpperCase()}`}
                  </td>
                  <td className="px-5 py-4 text-zinc-950 dark:text-zinc-50 font-semibold text-base">
                    {reg.fullName || "Guest"}
                  </td>
                  <td className="px-4 py-4 font-mono text-zinc-500 text-sm">{reg.mobilePhone || "N/A"}</td>
                  <td className="px-4 py-4 font-mono font-bold text-zinc-950 dark:text-zinc-50 text-base">
                    {room}
                  </td>
                  <td className="px-4 py-4 font-mono text-zinc-500 text-sm">
                    {reg.createdAt
                      ? new Date(reg.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                      : "N/A"}
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button
                      onClick={() => onReview(reg)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                        isPending
                          ? "bg-amber-500 hover:bg-amber-400 text-white"
                          : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>{isPending ? "Review & Check-In" : "View"}</span>
                    </button>
                    <button
                      onClick={() => onPrintGrc(reg)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                      title="Print GRC"
                    >
                      <FileText className="h-4 w-4" />
                      <span>GRC</span>
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-zinc-400 text-sm">
                  No registrations found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
