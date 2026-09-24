"use client";

import React from "react";
import { formatINR } from "@/lib/gst/calculator";
import {
  Receipt,
  Plus,
  CreditCard,
  Printer,
  LogOut,
  Building2,
  Calendar,
  User,
} from "lucide-react";

interface FolioSummaryBannerProps {
  stay: any;
  roomNumber: string;
  folioData: any;
  onOpenPaymentModal: () => void;
  onOpenChargeModal: () => void;
  onOpenDiscountModal: () => void;
  onOpenInvoiceModal: () => void;
  onOpenCheckoutModal: () => void;
  formatShortDate: (dateStr?: string | null) => string;
}

export function FolioSummaryBanner({
  stay,
  roomNumber,
  folioData,
  onOpenPaymentModal,
  onOpenChargeModal,
  onOpenDiscountModal,
  onOpenInvoiceModal,
  onOpenCheckoutModal,
  formatShortDate,
}: FolioSummaryBannerProps) {
  if (!stay) {
    return (
      <div className="p-8 text-center rounded-xl bg-white dark:bg-[#121215] border border-zinc-200/60 dark:border-zinc-800/60 text-zinc-400">
        Select a guest or room from the directory to view the folio ledger.
      </div>
    );
  }

  const guest = stay.primaryGuest;
  const balance = folioData?.balance ?? 0;
  const isInHouse = stay.status === "IN_HOUSE";
  const hasCompany = Boolean(guest?.companyName);

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200/70 dark:border-zinc-800/70 space-y-4">
      {/* Top Row: Room, Guest Profile & Live Balance */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              Room {roomNumber}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {stay.roomAssignments?.[0]?.room?.roomType?.name || "Standard Room"}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                isInHouse
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {stay.status}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{guest?.name || "Valued Guest"}</span>
            {guest?.phone && (
              <span className="text-xs text-zinc-400 font-mono font-normal">
                • {guest.phone}
              </span>
            )}
          </div>

          {hasCompany && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span>{guest.companyName}</span>
              {guest.gstin && (
                <span className="font-mono text-zinc-400">(GSTIN: {guest.gstin})</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-zinc-500 pt-0.5">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            <span>
              {formatShortDate(stay.arrivalAt)} → {formatShortDate(stay.expectedDepartureAt)}
            </span>
            <span className="text-zinc-400 font-mono">({stay.adults || 1} Pax)</span>
          </div>
        </div>

        {/* Financial Balance Callout */}
        <div className="flex flex-col items-start sm:items-end bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 min-w-[160px]">
          <span className="text-[10.5px] uppercase font-semibold text-zinc-400 tracking-wider">
            Net Due Balance
          </span>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              balance > 0.5
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatINR(balance)}
          </div>
          <span className="text-[11px] font-medium text-zinc-500">
            {balance > 0.5 ? "Payment Outstanding" : "✓ Folio Cleared"}
          </span>
        </div>
      </div>

      {/* Action Buttons Strip */}
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onOpenPaymentModal}
            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Collect Payment</span>
          </button>

          <button
            onClick={onOpenChargeModal}
            className="h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Charge</span>
          </button>

          <button
            onClick={onOpenDiscountModal}
            className="h-8 px-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition cursor-pointer"
          >
            Discount
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onOpenInvoiceModal}
            className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Tax Invoice</span>
          </button>

          {isInHouse && (
            <button
              onClick={onOpenCheckoutModal}
              className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Checkout & Settle</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
