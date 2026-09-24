"use client";

import React, { useMemo } from "react";
import { formatINR } from "@/lib/gst/calculator";
import { Receipt, Search, Filter } from "lucide-react";

interface FolioLedgerTableProps {
  folioData: any;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  typeFilter: "ALL" | "ROOM_TARIFF" | "RESTAURANT_FOOD" | "MANUAL";
  onTypeFilterChange: (t: "ALL" | "ROOM_TARIFF" | "RESTAURANT_FOOD" | "MANUAL") => void;
  onEditPayment?: (payment: any) => void;
}

export function FolioLedgerTable({
  folioData,
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onEditPayment,
}: FolioLedgerTableProps) {
  // Extract all entries across windows
  const allEntries = useMemo(() => {
    if (!folioData?.windows) return [];
    return folioData.windows.flatMap((w: any) => w.entries || w.lineItems || []);
  }, [folioData]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry: any) => {
      if (typeFilter !== "ALL") {
        if (typeFilter === "ROOM_TARIFF" && entry.chargeCode !== "ROOM_TARIFF") return false;
        if (typeFilter === "RESTAURANT_FOOD" && entry.chargeCode !== "RESTAURANT_FOOD") return false;
        if (typeFilter === "MANUAL" && (entry.chargeCode === "ROOM_TARIFF" || entry.chargeCode === "RESTAURANT_FOOD")) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const desc = (entry.description || "").toLowerCase();
        const ref = (entry.reference || "").toLowerCase();
        const code = (entry.chargeCode || "").toLowerCase();
        return desc.includes(q) || ref.includes(q) || code.includes(q);
      }
      return true;
    });
  }, [allEntries, typeFilter, searchQuery]);

  // Compute running totals
  const totalDebits = allEntries
    .filter((e: any) => e.type === "DEBIT" || !e.type)
    .reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);

  const totalCredits = allEntries
    .filter((e: any) => e.type === "CREDIT")
    .reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);

  return (
    <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-[#121215] overflow-hidden space-y-3">
      {/* Table Filter Toolbar */}
      <div className="p-3 sm:p-4 border-b border-zinc-200/70 dark:border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-zinc-500" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Folio Ledger Transactions
          </h3>
          <span className="text-xs text-zinc-400 font-mono">
            ({filteredEntries.length} lines)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => onTypeFilterChange("ALL")}
              className={`px-2 py-1 rounded-md transition cursor-pointer ${
                typeFilter === "ALL"
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              All
            </button>
            <button
              onClick={() => onTypeFilterChange("ROOM_TARIFF")}
              className={`px-2 py-1 rounded-md transition cursor-pointer ${
                typeFilter === "ROOM_TARIFF"
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Tariff
            </button>
            <button
              onClick={() => onTypeFilterChange("RESTAURANT_FOOD")}
              className={`px-2 py-1 rounded-md transition cursor-pointer ${
                typeFilter === "RESTAURANT_FOOD"
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              F&B
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search ledger..."
              className="w-40 sm:w-48 h-7.5 pl-8 pr-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200/70 dark:border-zinc-800/70 text-zinc-500 dark:text-zinc-400 font-medium">
            <tr>
              <th className="px-3.5 py-2.5">Date / Time</th>
              <th className="px-3.5 py-2.5">Description</th>
              <th className="px-3 py-2.5">SAC / HSN</th>
              <th className="px-3.5 py-2.5 text-right">Debit (Charges)</th>
              <th className="px-3.5 py-2.5 text-right">Credit (Paid)</th>
              <th className="px-3.5 py-2.5 text-right">GST %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
            {filteredEntries.map((entry: any, index: number) => {
              const isCredit = entry.type === "CREDIT";
              const dateStr = entry.date || entry.createdAt;
              const formattedDate = dateStr
                ? new Date(dateStr).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "N/A";

              return (
                <tr
                  key={entry.id || index}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition"
                >
                  <td className="px-3.5 py-2 font-mono text-zinc-500 text-[11px]">
                    {formattedDate}
                  </td>
                  <td className="px-3.5 py-2 text-zinc-900 dark:text-zinc-100">
                    <span className="font-medium">{entry.description || "Charge"}</span>
                    {entry.reference && (
                      <span className="ml-1.5 font-mono text-[10.5px] text-zinc-400">
                        ({entry.reference})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-400 text-[11px]">
                    {entry.sacHsnCode || "996311"}
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {!isCredit ? formatINR(entry.totalAmount || 0) : ""}
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {isCredit ? formatINR(entry.totalAmount || 0) : ""}
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono text-zinc-400 text-[11px]">
                    {entry.gstRate ? `${entry.gstRate}%` : "12%"}
                  </td>
                </tr>
              );
            })}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400 text-xs">
                  No folio ledger entries recorded yet.
                </td>
              </tr>
            )}
          </tbody>
          {filteredEntries.length > 0 && (
            <tfoot className="bg-zinc-50/90 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 font-bold text-xs">
              <tr>
                <td colSpan={3} className="px-3.5 py-2.5 text-zinc-600 dark:text-zinc-400">
                  Total Ledger Summary
                </td>
                <td className="px-3.5 py-2.5 text-right font-mono text-zinc-900 dark:text-zinc-100">
                  {formatINR(totalDebits)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {formatINR(totalCredits)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-mono text-zinc-500">
                  Net: {formatINR(totalDebits - totalCredits)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
