import React from "react";
import { RotateCcw, X } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";
import { formatGuestDisplayName } from "@/lib/domain/name-utils";
import { RefundFormState } from "./billing-types";

interface ProcessRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStay: any;
  refundForm: RefundFormState;
  setRefundForm: React.Dispatch<React.SetStateAction<RefundFormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  surplusCredit: number;
  totalPayments: number;
  totalCharges: number;
  loading: boolean;
}

export function ProcessRefundModal({
  isOpen,
  onClose,
  activeStay,
  refundForm,
  setRefundForm,
  onSubmit,
  surplusCredit,
  totalPayments,
  totalCharges,
  loading,
}: ProcessRefundModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Issue Refund / Advance Return
              </h2>
              <p className="text-xs text-zinc-500">
                Return surplus money to guest & reconcile folio ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Surplus Context Banner */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Guest Name:</span>
            <strong className="text-zinc-900 dark:text-white font-bold">{formatGuestDisplayName(activeStay?.primaryGuest?.name)}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Advance Overpayment:</span>
            <strong className="font-mono font-bold text-amber-700 dark:text-amber-400">{formatINR(surplusCredit)}</strong>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-amber-200 dark:border-amber-800/50">
            <span>Total Paid: {formatINR(totalPayments)}</span>
            <span>Total Bill: {formatINR(totalCharges)}</span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Refund Method *</label>
              <select
                value={refundForm.method}
                onChange={(e) => setRefundForm({ ...refundForm, method: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="UPI">📱 UPI Return / QR</option>
                <option value="CASH">💵 Cash Drawer Payout</option>
                <option value="BANK_TRANSFER">🏦 Bank Account Transfer</option>
                <option value="CARD_REFUND">💳 Card Reversal</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Refund Amount (₹) *</label>
              <input
                type="number"
                required
                step="0.01"
                value={refundForm.amount}
                onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono font-black text-base"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Refund UTR / Txn Reference (Optional)</label>
            <input
              type="text"
              placeholder="e.g. UPI/REF-98129381 or Cash Voucher #"
              value={refundForm.reference}
              onChange={(e) => setRefundForm({ ...refundForm, reference: e.target.value })}
              className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Reason / Accounting Remarks</label>
            <input
              type="text"
              value={refundForm.notes}
              onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
              className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium"
            />
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
              className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black transition disabled:opacity-50 shadow-md flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{loading ? "Processing..." : "Confirm & Pay Out Refund"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
