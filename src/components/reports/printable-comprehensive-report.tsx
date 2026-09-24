"use client";

import React, { useRef } from "react";
import { Printer, Download, X, Building2, Calendar, ShieldCheck, Mail } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";
import { ComprehensiveHotelReport } from "@/lib/domain/comprehensive-report-service";

interface PrintableComprehensiveReportProps {
  isOpen: boolean;
  onClose: () => void;
  report: ComprehensiveHotelReport;
  onEmailClick?: () => void;
}

export function PrintableComprehensiveReport({
  isOpen,
  onClose,
  report,
  onEmailClick,
}: PrintableComprehensiveReportProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !report) return null;

  const { property, money, rooms, adminModifications } = report;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl my-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* TOP BAR / CONTROLS (Hidden on print) */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                Comprehensive Hotel Audit Master Sheet
              </h2>
              <p className="text-xs text-zinc-500">
                {property.displayName} ({report.reportDate})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEmailClick && (
              <button
                type="button"
                onClick={onEmailClick}
                className="h-9 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Mail className="h-4 w-4 text-blue-500" />
                <span>Email Report</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE BODY */}
        <div ref={printRef} className="p-6 sm:p-8 overflow-y-auto space-y-6 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 print:p-0 print:m-0 print:overflow-visible print:max-h-none print:text-black">
          
          {/* HEADER */}
          <div className="border-b-2 border-zinc-900 pb-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 print:text-blue-800">
                  Daily Comprehensive Hotel Audit Report
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white print:text-black mt-1">
                  {property.displayName}
                </h1>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 print:text-zinc-700 mt-1 space-y-0.5">
                  <div>Legal Entity: <span className="font-semibold text-zinc-900 dark:text-zinc-200 print:text-black">{property.legalName}</span></div>
                  <div>Address: {property.address || "Paltan Bazar, Guwahati, Assam - 781008"}</div>
                  <div>GSTIN: <span className="font-mono font-bold text-zinc-900 dark:text-zinc-200 print:text-black">{property.gstin || "N/A"}</span> &bull; Phone: {property.phone || "N/A"}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 print:bg-zinc-100 print:border-zinc-300">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase">Operational Date</div>
                  <div className="text-sm font-mono font-black text-zinc-900 dark:text-white print:text-black">{report.reportDate}</div>
                </div>
                <div className="text-[10px] text-zinc-500 mt-2">
                  Generated: {new Date(report.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </div>
                <div className="text-[10px] text-zinc-500">
                  Property Code: <span className="font-mono font-bold text-zinc-900 dark:text-white print:text-black">{property.code}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5 EXECUTIVE KPI TILES */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 print:bg-white print:border-zinc-300">
              <div className="text-[10px] font-bold text-zinc-500 uppercase">Gross Revenue</div>
              <div className="text-base font-black font-mono text-zinc-900 dark:text-white print:text-black mt-0.5">{formatINR(money.grossRevenue)}</div>
              <div className="text-[10px] text-zinc-500">Taxable + Taxes</div>
            </div>

            <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 print:bg-white print:border-zinc-300">
              <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">Total Collections</div>
              <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300 print:text-emerald-800 mt-0.5">{formatINR(money.totalCollections)}</div>
              <div className="text-[10px] text-emerald-600/80">{money.collectionsCount} receipts</div>
            </div>

            <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 print:bg-white print:border-zinc-300">
              <div className="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase">Occupancy</div>
              <div className="text-base font-black font-mono text-blue-700 dark:text-blue-300 print:text-blue-800 mt-0.5">{rooms.occupancyPct}%</div>
              <div className="text-[10px] text-blue-600/80">{rooms.occupiedRooms} / {rooms.totalRooms} rooms</div>
            </div>

            <div className="p-3 rounded-xl border border-teal-200 dark:border-teal-900/40 bg-teal-50/40 dark:bg-teal-950/20 print:bg-white print:border-zinc-300">
              <div className="text-[10px] font-bold text-teal-800 dark:text-teal-400 uppercase">Cash Till In-Hand</div>
              <div className="text-base font-black font-mono text-teal-700 dark:text-teal-300 print:text-teal-800 mt-0.5">{formatINR(money.cashDrawer.netCashInHand)}</div>
              <div className="text-[10px] text-teal-600/80">Physical Float</div>
            </div>

            <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 print:bg-white print:border-zinc-300">
              <div className="text-[10px] font-bold text-purple-800 dark:text-purple-400 uppercase">Admin Logs</div>
              <div className="text-base font-black font-mono text-purple-700 dark:text-purple-300 print:text-purple-800 mt-0.5">{adminModifications.totalModificationsCount}</div>
              <div className="text-[10px] text-purple-600/80">Modifications</div>
            </div>
          </div>

          {/* SECTION 1: DAILY MONEY SUMMARY */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 print:text-black border-b border-zinc-200 dark:border-zinc-800 pb-1 flex items-center justify-between">
              <span>1. Daily Money & Financial Position</span>
              <span className="text-[10px] font-mono font-normal text-zinc-500">Net Flow: {formatINR(money.netCashFlow)}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Collections by Method */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden print:border-zinc-300">
                <div className="bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 font-bold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 print:bg-zinc-100 flex items-center justify-between">
                  <span>Mode of Payments</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">{formatINR(money.totalCollections)}</span>
                </div>
                <table className="w-full">
                  <tbody>
                    {[
                      { key: "CASH", label: "CASH" },
                      { key: "UPI", label: "UPI" },
                      { key: "BTC", label: "BTC (Bill to Company)" },
                      { key: "CARD", label: "CARD" },
                      { key: "BANK_TRANSFER", label: "BANK TRANSFER" },
                      { key: "CHEQUE", label: "CHEQUE" },
                    ].map(({ key, label }) => {
                      const amt = (money.collectionsByMethod as Record<string, number | undefined>)[key] || 0;
                      if (key === "CHEQUE" && amt === 0) return null;
                      return (
                        <tr key={key} className="border-b border-zinc-100 dark:border-zinc-800/60">
                          <td className="px-3 py-1.5 font-medium">{label}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatINR(amt)}</td>
                        </tr>
                      );
                    })}

                    {Object.entries(money.collectionsByMethod || {})
                      .filter(([m, amt]) => !["CASH", "UPI", "BTC", "CARD", "BANK_TRANSFER", "CHEQUE", "OUTSTANDING", "TRANSFER", "ADVANCE_ALLOCATION"].includes(m) && (amt || 0) > 0)
                      .map(([method, amt]) => (
                        <tr key={method} className="border-b border-zinc-100 dark:border-zinc-800/60">
                          <td className="px-3 py-1.5 font-medium">{method.replace(/_/g, " ")}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatINR(amt || 0)}</td>
                        </tr>
                      ))}

                    <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold border-b border-emerald-100 dark:border-emerald-900/40">
                      <td className="px-3 py-2 text-emerald-900 dark:text-emerald-200">Total Tender Collections</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-300">{formatINR(money.totalCollections)}</td>
                    </tr>

                    <tr className="bg-amber-50/40 dark:bg-amber-950/20 font-bold">
                      <td className="px-3 py-1.5 text-amber-900 dark:text-amber-200">OUTSTANDING (Pending Dues)</td>
                      <td className="px-3 py-1.5 text-right font-mono text-amber-700 dark:text-amber-400">{formatINR(money.collectionsByMethod.OUTSTANDING || 0)}</td>
                    </tr>
                  </tbody>
                </table>

                {money.internalTransfers && (money.internalTransfers.transferredDueToMaster > 0 || money.internalTransfers.advanceAllocatedFromPool > 0) && (
                  <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500">
                    Reconciled Internal: {money.internalTransfers.transferredDueToMaster > 0 ? `${formatINR(money.internalTransfers.transferredDueToMaster)} to Master` : ""}
                    {money.internalTransfers.transferredDueToMaster > 0 && money.internalTransfers.advanceAllocatedFromPool > 0 ? " • " : ""}
                    {money.internalTransfers.advanceAllocatedFromPool > 0 ? `${formatINR(money.internalTransfers.advanceAllocatedFromPool)} from Advance Pool` : ""}
                  </div>
                )}
              </div>

              {/* Expenses by Category */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden print:border-zinc-300">
                <div className="bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 font-bold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 print:bg-zinc-100">
                  Expenses & Payouts by Category
                </div>
                <table className="w-full">
                  <tbody>
                    {Object.entries(money.expensesByCategory).filter(([_, v]) => v > 0).map(([cat, amt]) => (
                      <tr key={cat} className="border-b border-zinc-100 dark:border-zinc-800/60">
                        <td className="px-3 py-1.5 font-medium">{cat.replace(/_/g, " ")}</td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold text-rose-700 dark:text-rose-400">-{formatINR(amt)}</td>
                      </tr>
                    ))}
                    <tr className="bg-rose-50/50 dark:bg-rose-950/20 font-bold">
                      <td className="px-3 py-2 text-rose-900 dark:text-rose-200">Total Expenses</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-700 dark:text-rose-300">-{formatINR(money.totalExpenses)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Front Desk Cash Drawer Reconciliation */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-xs">
              <div className="font-bold text-zinc-800 dark:text-zinc-200 mb-1.5 text-[11px] uppercase tracking-wide">
                Front Desk Physical Drawer Reconciliation
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>Opening Float: <span className="font-mono font-bold">{formatINR(money.cashDrawer.openingBalance)}</span></div>
                <div className="text-emerald-700 dark:text-emerald-400">+ Cash In: <span className="font-mono font-bold">+{formatINR(money.cashDrawer.cashIn)}</span></div>
                <div className="text-rose-700 dark:text-rose-400">- Cash Out: <span className="font-mono font-bold">-{formatINR(money.cashDrawer.cashOut)}</span></div>
                <div className="text-teal-700 dark:text-teal-300 font-bold sm:text-right">Net Till: <span className="font-mono text-sm">{formatINR(money.cashDrawer.netCashInHand)}</span></div>
              </div>
            </div>
          </div>

          {/* SECTION 2: DAILY ROOMS & OPERATIONS */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 print:text-black border-b border-zinc-200 dark:border-zinc-800 pb-1">
              2. Daily Room Inventory & Operations
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Average Daily Rate (ADR)</span>
                <span className="font-mono font-bold text-sm">{formatINR(rooms.adr)}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">RevPAR</span>
                <span className="font-mono font-bold text-sm">{formatINR(rooms.revpar)}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">In-House Headcount</span>
                <span className="font-bold text-sm">{rooms.inHouseGuestsCount} Guests</span>
              </div>
              <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Desk Flow Today</span>
                <span className="font-bold text-sm">{rooms.arrivalsToday} Arr / {rooms.departuresToday} Dep</span>
              </div>
            </div>

            {/* Room Status Summary */}
            <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-xs">
              <span className="text-zinc-500 font-semibold text-[11px]">Housekeeping States:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">{rooms.roomStates.inspected} Inspected</span>
              <span className="text-blue-700 dark:text-blue-400 font-bold">{rooms.roomStates.clean} Clean</span>
              <span className="text-amber-700 dark:text-amber-400 font-bold">{rooms.roomStates.dirty} Dirty</span>
              <span className="text-rose-700 dark:text-rose-400 font-bold">{rooms.roomStates.maintenance} Out of Order</span>
            </div>
          </div>

          {/* SECTION 3: ADMIN & MANAGEMENT MODIFICATIONS */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 print:text-black border-b border-zinc-200 dark:border-zinc-800 pb-1 flex items-center justify-between">
              <span>3. Management & Admin Modifications Trail</span>
              <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                {adminModifications.totalModificationsCount} Events
              </span>
            </h3>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden text-xs print:border-zinc-300">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">
                    <th className="px-3 py-2 text-left w-20">Time</th>
                    <th className="px-3 py-2 text-left">Action & Summary</th>
                    <th className="px-3 py-2 text-left w-36">Authorized Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {adminModifications.records.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-zinc-400">
                        No admin modifications recorded on this business date.
                      </td>
                    </tr>
                  ) : (
                    adminModifications.records.map((rec) => (
                      <tr key={rec.id} className="border-b border-zinc-100 dark:border-zinc-800/60">
                        <td className="px-3 py-2 font-mono text-[11px] text-zinc-500 align-top">
                          {rec.timeFormatted}
                        </td>
                        <td className="px-3 py-2 align-top space-y-0.5">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">{rec.actionLabel}</div>
                          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">{rec.summary}</div>
                        </td>
                        <td className="px-3 py-2 align-top font-semibold text-zinc-800 dark:text-zinc-300 text-[11px]">
                          {rec.actorName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-center text-[10px] text-zinc-500 space-y-1">
            <div>Hotel OS Comprehensive Audit &bull; Generated for {property.displayName}</div>
            <div>Strictly Confidential &bull; Internal Management Records</div>
          </div>
        </div>
      </div>
    </div>
  );
}
