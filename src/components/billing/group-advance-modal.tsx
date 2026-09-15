import React from "react";
import { Wallet, X } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";
import { formatGuestDisplayName } from "@/lib/domain/name-utils";
import { DirectoryRoomItem, GroupAdvanceMetrics } from "./billing-types";

interface GroupAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStay: any;
  allGroupRooms: string[];
  groupAdvanceMetrics: GroupAdvanceMetrics;
  directoryItems: DirectoryRoomItem[];
  selectedStayId: string;
}

export function GroupAdvanceModal({
  isOpen,
  onClose,
  activeStay,
  allGroupRooms,
  groupAdvanceMetrics,
  directoryItems,
  selectedStayId,
}: GroupAdvanceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                Group Advance Deposit Pool
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                {formatGuestDisplayName(activeStay?.primaryGuest?.name)} • {allGroupRooms.length} Rooms in Group
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="text-[10px] uppercase font-bold text-zinc-400">Total Advance Received</div>
            <div className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-white mt-0.5">
              {formatINR(groupAdvanceMetrics.totalReceived)}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="text-[10px] uppercase font-bold text-zinc-400">Applied to Rooms</div>
            <div className="text-base sm:text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
              {formatINR(groupAdvanceMetrics.consumed)}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center">
            <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Available Advance</div>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatINR(groupAdvanceMetrics.available)}
            </div>
          </div>
        </div>

        {/* Advance Payments Received Ledger */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider">
            Unallocated Advance Payments Received ({groupAdvanceMetrics.unallocatedPayments.length})
          </h3>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {groupAdvanceMetrics.unallocatedPayments.length === 0 ? (
              <div className="p-4 text-center text-zinc-400">No unallocated advance payments recorded</div>
            ) : (
              groupAdvanceMetrics.unallocatedPayments.map((p: any) => (
                <div key={p.id} className="p-3 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-white font-mono">{p.receiptNo || "Receipt"}</div>
                    <div className="text-[11px] text-zinc-500">
                      {p.method} • {p.reference || "Advance Deposit"} • {new Date(p.receivedAt || p.createdAt).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatINR(p.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Room Due Status Overview */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider">
            In-House Group Rooms Status ({allGroupRooms.length})
          </h3>
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {directoryItems
              .filter((d) => d.stayId === selectedStayId)
              .map((item) => (
                <div key={item.key} className="p-2.5 flex items-center justify-between bg-white dark:bg-zinc-900">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">Room {item.roomNumber}</span>
                    <span className="text-[10px] text-zinc-500">Charges: {formatINR(item.roomCharges)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">Direct Paid: {formatINR(item.roomPayments)}</span>
                    <span className={`font-mono font-bold ${item.roomBalance > 0.5 ? "text-rose-600" : "text-emerald-600"}`}>
                      Due: {formatINR(item.roomBalance)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 font-bold text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
