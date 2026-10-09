"use client";

import React from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Equal,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  CreditCard,
  Building2,
  Banknote,
} from "lucide-react";
import { CashReconciliationSection } from "@/lib/domain/executive-report-service";
import { formatINR } from "@/lib/gst/calculator";

interface ExecutiveCashReconciliationProps {
  data: CashReconciliationSection;
}

export const ExecutiveCashReconciliation: React.FC<ExecutiveCashReconciliationProps> = ({
  data,
}) => {
  const {
    openingBalance,
    cashCollections,
    cashExpenses,
    expectedClosingCash,
    actualClosingCash,
    discrepancy,
    collectionsByInstrument,
  } = data;

  const hasActualCount = actualClosingCash !== null;
  const isBalanced = discrepancy === 0;

  return (
    <div className="space-y-6">
      {/* Drawer Reconciliation Formula Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Front Desk Cash Drawer Reconciliation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic daily cash movement audit
            </p>
          </div>

          {hasActualCount && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isBalanced
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
              }`}
            >
              {isBalanced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Drawer Balanced (Zero Variance)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Discrepancy: {formatINR(discrepancy || 0)}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Visual Movement Step Formula */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Opening Cash */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              1. Opening Cash Float
            </span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatINR(openingBalance)}
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Shift handover baseline
            </span>
          </div>

          {/* 2. Cash Collections */}
          <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block mb-1">
                2. (+) Cash Inflow
              </span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              +{formatINR(cashCollections)}
            </div>
            <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1 block">
              Guest cash receipts logged
            </span>
          </div>

          {/* 3. Cash Expenses */}
          <div className="p-4 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block mb-1">
                3. (−) Cash Paid Out
              </span>
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-300">
              −{formatINR(cashExpenses)}
            </div>
            <span className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1 block">
              Approved petty cash vouchers
            </span>
          </div>

          {/* 4. Expected Closing Cash */}
          <div className="p-4 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 dark:text-slate-600 block mb-1">
              4. (=) Expected Closing Cash
            </span>
            <div className="text-xl sm:text-2xl font-bold">
              {formatINR(expectedClosingCash)}
            </div>
            <span className="text-xs text-slate-300 dark:text-slate-600 mt-1 block">
              Formula: (1 + 2 − 3)
            </span>
          </div>
        </div>

        {/* Physical Count Verification */}
        {hasActualCount && (
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium">Physical Cash Counted at Close:</span>
              <strong className="text-base text-slate-900 dark:text-slate-100 font-bold">
                {formatINR(actualClosingCash)}
              </strong>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium">Drawer Variance (Discrepancy):</span>
              <strong
                className={`text-base font-bold ${
                  discrepancy === 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {discrepancy === 0 ? "₹0.00" : formatINR(discrepancy || 0)}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Complete Instrument Matrix (Cash, UPI, Card, Bank, Cheque) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          All Incoming Payments by Settlement Instrument
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-[11px]">Cash</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatINR(collectionsByInstrument.cash)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <QrCode className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-[11px]">UPI</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatINR(collectionsByInstrument.upi)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-[11px]">Credit / Debit Card</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatINR(collectionsByInstrument.card)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-[11px]">Bank / NEFT</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatINR(collectionsByInstrument.bankTransfer)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Wallet className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-[11px]">Cheque & Other</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatINR(collectionsByInstrument.cheque + collectionsByInstrument.other)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
