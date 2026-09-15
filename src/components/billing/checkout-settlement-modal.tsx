import React from "react";
import { Receipt, CreditCard, Coins, Layers, AlertCircle, CheckCircle2, X } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";
import { formatGuestDisplayName } from "@/lib/domain/name-utils";
import { GroupAdvanceMetrics, OutstandingFormState } from "./billing-types";

interface CheckoutSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStay: any;
  activeRoomNumber: string;
  allGroupRooms: string[];
  isMultiRoomGroup: boolean;
  groupBillingMode: "NO" | "YES";
  totalCharges: number;
  totalPayments: number;
  currentBalance: number;
  groupAdvanceMetrics: GroupAdvanceMetrics;
  checkoutTab: "PAY_NOW" | "APPLY_ADVANCE" | "TRANSFER" | "DEBTOR";
  setCheckoutTab: (tab: "PAY_NOW" | "APPLY_ADVANCE" | "TRANSFER" | "DEBTOR") => void;
  checkoutPaymentMethod: string;
  setCheckoutPaymentMethod: (method: string) => void;
  checkoutPaymentAmount: string;
  setCheckoutPaymentAmount: (amount: string) => void;
  checkoutPaymentRef: string;
  setCheckoutPaymentRef: (ref: string) => void;
  checkoutAdvanceAmount: string;
  setCheckoutAdvanceAmount: (amount: string) => void;
  checkoutTransferRemarks: string;
  setCheckoutTransferRemarks: (remarks: string) => void;
  outstandingForm: OutstandingFormState;
  setOutstandingForm: React.Dispatch<React.SetStateAction<OutstandingFormState>>;
  onPerformCheckout: (options: any) => Promise<void>;
  loading: boolean;
}

export function CheckoutSettlementModal({
  isOpen,
  onClose,
  activeStay,
  activeRoomNumber,
  allGroupRooms,
  isMultiRoomGroup,
  groupBillingMode,
  totalCharges,
  totalPayments,
  currentBalance,
  groupAdvanceMetrics,
  checkoutTab,
  setCheckoutTab,
  checkoutPaymentMethod,
  setCheckoutPaymentMethod,
  checkoutPaymentAmount,
  setCheckoutPaymentAmount,
  checkoutPaymentRef,
  setCheckoutPaymentRef,
  checkoutAdvanceAmount,
  setCheckoutAdvanceAmount,
  checkoutTransferRemarks,
  setCheckoutTransferRemarks,
  outstandingForm,
  setOutstandingForm,
  onPerformCheckout,
  loading,
}: CheckoutSettlementModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Check Out Room {activeRoomNumber}</span>
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                {formatGuestDisplayName(activeStay?.primaryGuest?.name)} •{" "}
                {isMultiRoomGroup && groupBillingMode === "NO"
                  ? `Group Stay (${allGroupRooms.length} Rooms)`
                  : "Standard Room Checkout"}
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

        {/* Financial Summary Card */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Total Charges</div>
              <div className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white font-mono">
                {formatINR(totalCharges)}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Already Paid</div>
              <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(totalPayments)}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
              <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Balance Due</div>
              <div className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                {formatINR(currentBalance)}
              </div>
            </div>
          </div>

          {/* Group Advance Availability Notice */}
          {isMultiRoomGroup && groupAdvanceMetrics.available > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
              <Coins className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Group has <strong>{formatINR(groupAdvanceMetrics.available)}</strong> unallocated advance deposit available that can settle this room.
              </span>
            </div>
          )}
        </div>

        {/* Settlement Method Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider block">
            Choose Settlement Method:
          </label>
          <div
            className={`grid gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold ${
              groupAdvanceMetrics.available > 0 && isMultiRoomGroup && groupBillingMode === "NO"
                ? "grid-cols-2 sm:grid-cols-4"
                : isMultiRoomGroup && groupBillingMode === "NO"
                ? "grid-cols-3"
                : "grid-cols-2"
            }`}
          >
            {/* Tab 1: Guest Pays Now */}
            <button
              type="button"
              onClick={() => setCheckoutTab("PAY_NOW")}
              className={`py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                checkoutTab === "PAY_NOW"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Guest Pays Now</span>
            </button>

            {/* Tab 2: Deduct from Group Advance Pool */}
            {groupAdvanceMetrics.available > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCheckoutTab("APPLY_ADVANCE");
                  if (!checkoutAdvanceAmount) {
                    setCheckoutAdvanceAmount(String(Math.min(currentBalance, groupAdvanceMetrics.available)));
                  }
                }}
                className={`py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  checkoutTab === "APPLY_ADVANCE"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <Coins className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Group Advance</span>
              </button>
            )}

            {/* Tab 3: Transfer to Group Master */}
            {isMultiRoomGroup && groupBillingMode === "NO" && (
              <button
                type="button"
                onClick={() => setCheckoutTab("TRANSFER")}
                className={`py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  checkoutTab === "TRANSFER"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Bill to Group</span>
              </button>
            )}

            {/* Tab 4: Debtors / City Ledger */}
            <button
              type="button"
              onClick={() => setCheckoutTab("DEBTOR")}
              className={`py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                checkoutTab === "DEBTOR"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">City Ledger / Due</span>
            </button>
          </div>
        </div>

        {/* TAB CONTENT 1: GUEST PAYS NOW */}
        {checkoutTab === "PAY_NOW" && (
          <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">Payment Collection Amount:</span>
              <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                {formatINR(Number(checkoutPaymentAmount) || currentBalance)}
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-semibold">
                  {[
                    { code: "UPI", label: "UPI / QR", icon: "📱" },
                    { code: "CASH", label: "Cash", icon: "💵" },
                    { code: "CARD", label: "Card Swipe", icon: "💳" },
                    { code: "BANK_TRANSFER", label: "NetBanking", icon: "🏦" },
                  ].map((m) => (
                    <button
                      key={m.code}
                      type="button"
                      onClick={() => setCheckoutPaymentMethod(m.code)}
                      className={`py-2 px-2 rounded-xl border transition flex items-center justify-center gap-1 cursor-pointer ${
                        checkoutPaymentMethod === m.code
                          ? "bg-white dark:bg-zinc-900 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold"
                          : "bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-white"
                      }`}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">
                    Amount to Collect (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={checkoutPaymentAmount}
                    onChange={(e) => setCheckoutPaymentAmount(e.target.value)}
                    className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-sm font-bold font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">
                    Transaction Ref / UTR
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref / Card Auth Code"
                    value={checkoutPaymentRef}
                    onChange={(e) => setCheckoutPaymentRef(e.target.value)}
                    className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1">
                ✓ Settle this payment on Room <strong>{activeRoomNumber}</strong>, issue the final GST Tax Invoice, and check out the guest.
              </p>
            </div>
          </div>
        )}

        {/* TAB CONTENT 2: DEDUCT FROM GROUP ADVANCE POOL */}
        {checkoutTab === "APPLY_ADVANCE" && (
          <div className="space-y-3 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">Group Advance Pool Balance:</span>
              <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatINR(groupAdvanceMetrics.available)} Available
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">
                  Amount to Deduct from Group Advance (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={groupAdvanceMetrics.available}
                  value={checkoutAdvanceAmount}
                  onChange={(e) => setCheckoutAdvanceAmount(e.target.value)}
                  className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-sm font-bold font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Room {activeRoomNumber} Due:</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatINR(currentBalance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Advance Applied:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    - {formatINR(Number(checkoutAdvanceAmount) || Math.min(currentBalance, groupAdvanceMetrics.available))}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 font-bold">
                  <span className="text-zinc-700 dark:text-zinc-300">Net Room Settlement:</span>
                  <span className="text-emerald-600 font-mono">
                    {formatINR(
                      Math.max(
                        0,
                        currentBalance -
                          (Number(checkoutAdvanceAmount) || Math.min(currentBalance, groupAdvanceMetrics.available))
                      )
                    )}{" "}
                    (Settled)
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                The applied amount will be recorded as <strong>Advance Allocation</strong> on Room {activeRoomNumber} and debited from the Group Advance Pool. The room will check out with a complete GST Tax Invoice.
              </p>
            </div>
          </div>
        )}

        {/* TAB CONTENT 3: TRANSFER BALANCE TO GROUP MASTER */}
        {checkoutTab === "TRANSFER" && (
          <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">Balance to Transfer to Group:</span>
              <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                {formatINR(currentBalance)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Target Account</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  Group Master Folio ({allGroupRooms.length - 1} remaining in-house rooms)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Room {activeRoomNumber} Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ Settled at ₹0.00 (Tax Invoice Issued)
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">
                Transfer Remarks & Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Approved by group tour lead / company master"
                value={checkoutTransferRemarks}
                onChange={(e) => setCheckoutTransferRemarks(e.target.value)}
                className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              The remaining balance of <strong>{formatINR(currentBalance)}</strong> will be transferred as an adjusting charge to the Group Master Folio. Room {activeRoomNumber} will check out at ₹0.00 and the group organizer will absorb this balance.
            </p>
          </div>
        )}

        {/* TAB CONTENT 4: DEBTORS / CITY LEDGER */}
        {checkoutTab === "DEBTOR" && (
          <div className="space-y-3 p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-900 dark:text-rose-300">Unsettled Balance to Log in Debtors:</span>
              <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                {formatINR(currentBalance)}
              </span>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">
                  Reason for Outstanding Check-Out *
                </label>
                <select
                  value={outstandingForm.reason}
                  onChange={(e) => setOutstandingForm({ ...outstandingForm, reason: e.target.value })}
                  className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 transition cursor-pointer"
                >
                  <option value="Corporate Direct Billing / Bill to Company">🏢 Corporate Direct Billing / Bill to Company</option>
                  <option value="Guest Promised Online / Bank Transfer">💳 Guest Promised Online / Bank Transfer</option>
                  <option value="Delayed Settlement on Departure">⏱️ Delayed Settlement on Departure</option>
                  <option value="Disputed Charge Under Audit Hold">⚖️ Disputed Charge Under Audit Hold</option>
                  <option value="Management Approved Credit">👔 Management Approved Credit</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">
                    Settlement Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={outstandingForm.dueDate}
                    onChange={(e) => setOutstandingForm({ ...outstandingForm, dueDate: e.target.value })}
                    className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-xs sm:text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">
                    Payer Category
                  </label>
                  <div className="h-10 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                    {activeStay?.primaryGuest?.companyName ? "Corporate Master" : "Individual Guest"}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">
                  Manager Remarks & Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved by Duty Manager; invoice sent to accounts"
                  value={outstandingForm.remarks}
                  onChange={(e) => setOutstandingForm({ ...outstandingForm, remarks: e.target.value })}
                  className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500 transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {checkoutTab === "PAY_NOW" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const payAmt = Number(checkoutPaymentAmount) || currentBalance;
                  onPerformCheckout({
                    paymentNow: {
                      amount: payAmt,
                      method: checkoutPaymentMethod,
                      reference: checkoutPaymentRef || `Settlement for Room ${activeRoomNumber}`,
                    },
                  });
                }}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-black transition disabled:opacity-50 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                <span>
                  {loading
                    ? "Processing..."
                    : `Collect ${formatINR(Number(checkoutPaymentAmount) || currentBalance)} & Check Out`}
                </span>
              </button>
            )}

            {checkoutTab === "APPLY_ADVANCE" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const advAmt =
                    Number(checkoutAdvanceAmount) || Math.min(currentBalance, groupAdvanceMetrics.available);
                  onPerformCheckout({
                    applyGroupAdvance: true,
                    groupAdvanceAmount: advAmt,
                  });
                }}
                className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-black transition disabled:opacity-50 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Coins className="h-4 w-4" />
                <span>
                  {loading
                    ? "Processing..."
                    : `Apply ${formatINR(
                        Number(checkoutAdvanceAmount) || Math.min(currentBalance, groupAdvanceMetrics.available)
                      )} Advance & Check Out`}
                </span>
              </button>
            )}

            {checkoutTab === "TRANSFER" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  onPerformCheckout({
                    transferBalanceToGroup: true,
                    transferRemarks: checkoutTransferRemarks,
                  });
                }}
                className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-black transition disabled:opacity-50 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Layers className="h-4 w-4" />
                <span>
                  {loading ? "Processing..." : `Transfer ${formatINR(currentBalance)} to Group & Check Out`}
                </span>
              </button>
            )}

            {checkoutTab === "DEBTOR" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  onPerformCheckout({
                    allowOutstanding: true,
                  });
                }}
                className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs font-black transition disabled:opacity-50 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{loading ? "Processing..." : "Confirm Outstanding Check-Out"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
