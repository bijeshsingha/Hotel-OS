import React, { useState, useEffect } from "react";
import { CreditCard, Building2, X, Coins, Calendar } from "lucide-react";
import { PaymentFormState, GroupAdvanceMetrics, getTodayLocalDate } from "./billing-types";
import { formatINR } from "@/lib/gst/calculator";
import initialCompaniesJson from "@/data/initial-companies.json";

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStay: any;
  activeProperty?: any;
  paymentForm: PaymentFormState;
  setPaymentForm: React.Dispatch<React.SetStateAction<PaymentFormState>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
  groupAdvanceMetrics?: GroupAdvanceMetrics;
  activeRoomNumber?: string;
}

export function CollectPaymentModal({
  isOpen,
  onClose,
  activeStay,
  activeProperty,
  paymentForm,
  setPaymentForm,
  onSubmit,
  loading,
  groupAdvanceMetrics,
  activeRoomNumber,
}: CollectPaymentModalProps) {
  const [companies, setCompanies] = useState<any[]>(initialCompaniesJson || []);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  useEffect(() => {
    async function loadCompanies() {
      try {
        const propId = activeProperty?.id || "";
        const res = await fetch(`/api/v1/companies?propertyId=${propId}&type=ALL`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCompanies(data);
          }
        }
      } catch (err) {
        console.warn("Could not fetch companies from API, using default list:", err);
      }
    }
    loadCompanies();
  }, [activeProperty?.id]);

  useEffect(() => {
    if (paymentForm.companyName && companies.length > 0) {
      const match = companies.find(
        (c: any) => c.accountName?.toLowerCase() === paymentForm.companyName.toLowerCase()
      );
      if (match) {
        setSelectedCompanyId(match.id || match.accountName);
      }
    }
  }, [paymentForm.companyName, companies]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4  ">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-zinc-900 dark:text-white ui-radius-panel ui-dialog-surface ui-surface">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 ui-weight-medium ui-section-title">
            <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Collect Payment for Room {activeStay?.roomAssignments?.[0]?.room?.number}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer ui-control">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Group Advance Pool Deduction Banner (if advance available) */}
        {groupAdvanceMetrics && groupAdvanceMetrics.available > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-center justify-between gap-3 text-xs ui-radius-panel ui-text-body">
            <div className="flex items-center gap-2.5">
              <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div className="font-bold text-amber-900 dark:text-amber-200 ui-weight-medium">Group Advance Pool Available</div>
                <div className="text-[11px] text-zinc-500 font-mono ui-text-meta ui-font-body">
                  {formatINR(groupAdvanceMetrics.available)} available in unallocated group deposits
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPaymentForm((prev) => ({
                  ...prev,
                  method: "ADVANCE_ALLOCATION",
                  amount: String(Math.min(Number(prev.amount) || groupAdvanceMetrics.available, groupAdvanceMetrics.available)),
                  reference: `Deduction from Group Advance Pool for Room ${activeRoomNumber || ""}`,
                }));
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer transition text-xs shrink-0 ui-radius-control ui-weight-medium ui-text-body ui-control"
            >
              Use Group Advance
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 text-xs sm:text-sm ui-text-body">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5 ui-weight-medium ui-label">Payment Method *</label>
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
                        : newMethod === "ADVANCE_ALLOCATION"
                        ? `Deduction from Group Advance Pool for Room ${activeRoomNumber || ""}`
                        : prev.reference,
                  }));
                }}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer ui-radius-control ui-weight-medium ui-field" aria-label="Payment Method"
              >
                {groupAdvanceMetrics && groupAdvanceMetrics.available > 0 && (
                  <option value="ADVANCE_ALLOCATION">
                    🪙 Deduct from Group Pool ({formatINR(groupAdvanceMetrics.available)})
                  </option>
                )}
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
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5 ui-weight-medium ui-label">Amount (₹) *</label>
              <input
                type="number"
                required
                step="0.01"
                max={paymentForm.method === "ADVANCE_ALLOCATION" && groupAdvanceMetrics ? groupAdvanceMetrics.available : undefined}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono font-black text-base ui-radius-control ui-font-body ui-weight-medium ui-field" aria-label="Amount (₹)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5 flex items-center gap-1.5 ui-weight-medium ui-label">
                <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Payment Date *</span>
              </label>
              <input
                type="date"
                required
                value={paymentForm.date || getTodayLocalDate()}
                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono text-xs sm:text-sm cursor-pointer ui-radius-control ui-font-body ui-text-body ui-field"
              />
            </div>
            {paymentForm.method !== "DIRECT_BILL" ? (
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5 ui-weight-medium ui-label">Reference / UTR / Auth Code</label>
                <input
                  type="text"
                  placeholder="e.g. UTR/98127391823 or Cash Ref"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono text-xs sm:text-sm ui-radius-control ui-font-body ui-text-body ui-field" aria-label="Reference / UTR / Auth Code"
                />
              </div>
            ) : (
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5 ui-weight-medium ui-label">
                  Authorized Guest / Employee Name
                </label>
                <input
                  type="text"
                  value={paymentForm.payerName}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payerName: e.target.value })}
                  className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium text-xs sm:text-sm ui-radius-control ui-text-body ui-field" aria-label="Authorized Guest / Employee Name"
                />
              </div>
            )}
          </div>

          {paymentForm.method !== "DIRECT_BILL" && (
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5 ui-weight-medium ui-label">Payer Name</label>
              <input
                type="text"
                value={paymentForm.payerName}
                onChange={(e) => setPaymentForm({ ...paymentForm, payerName: e.target.value })}
                className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium text-xs sm:text-sm ui-radius-control ui-text-body ui-field" aria-label="Payer Name"
              />
            </div>
          )}

          {/* Group Advance Pool Deduction Notice */}
          {paymentForm.method === "ADVANCE_ALLOCATION" && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 space-y-1   ui-radius-panel">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 ui-text-body ui-weight-medium">
                <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Group Advance Pool Deduction</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed ui-text-meta">
                Applying <strong>{formatINR(Number(paymentForm.amount) || 0)}</strong> directly from the available Group Advance Pool. The room balance will decrease immediately and the group pool will be debited.
              </p>
            </div>
          )}

          {/* Corporate Direct Billing Fields */}
          {paymentForm.method === "DIRECT_BILL" && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 space-y-3.5   ui-radius-panel">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider font-mono ui-text-body ui-weight-medium ui-font-body">
                <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Bill to Company (BTC / Corporate Ledger)</span>
              </div>

              {/* Company Dropdown Selection */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1 ui-text-body ui-weight-medium ui-label">
                  Select Registered Company
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedCompanyId(id);
                    if (!id) return;
                    const comp = companies.find((c: any) => (c.id || c.accountName) === id);
                    if (comp) {
                      setPaymentForm((prev) => ({
                        ...prev,
                        companyName: comp.accountName,
                        gstin: comp.gstin || prev.gstin,
                        reference:
                          prev.reference && !prev.reference.startsWith("PO-")
                            ? prev.reference
                            : `PO-${(comp.shortName || comp.accountName).slice(0, 10).replace(/[^a-zA-Z0-9]/g, "")}`,
                      }));
                    }
                  }}
                  className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer ui-radius-control ui-text-body ui-weight-medium ui-surface ui-field" aria-label="Select Registered Company"
                >
                  <option value="">-- Choose Company from Master List (or type below) --</option>
                  {companies.map((c: any, idx: number) => (
                    <option key={c.id || `${c.accountName}-${idx}`} value={c.id || c.accountName}>
                      {c.accountName} {c.city ? `(${c.city})` : ""} {c.gstin ? `• GST: ${c.gstin}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1 ui-text-body ui-weight-medium ui-label">Company Entity *</label>
                  <input
                    type="text"
                    required={paymentForm.method === "DIRECT_BILL"}
                    placeholder="e.g. Tata Consultancy Services"
                    value={paymentForm.companyName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, companyName: e.target.value })}
                    className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs font-bold focus:outline-none focus:border-amber-500 ui-radius-control ui-text-body ui-weight-medium ui-surface ui-field" aria-label="Company Entity"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1 ui-text-body ui-weight-medium ui-label">Company GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 18AAAAA0000A1Z5"
                    value={paymentForm.gstin}
                    onChange={(e) => setPaymentForm({ ...paymentForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs font-mono focus:outline-none focus:border-amber-500 ui-radius-control ui-text-body ui-font-body ui-surface ui-field" aria-label="Company GSTIN"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1 ui-text-body ui-weight-medium ui-label">Corporate PO # / Approval Ref *</label>
                  <input
                    type="text"
                    required={paymentForm.method === "DIRECT_BILL"}
                    placeholder="e.g. PO-2026-8891 / Mgr Approval"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs font-mono focus:outline-none focus:border-amber-500 ui-radius-control ui-text-body ui-font-body ui-surface ui-field" aria-label="Corporate PO # / Approval Ref"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1 ui-text-body ui-weight-medium ui-label">Credit Terms</label>
                  <select
                    value={paymentForm.creditPeriod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, creditPeriod: e.target.value })}
                    className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 font-bold ui-radius-control ui-text-body ui-weight-medium ui-surface ui-field" aria-label="Credit Terms"
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
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1 ui-text-body ui-weight-medium ui-label">Billing Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Executive Summit / Project Team Bill"
                  value={paymentForm.billingRemarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, billingRemarks: e.target.value })}
                  className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 ui-radius-control ui-text-body ui-surface ui-field" aria-label="Billing Remarks"
                />
              </div>
            </div>
          )}



          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold cursor-pointer ui-radius-control ui-weight-medium ui-control ui-control-sized"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-6 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 font-black transition disabled:opacity-50 shadow-md flex items-center gap-2 cursor-pointer ui-radius-control ui-weight-medium ui-shadow-quiet ui-control ui-control-sized"
            >
              <CreditCard className="h-4 w-4" />
              {loading
                ? "Processing..."
                : paymentForm.method === "DIRECT_BILL"
                ? "Bill to Company Ledger"
                : paymentForm.method === "ADVANCE_ALLOCATION"
                ? `Deduct ${formatINR(Number(paymentForm.amount) || 0)} from Group Pool`
                : "Record Payment & Settle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
