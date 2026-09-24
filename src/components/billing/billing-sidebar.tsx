import React from "react";
import { BedDouble, AlertCircle, Archive, Search, X, Building2, Check, ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";
import { DirectoryRoomItem, MainFolioTab } from "./billing-types";

interface BillingSidebarProps {
  activeMainTab: MainFolioTab;
  directoryItems: DirectoryRoomItem[];
  filteredDirectoryItems: DirectoryRoomItem[];
  selectedStayId: string;
  selectedRoomNumber: string;
  selectedRoomKeys?: string[];
  staySearchQuery: string;
  setStaySearchQuery: (q: string) => void;
  stayStatusFilter: "ALL" | "SETTLED" | "WITH_BALANCE";
  setStayStatusFilter: React.Dispatch<React.SetStateAction<"ALL" | "SETTLED" | "WITH_BALANCE">>;
  onSelectRoom: (stayId: string, roomNumber: string) => void;
  onToggleRoomSelection?: (key: string) => void;
  onSelectAllRooms?: () => void;
  inHouseCount: number;
  outstandingCount: number;
  settledArchiveCount: number;
  formatShortDate: (dateStr?: string | null) => string;
}

export function BillingSidebar({
  activeMainTab,
  directoryItems,
  filteredDirectoryItems,
  selectedStayId,
  selectedRoomNumber,
  staySearchQuery,
  setStaySearchQuery,
  stayStatusFilter,
  setStayStatusFilter,
  onSelectRoom,
  inHouseCount,
  outstandingCount,
  settledArchiveCount,
  formatShortDate,
}: BillingSidebarProps) {
  // Calculate tab total dues for quick directory context
  const totalDueInView = filteredDirectoryItems.reduce((acc, item) => acc + (item.roomBalance || 0), 0);

  return (
    <aside className="w-full lg:w-[350px] xl:w-[380px] shrink-0 sticky top-4 flex flex-col max-h-[calc(100vh-2rem)] rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 p-4 space-y-3.5 shadow-xs transition-colors duration-150">
      {/* Directory Title & Count Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {activeMainTab === "IN_HOUSE" ? (
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BedDouble className="h-4 w-4" />
            </div>
          ) : activeMainTab === "OUTSTANDING_DUES" ? (
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
              <Archive className="h-4 w-4" />
            </div>
          )}
          <span>
            {activeMainTab === "IN_HOUSE"
              ? "In-House Rooms"
              : activeMainTab === "OUTSTANDING_DUES"
              ? "Debtors Ledger"
              : "Settled Archive"}
          </span>
        </div>

        <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono font-semibold bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
          {filteredDirectoryItems.length}{" "}
          {activeMainTab === "IN_HOUSE"
            ? "Active"
            : activeMainTab === "OUTSTANDING_DUES"
            ? "Pending"
            : "Archived"}
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder={
            activeMainTab === "IN_HOUSE"
              ? "Search room #, guest name, phone..."
              : "Search room, invoice #, guest, company..."
          }
          value={staySearchQuery}
          onChange={(e) => setStaySearchQuery(e.target.value)}
          className="w-full h-9.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 pl-9 pr-8 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 font-medium transition"
        />
        {staySearchQuery && (
          <button
            type="button"
            onClick={() => setStaySearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer p-0.5 rounded"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Sub-status Quick Filter Segmented Controls */}
      {activeMainTab === "IN_HOUSE" ? (
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 text-xs font-semibold text-center">
          <button
            type="button"
            onClick={() => setStayStatusFilter("ALL")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "ALL"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            All ({inHouseCount})
          </button>
          <button
            type="button"
            onClick={() => setStayStatusFilter("WITH_BALANCE")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "WITH_BALANCE"
                ? "bg-rose-600 text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Due ({directoryItems.filter((d) => d.status === "IN_HOUSE" && d.roomBalance > 0.5).length})
          </button>
          <button
            type="button"
            onClick={() => setStayStatusFilter("SETTLED")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "SETTLED"
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Paid ({directoryItems.filter((d) => d.status === "IN_HOUSE" && d.roomBalance <= 0.5).length})
          </button>
        </div>
      ) : activeMainTab === "OUTSTANDING_DUES" ? (
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 text-xs font-semibold text-center">
          <button
            type="button"
            onClick={() => setStayStatusFilter("ALL")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "ALL"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            All ({outstandingCount})
          </button>
          <button
            type="button"
            onClick={() => setStayStatusFilter("WITH_BALANCE")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "WITH_BALANCE"
                ? "bg-amber-600 text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Corporate ({directoryItems.filter((d) => (d.status === "CHECKED_OUT" || d.status === "COMPLETED") && d.roomBalance > 0.5 && d.companyName).length})
          </button>
          <button
            type="button"
            onClick={() => setStayStatusFilter("SETTLED")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "SETTLED"
                ? "bg-blue-600 text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Individual ({directoryItems.filter((d) => (d.status === "CHECKED_OUT" || d.status === "COMPLETED") && d.roomBalance > 0.5 && !d.companyName).length})
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 text-xs font-semibold text-center">
          <button
            type="button"
            onClick={() => setStayStatusFilter("ALL")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "ALL"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            All Settled ({settledArchiveCount})
          </button>
          <button
            type="button"
            onClick={() => setStayStatusFilter("WITH_BALANCE")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "WITH_BALANCE"
                ? "bg-amber-600 text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Corporate ({directoryItems.filter((d) => (d.status === "CHECKED_OUT" || d.status === "COMPLETED") && d.companyName).length})
          </button>
        </div>
      )}

      {/* Room Directory List */}
      <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 -mr-1 min-h-[160px]">
        {filteredDirectoryItems.map((item) => {
          const isSelected =
            item.stayId === selectedStayId &&
            (selectedRoomNumber ? item.roomNumber === selectedRoomNumber : true);
          const hasCompany = Boolean(item.companyName);
          const isSettled = item.roomBalance <= 0.5;

          return (
            <div
              key={item.key}
              onClick={() => onSelectRoom(item.stayId, item.roomNumber)}
              className={`rounded-xl p-3.5 border transition-all duration-150 cursor-pointer relative ${
                isSelected
                  ? "bg-blue-50/70 dark:bg-blue-950/25 border-blue-500/80 dark:border-blue-400/80 shadow-xs ring-1 ring-blue-500/20 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-blue-600 dark:before:bg-blue-400"
                  : "bg-white dark:bg-[#121215] border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40"
              }`}
            >
              {/* Row 1: Room Identification & Live Balance */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base font-bold font-mono text-zinc-950 dark:text-zinc-50 shrink-0">
                    Room {item.roomNumber}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[130px] sm:max-w-[150px]">
                    {item.roomType?.name || "Standard Room"}
                  </span>
                </div>

                <div className="shrink-0 font-mono text-sm font-bold tabular-nums">
                  {!isSettled ? (
                    <span className="text-rose-600 dark:text-rose-400">
                      {formatINR(item.roomBalance)}
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Cleared</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Guest Name & Company */}
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {item.guestName}
                </div>
                {item.isMultiRoom && (
                  <span className="shrink-0 text-[11px] font-mono font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/50">
                    Group Stay
                  </span>
                )}
              </div>

              {hasCompany && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium truncate">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.companyName}</span>
                </div>
              )}

              {/* Row 3: Stay Dates & Lineage Indicator */}
              <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-1">
                  <span>{formatShortDate(item.arrivalAt)}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
                  <span>{formatShortDate(item.expectedDepartureAt)}</span>
                </div>

                {item.moveReason?.includes("MOVED_FROM:") && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">
                    Transferred
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filteredDirectoryItems.length === 0 && (
          <div className="py-10 px-4 text-center text-sm text-zinc-500 space-y-2">
            <AlertCircle className="h-8 w-8 text-zinc-400 dark:text-zinc-600 mx-auto" />
            <p className="font-bold text-zinc-800 dark:text-zinc-300 text-sm">No matching folios found</p>
            <p className="text-zinc-400 text-xs">Try adjusting your search query or filter tab.</p>
          </div>
        )}
      </div>

      {/* Directory Footer Summary */}
      {filteredDirectoryItems.length > 0 && (
        <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>{filteredDirectoryItems.length} Folios</span>
          {totalDueInView > 0 ? (
            <span className="font-bold text-rose-600 dark:text-rose-400">
              Due: {formatINR(totalDueInView)}
            </span>
          ) : (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              All Settled
            </span>
          )}
        </div>
      )}
    </aside>
  );
}
