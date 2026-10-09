"use client";

import React, { useState } from "react";
import { Calendar, Search, ArrowDownRight, Tag } from "lucide-react";
import { FutureBookingAdvance } from "@/lib/domain/executive-report-service";
import { formatINR } from "@/lib/gst/calculator";

interface ExecutiveAdvancesTableProps {
  items: FutureBookingAdvance[];
  receivedInPeriod: number;
  totalUnappliedHeld: number;
}

export const ExecutiveAdvancesTable: React.FC<ExecutiveAdvancesTableProps> = ({
  items,
  receivedInPeriod,
  totalUnappliedHeld,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = items.filter(
    (item) =>
      !searchTerm.trim() ||
      item.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bookingRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.receiptNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalFiltered = filtered.reduce((sum, item) => sum + item.amountReceived, 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Future Booking Advances
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
              {items.length} Deposits
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pre-payments received during this period for reservations checking in on future dates
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Received in Period</span>
            <strong className="text-blue-600 dark:text-blue-400 font-bold text-sm">
              {formatINR(receivedInPeriod)}
            </strong>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <div>
            <span className="text-slate-500 block text-[11px]">Total Unapplied Held</span>
            <strong className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
              {formatINR(totalUnappliedHeld)}
            </strong>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search booking or guest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filtered.length} of {items.length} advances
        </div>
      </div>

      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No future booking advances logged during this selected period.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                  Receipt #
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                  Guest Name
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                  Booking Ref
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                  Receipt Date
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                  Arrival Date
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                  Method
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                  Status
                </th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {item.receiptNo}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                    {item.guestName}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {item.bookingRef}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{item.receiptDate}</td>
                  <td className="px-3 py-2 font-medium text-blue-700 dark:text-blue-300">
                    {item.arrivalDate}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                    {item.paymentMethod}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.bookingStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 text-right">
                    {formatINR(item.amountReceived)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 font-bold">
              <tr>
                <td colSpan={7} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                  Total Filtered Advances ({filtered.length} deposits)
                </td>
                <td className="px-3 py-2 text-right text-blue-700 dark:text-blue-400">
                  {formatINR(totalFiltered)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};
