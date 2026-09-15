import React from "react";
import { Users, X } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";
import { GroupPaymentFormState } from "./billing-types";

interface GroupPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroupStayIds: string[];
  stays: any[];
  groupPaymentForm: GroupPaymentFormState;
  setGroupPaymentForm: React.Dispatch<React.SetStateAction<GroupPaymentFormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
}

export function GroupPaymentModal({
  isOpen,
  onClose,
  selectedGroupStayIds,
  stays,
  groupPaymentForm,
  setGroupPaymentForm,
  onSubmit,
  loading,
}: GroupPaymentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-xl rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-zinc-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Group Multi-Room Payment Settlement
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Record a single payment distributed across {selectedGroupStayIds.length} room folios
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Group Payer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Vikram Sharma (Group Head)"
                value={groupPaymentForm.payerName}
                onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, payerName: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Payment Method *</label>
              <select
                value={groupPaymentForm.method}
                onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, method: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="UPI">📱 UPI / QR Code</option>
                <option value="CARD">💳 Debit / Credit Card</option>
                <option value="CASH">💵 Cash Drawer</option>
                <option value="DIRECT_BILL">🏢 Bill to Company (Corporate Group Account)</option>
                <option value="BANK_TRANSFER">🏦 Bank Transfer / NEFT</option>
                <option value="CHEQUE">📝 Cheque</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">
                Company Name {groupPaymentForm.method === "DIRECT_BILL" ? "*" : "(Optional)"}
              </label>
              <input
                type="text"
                required={groupPaymentForm.method === "DIRECT_BILL"}
                placeholder="e.g. Singhania Tech Ltd"
                value={groupPaymentForm.companyName}
                onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, companyName: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Company GSTIN (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 18AAAAA0000A1Z5"
                value={groupPaymentForm.gstin}
                onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, gstin: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Transaction Ref / UTR / Cheque # *</label>
            <input
              type="text"
              required
              placeholder="e.g. UTR/98127391823"
              value={groupPaymentForm.reference}
              onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, reference: e.target.value })}
              className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Allocated Rooms Breakdown */}
          <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
              <span>Room Allocations ({selectedGroupStayIds.length} Rooms)</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                Total Group Settlement:{" "}
                {formatINR(
                  Object.values(groupPaymentForm.allocations).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0)
                )}
              </span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {stays
                .filter((s) => selectedGroupStayIds.includes(s.id))
                .map((s) => {
                  const roomNo = s.roomAssignments?.[0]?.room?.number || "Unassigned";
                  const bal = s.folio?.balance ?? 0;
                  const allocVal = groupPaymentForm.allocations[s.id] ?? bal;

                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 dark:text-white font-mono text-sm">Room {roomNo}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {s.primaryGuest?.name} • Due: {formatINR(bal)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 font-mono font-bold">Allocate ₹</span>
                        <input
                          type="number"
                          required
                          step="0.01"
                          value={allocVal}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setGroupPaymentForm({
                              ...groupPaymentForm,
                              allocations: {
                                ...groupPaymentForm.allocations,
                                [s.id]: val,
                              },
                            });
                          }}
                          className="w-28 h-9 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 px-2.5 text-right text-zinc-900 dark:text-white font-mono font-black focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition disabled:opacity-50 shadow-md cursor-pointer"
            >
              {loading ? "Processing..." : "Confirm Group Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
