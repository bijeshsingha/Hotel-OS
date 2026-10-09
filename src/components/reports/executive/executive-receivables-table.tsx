"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, Search, ExternalLink, ShieldAlert, Phone, BedDouble } from "lucide-react";
import { OutstandingRoomAccount } from "@/lib/domain/executive-report-service";
import { formatINR } from "@/lib/gst/calculator";

interface ExecutiveReceivablesTableProps {
  accounts: OutstandingRoomAccount[];
  totalOverThresholdAmount: number;
  totalOverThresholdCount: number;
  threshold: number;
  totalOutstandingAllRooms: number;
}

export const ExecutiveReceivablesTable: React.FC<ExecutiveReceivablesTableProps> = ({
  accounts,
  totalOverThresholdAmount,
  totalOverThresholdCount,
  threshold,
  totalOutstandingAllRooms,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_HOUSE" | "CHECKED_OUT">("ALL");

  const filtered = accounts.filter((acc) => {
    const matchesStatus = statusFilter === "ALL" || acc.status === statusFilter;
    const matchesSearch =
      !searchTerm.trim() ||
      acc.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.bookingRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.phone.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const filteredTotal = filtered.reduce((sum, a) => sum + a.balanceDue, 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
      {/* Header section with alert summary */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Accounts with Outstanding Balance &gt; {formatINR(threshold)}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                  {totalOverThresholdCount} Accounts
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Audit watch-list of guest folios exceeding ₹5,000 threshold as of report date
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Flagged Balance</span>
              <strong className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                {formatINR(totalOverThresholdAmount)}
              </strong>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <span className="text-slate-500 block text-[11px]">Total Outstanding (All Rooms)</span>
              <strong className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
                {formatINR(totalOutstandingAllRooms)}
              </strong>
            </div>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              All ({accounts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("IN_HOUSE")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                statusFilter === "IN_HOUSE"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              In-House ({accounts.filter((a) => a.status === "IN_HOUSE").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("CHECKED_OUT")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                statusFilter === "CHECKED_OUT"
                  ? "bg-rose-700 text-white"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              Checked-Out Overdue ({accounts.filter((a) => a.status === "CHECKED_OUT").length})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search room or guest..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {accounts.length === 0
              ? "Healthy portfolio: No room accounts exceed the ₹5,000 outstanding threshold as of this report."
              : "No records found matching current search or status filter."}
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                  Room
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                  Guest Name
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                  Status
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                  Stay Dates
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 text-right">
                  Room Charges
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 text-right">
                  F&B Charges
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 text-right">
                  Other
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 text-right">
                  Paid / Adv.
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 text-center">
                  Aging
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 text-right">
                  Balance Due
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 text-center">
                  Folio
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((acc) => (
                <tr
                  key={acc.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                    <span className="inline-flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                      {acc.roomNumber}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {acc.guestName}
                    </div>
                    {acc.phone && acc.phone !== "-" && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {acc.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {acc.status === "IN_HOUSE" ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        In-House
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        Checked Out
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                    {acc.stayDates}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 font-medium">
                    {formatINR(acc.roomCharges)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                    {formatINR(acc.foodCharges)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                    {formatINR(acc.otherCharges)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                    -{formatINR(acc.paymentsApplied)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        acc.ageDays > 7
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {acc.ageDays}d
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400 text-sm">
                    {formatINR(acc.balanceDue)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Link
                      href={`/billing?stayId=${acc.stayId}`}
                      className="inline-flex items-center justify-center p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      title="Open Folio Details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 font-bold">
              <tr>
                <td colSpan={9} className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                  Total Filtered High Receivables ({filtered.length} folios)
                </td>
                <td className="px-3 py-2.5 text-right text-rose-600 dark:text-rose-400 text-sm">
                  {formatINR(filteredTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};
