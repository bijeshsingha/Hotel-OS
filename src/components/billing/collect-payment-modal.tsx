import React from "react";
import { CreditCard, Building2, X } from "lucide-react";
import { PaymentFormState } from "./billing-types";

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStay: any;
  paymentForm: PaymentFormState;
  setPaymentForm: React.Dispatch<React.SetStateAction<PaymentFormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
}

export function CollectPaymentModal({
  isOpen,
  onClose,
  activeStay,
  paymentForm,
  setPaymentForm,
  onSubmit,
  loading,
}: CollectPaymentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Collect Payment for Room {activeStay?.roomAssignments?.[0]?.room?.number}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Payment Method *</label>
              <select
                value={paymentForm.method}
                onChange={(e) => {
                  const newMethod = e.target.value;
                  setPaymentForm((prev) => ({
                    ...prev,
                    method: newMethod,
                    reference:
                      newMethod === "DIRECT_BILL" && !prev.reference
                        ? `PO-${(prev.companyName || "CORP").slice(0, 10)}`
                        : prev.reference,
                  }));
                }}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="UPI">📱 UPI / QR Code</option>
                <option value="CARD">💳 Debit / Credit Card</option>
                <option value="CASH">💵 Cash Drawer</option>
                <option value="DIRECT_BILL">🏢 Bill to Company (BTC / Corporate)</option>
                <option value="BANK_TRANSFER">🏦 Bank Transfer / NEFT</option>
                <option value="OTA_VCC">🌐 OTA Virtual Card</option>
                <option value="CHEQUE">📝 Cheque</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Amount (₹) *</label>
              <input
                type="number"
                required
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono font-black text-base"
              />
            </div>
          </div>

          {/* Corporate Direct Billing Fields */}
          {paymentForm.method === "DIRECT_BILL" && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 space-y-3.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider font-mono">
                <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Bill to Company (BTC / Corporate Ledger)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Company Entity *</label>
                  <input
                    type="text"
                    required={paymentForm.method === "DIRECT_BILL"}
                    placeholder="e.g. Tata Consultancy Services"
                    value={paymentForm.companyName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, companyName: e.target.value })}
                    className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Company GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 18AAAAA0000A1Z5"
                    value={paymentForm.gstin}
                    onChange={(e) => setPaymentForm({ ...paymentForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Corporate PO # / Approval Ref *</label>
                  <input
                    type="text"
                    required={paymentForm.method === "DIRECT_BILL"}
                    placeholder="e.g. PO-2026-8891 / Mgr Approval"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Credit Terms</label>
                  <select
                    value={paymentForm.creditPeriod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, creditPeriod: e.target.value })}
                    className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="15_DAYS">Net 15 Days</option>
                    <option value="30_DAYS">Net 30 Days (Standard Corporate)</option>
                    <option value="45_DAYS">Net 45 Days</option>
                    <option value="60_DAYS">Net 60 Days</option>
                    <option value="IMMEDIATE">Immediate Invoice Submission</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Billing Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Executive Summit / Project Team Bill"
                  value={paymentForm.billingRemarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, billingRemarks: e.target.value })}
                  className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {paymentForm.method !== "DIRECT_BILL" && (
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Reference / UTR / Auth Code</label>
              <input
                type="text"
                placeholder="e.g. UTR/98127391823 or Cash Ref"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          )}

          <div>
            <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">
              {paymentForm.method === "DIRECT_BILL" ? "Authorized Guest / Employee Name" : "Payer Name"}
            </label>
            <input
              type="text"
              value={paymentForm.payerName}
              onChange={(e) => setPaymentForm({ ...paymentForm, payerName: e.target.value })}
              className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
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
              className="h-11 px-6 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 font-black transition disabled:opacity-50 shadow-md flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="h-4 w-4" />
              {loading
                ? "Recording..."
                : paymentForm.method === "DIRECT_BILL"
                ? "Bill to Company Ledger"
                : "Record Payment & Settle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
