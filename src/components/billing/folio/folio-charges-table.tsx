"use client";

import React, { useMemo } from "react";
import { formatINR } from "@/lib/gst/calculator";
import { FileText, Search, Trash2, X, AlertCircle } from "lucide-react";

interface FolioChargesTableProps {
  entries: any[];
  rawEntriesCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  typeFilter: string;
  onTypeFilterChange: (t: string) => void;
  activeStayStatus?: string;
  folioStatus?: string;
  actionLoading: boolean;
  onDeleteCharge: (id: string, description: string, amount: number) => void;
  activeTaxRates: {
    ROOM_ACCOMMODATION_RATE: number;
    RESTAURANT_FOOD_RATE: number;
    SERVICES_LAUNDRY_RATE: number;
  };
}

export function FolioChargesTable({
  entries,
  rawEntriesCount,
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  activeStayStatus,
  folioStatus,
  actionLoading,
  onDeleteCharge,
  activeTaxRates,
}: FolioChargesTableProps) {
  // Format ISO date into human-friendly format (e.g. "21 Sep 2026")
  const formatChargeDate = (d?: string | null) => {
    if (!d) return "-";
    try {
      const datePart = d.split("T")[0];
      const parts = datePart.split("-");
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = Number(parts[1]) - 1;
        const day = parts[2];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${day} ${months[monthIdx]} ${year}`;
      }
      return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return d;
    }
  };

  // Parse long description strings into concise headline + explanatory subtext
  const parseDescription = (desc: string) => {
    if (!desc) return { title: "-", subtitle: null };

    // Match parenthetical notes like "Room Tariff - Room 31 (Night 2 - 24hr Cycle Rollover)"
    const parenMatch = desc.match(/^(.*?)\s*\((.*?)\)$/);
    if (parenMatch) {
      return {
        title: parenMatch[1].trim(),
        subtitle: parenMatch[2].trim(),
      };
    }

    // Match checkout advance allocations like "Group Advance Applied to Room 26 at Checkout"
    if (desc.includes("Applied to") && desc.includes("at Checkout")) {
      const parts = desc.split("Applied to");
      return {
        title: parts[0].trim(),
        subtitle: `Applied to ${parts[1].trim()}`,
      };
    }

    // Match hyphenated breakdown like "Laundry - Express Dry Clean"
    if (desc.includes(" - ")) {
      const parts = desc.split(" - ");
      return {
        title: parts[0].trim(),
        subtitle: parts.slice(1).join(" - ").trim(),
      };
    }

    return {
      title: desc,
      subtitle: null,
    };
  };

  // Live ledger sums for the table reconciliation footer
  const { totalTaxableSum, totalTaxSum, totalAmountSum, counts } = useMemo(() => {
    let taxable = 0;
    let total = 0;
    let roomCount = 0;
    let foodCount = 0;
    let serviceCount = 0;

    for (const e of entries) {
      taxable += e.taxableAmount || 0;
      total += e.totalAmount || 0;

      const isFood =
        e.chargeCode?.includes("FOOD") ||
        e.chargeCode?.includes("RESTAURANT") ||
        e.chargeCode?.includes("FB");
      const isRoom =
        e.chargeCode?.includes("ROOM_TARIFF") ||
        e.chargeCode === "STAY_EXTENSION" ||
        e.sourceType === "PMS_NIGHTLY_CHARGE" ||
        e.chargeCode === "EXTRA_PAX";

      if (isRoom) roomCount++;
      else if (isFood) foodCount++;
      else serviceCount++;
    }

    const tax = total - taxable;
    return {
      totalTaxableSum: taxable,
      totalTaxSum: tax,
      totalAmountSum: total,
      counts: { all: entries.length, room: roomCount, food: foodCount, service: serviceCount },
    };
  }, [entries]);

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden shadow-xs transition-colors duration-150">
      
      {/* Header & Filter Controls Bar */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
                Itemized Charges
              </h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                {rawEntriesCount} {rawEntriesCount === 1 ? "entry" : "entries"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live audit ledger of all room tariffs, food and beverage, and service postings
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap self-start md:self-auto">
          {/* Search Input */}
          <div className="relative w-44 sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search charges..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-8.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-8 pr-7 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 font-medium transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer p-0.5"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Category Filter Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="h-8.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="ROOM_TARIFF">Room Tariff ({activeTaxRates.ROOM_ACCOMMODATION_RATE}%)</option>
            <option value="RESTAURANT_FOOD">Restaurant F&B ({activeTaxRates.RESTAURANT_FOOD_RATE}%)</option>
            <option value="MANUAL">Services & Laundry ({activeTaxRates.SERVICES_LAUNDRY_RATE}%)</option>
          </select>
        </div>
      </div>

      {/* Main Ledger Table: Proportional column widths with no awkward gaps or horizontal cutoff */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[720px]">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200/70 dark:border-zinc-800/80 text-zinc-500 dark:text-zinc-400 font-bold text-[11px] uppercase tracking-wider">
            <tr>
              <th scope="col" className="py-3 px-4 w-[110px]">Date</th>
              <th scope="col" className="py-3 px-4 min-w-[240px]">Description</th>
              <th scope="col" className="py-3 px-2 w-[80px] text-center">SAC</th>
              <th scope="col" className="py-3 px-4 w-[110px] text-right">Taxable</th>
              <th scope="col" className="py-3 px-4 w-[95px] text-right">GST</th>
              <th scope="col" className="py-3 px-4 w-[120px] text-right">Total</th>
              <th scope="col" className="py-3 px-2 w-[55px] text-center">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {entries.map((e) => {
              const taxAmt = (e.totalAmount || 0) - (e.taxableAmount || 0);
              const isFood =
                e.chargeCode?.includes("FOOD") ||
                e.chargeCode?.includes("RESTAURANT") ||
                e.chargeCode?.includes("FB");
              const isRoom =
                e.chargeCode?.includes("ROOM_TARIFF") ||
                e.chargeCode === "STAY_EXTENSION" ||
                e.sourceType === "PMS_NIGHTLY_CHARGE" ||
                e.chargeCode === "EXTRA_PAX";
              const isSystemRoomCharge = isRoom && e.sourceType !== "MANUAL_CHARGE";
              const isDiscount = (e.amount || 0) < 0 || (e.totalAmount || 0) < 0;
              const { title, subtitle } = parseDescription(e.description);

              return (
                <tr
                  key={e.id}
                  className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors duration-150"
                >
                  {/* 1. Date */}
                  <td className="py-3 px-4 font-mono text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap align-middle">
                    {formatChargeDate(e.serviceDate || e.createdAt)}
                  </td>

                  {/* 2. Description (Structured Title + Contextual Subtitle & Badge) */}
                  <td className="py-3 px-4 align-middle">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                          {title}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.2 rounded border ${
                            isDiscount
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60"
                              : isFood
                              ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60"
                              : isRoom
                              ? "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60"
                              : "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/60"
                          }`}
                        >
                          {isDiscount
                            ? "Discount"
                            : isFood
                            ? "F&B"
                            : isRoom
                            ? "Room"
                            : "Service"}
                        </span>
                      </div>
                      {subtitle && (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                          {subtitle}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 3. SAC Code */}
                  <td className="py-3 px-2 text-center align-middle">
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800/60 inline-block">
                      {e.sacHsn || (isFood ? "996331" : "996311")}
                    </span>
                  </td>

                  {/* 4. Taxable */}
                  <td className="py-3 px-4 font-mono text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 text-right tabular-nums whitespace-nowrap align-middle">
                    {formatINR(e.taxableAmount || 0)}
                  </td>

                  {/* 5. GST */}
                  <td className="py-3 px-4 font-mono text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 text-right tabular-nums whitespace-nowrap align-middle">
                    {formatINR(taxAmt)}
                  </td>

                  {/* 6. Total Amount */}
                  <td
                    className={`py-3 px-4 font-mono font-bold text-right tabular-nums text-sm sm:text-base whitespace-nowrap align-middle ${
                      isDiscount
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-zinc-950 dark:text-zinc-50"
                    }`}
                  >
                    {formatINR(e.totalAmount || 0)}
                  </td>

                  {/* 7. Action Button */}
                  <td className="py-3 px-2 text-center align-middle">
                    {!isSystemRoomCharge &&
                    activeStayStatus === "IN_HOUSE" &&
                    folioStatus === "OPEN" ? (
                      <button
                        type="button"
                        onClick={() =>
                          onDeleteCharge(e.id, e.description, e.totalAmount || 0)
                        }
                        disabled={actionLoading}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
                        title="Delete this charge"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-700 text-xs font-mono">-</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center text-zinc-400 text-sm space-y-2">
                  <AlertCircle className="h-7 w-7 text-zinc-300 dark:text-zinc-600 mx-auto" />
                  <p className="font-semibold text-zinc-600 dark:text-zinc-400">
                    {rawEntriesCount === 0 ? "No charges posted yet to this folio" : "No charges match current filter"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Use '+ Post Charge' or 'Add KOT' in the command deck above to post charges.
                  </p>
                </td>
              </tr>
            )}
          </tbody>

          {/* Table Reconciliation Footer Summary */}
          {entries.length > 0 && (
            <tfoot className="bg-zinc-50/90 dark:bg-zinc-900/60 border-t-2 border-zinc-200/80 dark:border-zinc-800 text-xs font-mono">
              <tr>
                <td colSpan={3} className="py-3 px-4 font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                  Total Ledger Summary ({entries.length} items)
                </td>
                <td className="py-3 px-4 text-right font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">
                  {formatINR(totalTaxableSum)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {formatINR(totalTaxSum)}
                </td>
                <td className="py-3 px-4 text-right font-black text-sm text-zinc-950 dark:text-zinc-50 tabular-nums">
                  {formatINR(totalAmountSum)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
