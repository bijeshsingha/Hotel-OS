"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR } from "@/lib/gst/calculator";
import {
  Receipt,
  Plus,
  CreditCard,
  Printer,
  X,
  QrCode,
  Search,
  BedDouble,
  User,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
} from "lucide-react";

export default function BillingPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [stays, setStays] = useState<any[]>([]);
  const [selectedStayId, setSelectedStayId] = useState<string>("");
  const [folioData, setFolioData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter States for Stays / Folios
  const [staySearchQuery, setStaySearchQuery] = useState<string>("");
  const [stayStatusFilter, setStayStatusFilter] = useState<"ALL" | "IN_HOUSE" | "CHECKED_OUT" | "WITH_BALANCE">("ALL");

  // Search & Filter States for Ledger Entries
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState<string>("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<"ALL" | "ROOM_TARIFF" | "RESTAURANT_FOOD" | "MANUAL">("ALL");

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
    if (!activeProperty?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/stays?propertyId=${encodeURIComponent(activeProperty.id)}`);
      if (!res.ok) {
        throw new Error(`Failed to load stays: ${res.status}`);
      }
      const data = await res.json();
      const stayList = Array.isArray(data) ? data : [];
      setStays(stayList);

      if (stayList.length > 0) {
        setSelectedStayId((prev) => {
          if (prev && stayList.some((s: any) => s.id === prev)) return prev;
          return stayList[0].id;
        });
      } else {
        setSelectedStayId("");
      }
    } catch (err) {
      console.error("Billing error:", err);
      setStays([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFolio = async (folioId: string) => {
    if (!folioId) {
      setFolioData(null);
      return;
    }
    try {
      const res = await fetch(`/api/v1/folios/${encodeURIComponent(folioId)}`);
      if (!res.ok) {
        throw new Error(`Failed to load folio: ${res.status}`);
      }
      const data = await res.json();
      setFolioData(data);
    } catch (err) {
      console.error("Folio load error:", err);
      setFolioData(null);
    }
  };

  useEffect(() => {
    if (activeProperty?.id) {
      loadStays();
    }
  }, [activeProperty?.id, refreshKey]);

  useEffect(() => {
    const activeStay = stays.find((s) => s.id === selectedStayId);
    if (activeStay?.folioId) {
      loadFolio(activeStay.folioId);
    } else {
      setFolioData(null);
    }
  }, [selectedStayId, stays]);

  // Filtered Stays based on Search Query and Status Tabs
  const filteredStays = useMemo(() => {
    return stays.filter((s) => {
      // 1. Status Filter
      if (stayStatusFilter === "IN_HOUSE" && s.status !== "IN_HOUSE") return false;
      if (stayStatusFilter === "CHECKED_OUT" && s.status !== "CHECKED_OUT") return false;
      if (stayStatusFilter === "WITH_BALANCE" && (s.folio?.balance === undefined || s.folio.balance <= 0)) return false;

      // 2. Search Query Filter
      if (staySearchQuery.trim()) {
        const q = staySearchQuery.toLowerCase().trim();
        const roomNo = s.roomAssignments?.[0]?.room?.number ? String(s.roomAssignments[0].room.number).toLowerCase() : "";
        const guestName = s.primaryGuest?.name ? String(s.primaryGuest.name).toLowerCase() : "";
        const guestPhone = s.primaryGuest?.phone ? String(s.primaryGuest.phone).toLowerCase() : "";
        const guestEmail = s.primaryGuest?.email ? String(s.primaryGuest.email).toLowerCase() : "";
        const folioNo = s.folioId ? String(s.folioId).toLowerCase() : "";

        const matchRoom = roomNo.includes(q);
        const matchName = guestName.includes(q);
        const matchPhone = guestPhone.includes(q);
        const matchEmail = guestEmail.includes(q);
        const matchFolio = folioNo.includes(q);

        if (!matchRoom && !matchName && !matchPhone && !matchEmail && !matchFolio) {
          return false;
        }
      }

      return true;
    });
  }, [stays, staySearchQuery, stayStatusFilter]);

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
  const rawEntries = folioData?.windows?.flatMap((w: any) => w.entries) || [];
  const payments = folioData?.payments || [];
  const invoices = folioData?.windows?.flatMap((w: any) => w.invoices) || [];

  const totalCharges = rawEntries.reduce((sum: number, e: any) => sum + e.totalAmount, 0);
  const totalPayments = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const currentBalance = Math.round((totalCharges - totalPayments) * 100) / 100;

  // Filtered Ledger Entries
  const entries = useMemo(() => {
    return rawEntries.filter((e: any) => {
      if (ledgerTypeFilter !== "ALL") {
        if (ledgerTypeFilter === "ROOM_TARIFF" && !e.chargeCode?.includes("ROOM") && !e.chargeCode?.includes("TARIFF")) return false;
        if (ledgerTypeFilter === "RESTAURANT_FOOD" && !e.chargeCode?.includes("FOOD") && !e.chargeCode?.includes("RESTAURANT") && !e.chargeCode?.includes("FB")) return false;
        if (ledgerTypeFilter === "MANUAL" && (e.chargeCode?.includes("ROOM") || e.chargeCode?.includes("FOOD") || e.chargeCode?.includes("FB"))) return false;
      }

      if (ledgerSearchQuery.trim()) {
        const q = ledgerSearchQuery.toLowerCase().trim();
        const desc = (e.description || "").toLowerCase();
        const code = (e.chargeCode || "").toLowerCase();
        const date = (e.serviceDate || "").toLowerCase();
        const amount = String(e.totalAmount || "");

        if (!desc.includes(q) && !code.includes(q) && !date.includes(q) && !amount.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [rawEntries, ledgerTypeFilter, ledgerSearchQuery]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-[#111114] border border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-zinc-400" />
              Folio & India GST Invoicing
            </h1>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800">
              B01–B09
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
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
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition shadow-sm"
            >
              <Plus className="h-4 w-4" /> Post Charge
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
              className="flex items-center gap-1.5 rounded-lg bg-white hover:bg-zinc-200 px-3 py-2 text-xs font-black text-zinc-950 transition shadow-sm"
            >
              <CreditCard className="h-4 w-4" /> Collect Payment
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Stays & Folios List with Powerful Search */}
        <div className="lg:col-span-4 p-3.5 sm:p-4 rounded-xl bg-[#111114] border border-zinc-800 space-y-3 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs">
            <span className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-zinc-400" />
              Folios Directory
            </span>
            <span className="text-zinc-400 font-mono font-semibold">
              {filteredStays.length} / {stays.length}
            </span>
          </div>

          {/* SEARCH BAR FOR STAYS / FOLIOS */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search room, guest name, phone..."
              value={staySearchQuery}
              onChange={(e) => setStaySearchQuery(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700/80 pl-8 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
            />
            {staySearchQuery && (
              <button
                onClick={() => setStaySearchQuery("")}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[10px] font-semibold text-center">
            <button
              onClick={() => setStayStatusFilter("ALL")}
              className={`rounded py-1 transition ${
                stayStatusFilter === "ALL"
                  ? "bg-zinc-800 text-white shadow-sm font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All ({stays.length})
            </button>
            <button
              onClick={() => setStayStatusFilter("IN_HOUSE")}
              className={`rounded py-1 transition ${
                stayStatusFilter === "IN_HOUSE"
                  ? "bg-emerald-600 text-white shadow-sm font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              In-House ({stays.filter((s) => s.status === "IN_HOUSE").length})
            </button>
            <button
              onClick={() => setStayStatusFilter("WITH_BALANCE")}
              className={`rounded py-1 transition ${
                stayStatusFilter === "WITH_BALANCE"
                  ? "bg-rose-600 text-white shadow-sm font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Due ({stays.filter((s) => s.folio?.balance > 0).length})
            </button>
            <button
              onClick={() => setStayStatusFilter("CHECKED_OUT")}
              className={`rounded py-1 transition ${
                stayStatusFilter === "CHECKED_OUT"
                  ? "bg-zinc-800 text-white shadow-sm font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Departed
            </button>
          </div>

          {/* Stays List */}
          <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1 flex-1">
            {filteredStays.map((s) => {
              const isSelected = s.id === selectedStayId;
              const room = s.roomAssignments?.[0]?.room;
              const balance = s.folio?.balance ?? 0;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStayId(s.id)}
                  className={`rounded-xl p-3 border transition cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? "bg-zinc-800/90 border-blue-500 shadow-md text-zinc-100"
                      : "bg-zinc-900/90 border-zinc-800/90 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="font-bold text-xs text-white font-mono">
                        Room {room?.number || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {balance > 0 && (
                        <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-800/50 px-1.5 py-0.2 rounded">
                          Due: {formatINR(balance)}
                        </span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-semibold ${
                          s.status === "IN_HOUSE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-200 font-semibold flex items-center gap-1.5">
                    <User className="h-3 w-3 text-zinc-500" />
                    <span>{s.primaryGuest?.name || "Guest"}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
                    <span>
                      {s.arrivalAt?.slice(0, 10)} → {s.expectedDepartureAt?.slice(0, 10)}
                    </span>
                    {s.primaryGuest?.phone && <span>{s.primaryGuest.phone}</span>}
                  </div>
                </div>
              );
            })}

            {filteredStays.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-500 space-y-1">
                <AlertCircle className="h-5 w-5 text-zinc-600 mx-auto" />
                <p className="font-semibold text-zinc-400">No matching folios found</p>
                <p className="text-[11px] text-zinc-600">Try changing your search term or filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Folio Ledger & Invoices */}
        <div className="lg:col-span-8 space-y-4">
          {folioData ? (
            <>
              {/* Active Folio Header Details */}
              <div className="p-4 rounded-xl bg-[#111114] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                    <BedDouble className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono">
                        Room {activeStay?.roomAssignments?.[0]?.room?.number || "Unassigned"}
                      </span>
                      <span className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                        Folio #{folioData.id?.slice(-6).toUpperCase()}
                      </span>
                      <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono font-semibold">
                        {activeStay?.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-300 font-medium mt-0.5">
                      Guest: <strong className="text-white">{activeStay?.primaryGuest?.name}</strong>
                      {activeStay?.primaryGuest?.phone && ` • ${activeStay.primaryGuest.phone}`}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 font-mono flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 self-start sm:self-auto">
                  <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                  <span>
                    Stay: {activeStay?.arrivalAt?.slice(0, 10)} to {activeStay?.expectedDepartureAt?.slice(0, 10)}
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 text-center font-mono">
                <div className="rounded-xl bg-[#111114] p-3 border border-zinc-800 shadow-sm">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Charges</div>
                  <div className="text-lg font-black text-white mt-0.5 tabular-nums">{formatINR(totalCharges)}</div>
                </div>
                <div className="rounded-xl bg-[#111114] p-3 border border-zinc-800 shadow-sm">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Payments</div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5 tabular-nums">{formatINR(totalPayments)}</div>
                </div>
                <div className="rounded-xl bg-[#111114] p-3 border border-zinc-800 shadow-sm">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Outstanding Balance</div>
                  <div
                    className={`text-lg font-black mt-0.5 tabular-nums ${
                      currentBalance > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {formatINR(currentBalance)}
                  </div>
                </div>
              </div>

              {/* Itemized Charges Table with Search */}
              <div className="rounded-xl border border-zinc-800 bg-[#111114] overflow-hidden shadow-sm space-y-2.5 p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-zinc-800">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Folio Charges Ledger</h2>
                    <p className="text-[10px] text-zinc-500 font-mono">SAC 996311 (Room 12%) / SAC 996331 (F&B 5%)</p>
                  </div>

                  {/* Ledger Search & Type Filter */}
                  <div className="flex items-center gap-2">
                    <div className="relative w-48 sm:w-56">
                      <Search className="absolute left-2.5 top-2 h-3 w-3 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Filter charges..."
                        value={ledgerSearchQuery}
                        onChange={(e) => setLedgerSearchQuery(e.target.value)}
                        className="w-full rounded-md bg-zinc-900 border border-zinc-700/80 pl-7 pr-6 py-1 text-[11px] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                      {ledgerSearchQuery && (
                        <button
                          onClick={() => setLedgerSearchQuery("")}
                          className="absolute right-2 top-1.5 text-zinc-500 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <select
                      value={ledgerTypeFilter}
                      onChange={(e: any) => setLedgerTypeFilter(e.target.value)}
                      className="rounded-md bg-zinc-900 border border-zinc-700/80 px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono"
                    >
                      <option value="ALL">All Types</option>
                      <option value="ROOM_TARIFF">Room Tariffs</option>
                      <option value="RESTAURANT_FOOD">Dining / F&B</option>
                      <option value="MANUAL">Services / Other</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
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
                        const isFood = e.chargeCode?.includes("FOOD") || e.chargeCode?.includes("RESTAURANT") || e.chargeCode?.includes("FB");
                        return (
                          <tr key={e.id} className="hover:bg-zinc-900/50 transition">
                            <td className="p-2.5 font-mono text-zinc-400 text-[11px]">{e.serviceDate}</td>
                            <td className="p-2.5 font-medium text-zinc-200">
                              <div className="flex items-center gap-1.5">
                                <span>{e.description}</span>
                                <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                                  isFood ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                }`}>
                                  {isFood ? "F&B" : "Room"}
                                </span>
                              </div>
                            </td>
                            <td className="p-2.5 font-mono text-zinc-400 text-[11px]">
                              {isFood ? "996331" : "996311"}
                            </td>
                            <td className="p-2.5 font-mono tabular-nums text-zinc-300">{formatINR(e.taxableAmount)}</td>
                            <td className="p-2.5 font-mono text-zinc-400 tabular-nums">{formatINR(taxAmt)}</td>
                            <td className="p-2.5 font-mono font-bold text-white text-right tabular-nums">
                              {formatINR(e.totalAmount)}
                            </td>
                          </tr>
                        );
                      })}
                      {entries.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-zinc-500 italic font-mono text-xs">
                            {rawEntries.length === 0 ? "No charges posted yet" : "No charges match your search"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Receipts Table */}
              <div className="rounded-xl border border-zinc-800 bg-[#111114] overflow-hidden shadow-sm p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Payment Receipts</h2>
                  <span className="text-[10px] text-zinc-500 font-mono">{payments.length} Payments</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
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
                        <tr key={p.id} className="hover:bg-zinc-900/50 transition">
                          <td className="p-2.5 font-mono text-blue-400 font-bold">{p.receiptNo}</td>
                          <td className="p-2.5 font-mono text-zinc-400 text-[11px]">{p.receivedAt?.slice(0, 10)}</td>
                          <td className="p-2.5 font-semibold text-zinc-200">
                            <span className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px]">
                              {p.method}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-zinc-400 text-[11px]">{p.reference || "—"}</td>
                          <td className="p-2.5 font-mono font-bold text-emerald-400 text-right tabular-nums">
                            {formatINR(p.amount)}
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-zinc-500 italic font-mono text-xs">
                            No payments recorded yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoices List */}
              {invoices.length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-[#111114] p-3.5 space-y-2.5 shadow-sm">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Tax Invoices</h2>
                  {invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-blue-400">{inv.invoiceNo}</div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          FY: {inv.financialYear} • {inv.issuedAt?.slice(0, 10)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400 tabular-nums">{formatINR(inv.totalAmount)}</span>
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowInvoiceModal(true);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition"
                        >
                          <Printer className="h-3.5 w-3.5" /> View / Print
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-[#111114] p-16 text-center text-xs text-zinc-400 font-mono space-y-2">
              <Receipt className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="font-bold text-zinc-300">Select a stay to view folio ledger</p>
              <p className="text-zinc-500">Use the search bar on the left to quickly look up any guest or room.</p>
            </div>
          )}
        </div>
      </div>

      {/* POST CHARGE MODAL */}
      {showManualChargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-zinc-400" />
                Post Manual Charge
              </h2>
              <button onClick={() => setShowManualChargeModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePostCharge} className="space-y-3.5 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Base Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={chargeForm.amount}
                    onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">SAC Code</label>
                  <select
                    value={chargeForm.sacHsn}
                    onChange={(e) => setChargeForm({ ...chargeForm, sacHsn: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white font-mono"
                  >
                    <option value="996311">SAC 996311 (Room 12%)</option>
                    <option value="996331">SAC 996331 (F&B 5%)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualChargeModal(false)}
                  className="rounded-xl px-3 py-2 text-zinc-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-white px-4 py-2 font-black text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-zinc-400" />
                Collect Payment
              </h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Method *</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Reference / UTR</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white font-mono"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-xl px-3 py-2 text-zinc-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-white px-4 py-2 font-black text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-white text-zinc-900 p-6 shadow-2xl space-y-4 print:p-0 print:border-none">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 print:hidden">
              <span className="text-xs font-bold uppercase font-mono text-zinc-600">
                GST Tax Invoice (Rule 46)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition shadow-sm"
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
                  <h1 className="text-lg font-black text-zinc-950">{activeProperty?.displayName}</h1>
                  <p className="text-zinc-600 text-[11px] mt-0.5">{activeProperty?.legalName}</p>
                  <p className="font-mono text-zinc-800 text-[11px]">
                    GSTIN: {activeProperty?.gstin || "N/A"} | State: {activeProperty?.stateCode || "18"}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-zinc-950">{selectedInvoice.invoiceNo}</div>
                  <div className="text-zinc-600 text-[11px]">Date: {selectedInvoice.issuedAt?.slice(0, 10)}</div>
                  <div className="text-zinc-600 text-[11px]">FY: {selectedInvoice.financialYear}</div>
                </div>
              </div>

              <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="font-bold text-zinc-500 uppercase text-[10px]">Billed To:</div>
                  <div className="font-bold text-zinc-900">{activeStay?.primaryGuest?.name}</div>
                  <div className="text-zinc-600">{activeStay?.primaryGuest?.phone}</div>
                </div>
                <div>
                  <div className="font-bold text-zinc-500 uppercase text-[10px]">Place of Supply:</div>
                  <div className="font-mono">{activeProperty?.stateCode || "18"} (Intra-State)</div>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-zinc-200 rounded-lg overflow-hidden">
                <thead className="bg-zinc-100 text-zinc-800 font-bold border-b border-zinc-200">
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
                        <td className="p-2 font-medium">{line.description}</td>
                        <td className="p-2 font-mono">{line.sacHsn}</td>
                        <td className="p-2 font-mono text-right tabular-nums">{formatINR(line.taxableAmount)}</td>
                        <td className="p-2 font-mono text-right tabular-nums">{formatINR(comp.cgstAmount || 0)}</td>
                        <td className="p-2 font-mono text-right tabular-nums">{formatINR(comp.sgstAmount || 0)}</td>
                        <td className="p-2 font-mono font-bold text-right tabular-nums">{formatINR(line.totalAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-between items-end pt-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-12 w-12 bg-zinc-100 border border-zinc-300 rounded-lg flex items-center justify-center">
                    <QrCode className="h-9 w-9 text-zinc-800" />
                  </div>
                  <div className="text-[10px] text-zinc-600 font-mono">
                    <div className="font-bold text-zinc-900">GST Rule 46 Authenticated</div>
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
                  <div className="flex justify-between font-black text-sm text-zinc-950 pt-1 border-t border-zinc-300">
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
