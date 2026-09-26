"use client";

import React from "react";
import { formatINR } from "@/lib/gst/calculator";
import {
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Layers,
  Printer,
  Plus,
  UtensilsCrossed,
  Phone,
  Mail,
} from "lucide-react";

interface FolioHeroProps {
  activeStay: any;
  activeRoomNumber: string;
  activeDirectoryItem: any;
  groupBillingMode: "YES" | "NO";
  setGroupBillingMode: (v: "YES" | "NO") => void;
  isMultiRoomGroup: boolean;
  allGroupRooms: string[];
  currentBalance: number;
  surplusCredit: number;
  totalCharges: number;
  totalTaxable: number;
  totalTaxes: number;
  totalPayments: number;
  paymentsCount: number;
  stayCalculations: any;
  gracePeriodMinutes: number;
  onGracePeriodChange: (mins: number) => void;
  groupAdvanceMetrics: { totalReceived: number; consumed: number; available: number };
  onManageAdvance: () => void;
  onExecuteCheckout: () => void;
  onOpenPaymentModal: () => void;
  onOpenPrintInvoice: () => void;
  onOpenLiveTaxBill: () => void;
  onOpenChargeModal: () => void;
  onOpenKotModal?: () => void;
  onOpenDiscountModal: () => void;
  onOpenRefundModal: (amt: number) => void;
  onOpenTransferRoomModal?: () => void;
  actionLoading: boolean;
  folioStatus?: string;
  formatDateTimeShort: (d?: string | null) => string;
  formatGuestDisplayName: (name?: string | null) => string;
  onApplyGroupAdvance?: (amount: number) => Promise<void>;
}

export function FolioHero({
  activeStay,
  activeRoomNumber,
  activeDirectoryItem,
  groupBillingMode,
  setGroupBillingMode,
  isMultiRoomGroup,
  allGroupRooms,
  currentBalance,
  surplusCredit,
  totalCharges,
  totalTaxable,
  totalTaxes,
  totalPayments,
  paymentsCount,
  stayCalculations,
  gracePeriodMinutes,
  onGracePeriodChange,
  groupAdvanceMetrics,
  onManageAdvance,
  onApplyGroupAdvance,
  onExecuteCheckout,
  onOpenPaymentModal,
  onOpenPrintInvoice,
  onOpenLiveTaxBill,
  onOpenChargeModal,
  onOpenKotModal,
  onOpenDiscountModal,
  onOpenRefundModal,
  onOpenTransferRoomModal,
  actionLoading,
  formatDateTimeShort,
  formatGuestDisplayName,
}: FolioHeroProps) {
  const isInHouse = activeStay?.status === "IN_HOUSE";
  const guest = activeStay?.primaryGuest;
  const roomTypeName =
    activeDirectoryItem?.roomType?.name ||
    activeStay?.roomAssignments?.[0]?.room?.roomType?.name ||
    "Standard Room";

  // Predecessor room lineage discovery
  const assignments = activeStay?.roomAssignments || [];
  const originRoomsSet = new Set<string>();

  if (activeRoomNumber && activeRoomNumber !== "Unassigned") {
    for (const ra of assignments) {
      const rNum = ra.room?.number;
      if (rNum === activeRoomNumber && ra.moveReason) {
        const match = ra.moveReason.match(/MOVED_FROM:([^|:]+)/i);
        if (match && match[1] && match[1].trim() !== activeRoomNumber) {
          originRoomsSet.add(match[1].trim());
        }
      }
      const reasonText = `${ra.moveReason || ""} ${ra.reason || ""}`;
      if (ra.endsAt && reasonText) {
        const movedMatch = reasonText.match(/Moved to Room\s+([A-Za-z0-9_-]+)/i);
        if (movedMatch && movedMatch[1]?.toLowerCase() === activeRoomNumber.toLowerCase()) {
          if (rNum && rNum !== activeRoomNumber) {
            originRoomsSet.add(rNum);
          }
        }
      }
    }
  }
  originRoomsSet.delete(activeRoomNumber);
  const predecessorRooms = Array.from(originRoomsSet);
  const hasTransfers = predecessorRooms.length > 0;
  const transferChain = predecessorRooms.join(", ");

  return (
    <div className="space-y-4">
      {/* MASTER FOLIO COMMAND DECK: Consolidated, non-boxy, high-legibility */}
      <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-hidden transition-colors duration-150">
        
        {/* Tier 1: Room Identification, Guest Details & Primary Action Cluster */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            
            {/* Left: Identification and Guest Details */}
            <div className="space-y-2.5 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-zinc-950 dark:text-zinc-50">
                  {groupBillingMode === "YES" && isMultiRoomGroup
                    ? `Rooms ${allGroupRooms.join(", ")}`
                    : `Room ${activeRoomNumber}`}
                </h1>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                  {groupBillingMode === "YES" && isMultiRoomGroup ? "Group Folio" : roomTypeName}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide shrink-0 ${
                    isInHouse
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60"
                  }`}
                >
                  {isInHouse && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                  <span>{isInHouse ? "In-House" : activeStay?.status || "Checked Out"}</span>
                </span>
              </div>

              {/* Room Transfer Lineage Notice (if guest moved rooms) */}
              {hasTransfers && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 font-medium"
                  title={`Previously stayed in Room ${transferChain}`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Transferred from Room <strong className="font-mono font-bold">{transferChain}</strong>
                  </span>
                </div>
              )}

              {/* Guest Meta Bar */}
              <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 flex-wrap">
                <span className="font-bold text-zinc-950 dark:text-zinc-100 text-base">
                  {formatGuestDisplayName(guest?.name) || "In-House Guest"}
                </span>

                {guest?.phone && (
                  <span className="inline-flex items-center gap-1 font-mono text-zinc-500">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{guest.phone}</span>
                  </span>
                )}

                {guest?.email && (
                  <span className="hidden md:inline-flex items-center gap-1 text-zinc-400">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>{guest.email}</span>
                  </span>
                )}

                {guest?.companyName && (
                  <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/50">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{guest.companyName}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Right: Consolidated Action Deck */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              {isInHouse ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenPaymentModal}
                    className="h-10 px-4.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition duration-150 shadow-xs cursor-pointer active:scale-[0.98]"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Collect Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={onExecuteCheckout}
                    disabled={actionLoading}
                    className="h-10 px-4.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition duration-150 shadow-xs cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{actionLoading ? "Processing..." : "Check Out"}</span>
                  </button>
                </>
              ) : (
                <>
                  {currentBalance > 0.5 && (
                    <button
                      type="button"
                      onClick={onOpenPaymentModal}
                      className="h-10 px-4.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Settle {formatINR(currentBalance)}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onOpenPrintInvoice}
                    className="h-10 px-4.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Final Invoice</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Operations Strip */}
          {isInHouse && (
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
              {onOpenTransferRoomModal && (
                <button
                  type="button"
                  onClick={onOpenTransferRoomModal}
                  className="h-8.5 px-3 rounded-lg border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Transfer guest stay to another vacant room"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Transfer Room</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenChargeModal}
                className="h-8.5 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
              >
                <Plus className="h-3.5 w-3.5 text-zinc-500" />
                <span>Post Charge</span>
              </button>

              {onOpenKotModal && (
                <button
                  type="button"
                  onClick={onOpenKotModal}
                  className="h-8.5 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
                  title="Add Food & Beverage / Kitchen Order Ticket Bill"
                >
                  <UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" />
                  <span>Add KOT</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenDiscountModal}
                className="h-8.5 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
              >
                <Plus className="h-3.5 w-3.5 text-zinc-500" />
                <span>Discount</span>
              </button>

              <button
                type="button"
                onClick={onOpenLiveTaxBill}
                className="h-8.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-zinc-500" />
                <span>Tax Bill</span>
              </button>
            </div>
          )}
        </div>

        {/* Tier 2: Stay Parameters & Timing Timeline Strip */}
        <div className="px-5 sm:px-6 py-3 bg-zinc-50/80 dark:bg-zinc-900/40 border-t border-b border-zinc-100 dark:border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-end text-sm">
          {/* Check In */}
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block mb-0.5">
              Check In
            </span>
            <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 font-semibold truncate block">
              {formatDateTimeShort(activeStay?.arrivalAt || activeStay?.guestRegistration?.arrivalDateTime)}
            </span>
          </div>

          {/* Departure */}
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block mb-0.5">
              {activeStay?.actualDepartureAt ? "Checked Out" : "Departure"}
            </span>
            <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 font-semibold truncate block">
              {formatDateTimeShort(activeStay?.actualDepartureAt || stayCalculations?.effectiveDepartureAt || activeStay?.expectedDepartureAt)}
            </span>
          </div>

          {/* Nights Billed */}
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block mb-0.5">
              Duration
            </span>
            <span className="font-mono text-xs font-bold text-zinc-950 dark:text-zinc-100 block">
              {stayCalculations?.nights || 1} Night{stayCalculations?.nights > 1 ? "s" : ""}
            </span>
          </div>

          {/* Grace Period Control */}
          {isInHouse ? (
            <div className="min-w-0">
              <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block mb-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3 text-zinc-400" />
                Grace Period
              </span>
              <select
                value={gracePeriodMinutes >= 1440 && !stayCalculations?.canWaiveNextNight ? 0 : gracePeriodMinutes}
                onChange={(e) => onGracePeriodChange(Number(e.target.value))}
                className="w-full h-8.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value={0}>Standard (0h)</option>
                <option value={60}>1 Hour</option>
                <option value={120}>2 Hours</option>
                <option value={180}>3 Hours</option>
                <option value={240}>4 Hours</option>
                <option value={300}>5 Hours</option>
                <option value={360}>6 Hours</option>
                <option value={1440} disabled={!stayCalculations?.canWaiveNextNight}>
                  {stayCalculations?.canWaiveNextNight ? "Waive Next Night" : "Waive Next Night (N/A)"}
                </option>
              </select>
            </div>
          ) : (
            <div className="min-w-0">
              <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block mb-0.5">
                Checkout State
              </span>
              <span className="font-mono text-xs text-zinc-500">Departed</span>
            </div>
          )}

          {/* Billing Mode Control (if multi-room group) */}
          {isMultiRoomGroup ? (
            <div className="min-w-0">
              <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block mb-0.5 flex items-center gap-1">
                <Layers className="h-3 w-3 text-blue-500" />
                Billing Mode
              </span>
              <select
                value={groupBillingMode}
                onChange={(e) => setGroupBillingMode(e.target.value as "NO" | "YES")}
                className="w-full h-8.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="NO">Room {activeRoomNumber} Only</option>
                <option value="YES">Combined ({allGroupRooms.length} Rooms)</option>
              </select>
            </div>
          ) : (
            <div className="hidden lg:block min-w-0">
              <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block mb-0.5">
                Folio Scope
              </span>
              <span className="text-xs text-zinc-500 font-medium truncate block">Single Room Folio</span>
            </div>
          )}
        </div>

        {/* Tier 3: Seamless Integrated Financial KPI Ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-200/80 dark:divide-zinc-800">
          
          {/* Metric 1: Charges Posted */}
          <div className="p-4 sm:p-5 space-y-1">
            <div className="text-[11px] uppercase font-bold tracking-wider text-zinc-400">
              Total Charges Posted
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-zinc-950 dark:text-zinc-50">
              {formatINR(totalCharges)}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              Taxable: {formatINR(totalTaxable)} • Tax: {formatINR(totalTaxes)}
            </div>
          </div>

          {/* Metric 2: Payments Received */}
          <div className="p-4 sm:p-5 space-y-1">
            <div className="text-[11px] uppercase font-bold tracking-wider text-zinc-400">
              Payments Received
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatINR(totalPayments)}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              {paymentsCount} Payment{paymentsCount === 1 ? "" : "s"} Processed
            </div>
          </div>

          {/* Metric 3: Outstanding Balance / Surplus */}
          <div className="p-4 sm:p-5 space-y-1 bg-zinc-50/50 dark:bg-zinc-900/20">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] uppercase font-bold tracking-wider text-zinc-400">
                {surplusCredit > 0 ? "Advance Surplus" : "Outstanding Balance"}
              </div>
              {surplusCredit > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenRefundModal(surplusCredit)}
                  className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500 hover:bg-amber-600 text-zinc-950 transition cursor-pointer"
                >
                  Refund
                </button>
              )}
            </div>
            <div
              className={`text-2xl sm:text-3xl font-black font-mono ${
                surplusCredit > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : currentBalance > 0.5
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {surplusCredit > 0 ? `+ ${formatINR(surplusCredit)}` : formatINR(currentBalance)}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {surplusCredit > 0
                ? "Credit surplus due to guest at checkout"
                : currentBalance > 0.5
                ? "Pending settlement prior to check-out"
                : "Zero balance • All charges fully cleared"}
            </div>
          </div>
        </div>
      </div>

      {/* Group Advance Pool Notification Card (if applicable) */}
      {isInHouse && isMultiRoomGroup && groupAdvanceMetrics.totalReceived > 0 && (
        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <Coins className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Group Advance Pool: </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(groupAdvanceMetrics.available)} available
              </span>
              <span className="text-zinc-500 ml-1.5 text-xs hidden sm:inline">
                ({formatINR(groupAdvanceMetrics.totalReceived)} received, {formatINR(groupAdvanceMetrics.consumed)} applied)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isInHouse && currentBalance > 0.5 && groupAdvanceMetrics.available > 0 && onApplyGroupAdvance && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onApplyGroupAdvance(Math.min(currentBalance, groupAdvanceMetrics.available))}
                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Coins className="h-3.5 w-3.5" />
                <span>Apply {formatINR(Math.min(currentBalance, groupAdvanceMetrics.available))} to Room</span>
              </button>
            )}
            <button
              type="button"
              onClick={onManageAdvance}
              className="h-8 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs hover:bg-zinc-100 transition shrink-0 cursor-pointer"
            >
              Manage Pool
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
