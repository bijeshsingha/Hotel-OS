"use client";

import React, { useState } from "react";
import { Search, Tag, Wallet, CreditCard, Building2, Receipt } from "lucide-react";
import { ExpenseReportSection } from "@/lib/domain/executive-report-service";
import { formatINR } from "@/lib/gst/calculator";

interface ExecutiveExpenseSectionProps {
  data: ExpenseReportSection;
}

export const ExecutiveExpenseSection: React.FC<ExecutiveExpenseSectionProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const {
    totalExpenses,
    cashExpenses,
    nonCashExpenses,
    byCategory,
    byDepartment,
    byMethod,
    byVendor,
    expensesList,
  } = data;

  const filteredExpenses = expensesList.filter((item) => {
    const matchesCategory = categoryFilter === "ALL" || item.category === categoryFilter;
    const matchesSearch =
      !searchTerm.trim() ||
      item.payeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalFiltered = filteredExpenses.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Operating Expenses
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatINR(totalExpenses)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {expensesList.length} vouchers recorded in period
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Petty Cash Payouts
          </span>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatINR(cashExpenses)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Deducted directly from Cash Drawer
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Bank, UPI & Non-Cash Expenses
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatINR(nonCashExpenses)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Paid via Online / Vendor Account
          </span>
        </div>
      </div>

      {/* Category and Department Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Expenses by Category
          </h4>
          <div className="space-y-2 text-xs">
            {Object.keys(byCategory).length === 0 ? (
              <p className="text-slate-400 text-xs">No category breakdown recorded.</p>
            ) : (
              Object.entries(byCategory).map(([cat, amt]) => (
                <div
                  key={cat}
                  className="flex items-center justify-between py-1.5 px-2 bg-slate-50 dark:bg-slate-800/40 rounded"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {cat.replace(/_/g, " ")}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatINR(amt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Department / Vendor */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Top Vendors & Payees
          </h4>
          <div className="space-y-2 text-xs">
            {Object.keys(byVendor).length === 0 ? (
              <p className="text-slate-400 text-xs">No vendor records available.</p>
            ) : (
              Object.entries(byVendor)
                .slice(0, 6)
                .map(([vendor, amt]) => (
                  <div
                    key={vendor}
                    className="flex items-center justify-between py-1.5 px-2 bg-slate-50 dark:bg-slate-800/40 rounded"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                      {vendor}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatINR(amt)}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Itemized Voucher Register */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Operating Expense Register
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit log of approved expense vouchers incurred during this period
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search payee or voucher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {Object.keys(byCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No expense vouchers found matching the filter criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Voucher #
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Date
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Payee / Vendor
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Description
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Category
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    Method
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {exp.voucherNo}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{exp.date}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                      {exp.payeeName}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
                          exp.paymentMethod === "CASH"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 text-right">
                      {formatINR(exp.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 font-bold">
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    Total Filtered Expenses ({filteredExpenses.length} vouchers)
                  </td>
                  <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100">
                    {formatINR(totalFiltered)}
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
