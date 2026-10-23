import React from "react";
import { Pencil, Trash2, CheckCircle2, X, Calendar } from "lucide-react";

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPayment: any;
  setEditingPayment: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onDelete: (paymentId: string) => Promise<void>;
  loading: boolean;
}

export function EditPaymentModal({
  isOpen,
  onClose,
  editingPayment,
  setEditingPayment,
  onSubmit,
  onDelete,
  loading,
}: EditPaymentModalProps) {
  if (!isOpen || !editingPayment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4  ">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#121215] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-zinc-900 dark:text-white max-h-[92vh] overflow-y-auto ui-radius-panel ui-dialog-surface ui-surface">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0 ui-weight-medium">
              <Pencil className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white truncate ui-weight-medium ui-section-title">
                Edit Payment Record
              </h2>
              <p className="text-xs text-zinc-500 font-mono truncate ui-text-body ui-font-body">
                Receipt: {editingPayment.receiptNo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer shrink-0 ui-control ui-control-sized"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5 ui-text-body ui-weight-medium ui-label">Payment Method *</label>
              <select
                value={editingPayment.method}
                onChange={(e) => setEditingPayment({ ...editingPayment, method: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-xs text-zinc-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer ui-radius-control ui-text-body ui-weight-medium ui-field" aria-label="Payment Method"
              >
                <option value="UPI">📱 UPI / QR Code</option>
                <option value="CARD">💳 Debit / Credit Card</option>
                <option value="CASH">💵 Cash Drawer</option>
                <option value="DIRECT_BILL">🏢 Bill to Company (BTC)</option>
                <option value="BANK_TRANSFER">🏦 Bank Transfer / NEFT</option>
                <option value="OTA_VCC">🌐 OTA Virtual Card</option>
                <option value="CHEQUE">📝 Cheque</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5 ui-text-body ui-weight-medium ui-label">Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs text-zinc-400 font-mono font-bold ui-text-body ui-font-body ui-weight-medium">₹</span>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={editingPayment.amount}
                  onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })}
                  className="w-full h-11 pl-7 pr-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono font-black text-sm ui-radius-control ui-font-body ui-weight-medium ui-field" aria-label="Amount (₹)"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5 flex items-center gap-1.5 ui-text-body ui-weight-medium ui-label">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Payment Date *</span>
              </label>
              <input
                type="date"
                required
                value={editingPayment.paymentDate || ""}
                onChange={(e) => setEditingPayment({ ...editingPayment, paymentDate: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-blue-500 cursor-pointer ui-radius-control ui-text-body ui-font-body ui-field"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5 ui-text-body ui-weight-medium ui-label">Payer Name</label>
              <input
                type="text"
                placeholder="Guest / Payer Name"
                value={editingPayment.payerName || ""}
                onChange={(e) => setEditingPayment({ ...editingPayment, payerName: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium ui-radius-control ui-text-body ui-field" aria-label="Payer Name"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1 ui-text-body ui-weight-medium ui-label">Reference / Transaction Note</label>
            <input
              type="text"
              placeholder="e.g. UTR / Auth Code / Advance Deposit"
              value={editingPayment.reference}
              onChange={(e) => setEditingPayment({ ...editingPayment, reference: e.target.value })}
              className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-blue-500 ui-radius-control ui-text-body ui-font-body ui-field" aria-label="Reference / Transaction Note"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => onDelete(editingPayment.id)}
              className="min-h-[44px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-800 transition flex items-center justify-center gap-1.5 cursor-pointer  ui-radius-control ui-weight-medium ui-text-body ui-control ui-control-sized"
              title="Permanently remove this payment record and rebalance folio" aria-label="Permanently remove this payment record and rebalance folio"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Void / Delete</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial min-h-[44px] px-4 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold text-xs cursor-pointer  ui-radius-control ui-weight-medium ui-text-body ui-control ui-control-sized"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial min-h-[44px] px-5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-black text-xs transition disabled:opacity-50 shadow-md flex items-center justify-center gap-1.5 cursor-pointer  ui-radius-control ui-weight-medium ui-text-body ui-shadow-quiet ui-control ui-control-sized"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{loading ? "Updating..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
