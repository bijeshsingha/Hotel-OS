"use client";

import React, { useState } from "react";
import { Search, CreditCard, Banknote, QrCode, Building2, HelpCircle } from "lucide-react";
import { RevenueBreakdown } from "@/lib/domain/executive-report-service";
import { formatINR } from "@/lib/gst/calculator";

interface ExecutiveRevenueCollectionsProps {
  data: RevenueBreakdown;
  currency?: string;
}

export const ExecutiveRevenueCollections: React.FC<ExecutiveRevenueCollectionsProps> = ({
  data,
}) => {
  const [searchTx, setSearchTx] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");

  const { categories, collectionsByMethod, collectionsBySource, bookingChannels, transactions } =
    data;

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesMethod = methodFilter === "ALL" || tx.paymentMethod === methodFilter;
    const matchesSearch =
      !searchTx.trim() ||
      tx.payerName.toLowerCase().includes(searchTx.toLowerCase()) ||
      tx.receiptNo.toLowerCase().includes(searchTx.toLowerCase()) ||
      tx.roomOrBookingRef.toLowerCase().includes(searchTx.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchTx.toLowerCase());
    return matchesMethod && matchesSearch;
  });

  const totalFilteredCollections = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Method icons helper
  const getMethodIcon = (method: string) => {
    switch (method.toUpperCase()) {
      case "CASH":
        return <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case "UPI":
        return <QrCode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case "CARD":
        return <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case "BANK_TRANSFER":
      case "NEFT":
      case "RTGS":
        return <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      default:
        return <CreditCard className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Educational Notice Banner to prevent confusion between earned revenue and cash collected */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Accounting Distinction:
          </span>{" "}
          <strong className="text-slate-700 dark:text-slate-300">Earned Revenue</strong> reflects
          room nights consumed, meals served, and services rendered in this period (accrual basis).{" "}
          <strong className="text-slate-700 dark:text-slate-300">Collections</strong> reflect
          actual money received through Cash, UPI, Cards, or Bank during this period (cash basis),
          which includes future booking advances and settles past or present stays.
        </div>
      </div>

      {/* Side-by-side Revenue vs Collections Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Earned Revenue Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Earned Revenue Breakdown
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Service delivery charges posted across departments
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Gross Turnover</span>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatINR(categories.grossTurnover)}
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 px-2 bg-slate-50 dark:bg-slate-800/40 rounded">
              <span className="text-slate-600 dark:text-slate-400">Room Tariff & Lodging</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatINR(categories.roomRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 px-2 bg-slate-50 dark:bg-slate-800/40 rounded">
              <span className="text-slate-600 dark:text-slate-400">Food, Beverage & Dining</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatINR(categories.fbRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 px-2 bg-slate-50 dark:bg-slate-800/40 rounded">
              <span className="text-slate-600 dark:text-slate-400">Laundry, Transfers & Other</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatINR(categories.otherRevenue)}
              </span>
            </div>

            {categories.discountsAmount > 0 && (
              <div className="flex items-center justify-between py-1.5 px-2 text-rose-600 dark:text-rose-400">
                <span>Discounts & Rebates Granted</span>
                <span className="font-semibold">-{formatINR(categories.discountsAmount)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold text-sm">
              <span className="text-slate-800 dark:text-slate-200">Net Earned Revenue</span>
              <span className="text-slate-900 dark:text-slate-100">
                {formatINR(categories.netRevenue)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Output GST Collected on Folios</span>
              <span>+{formatINR(categories.totalTax)}</span>
            </div>
          </div>
        </div>

        {/* Right Card: Collections Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Money Collected by Instrument
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Total payments realized into cashier drawers & accounts
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Total Inflow</span>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(
                  Object.values(collectionsByMethod).reduce((sum, val) => sum + val, 0)
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            {Object.entries(collectionsByMethod).map(([method, amount]) => (
              <div
                key={method}
                className="flex items-center justify-between py-1.5 px-2 bg-slate-50 dark:bg-slate-800/40 rounded"
              >
                <div className="flex items-center gap-2">
                  {getMethodIcon(method)}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {method.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatINR(amount)}
                </span>
              </div>
            ))}
          </div>

          {/* Breakdown by source & channels */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="font-semibold text-[11px] text-slate-500 uppercase tracking-wider block mb-1">
                Collection Source
              </span>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                <li>
                  Guest Stays:{" "}
                  <strong>{formatINR(collectionsBySource.GUEST_PAYMENT || 0)}</strong>
                </li>
                <li>
                  Future Advances:{" "}
                  <strong>{formatINR(collectionsBySource.BOOKING_ADVANCE || 0)}</strong>
                </li>
              </ul>
            </div>
            <div>
              <span className="font-semibold text-[11px] text-slate-500 uppercase tracking-wider block mb-1">
                Booking Channels
              </span>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                {Object.entries(bookingChannels).map(([ch, amt]) => (
                  <li key={ch}>
                    {ch}: <strong>{formatINR(amt)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Collections Register Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Receipts & Collections Register
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Itemized ledger of all payments logged during this period
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search guest or receipt..."
                value={searchTx}
                onChange={(e) => setSearchTx(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No payment transactions found matching the selected filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Receipt #
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Date & Time
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Payer / Guest
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Room / Booking
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Method
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Reference
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                      {tx.receiptNo}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                      {tx.receivedAtFormatted}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                      {tx.payerName}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                      {tx.roomOrBookingRef}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {getMethodIcon(tx.paymentMethod)}
                        <span>{tx.paymentMethod}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                      {tx.reference || "-"}
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 text-right">
                      {formatINR(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 font-bold">
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    Total Filtered Collections ({filteredTransactions.length} receipts)
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-700 dark:text-emerald-400">
                    {formatINR(totalFilteredCollections)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
