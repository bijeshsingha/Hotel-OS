"use client";

import React, { useEffect, useState } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR } from "@/lib/gst/calculator";
import {
  Receipt,
  Plus,
  CreditCard,
  Printer,
  X,
  QrCode,
} from "lucide-react";

export default function BillingPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [stays, setStays] = useState<any[]>([]);
  const [selectedStayId, setSelectedStayId] = useState<string>("");
  const [folioData, setFolioData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showManualChargeModal, setShowManualChargeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Form states
  const [chargeForm, setChargeForm] = useState({
    chargeCode: "ROOM_TARIFF",
    description: "Extra Bed & Linen",
    amount: "1000",
    sacHsn: "996311",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "0",
    method: "UPI",
    reference: "UPI/2026/89912",
    payerName: "Guest",
  });

  const [actionLoading, setActionLoading] = useState(false);

  const loadStays = async () => {
    if (!activeProperty) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/stays?propertyId=${activeProperty.id}`);
      const data = await res.json();
      const stayList = Array.isArray(data) ? data : [];
      setStays(stayList);

      if (stayList.length > 0 && !selectedStayId) {
        setSelectedStayId(stayList[0].id);
      }
    } catch (err) {
      console.error("Billing error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFolio = async (folioId: string) => {
    try {
      const res = await fetch(`/api/v1/folios/${folioId}`);
      const data = await res.json();
      setFolioData(data);
    } catch (err) {
      console.error("Folio load error:", err);
    }
  };

  useEffect(() => {
    loadStays();
  }, [activeProperty, refreshKey]);

  useEffect(() => {
    const activeStay = stays.find((s) => s.id === selectedStayId);
    if (activeStay?.folioId) {
      loadFolio(activeStay.folioId);
    } else {
      setFolioData(null);
    }
  }, [selectedStayId, stays]);

  const handlePostCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioData) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/folios/${folioData.id}/charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chargeForm),
      });
      if (!res.ok) throw new Error("Failed to post charge");

      setShowManualChargeModal(false);
      await loadFolio(folioData.id);
      await refreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioData) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/folios/${folioData.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      if (!res.ok) throw new Error("Failed to record payment");

      setShowPaymentModal(false);
      await loadFolio(folioData.id);
      await refreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const activeStay = stays.find((s) => s.id === selectedStayId);
  const entries = folioData?.windows?.flatMap((w: any) => w.entries) || [];
  const payments = folioData?.payments || [];
  const invoices = folioData?.windows?.flatMap((w: any) => w.invoices) || [];

  const totalCharges = entries.reduce((sum: number, e: any) => sum + e.totalAmount, 0);
  const totalPayments = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const currentBalance = Math.round((totalCharges - totalPayments) * 100) / 100;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-lg bg-[#111114] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-zinc-400" />
              Folio & India GST Invoicing
            </h1>
            <span className="rounded px-1.5 py-0.2 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
              B01–B09
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Guest folios, payment receipts & Rule 46 GST tax invoices
          </p>
        </div>

        {folioData && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setChargeForm({
                  chargeCode: "MANUAL",
                  description: "Extra Service / Laundry",
                  amount: "500",
                  sacHsn: "996311",
                });
                setShowManualChargeModal(true);
              }}
              className="flex items-center gap-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Post Charge
            </button>
            <button
              onClick={() => {
                setPaymentForm({
                  amount: String(Math.max(0, currentBalance)),
                  method: "UPI",
                  reference: `UPI/${Date.now().toString().slice(-6)}`,
                  payerName: activeStay?.primaryGuest?.name || "Guest",
                });
                setShowPaymentModal(true);
              }}
              className="flex items-center gap-1.5 rounded-md bg-zinc-100 hover:bg-white px-3 py-1.5 text-xs font-medium text-zinc-950 transition"
            >
              <CreditCard className="h-3.5 w-3.5" /> Collect Payment
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left: Stays List */}
        <div className="lg:col-span-4 p-3 rounded-lg bg-[#111114] border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-xs">
            <span className="font-medium text-zinc-300">Select Stay</span>
            <span className="text-zinc-500 font-mono">{stays.length} total</span>
          </div>

          <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
            {stays.map((s) => {
              const isSelected = s.id === selectedStayId;
              const room = s.roomAssignments?.[0]?.room;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStayId(s.id)}
                  className={`rounded-md p-2.5 border transition cursor-pointer flex flex-col gap-0.5 ${
                    isSelected
                      ? "bg-zinc-800 border-blue-500 text-zinc-100"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-zinc-100 font-mono">
                      Room {room?.number || "Unassigned"}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-mono ${
                        s.status === "IN_HOUSE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-200 font-medium">{s.primaryGuest?.name}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {s.arrivalAt?.slice(0, 10)} to {s.expectedDepartureAt?.slice(0, 10)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Folio Ledger & Invoices */}
        <div className="lg:col-span-8 space-y-3">
          {folioData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                <div className="rounded-md bg-[#111114] p-2.5 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase">Charges</div>
                  <div className="text-base font-semibold text-zinc-100 mt-0.5 tabular-nums">{formatINR(totalCharges)}</div>
                </div>
                <div className="rounded-md bg-[#111114] p-2.5 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase">Payments</div>
                  <div className="text-base font-semibold text-emerald-400 mt-0.5 tabular-nums">{formatINR(totalPayments)}</div>
                </div>
                <div className="rounded-md bg-[#111114] p-2.5 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase">Balance</div>
                  <div
                    className={`text-base font-semibold mt-0.5 tabular-nums ${
                      currentBalance > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {formatINR(currentBalance)}
                  </div>
                </div>
              </div>

              {/* Itemized Charges Table */}
              <div className="rounded-lg border border-zinc-800 bg-[#111114] overflow-hidden">
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-zinc-200">Folio Charges Ledger</h2>
                  <span className="text-[10px] text-zinc-500 font-mono">SAC 996311 / 996331</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/60 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">SAC</th>
                        <th className="p-2.5">Taxable</th>
                        <th className="p-2.5">Tax</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {entries.map((e: any) => {
                        const taxAmt = e.totalAmount - e.taxableAmount;
                        return (
                          <tr key={e.id} className="hover:bg-zinc-900/30 transition">
                            <td className="p-2.5 font-mono text-zinc-400 text-[11px]">{e.serviceDate}</td>
                            <td className="p-2.5 font-medium text-zinc-200">{e.description}</td>
                            <td className="p-2.5 font-mono text-zinc-400 text-[11px]">
                              {e.chargeCode.includes("FB") ? "996331" : "996311"}
                            </td>
                            <td className="p-2.5 font-mono tabular-nums">{formatINR(e.taxableAmount)}</td>
                            <td className="p-2.5 font-mono text-zinc-400 tabular-nums">{formatINR(taxAmt)}</td>
                            <td className="p-2.5 font-mono font-medium text-zinc-100 text-right tabular-nums">
                              {formatINR(e.totalAmount)}
                            </td>
                          </tr>
                        );
                      })}
                      {entries.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-zinc-600 italic font-mono">
                            No charges posted
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Receipts Table */}
              <div className="rounded-lg border border-zinc-800 bg-[#111114] overflow-hidden">
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-zinc-200">Payment Receipts</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/60 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                      <tr>
                        <th className="p-2.5">Receipt #</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Reference</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {payments.map((p: any) => (
                        <tr key={p.id} className="hover:bg-zinc-900/30 transition">
                          <td className="p-2.5 font-mono text-blue-400 font-medium">{p.receiptNo}</td>
                          <td className="p-2.5 font-mono text-zinc-400 text-[11px]">{p.receivedAt?.slice(0, 10)}</td>
                          <td className="p-2.5 font-medium text-zinc-200">{p.method}</td>
                          <td className="p-2.5 font-mono text-zinc-500 text-[11px]">{p.reference || "—"}</td>
                          <td className="p-2.5 font-mono font-medium text-emerald-400 text-right tabular-nums">
                            {formatINR(p.amount)}
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-zinc-600 italic font-mono">
                            No payments recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoices List */}
              {invoices.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-[#111114] p-3 space-y-2">
                  <h2 className="text-xs font-semibold text-zinc-200">Tax Invoices</h2>
                  {invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs"
                    >
                      <div>
                        <div className="font-mono font-medium text-blue-400">{inv.invoiceNo}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          FY: {inv.financialYear} • {inv.issuedAt?.slice(0, 10)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-emerald-400 tabular-nums">{formatINR(inv.totalAmount)}</span>
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowInvoiceModal(true);
                          }}
                          className="flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-200 transition"
                        >
                          <Printer className="h-3 w-3" /> View / Print
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-[#111114] p-12 text-center text-xs text-zinc-500 font-mono">
              Select a stay to view folio ledger
            </div>
          )}
        </div>
      </div>

      {/* POST CHARGE MODAL */}
      {showManualChargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Plus className="h-4 w-4 text-zinc-400" />
                Post Manual Charge
              </h2>
              <button onClick={() => setShowManualChargeModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePostCharge} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400">Description *</label>
                <input
                  type="text"
                  required
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400">Base Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={chargeForm.amount}
                    onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
                <div>
                  <label className="text-zinc-400">SAC Code</label>
                  <select
                    value={chargeForm.sacHsn}
                    onChange={(e) => setChargeForm({ ...chargeForm, sacHsn: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  >
                    <option value="996311">SAC 996311 (Room)</option>
                    <option value="996331">SAC 996331 (F&B)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualChargeModal(false)}
                  className="rounded-md px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-md bg-zinc-100 px-4 py-1.5 font-medium text-zinc-950 hover:bg-white transition disabled:opacity-50"
                >
                  {actionLoading ? "Posting..." : "Post Charge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-zinc-400" />
                Collect Payment
              </h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400">Method *</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400">Reference / UTR</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-md px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-md bg-zinc-100 px-4 py-1.5 font-medium text-zinc-950 hover:bg-white transition disabled:opacity-50"
                >
                  {actionLoading ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE TAX INVOICE MODAL */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-lg border border-zinc-700 bg-white text-zinc-900 p-6 shadow-2xl space-y-4 print:p-0 print:border-none">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 print:hidden">
              <span className="text-xs font-semibold uppercase font-mono text-zinc-600">
                GST Tax Invoice (Rule 46)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 rounded bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-black transition"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button onClick={() => setShowInvoiceModal(false)} className="text-zinc-500 hover:text-zinc-900">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* INVOICE SHEET */}
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-lg font-bold text-zinc-900">{activeProperty?.displayName}</h1>
                  <p className="text-zinc-600 text-[11px] mt-0.5">{activeProperty?.legalName}</p>
                  <p className="font-mono text-zinc-800 text-[11px]">
                    GSTIN: {activeProperty?.gstin || "N/A"} | State: {activeProperty?.stateCode || "18"}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-zinc-950">{selectedInvoice.invoiceNo}</div>
                  <div className="text-zinc-600 text-[11px]">Date: {selectedInvoice.issuedAt.slice(0, 10)}</div>
                  <div className="text-zinc-600 text-[11px]">FY: {selectedInvoice.financialYear}</div>
                </div>
              </div>

              <div className="rounded bg-zinc-50 p-3 border border-zinc-200 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="font-semibold text-zinc-500 uppercase text-[10px]">Billed To:</div>
                  <div className="font-semibold text-zinc-900">{activeStay?.primaryGuest?.name}</div>
                  <div className="text-zinc-600">{activeStay?.primaryGuest?.phone}</div>
                </div>
                <div>
                  <div className="font-semibold text-zinc-500 uppercase text-[10px]">Place of Supply:</div>
                  <div className="font-mono">{activeProperty?.stateCode || "18"} (Intra-State)</div>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-zinc-200">
                <thead className="bg-zinc-100 text-zinc-700 font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Description</th>
                    <th className="p-2 font-mono">SAC</th>
                    <th className="p-2 font-mono text-right">Taxable</th>
                    <th className="p-2 font-mono text-right">CGST</th>
                    <th className="p-2 font-mono text-right">SGST</th>
                    <th className="p-2 font-mono text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {selectedInvoice.lines?.map((line: any, idx: number) => {
                    const comp = line.componentTaxRatesJson ? JSON.parse(line.componentTaxRatesJson) : {};
                    return (
                      <tr key={line.id}>
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{line.description}</td>
                        <td className="p-2 font-mono">{line.sacHsn}</td>
                        <td className="p-2 font-mono text-right tabular-nums">{formatINR(line.taxableAmount)}</td>
                        <td className="p-2 font-mono text-right tabular-nums">{formatINR(comp.cgstAmount || 0)}</td>
                        <td className="p-2 font-mono text-right tabular-nums">{formatINR(comp.sgstAmount || 0)}</td>
                        <td className="p-2 font-mono font-semibold text-right tabular-nums">{formatINR(line.totalAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-between items-end pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-12 w-12 bg-zinc-100 border border-zinc-300 rounded flex items-center justify-center">
                    <QrCode className="h-9 w-9 text-zinc-800" />
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    <div>GST Rule 46 Authenticated</div>
                    <div>Digital Hash: Verified</div>
                  </div>
                </div>

                <div className="text-right space-y-0.5 font-mono text-xs w-48">
                  <div className="flex justify-between text-zinc-600">
                    <span>Taxable:</span>
                    <span className="tabular-nums">{formatINR(selectedInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Tax:</span>
                    <span className="tabular-nums">{formatINR(selectedInvoice.taxTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-zinc-950 pt-1 border-t border-zinc-300">
                    <span>Grand Total:</span>
                    <span className="tabular-nums">{formatINR(selectedInvoice.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
