import React, { useState } from "react";
import {
  Receipt,
  CreditCard,
  Coins,
  Layers,
  AlertCircle,
  CheckCircle2,
  X,
  Smartphone,
  Banknote,
  Building2,
  Hash,
  ShieldCheck,
} from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";
import { formatGuestDisplayName } from "@/lib/domain/name-utils";
import initialCompaniesJson from "@/data/initial-companies.json";
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
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  if (!isOpen) return null;

  const appliedAdvance =
    Number(checkoutAdvanceAmount) || Math.min(currentBalance, groupAdvanceMetrics.available);
  const netAdvanceSettlement = Math.max(0, currentBalance - appliedAdvance);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white max-h-[90vh] overflow-y-auto">
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
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer p-1 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Financial Summary Stat Bar (Anti-Boxy) */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800 text-center">
            <div className="px-2">
              <div className="text-xs uppercase font-bold tracking-wider text-zinc-400">Total Charges</div>
              <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-mono mt-0.5">
                {formatINR(totalCharges)}
              </div>
            </div>
            <div className="px-2">
              <div className="text-xs uppercase font-bold tracking-wider text-zinc-400">Already Paid</div>
              <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {formatINR(totalPayments)}
              </div>
            </div>
            <div className="px-2">
              <div className="text-xs uppercase font-bold tracking-wider text-zinc-400">Balance Due</div>
              <div
                className={`text-base sm:text-lg font-black font-mono mt-0.5 ${
                  currentBalance > 0.05
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatINR(currentBalance)}
              </div>
            </div>
          </div>

          {/* Group Advance Pool context chip */}
          {isMultiRoomGroup && groupAdvanceMetrics.available > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-400">
                <Coins className="h-4 w-4 text-amber-500" />
                <span>Group Advance Pool Available:</span>
              </div>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(groupAdvanceMetrics.available)}
              </span>
            </div>
          )}
        </div>

        {/* Settlement Method Segmented Control (Unified, Non-Truncated) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Settlement Method
          </label>
          <div className="p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            <div
              className={`grid gap-1 text-xs font-semibold ${
                groupAdvanceMetrics.available > 0 && isMultiRoomGroup && groupBillingMode === "NO"
                  ? "grid-cols-2 sm:grid-cols-4"
                  : isMultiRoomGroup && groupBillingMode === "NO"
                  ? "grid-cols-3"
                  : "grid-cols-2"
              }`}
            >
              {/* Tab 1: Group Advance Pool (if available) */}
              {groupAdvanceMetrics.available > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutTab("APPLY_ADVANCE");
                    if (!checkoutAdvanceAmount) {
                      setCheckoutAdvanceAmount(String(Math.min(currentBalance, groupAdvanceMetrics.available)));
                    }
                  }}
                  className={`h-10 px-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer text-center whitespace-nowrap ${
                    checkoutTab === "APPLY_ADVANCE"
                      ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-xs border border-zinc-200/90 dark:border-zinc-700/80"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <Coins className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Group Advance</span>
                </button>
              )}

              {/* Tab 2: Guest Pays Now */}
              <button
                type="button"
                onClick={() => setCheckoutTab("PAY_NOW")}
                className={`h-10 px-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer text-center whitespace-nowrap ${
                  checkoutTab === "PAY_NOW"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-xs border border-zinc-200/90 dark:border-zinc-700/80"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/60"
                }`}
              >
                <CreditCard className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>Guest Pays Now</span>
              </button>

              {/* Tab 3: Bill to Group */}
              {isMultiRoomGroup && groupBillingMode === "NO" && (
                <button
                  type="button"
                  onClick={() => setCheckoutTab("TRANSFER")}
                  className={`h-10 px-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer text-center whitespace-nowrap ${
                    checkoutTab === "TRANSFER"
                      ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-xs border border-zinc-200/90 dark:border-zinc-700/80"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <Layers className="h-4 w-4 shrink-0 text-blue-500" />
                  <span>Bill to Group</span>
                </button>
              )}

              {/* Tab 4: City Ledger / Due */}
              <button
                type="button"
                onClick={() => setCheckoutTab("DEBTOR")}
                className={`h-10 px-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer text-center whitespace-nowrap ${
                  checkoutTab === "DEBTOR"
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-xs border border-zinc-200/90 dark:border-zinc-700/80"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/60"
                  }`}
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>City Ledger</span>
              </button>
            </div>
          </div>
        </div>

        {/* TAB CONTENT 1: DEDUCT FROM GROUP ADVANCE POOL */}
        {checkoutTab === "APPLY_ADVANCE" && (
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    Group Advance Allocation
                  </span>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Debit room balance from collected group advance</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Pool Available</div>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatINR(groupAdvanceMetrics.available)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Amount to Deduct from Pool *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCheckoutAdvanceAmount(String(Math.min(currentBalance, groupAdvanceMetrics.available)))
                  }
                  className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-200/70 hover:bg-zinc-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300/50 dark:border-zinc-700/60 transition cursor-pointer"
                >
                  Use Max Due ({formatINR(Math.min(currentBalance, groupAdvanceMetrics.available))})
                </button>
              </div>
              <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus-within:border-zinc-950 dark:focus-within:border-zinc-200 focus-within:ring-2 focus-within:ring-zinc-950/10 transition shadow-xs overflow-hidden">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="text-zinc-400 font-bold font-mono text-base">₹</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={groupAdvanceMetrics.available}
                  value={checkoutAdvanceAmount}
                  onChange={(e) => setCheckoutAdvanceAmount(e.target.value)}
                  className="w-full h-11 pl-8 pr-3.5 bg-transparent text-base font-bold font-mono text-zinc-900 dark:text-white focus:outline-none placeholder-zinc-400"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Financial Breakdown with Hairline Divider */}
            <div className="py-2.5 border-y border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span>Room {activeRoomNumber} Due:</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                  {formatINR(currentBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span>Advance Allocation:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  - {formatINR(appliedAdvance)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 font-bold">
                <span className="text-zinc-700 dark:text-zinc-300">Net Room Settlement:</span>
                <span
                  className={`font-mono ${
                    netAdvanceSettlement <= 0.05
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatINR(netAdvanceSettlement)}{" "}
                  {netAdvanceSettlement <= 0.05 ? "(Fully Settled)" : "(Remaining Due)"}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 p-3.5 flex items-start gap-3 shadow-xs">
              <div className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 border border-amber-200/60 dark:border-amber-800/60">
                <Coins className="w-4 h-4" />
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The applied amount will be debited from the Group Advance Pool and allocated to Room{" "}
                <strong className="font-mono text-zinc-950 dark:text-zinc-50">{activeRoomNumber}</strong>. The room will check out with a complete GST Tax Invoice.
              </p>
            </div>
          </div>
        )}

        {/* TAB CONTENT 2: GUEST PAYS NOW */}
        {checkoutTab === "PAY_NOW" && (
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    Collect Payment from Guest
                  </span>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Direct settlement & invoice generation</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Total to Collect</div>
                <span className="text-base font-black font-mono text-zinc-950 dark:text-white">
                  {formatINR(Number(checkoutPaymentAmount) || currentBalance)}
                </span>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-2">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
                  {[
                    { code: "UPI", label: "UPI / QR", icon: Smartphone },
                    { code: "CASH", label: "Cash", icon: Banknote },
                    { code: "CARD", label: "Card Swipe", icon: CreditCard },
                    { code: "BANK_TRANSFER", label: "NetBanking", icon: Building2 },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = checkoutPaymentMethod === m.code;
                    return (
                      <button
                        key={m.code}
                        type="button"
                        onClick={() => setCheckoutPaymentMethod(m.code)}
                        className={`h-11 px-3 rounded-xl border transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer text-xs font-bold ${
                          isSelected
                            ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs ring-1 ring-zinc-950/10"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-850"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-white dark:text-zinc-950" : "text-zinc-400"}`} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      Amount to Collect *
                    </label>
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentAmount(String(currentBalance))}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-200/70 hover:bg-zinc-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300/50 dark:border-zinc-700/60 transition cursor-pointer"
                    >
                      Full Due ({formatINR(currentBalance)})
                    </button>
                  </div>
                  <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus-within:border-zinc-950 dark:focus-within:border-zinc-200 focus-within:ring-2 focus-within:ring-zinc-950/10 transition shadow-xs overflow-hidden">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-zinc-400 font-bold font-mono text-base">₹</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={checkoutPaymentAmount}
                      onChange={(e) => setCheckoutPaymentAmount(e.target.value)}
                      className="w-full h-11 pl-8 pr-3.5 bg-transparent text-base font-bold font-mono text-zinc-900 dark:text-white focus:outline-none placeholder-zinc-400"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Transaction Ref / UTR
                  </label>
                  <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus-within:border-zinc-950 dark:focus-within:border-zinc-200 focus-within:ring-2 focus-within:ring-zinc-950/10 transition shadow-xs overflow-hidden">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Hash className="w-4 h-4 text-zinc-400" />
                    </div>
                    <input
                      type="text"
                      placeholder={
                        checkoutPaymentMethod === "UPI"
                          ? "e.g. 12-digit UPI Ref / UTR / GPay ID"
                          : checkoutPaymentMethod === "CARD"
                          ? "e.g. Auth Code / Card Last 4 Digits"
                          : checkoutPaymentMethod === "BANK_TRANSFER"
                          ? "e.g. NEFT / IMPS Reference Number"
                          : "e.g. Shift / Cashier Notes (Optional)"
                      }
                      value={checkoutPaymentRef}
                      onChange={(e) => setCheckoutPaymentRef(e.target.value)}
                      className="w-full h-11 pl-9 pr-3.5 bg-transparent text-sm font-medium text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 p-3.5 flex items-start gap-3 shadow-xs">
                <div className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 border border-emerald-200/60 dark:border-emerald-800/60">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-200">
                    Direct Room Settlement:
                  </span>{" "}
                  <span>
                    Settles Room <strong className="font-mono text-zinc-950 dark:text-zinc-50">{activeRoomNumber}</strong> directly.
                    {isMultiRoomGroup && " Leaves the Group Advance Pool 100% intact for remaining rooms."}{" "}
                    Issues official GST Tax Invoice and completes checkout.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT 3: TRANSFER BALANCE TO GROUP MASTER */}
        {checkoutTab === "TRANSFER" && (
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    Transfer Balance to Group Master
                  </span>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Transfer outstanding charges to master folio</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Transfer Amount</div>
                <span className="text-base font-black font-mono text-zinc-900 dark:text-white">
                  {formatINR(currentBalance)}
                </span>
              </div>
            </div>

            <div className="py-2.5 border-y border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span>Target Account:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  Group Master Folio ({Math.max(1, allGroupRooms.length - 1)} remaining in-house rooms)
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span>Room {activeRoomNumber} Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ Settled at ₹0.00 (Tax Invoice Issued)
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                Transfer Remarks & Notes (Optional)
              </label>
              <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus-within:border-zinc-950 dark:focus-within:border-zinc-200 focus-within:ring-2 focus-within:ring-zinc-950/10 transition shadow-xs overflow-hidden">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Hash className="w-4 h-4 text-zinc-400" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Approved by group tour lead / company master"
                  value={checkoutTransferRemarks}
                  onChange={(e) => setCheckoutTransferRemarks(e.target.value)}
                  className="w-full h-11 pl-9 pr-3.5 bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 p-3.5 flex items-start gap-3 shadow-xs">
              <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 border border-blue-200/60 dark:border-blue-800/60">
                <Layers className="w-4 h-4" />
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The remaining balance of <strong>{formatINR(currentBalance)}</strong> will be transferred as an
                adjusting charge to the Group Master Folio. Room {activeRoomNumber} will check out at ₹0.00 and
                the group organizer will absorb this balance.
              </p>
            </div>
          </div>
        )}

        {/* TAB CONTENT 4: DEBTORS / CITY LEDGER */}
        {checkoutTab === "DEBTOR" && (
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    City Ledger / Debtors Registration
                  </span>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Check out with balance tracked as outstanding receivable</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Outstanding Due</div>
                <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                  {formatINR(currentBalance)}
                </span>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  Reason for Outstanding Check-Out *
                </label>
                <select
                  value={outstandingForm.reason}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOutstandingForm({ ...outstandingForm, reason: val });
                  }}
                  className="w-full h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-200 transition cursor-pointer shadow-xs"
                >
                  <option value="Corporate Direct Billing / Bill to Company">
                    🏢 Corporate Direct Billing / Bill to Company
                  </option>
                  <option value="Guest Promised Online / Bank Transfer">
                    💳 Guest Promised Online / Bank Transfer
                  </option>
                  <option value="Delayed Settlement on Departure">⏱️ Delayed Settlement on Departure</option>
                  <option value="Disputed Charge Under Audit Hold">⚖️ Disputed Charge Under Audit Hold</option>
                  <option value="Management Approved Credit">👔 Management Approved Credit</option>
                </select>
              </div>

              {/* Corporate Direct Billing: Company Dropdown Selection */}
              {outstandingForm.reason === "Corporate Direct Billing / Bill to Company" && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                    Select Registered Company
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedCompanyId(id);
                      if (!id) return;
                      const comp = (initialCompaniesJson as any[]).find(
                        (c: any) => (c.id || c.accountName) === id
                      );
                      if (comp) {
                        setOutstandingForm((prev) => ({
                          ...prev,
                          remarks: `Corporate Billing: ${comp.accountName}${
                            comp.gstin ? ` (GST: ${comp.gstin})` : ""
                          }`,
                        }));
                      }
                    }}
                    className="w-full h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-950 cursor-pointer shadow-xs"
                  >
                    <option value="">-- Choose Company from Master List --</option>
                    {(initialCompaniesJson as any[]).map((c: any, idx: number) => (
                      <option key={c.id || `${c.accountName}-${idx}`} value={c.id || c.accountName}>
                        {c.accountName} {c.city ? `(${c.city})` : ""} {c.gstin ? `• GST: ${c.gstin}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Settlement Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={outstandingForm.dueDate}
                    onChange={(e) => setOutstandingForm({ ...outstandingForm, dueDate: e.target.value })}
                    className="w-full h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-200 transition shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                    Payer Category
                  </label>
                  <div className="h-11 px-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                    {activeStay?.primaryGuest?.companyName
                      ? `Corporate: ${activeStay.primaryGuest.companyName}`
                      : "Individual Guest"}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  Manager Remarks & Notes
                </label>
                <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus-within:border-zinc-950 dark:focus-within:border-zinc-200 focus-within:ring-2 focus-within:ring-zinc-950/10 transition shadow-xs overflow-hidden">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Hash className="w-4 h-4 text-zinc-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Approved by Duty Manager; invoice sent to accounts"
                    value={outstandingForm.remarks}
                    onChange={(e) => setOutstandingForm({ ...outstandingForm, remarks: e.target.value })}
                    className="w-full h-11 pl-9 pr-3.5 bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 p-3.5 flex items-start gap-3 shadow-xs">
                <div className="p-1 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 border border-rose-200/60 dark:border-rose-800/60">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Room <strong className="font-mono text-zinc-950 dark:text-zinc-50">{activeRoomNumber}</strong> will check out with an outstanding debtor record in City Ledger. The
                  folio will be tracked in Outstanding Dues until settled.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs sm:text-sm font-bold cursor-pointer transition"
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
                className="h-11 px-6 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-[0.98] text-white dark:text-zinc-950 text-xs sm:text-sm font-bold transition disabled:opacity-50 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
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
                className="h-11 px-6 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-[0.98] text-white dark:text-zinc-950 text-xs sm:text-sm font-bold transition disabled:opacity-50 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Coins className="h-4 w-4 text-amber-500" />
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
                className="h-11 px-6 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-[0.98] text-white dark:text-zinc-950 text-xs sm:text-sm font-bold transition disabled:opacity-50 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Layers className="h-4 w-4 text-blue-500" />
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
                className="h-11 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs sm:text-sm font-bold transition disabled:opacity-50 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertCircle className="h-4 w-4" />
                <span>{loading ? "Processing..." : "Confirm Outstanding Check-Out"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
