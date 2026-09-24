import React, { useState } from "react";
import { Wallet, X, Coins, Check, AlertCircle } from "lucide-react";
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
  onAllocateAdvance?: (stayId: string, roomNumber: string, amount: number) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export function GroupAdvanceModal({
  isOpen,
  onClose,
  activeStay,
  allGroupRooms,
  groupAdvanceMetrics,
  directoryItems,
  selectedStayId,
  onAllocateAdvance,
  onRefresh,
}: GroupAdvanceModalProps) {
  const [allocatingKey, setAllocatingKey] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartAllocate = (item: DirectoryRoomItem) => {
    setErrorMsg(null);
    setAllocatingKey(item.key);
    const maxApplicable = Math.min(item.roomBalance, groupAdvanceMetrics.available);
    setCustomAmount(String(maxApplicable > 0 ? maxApplicable : ""));
  };

  const handleCancelAllocate = () => {
    setAllocatingKey(null);
    setCustomAmount("");
    setErrorMsg(null);
  };

  const handleConfirmAllocate = async (item: DirectoryRoomItem) => {
    const numAmt = Number(customAmount);
    if (!numAmt || isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg("Please enter a valid amount greater than ₹0");
      return;
    }
    if (numAmt > groupAdvanceMetrics.available) {
      setErrorMsg(`Amount cannot exceed available pool of ${formatINR(groupAdvanceMetrics.available)}`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (onAllocateAdvance) {
        await onAllocateAdvance(item.stayId, item.roomNumber, numAmt);
      } else {
        const res = await fetch("/api/v1/billing/group-advance/allocate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stayId: item.stayId,
            roomNumber: item.roomNumber,
            amount: numAmt,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to allocate advance");
        }
      }
      setAllocatingKey(null);
      setCustomAmount("");
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to allocate advance");
    } finally {
      setSubmitting(false);
    }
  };

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

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Room Due Status Overview with Direct Advance Allocation */}
        {(() => {
          const inHouseGroupItems = directoryItems.filter(
            (d) => (d.stayId === selectedStayId || allGroupRooms.includes(d.roomNumber)) && d.status === "IN_HOUSE"
          );
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider">
                  In-House Group Rooms Status ({inHouseGroupItems.length})
                </h3>
                {groupAdvanceMetrics.available > 0 && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatINR(groupAdvanceMetrics.available)} Available to Deduct
                  </span>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {inHouseGroupItems.length === 0 ? (
                  <div className="p-3 text-center text-zinc-400 text-xs">All group rooms have checked out / settled</div>
                ) : (
                  inHouseGroupItems.map((item) => (
                    <div key={item.key} className="p-3 bg-white dark:bg-zinc-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-zinc-900 dark:text-white">Room {item.roomNumber}</span>
                          <span className="text-[10px] text-zinc-500">Charges: {formatINR(item.roomCharges)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-400">Paid: {formatINR(item.roomPayments)}</span>
                          <span className={`font-mono font-bold ${item.roomBalance > 0.5 ? "text-rose-600" : "text-emerald-600"}`}>
                            Due: {formatINR(item.roomBalance)}
                          </span>
                          {item.roomBalance > 0.5 && groupAdvanceMetrics.available > 0 && allocatingKey !== item.key && (
                            <button
                              type="button"
                              onClick={() => handleStartAllocate(item)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                            >
                              <Coins className="w-3 h-3" />
                              <span>Apply Advance</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Allocation Card */}
                      {allocatingKey === item.key && (
                        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-600 dark:text-zinc-300 font-bold text-xs whitespace-nowrap">
                              Deduct Amount:
                            </span>
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-zinc-400 font-bold font-mono">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                max={Math.min(item.roomBalance, groupAdvanceMetrics.available)}
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                className="w-32 h-8 pl-6 pr-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-xs font-bold font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomAmount(String(Math.min(item.roomBalance, groupAdvanceMetrics.available)))
                              }
                              className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                            >
                              Full Due
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCancelAllocate}
                              disabled={submitting}
                              className="px-3 py-1 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleConfirmAllocate(item)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{submitting ? "Applying..." : "Confirm Deduction"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}

        {/* Advance Payments Received Ledger */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider">
            Unallocated Advance Payments Received ({groupAdvanceMetrics.unallocatedPayments.length})
          </h3>
          <div className="max-h-40 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
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
