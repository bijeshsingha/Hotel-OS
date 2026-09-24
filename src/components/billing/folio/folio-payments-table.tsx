"use client";

import React from "react";
import { formatINR } from "@/lib/gst/calculator";
import { CreditCard, FileCheck, Pencil, Printer } from "lucide-react";

interface FolioPaymentsTableProps {
  payments: any[];
  totalPayments: number;
  invoices?: any[];
  onEditPayment?: (payment: any) => void;
  onPrintInvoice?: (invoice: any) => void;
}

export function FolioPaymentsTable({
  payments,
  totalPayments,
  invoices = [],
  onEditPayment,
  onPrintInvoice,
}: FolioPaymentsTableProps) {
  return (
    <div className="space-y-6">
      {/* Payments Table */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden">
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              Payment Receipts
            </h2>
            <span className="text-sm text-zinc-400 font-mono">
              ({payments.length} {payments.length === 1 ? "receipt" : "receipts"})
            </span>
          </div>
          <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
            Total Settled: {formatINR(totalPayments)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[700px]">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200/70 dark:border-zinc-800/80 text-zinc-500 dark:text-zinc-400 font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th scope="col" className="py-3 px-4 w-[130px]">Receipt #</th>
                <th scope="col" className="py-3 px-4 w-[150px]">Date & Time</th>
                <th scope="col" className="py-3 px-4 w-[130px]">Method</th>
                <th scope="col" className="py-3 px-4 min-w-[180px]">Reference Notes</th>
                <th scope="col" className="py-3 px-4 w-[130px] text-right">Amount</th>
                {onEditPayment && <th scope="col" className="py-3 px-3 w-[65px] text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {payments.map((p) => {
                const isGroup = p.reference?.includes("GRP") || p.receiptNo?.includes("GRP");
                const isRefund =
                  Number(p.amount) < 0 ||
                  p.method?.includes("REFUND") ||
                  p.method?.includes("PAYOUT");

                const formatPaymentDate = (d?: string | null) => {
                  if (!d) return "-";
                  try {
                    const dt = new Date(d);
                    const day = dt.getDate().toString().padStart(2, "0");
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const month = months[dt.getMonth()];
                    const hours = dt.getHours().toString().padStart(2, "0");
                    const mins = dt.getMinutes().toString().padStart(2, "0");
                    return `${day} ${month} • ${hours}:${mins}`;
                  } catch {
                    return d;
                  }
                };

                return (
                  <tr key={p.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400 text-xs sm:text-sm whitespace-nowrap align-middle">
                      <div className="inline-flex items-center gap-1.5 flex-wrap">
                        <span>{p.receiptNo}</span>
                        {isGroup && (
                          <span className="text-[10px] font-mono bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-900 font-bold uppercase">
                            Group
                          </span>
                        )}
                        {isRefund && (
                          <span className="text-[10px] font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900 font-bold uppercase">
                            Refund
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs whitespace-nowrap align-middle">
                      {formatPaymentDate(p.receivedAt)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm align-middle whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px] font-bold border border-zinc-200/60 dark:border-zinc-700/60">
                        {p.method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm align-middle">
                      {p.reference && !p.reference.startsWith("GRC-DEPOSIT-") ? p.reference : "-"}
                    </td>
                    <td
                      className={`py-3 px-4 font-mono font-bold text-right tabular-nums text-sm sm:text-base whitespace-nowrap align-middle ${
                        isRefund
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isRefund ? `- ${formatINR(Math.abs(p.amount))}` : formatINR(p.amount || 0)}
                    </td>
                    {onEditPayment && (
                      <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onEditPayment(p)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition inline-flex items-center gap-1 cursor-pointer border border-zinc-200/80 dark:border-zinc-800"
                          title="Edit payment details"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={onEditPayment ? 6 : 5} className="py-12 px-5 text-center text-zinc-400 text-sm">
                    No payment receipts recorded for this folio yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Invoices List if any */}
      {invoices.length > 0 && (
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Tax Invoices
            </h3>
          </div>
          <div className="space-y-2">
            {invoices.map((inv: any) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 text-sm"
              >
                <div>
                  <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {inv.invoiceNo}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    FY: {inv.financialYear} • Issued: {inv.issuedAt?.slice(0, 10)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                    {formatINR(inv.totalAmount || 0)}
                  </span>
                  {onPrintInvoice && (
                    <button
                      type="button"
                      onClick={() => onPrintInvoice(inv)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
