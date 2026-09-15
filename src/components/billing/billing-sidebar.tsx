import React from "react";
import { BedDouble, AlertCircle, Archive, Search, X, Building2 } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";
import { DirectoryRoomItem, MainFolioTab } from "./billing-types";

interface BillingSidebarProps {
  activeMainTab: MainFolioTab;
  directoryItems: DirectoryRoomItem[];
  filteredDirectoryItems: DirectoryRoomItem[];
  selectedStayId: string;
  selectedRoomNumber: string;
  selectedRoomKeys: string[];
  staySearchQuery: string;
  setStaySearchQuery: (q: string) => void;
  stayStatusFilter: "ALL" | "SETTLED" | "WITH_BALANCE";
  setStayStatusFilter: React.Dispatch<React.SetStateAction<"ALL" | "SETTLED" | "WITH_BALANCE">>;
  onSelectRoom: (stayId: string, roomNumber: string) => void;
  onToggleRoomSelection: (key: string) => void;
  onSelectAllRooms: () => void;
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
  selectedRoomKeys,
  staySearchQuery,
  setStaySearchQuery,
  stayStatusFilter,
  setStayStatusFilter,
  onSelectRoom,
  onToggleRoomSelection,
  onSelectAllRooms,
  inHouseCount,
  outstandingCount,
  settledArchiveCount,
  formatShortDate,
}: BillingSidebarProps) {
  return (
    <div className="lg:col-span-3 xl:col-span-3 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 p-3 sm:p-3.5 shadow-xs flex flex-col space-y-2.5 h-fit">
      {/* Directory Title & Multi-room Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono">
          {activeMainTab === "IN_HOUSE" ? (
            <BedDouble className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : activeMainTab === "OUTSTANDING_DUES" ? (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          ) : (
            <Archive className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          )}
          <span>
            {activeMainTab === "IN_HOUSE"
              ? "In-House Rooms"
              : activeMainTab === "OUTSTANDING_DUES"
              ? "Outstanding Dues"
              : "Settled Archive"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {filteredDirectoryItems.length > 0 && (
            <button
              onClick={onSelectAllRooms}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
            >
              {selectedRoomKeys.length === filteredDirectoryItems.length ? "Deselect All" : "Select All"}
            </button>
          )}
          <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
            {filteredDirectoryItems.length}{" "}
            {activeMainTab === "IN_HOUSE"
              ? "Occupied"
              : activeMainTab === "OUTSTANDING_DUES"
              ? "Debtors"
              : "Settled"}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          placeholder={
            activeMainTab === "IN_HOUSE"
              ? "Search room #, guest name..."
              : "Search room, invoice #, guest, phone..."
          }
          value={staySearchQuery}
          onChange={(e) => setStaySearchQuery(e.target.value)}
          className="w-full h-9 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-8.5 pr-8 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-medium transition"
        />
        {staySearchQuery && (
          <button
            onClick={() => setStaySearchQuery("")}
            className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Quick Filter Tabs */}
      {activeMainTab === "IN_HOUSE" ? (
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-[11px] font-semibold text-center">
          <button
            onClick={() => setStayStatusFilter("ALL")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "ALL"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            All ({inHouseCount})
          </button>
          <button
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
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-[11px] font-semibold text-center">
          <button
            onClick={() => setStayStatusFilter("ALL")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "ALL"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            All ({outstandingCount})
          </button>
          <button
            onClick={() => setStayStatusFilter("WITH_BALANCE")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "WITH_BALANCE"
                ? "bg-amber-600 text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Corporate (
            {
              directoryItems.filter(
                (d) =>
                  (d.status === "CHECKED_OUT" || d.status === "COMPLETED") &&
                  d.roomBalance > 0.5 &&
                  d.companyName
              ).length
            }
            )
          </button>
          <button
            onClick={() => setStayStatusFilter("SETTLED")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "SETTLED"
                ? "bg-blue-600 text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Guest (
            {
              directoryItems.filter(
                (d) =>
                  (d.status === "CHECKED_OUT" || d.status === "COMPLETED") &&
                  d.roomBalance > 0.5 &&
                  !d.companyName
              ).length
            }
            )
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-[11px] font-semibold text-center">
          <button
            onClick={() => setStayStatusFilter("ALL")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "ALL"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            All Settled ({settledArchiveCount})
          </button>
          <button
            onClick={() => setStayStatusFilter("WITH_BALANCE")}
            className={`rounded-lg py-1.5 transition cursor-pointer ${
              stayStatusFilter === "WITH_BALANCE"
                ? "bg-amber-600 text-white shadow-xs font-bold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Corporate (
            {
              directoryItems.filter(
                (d) => (d.status === "CHECKED_OUT" || d.status === "COMPLETED") && d.companyName
              ).length
            }
            )
          </button>
        </div>
      )}

      {/* Stays / Rooms List with Separated Individual Cards */}
      <div className="space-y-2 max-h-[calc(100vh-290px)] overflow-y-auto pr-0.5 flex-1">
        {filteredDirectoryItems.map((item) => {
          const isSelected =
            item.stayId === selectedStayId &&
            (selectedRoomNumber ? item.roomNumber === selectedRoomNumber : true);
          const isGroupChecked = selectedRoomKeys.includes(item.key);
          const hasCompany = Boolean(item.companyName);

          return (
            <div
              key={item.key}
              onClick={() => onSelectRoom(item.stayId, item.roomNumber)}
              className={`rounded-xl p-3 border transition-all cursor-pointer flex items-start gap-2.5 shadow-xs ${
                isSelected
                  ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 text-zinc-900 dark:text-zinc-100"
                  : "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <input
                type="checkbox"
                checked={isGroupChecked}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleRoomSelection(item.key)}
                className="mt-0.5 h-3.5 w-3.5 rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 accent-emerald-500 cursor-pointer shrink-0"
                title="Select for group settlement"
              />

              <div className="flex-1 min-w-0 space-y-1">
                {/* Top Row: Room Number & Settled/Due Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-zinc-900 dark:text-white">
                      {item.roomNumber}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium truncate">
                      {item.roomType?.name || "Deluxe Room"}
                    </span>
                  </div>

                  <div className="shrink-0">
                    {item.roomBalance > 0.5 ? (
                      <span className="text-[10.5px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50 px-2 py-0.5 rounded-md">
                        Due: {formatINR(item.roomBalance)}
                      </span>
                    ) : item.groupAdvanceCovered && item.groupAdvanceCovered > 0 ? (
                      <span className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-md" title="Tariff covered by Group Master Advance">
                        ✓ Settled (Group)
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-md">
                        ✓ Settled
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Row: Guest Name & Status Tag */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {item.guestName}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.isMultiRoom && (
                      <span className="rounded-md px-1.5 py-0.2 text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                        Group ({item.allRoomNumbers.length} Rooms)
                      </span>
                    )}
                    <span
                      className={`rounded-md px-1.5 py-0.2 text-[9.5px] font-semibold uppercase ${
                        item.status === "IN_HOUSE"
                          ? "bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Corporate Entity if present */}
                {hasCompany && (
                  <div className="flex items-center gap-1 text-[10.5px] text-amber-800 dark:text-amber-300 font-medium truncate bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 rounded-md">
                    <Building2 className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="truncate">{item.companyName}</span>
                  </div>
                )}

                {/* Bottom Row: Dates & Phone */}
                <div className="flex items-center justify-between text-[10.5px] text-zinc-400 dark:text-zinc-500">
                  <span className="font-mono flex items-center gap-1.5">
                    <span>
                      {formatShortDate(item.arrivalAt)} → {formatShortDate(item.expectedDepartureAt)}
                    </span>
                    {item.isExtendedDeparture && (
                      <span
                        title={
                          item.originalExpectedDepartureAt
                            ? `Original departure: ${formatShortDate(item.originalExpectedDepartureAt)}`
                            : "Auto-extended stay"
                        }
                        className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60"
                      >
                        Ext
                      </span>
                    )}
                  </span>
                  {item.phone && <span className="truncate font-mono">{item.phone}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {filteredDirectoryItems.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
            <AlertCircle className="h-6 w-6 text-zinc-400 dark:text-zinc-600 mx-auto" />
            <p className="font-bold text-zinc-800 dark:text-zinc-300 text-xs">No matching folios found</p>
            <p className="text-zinc-400 text-[11px]">Try changing your search term or filter status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
