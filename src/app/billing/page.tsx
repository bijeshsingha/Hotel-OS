"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR } from "@/lib/gst/calculator";
import { numberToWordsINR } from "@/lib/gst/number-to-words";
import {
  Receipt,
  Plus,
  CreditCard,
  Printer,
  X,
  Search,
  BedDouble,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react";

function BillingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStayId = searchParams.get("stayId") || "";
  const initialAction = searchParams.get("action") || "";

  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [stays, setStays] = useState<any[]>([]);
  const [selectedStayId, setSelectedStayId] = useState<string>(initialStayId);
  const [folioData, setFolioData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter States for Stays / Folios
  const [staySearchQuery, setStaySearchQuery] = useState<string>("");
  const [stayStatusFilter, setStayStatusFilter] = useState<"ALL" | "IN_HOUSE" | "CHECKED_OUT" | "WITH_BALANCE">("ALL");

  // Search & Filter States for Ledger Entries
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState<string>("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<"ALL" | "ROOM_TARIFF" | "RESTAURANT_FOOD" | "MANUAL">("ALL");

  // Group Multi-Room Settlement State
  const [selectedGroupStayIds, setSelectedGroupStayIds] = useState<string[]>([]);
  const [showGroupPaymentModal, setShowGroupPaymentModal] = useState(false);
  const [groupPaymentForm, setGroupPaymentForm] = useState({
    payerName: "",
    companyName: "",
    gstin: "",
    method: "UPI",
    reference: "",
    notes: "",
    allocations: {} as { [stayId: string]: number },
  });

  // Single Modals
  const [showManualChargeModal, setShowManualChargeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isLiveTaxBillView, setIsLiveTaxBillView] = useState(false);

  // Single Form states
  const [chargeForm, setChargeForm] = useState({
    chargeCode: "ROOM_TARIFF",
    description: "Extra Bed & Linen",
    amount: "1000",
    sacHsn: "996311",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "0",
    method: "UPI",
    reference: "",
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
          if (initialStayId && stayList.some((s: any) => s.id === initialStayId)) {
            return initialStayId;
          }
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

  // Handle URL checkout action trigger
  useEffect(() => {
    if (initialAction === "checkout" && folioData && selectedStayId) {
      const activeStay = stays.find((s) => s.id === selectedStayId);
      if (activeStay && activeStay.status === "IN_HOUSE") {
        const bal = folioData.balance ?? 0;
        if (bal > 0) {
          setPaymentForm({
            amount: String(Math.max(0, bal)),
            method: "UPI",
            reference: `UPI/${Date.now().toString().slice(-6)}`,
            payerName: activeStay?.primaryGuest?.name || "Guest",
          });
        }
      }
    }
  }, [initialAction, folioData?.id]);

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
        const companyName = s.primaryGuest?.companyName ? String(s.primaryGuest.companyName).toLowerCase() : "";
        const folioNo = s.folioId ? String(s.folioId).toLowerCase() : "";

        const matchRoom = roomNo.includes(q);
        const matchName = guestName.includes(q);
        const matchPhone = guestPhone.includes(q);
        const matchEmail = guestEmail.includes(q);
        const matchCompany = companyName.includes(q);
        const matchFolio = folioNo.includes(q);

        if (!matchRoom && !matchName && !matchPhone && !matchEmail && !matchCompany && !matchFolio) {
          return false;
        }
      }

      return true;
    });
  }, [stays, staySearchQuery, stayStatusFilter]);

  const activeStay = stays.find((s) => s.id === selectedStayId);
  const rawEntries = folioData?.windows?.flatMap((w: any) => w.entries) || [];
  const payments = folioData?.payments || [];
  const invoices = folioData?.windows?.flatMap((w: any) => w.invoices) || [];

  const totalCharges = rawEntries.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
  const totalTaxable = rawEntries.reduce((sum: number, e: any) => sum + (e.taxableAmount || 0), 0);
  const totalTaxes = Math.max(0, totalCharges - totalTaxable);
  const totalPayments = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const currentBalance = Math.round((totalCharges - totalPayments) * 100) / 100;

  // Stay Duration & Night Calculations
  const stayCalculations = useMemo(() => {
    if (!activeStay) return { nights: 1, roomRatePerNight: 0 };

    const arrDate = new Date(activeStay.arrivalAt || new Date());
    const depDate = new Date(activeStay.actualDepartureAt || activeStay.expectedDepartureAt || new Date());
    
    const diffMs = Math.max(0, depDate.getTime() - arrDate.getTime());
    const calculatedNights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const roomEntries = rawEntries.filter((e: any) => e.chargeCode?.includes("ROOM") || e.chargeCode?.includes("TARIFF"));
    const firstRoomEntry = roomEntries[0];
    const roomRatePerNight = firstRoomEntry ? firstRoomEntry.unitAmount || firstRoomEntry.taxableAmount : 2000;

    return {
      nights: calculatedNights,
      roomRatePerNight,
    };
  }, [activeStay, rawEntries]);

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

  // Post Manual Charge
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
      await loadStays();
      await refreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Record Single Payment
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
      await loadStays();
      await refreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Check-out and Issue Invoice
  const handleExecuteCheckout = async () => {
    if (!activeStay) return;
    if (currentBalance > 0.5) {
      setPaymentForm({
        amount: String(currentBalance),
        method: "UPI",
        reference: `UPI/${Date.now().toString().slice(-6)}`,
        payerName: activeStay?.primaryGuest?.name || "Guest",
      });
      setShowPaymentModal(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/stays/${activeStay.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      await loadStays();
      if (data.invoice) {
        setSelectedInvoice(data.invoice);
        setIsLiveTaxBillView(false);
        setShowInvoiceModal(true);
      }
      await refreshData();
    } catch (err: any) {
      alert(`Checkout error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Live Tax Invoice preview
  const handleOpenLiveTaxBill = () => {
    setIsLiveTaxBillView(true);
    setSelectedInvoice(invoices[0] || null);
    setShowInvoiceModal(true);
  };

  // Group Multi-Room Checkbox Toggle
  const toggleGroupStaySelection = (stayId: string) => {
    setSelectedGroupStayIds((prev) =>
      prev.includes(stayId) ? prev.filter((id) => id !== stayId) : [...prev, stayId]
    );
  };

  // Open Group Settlement Modal with Auto-Allocations
  const handleOpenGroupPaymentModal = () => {
    const selectedStays = stays.filter((s) => selectedGroupStayIds.includes(s.id));
    if (selectedStays.length === 0) {
      alert("Please select at least one room from the directory checkboxes.");
      return;
    }

    const initialAlloc: { [stayId: string]: number } = {};
    selectedStays.forEach((s) => {
      const bal = Math.max(0, s.folio?.balance ?? 0);
      initialAlloc[s.id] = bal;
    });

    const firstGuest = selectedStays[0]?.primaryGuest;
    setGroupPaymentForm({
      payerName: firstGuest?.name || "Group Representative",
      companyName: firstGuest?.companyName || "",
      gstin: firstGuest?.gstin || "",
      method: "UPI",
      reference: `GRP-UPI/${Date.now().toString().slice(-6)}`,
      notes: `Group payment covering ${selectedStays.length} rooms: ${selectedStays.map((s) => s.roomAssignments?.[0]?.room?.number || "Unassigned").join(", ")}`,
      allocations: initialAlloc,
    });
    setShowGroupPaymentModal(true);
  };

  // Submit Group Payment
  const handleSubmitGroupPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty?.id) return;
    setActionLoading(true);
    try {
      const selectedStays = stays.filter((s) => selectedGroupStayIds.includes(s.id));
      const allocationsPayload = selectedStays
        .map((s) => ({
          folioId: s.folioId || s.folio?.id,
          stayId: s.id,
          roomNumber: s.roomAssignments?.[0]?.room?.number || "Unassigned",
          guestName: s.primaryGuest?.name || "Guest",
          amount: Number(groupPaymentForm.allocations[s.id] || 0),
        }))
        .filter((a) => a.folioId && a.amount > 0);

      if (allocationsPayload.length === 0) {
        throw new Error("No allocated amounts provided for selected rooms.");
      }

      const res = await fetch("/api/v1/billing/group-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty.id,
          payerName: groupPaymentForm.payerName,
          companyName: groupPaymentForm.companyName,
          gstin: groupPaymentForm.gstin,
          method: groupPaymentForm.method,
          reference: groupPaymentForm.reference,
          notes: groupPaymentForm.notes,
          allocations: allocationsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process group settlement");

      alert(`Group Payment Successful! Receipt: ${data.groupReceiptNo} allocated across ${data.paymentsCount} rooms.`);
      setShowGroupPaymentModal(false);
      setSelectedGroupStayIds([]);
      await loadStays();
      if (folioData?.id) await loadFolio(folioData.id);
      await refreshData();
    } catch (err: any) {
      alert(`Group payment error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Group Checkout (for all settled rooms in group)
  const handleExecuteGroupCheckout = async () => {
    const selectedStays = stays.filter((s) => selectedGroupStayIds.includes(s.id) && s.status === "IN_HOUSE");
    const unSettled = selectedStays.filter((s) => (s.folio?.balance ?? 0) > 0.5);

    if (unSettled.length > 0) {
      alert(
        `Cannot group checkout: Room(s) ${unSettled
          .map((s) => s.roomAssignments?.[0]?.room?.number)
          .join(", ")} still have unpaid balances. Please record group settlement first.`
      );
      return;
    }

    if (!confirm(`Confirm checkout for all ${selectedStays.length} selected group rooms?`)) return;

    setActionLoading(true);
    try {
      for (const s of selectedStays) {
        await fetch(`/api/v1/stays/${s.id}/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      }
      alert(`Group checkout complete for ${selectedStays.length} rooms! Invoices generated.`);
      setSelectedGroupStayIds([]);
      await loadStays();
      await refreshData();
    } catch (err: any) {
      alert(`Group checkout error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-[#111114] border border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-zinc-400" />
              Billing, Checkout & Tax Invoices
            </h1>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50">
              Rule 46 GST
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Single & group checkouts, stay-duration billing, and printable tax receipts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedGroupStayIds.length > 0 && (
            <button
              onClick={handleOpenGroupPaymentModal}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs font-bold transition shadow-sm animate-in fade-in"
            >
              <Users className="h-4 w-4" /> Group Payment ({selectedGroupStayIds.length} Rooms)
            </button>
          )}

          {selectedGroupStayIds.length > 0 && (
            <button
              onClick={handleExecuteGroupCheckout}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-2 text-xs font-semibold transition shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Group Checkout
            </button>
          )}

          {folioData && (
            <>
              <button
                onClick={handleOpenLiveTaxBill}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition shadow-sm"
              >
                <Printer className="h-4 w-4 text-zinc-300" /> Print Tax Bill
              </button>

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
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Stays & Folios Directory */}
        <div className="lg:col-span-4 p-3.5 sm:p-4 rounded-xl bg-[#111114] border border-zinc-800 space-y-3 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs">
            <span className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-zinc-400" />
              Rooms Directory
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedGroupStayIds.length === filteredStays.length) {
                    setSelectedGroupStayIds([]);
                  } else {
                    setSelectedGroupStayIds(filteredStays.map((s) => s.id));
                  }
                }}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-mono font-medium underline"
              >
                {selectedGroupStayIds.length > 0 ? "Clear Selection" : "Select All"}
              </button>
              <span className="text-zinc-400 font-mono font-semibold">
                {filteredStays.length} / {stays.length}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search room #, guest name, company..."
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

          {/* Stays List with Group Selection Checkbox */}
          <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1 flex-1">
            {filteredStays.map((s) => {
              const isSelected = s.id === selectedStayId;
              const isGroupChecked = selectedGroupStayIds.includes(s.id);
              const room = s.roomAssignments?.[0]?.room;
              const balance = s.folio?.balance ?? 0;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStayId(s.id)}
                  className={`rounded-xl p-3 border transition cursor-pointer flex items-start gap-2.5 ${
                    isSelected
                      ? "bg-zinc-800/90 border-blue-500 shadow-md text-zinc-100"
                      : "bg-zinc-900/90 border-zinc-800/90 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isGroupChecked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleGroupStaySelection(s.id)}
                    className="mt-1 h-3.5 w-3.5 rounded bg-zinc-800 border-zinc-700 accent-emerald-500 cursor-pointer"
                    title="Select for group payment / checkout"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <BedDouble className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span className="font-bold text-xs text-white font-mono">
                          Room {room?.number || "Unassigned"}
                        </span>
                        <span className="text-[10px] text-zinc-500 truncate">
                          ({room?.roomType?.name || "AC"})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {balance > 0 ? (
                          <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-800/50 px-1.5 py-0.2 rounded">
                            Due: {formatINR(balance)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-1.5 py-0.2 rounded">
                            Paid
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-zinc-200 font-semibold flex items-center justify-between gap-1">
                      <span className="truncate">{s.primaryGuest?.name || "Guest"}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-semibold shrink-0 ${
                          s.status === "IN_HOUSE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>
                        {s.arrivalAt?.slice(0, 10)} → {s.expectedDepartureAt?.slice(0, 10)}
                      </span>
                      {s.primaryGuest?.phone && <span className="truncate">{s.primaryGuest.phone}</span>}
                    </div>
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

        {/* Right: Folio Ledger, Check-out Action & Invoices */}
        <div className="lg:col-span-8 space-y-4">
          {folioData ? (
            <>
              {/* Active Folio Header & Check-out Status Card */}
              <div className="p-4 rounded-xl bg-[#111114] border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white shrink-0">
                    <BedDouble className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white font-mono">
                        Room {activeStay?.roomAssignments?.[0]?.room?.number || "Unassigned"}
                      </span>
                      <span className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                        {activeStay?.roomAssignments?.[0]?.room?.roomType?.name || "Deluxe AC"}
                      </span>
                      <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono font-semibold">
                        {activeStay?.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-300 font-medium mt-0.5">
                      Guest: <strong className="text-white">{activeStay?.primaryGuest?.name}</strong>
                      {activeStay?.primaryGuest?.companyName && ` (${activeStay.primaryGuest.companyName})`}
                      {activeStay?.primaryGuest?.phone && ` • ${activeStay.primaryGuest.phone}`}
                    </div>
                  </div>
                </div>

                {/* Duration & Checkout Button Block */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                  <div className="text-xs text-zinc-300 font-mono bg-zinc-900/90 px-3 py-2 rounded-xl border border-zinc-800 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    <div>
                      <span className="font-bold text-white">{stayCalculations.nights} Night{stayCalculations.nights > 1 ? "s" : ""}</span>
                      <span className="text-[10px] text-zinc-500 block">@ {formatINR(stayCalculations.roomRatePerNight)}/night</span>
                    </div>
                  </div>

                  {activeStay?.status === "IN_HOUSE" ? (
                    currentBalance <= 0.5 ? (
                      <button
                        onClick={handleExecuteCheckout}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-black transition shadow-lg disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{actionLoading ? "Checking Out..." : "Check Out & Issue Invoice"}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setPaymentForm({
                            amount: String(currentBalance),
                            method: "UPI",
                            reference: `UPI/${Date.now().toString().slice(-6)}`,
                            payerName: activeStay?.primaryGuest?.name || "Guest",
                          });
                          setShowPaymentModal(true);
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 text-xs font-black transition shadow-lg"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Settle {formatINR(currentBalance)} & Check Out</span>
                      </button>
                    )
                  ) : (
                    <button
                      onClick={handleOpenLiveTaxBill}
                      className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white px-3.5 py-2 text-xs font-bold transition border border-zinc-700"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print Tax Invoice</span>
                    </button>
                  )}
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
                    <p className="text-[10px] text-zinc-500 font-mono">
                      Calculation: {stayCalculations.nights} Night{stayCalculations.nights > 1 ? "s" : ""} stayed x Room Rent
                    </p>
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
                        const taxAmt = (e.totalAmount || 0) - (e.taxableAmount || 0);
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
                            <td className="p-2.5 font-mono tabular-nums text-zinc-300">{formatINR(e.taxableAmount || 0)}</td>
                            <td className="p-2.5 font-mono text-zinc-400 tabular-nums">{formatINR(taxAmt)}</td>
                            <td className="p-2.5 font-mono font-bold text-white text-right tabular-nums">
                              {formatINR(e.totalAmount || 0)}
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
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Payment & Settlement Receipts</h2>
                  <span className="text-[10px] text-zinc-500 font-mono">{payments.length} Payments</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                      <tr>
                        <th className="p-2.5">Receipt #</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Reference / Notes</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {payments.map((p: any) => {
                        const isGroup = p.reference?.includes("GRP") || p.receiptNo?.includes("GRP");
                        return (
                          <tr key={p.id} className="hover:bg-zinc-900/50 transition">
                            <td className="p-2.5 font-mono text-blue-400 font-bold flex items-center gap-1.5">
                              <span>{p.receiptNo}</span>
                              {isGroup && (
                                <span className="text-[9px] bg-purple-950/50 text-purple-300 border border-purple-800 px-1 py-0.2 rounded font-mono">
                                  Group
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-zinc-400 text-[11px]">{p.receivedAt?.slice(0, 10)}</td>
                            <td className="p-2.5 font-semibold text-zinc-200">
                              <span className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px]">
                                {p.method}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-zinc-300 text-[11px]">{p.reference || "—"}</td>
                            <td className="p-2.5 font-mono font-bold text-emerald-400 text-right tabular-nums">
                              {formatINR(p.amount || 0)}
                            </td>
                          </tr>
                        );
                      })}
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
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Generated Tax Invoices</h2>
                  {invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-blue-400">{inv.invoiceNo}</div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          FY: {inv.financialYear} • Issued: {inv.issuedAt?.slice(0, 10)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400 tabular-nums">{formatINR(inv.totalAmount || 0)}</span>
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsLiveTaxBillView(false);
                            setShowInvoiceModal(true);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 px-3 py-1.5 text-xs font-bold transition shadow-sm"
                        >
                          <Printer className="h-3.5 w-3.5" /> Print Tax Invoice
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
              <p className="font-bold text-zinc-300">Select a room from the directory to manage billing</p>
              <p className="text-zinc-500">Use the directory on the left or select multiple rooms for group payments.</p>
            </div>
          )}
        </div>
      </div>

      {/* POST MANUAL CHARGE MODAL */}
      {showManualChargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-zinc-400" />
                Post Manual Charge to Room {activeStay?.roomAssignments?.[0]?.room?.number}
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

      {/* COLLECT SINGLE PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-zinc-400" />
                Collect Payment for Room {activeStay?.roomAssignments?.[0]?.room?.number}
              </h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Payment Method *</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CASH">Cash Drawer</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="OTA_VCC">OTA Virtual Card</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Reference / UTR / Auth Code</label>
                <input
                  type="text"
                  placeholder="e.g. UTR/98127391823 or Cash Ref"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Payer Name</label>
                <input
                  type="text"
                  value={paymentForm.payerName}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payerName: e.target.value })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white"
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
                  {actionLoading ? "Recording..." : "Record Payment & Settle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GROUP / MULTI-ROOM SETTLEMENT MODAL */}
      {showGroupPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-700 bg-[#121215] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-400" />
                  Group Multi-Room Payment Settlement
                </h2>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Record a single payment distributed across {selectedGroupStayIds.length} room folios
                </p>
              </div>
              <button onClick={() => setShowGroupPaymentModal(false)} className="text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitGroupPayment} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Group Payer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Sharma (Group Head)"
                    value={groupPaymentForm.payerName}
                    onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, payerName: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Payment Method *</label>
                  <select
                    value={groupPaymentForm.method}
                    onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, method: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white font-semibold"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CASH">Cash Drawer</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Company Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Singhania Tech Ltd"
                    value={groupPaymentForm.companyName}
                    onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, companyName: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Company GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 18AAAAA0000A1Z5"
                    value={groupPaymentForm.gstin}
                    onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, gstin: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Transaction Ref / UTR / Cheque # *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR/98127391823"
                  value={groupPaymentForm.reference}
                  onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, reference: e.target.value })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-white font-mono"
                />
              </div>

              {/* Allocated Rooms Breakdown */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Room Allocations ({selectedGroupStayIds.length} Rooms)</span>
                  <span className="font-mono text-emerald-400">
                    Total Group Settlement:{" "}
                    {formatINR(
                      Object.values(groupPaymentForm.allocations).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0)
                    )}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {stays
                    .filter((s) => selectedGroupStayIds.includes(s.id))
                    .map((s) => {
                      const roomNo = s.roomAssignments?.[0]?.room?.number || "Unassigned";
                      const bal = s.folio?.balance ?? 0;
                      const allocVal = groupPaymentForm.allocations[s.id] ?? bal;

                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-white font-mono">Room {roomNo}</div>
                            <div className="text-[10px] text-zinc-400 truncate">
                              {s.primaryGuest?.name} • Due: {formatINR(bal)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 font-mono">Allocate ₹</span>
                            <input
                              type="number"
                              required
                              step="0.01"
                              value={allocVal}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setGroupPaymentForm({
                                  ...groupPaymentForm,
                                  allocations: {
                                    ...groupPaymentForm.allocations,
                                    [s.id]: val,
                                  },
                                });
                              }}
                              className="w-24 rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1 text-right text-white font-mono font-bold focus:outline-none focus:border-white"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGroupPaymentModal(false)}
                  className="rounded-xl px-3 py-2 text-zinc-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-black text-white hover:bg-emerald-500 transition disabled:opacity-50 shadow-md"
                >
                  {actionLoading ? "Processing..." : "Confirm Group Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📄 HIGH-FIDELITY PRINTABLE TAX INVOICE MODAL (EXACT SPECIFICATION)      */}
      {/* ========================================================================= */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-700 bg-white text-zinc-900 p-5 sm:p-7 shadow-2xl space-y-4 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none">
            {/* Top Toolbar (Hidden when printing) */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase font-mono tracking-wider text-zinc-700">
                  {isLiveTaxBillView ? "Live Folio Tax Invoice (Rule 46)" : "Official Tax Invoice"}
                </span>
                <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-mono font-bold">
                  Verified
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white px-4 py-2 text-xs font-bold transition shadow"
                >
                  <Printer className="h-4 w-4" /> Print Tax Invoice
                </button>
                <button onClick={() => setShowInvoiceModal(false)} className="text-zinc-500 hover:text-zinc-900 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE TAX INVOICE DOCUMENT */}
            <div className="space-y-3.5 text-xs text-zinc-900 font-sans print:text-black">
              {/* Center Title */}
              <div className="text-center pb-1">
                <h1 className="text-lg font-black tracking-wide uppercase border-b-2 border-zinc-900 inline-block pb-0.5">
                  Tax Invoice
                </h1>
                <div className="text-[11px] font-bold text-zinc-700 uppercase mt-0.5">
                  {activeProperty?.legalName || activeProperty?.displayName}
                </div>
                <div className="text-[10px] text-zinc-600 font-mono">
                  {activeProperty?.address} | GSTIN: {activeProperty?.gstin || "18AAAAA1234A1Z5"} | State Code: {activeProperty?.stateCode || "18"}
                </div>
              </div>

              {/* 1. TOP HEADER KEY-VALUE BOX (MATCHING EXACT SCREENSHOT) */}
              <div className="border border-zinc-900 p-2.5 rounded-none grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] leading-tight">
                {/* Left Column */}
                <div className="space-y-0.5">
                  <div className="flex">
                    <span className="w-28 font-bold text-zinc-800">Bill No.</span>
                    <span>: {selectedInvoice?.invoiceNo || `F${activeStay?.roomAssignments?.[0]?.room?.number || "00"}${new Date().getDate()}`}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-zinc-800">Guest Name</span>
                    <span className="font-bold uppercase">: {activeStay?.primaryGuest?.name || "ANSHU KUMAR GUPTA"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-zinc-800">Address</span>
                    <span>: {activeStay?.primaryGuest?.city || "ASSAM / INDIA"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-zinc-800">Contact No.</span>
                    <span>: {activeStay?.primaryGuest?.phone || "9525053699"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-zinc-800">City</span>
                    <span>: {activeStay?.primaryGuest?.city || "Guwahati"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-zinc-800">Country</span>
                    <span>: {activeStay?.primaryGuest?.nationality || "India"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-zinc-800">Company</span>
                    <span>: {activeStay?.primaryGuest?.companyName || "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-zinc-800">Company Address</span>
                    <span>: —</span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-0.5">
                  <div className="flex">
                    <span className="w-32 font-bold text-zinc-800">Date & Time</span>
                    <span>: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} {new Date().toLocaleTimeString("en-US")}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-zinc-800">Pax</span>
                    <span>: {activeStay?.adults || 1} Adult{activeStay?.adults > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-zinc-800">Regn. No.</span>
                    <span>: R/000000{activeStay?.id?.slice(-4) || "4435"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-zinc-800">Regn Date & Time</span>
                    <span>: {activeStay?.arrivalAt ? new Date(activeStay.arrivalAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-zinc-800">Arrival Date</span>
                    <span>: {activeStay?.arrivalAt ? new Date(activeStay.arrivalAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-zinc-800">Departure Date</span>
                    <span>: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} {new Date().toLocaleTimeString("en-US")}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-zinc-800">Room No.</span>
                    <span className="font-bold">: {activeStay?.roomAssignments?.[0]?.room?.number || "229"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-zinc-800">Company GST No</span>
                    <span>: {activeStay?.primaryGuest?.gstin || "—"}</span>
                  </div>
                </div>
              </div>

              {/* 2. DATE-WISE CHARGES BREAKDOWN TABLE */}
              <div className="border border-zinc-900 overflow-hidden">
                <table className="w-full text-left font-mono text-[10px] border-collapse">
                  <thead className="border-b border-zinc-900 bg-zinc-100 font-bold">
                    <tr>
                      <th className="p-1 border-r border-zinc-400">Date</th>
                      <th className="p-1 border-r border-zinc-400 text-right">O.Room Rent</th>
                      <th className="p-1 border-r border-zinc-400 text-right">Disc</th>
                      <th className="p-1 border-r border-zinc-400 text-right">Room Rent</th>
                      <th className="p-1 border-r border-zinc-400 text-right">E.Bed Ch.</th>
                      <th className="p-1 border-r border-zinc-400 text-right">SGST</th>
                      <th className="p-1 border-r border-zinc-400 text-right">CGST</th>
                      <th className="p-1 border-r border-zinc-400 text-right">Room Credit</th>
                      <th className="p-1 border-r border-zinc-400 text-right">Oth. Charge</th>
                      <th className="p-1 border-r border-zinc-400 text-right">Advance</th>
                      <th className="p-1 text-right">Bill Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-300">
                    {rawEntries.map((e: any) => {
                      const isFood = e.chargeCode?.includes("FOOD") || e.chargeCode?.includes("RESTAURANT");
                      const taxHalf = ((e.totalAmount || 0) - (e.taxableAmount || 0)) / 2;
                      return (
                        <tr key={e.id}>
                          <td className="p-1 border-r border-zinc-300">{e.serviceDate}</td>
                          <td className="p-1 border-r border-zinc-300 text-right">{(e.taxableAmount || 0).toFixed(2)}</td>
                          <td className="p-1 border-r border-zinc-300 text-right">0.00</td>
                          <td className="p-1 border-r border-zinc-300 text-right">{(e.taxableAmount || 0).toFixed(2)}</td>
                          <td className="p-1 border-r border-zinc-300 text-right">0.00</td>
                          <td className="p-1 border-r border-zinc-300 text-right">{taxHalf.toFixed(2)}</td>
                          <td className="p-1 border-r border-zinc-300 text-right">{taxHalf.toFixed(2)}</td>
                          <td className="p-1 border-r border-zinc-300 text-right">0.00</td>
                          <td className="p-1 border-r border-zinc-300 text-right">{isFood ? (e.totalAmount || 0).toFixed(2) : "0.00"}</td>
                          <td className="p-1 border-r border-zinc-300 text-right">{totalPayments > 0 ? totalPayments.toFixed(2) : "0.00"}</td>
                          <td className="p-1 text-right font-bold">{(e.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}

                    {/* Summary row showing Nights calculation */}
                    <tr className="bg-zinc-50 border-t border-zinc-900 font-bold">
                      <td className="p-1 border-r border-zinc-400" colSpan={3}>
                        STAY DURATION: {stayCalculations.nights} NIGHT{stayCalculations.nights > 1 ? "S" : ""}
                      </td>
                      <td className="p-1 border-r border-zinc-400 text-right">
                        {totalTaxable.toFixed(2)}
                      </td>
                      <td className="p-1 border-r border-zinc-400 text-right">0.00</td>
                      <td className="p-1 border-r border-zinc-400 text-right">
                        {(totalTaxes / 2).toFixed(2)}
                      </td>
                      <td className="p-1 border-r border-zinc-400 text-right">
                        {(totalTaxes / 2).toFixed(2)}
                      </td>
                      <td className="p-1 border-r border-zinc-400 text-right">0.00</td>
                      <td className="p-1 border-r border-zinc-400 text-right">0.00</td>
                      <td className="p-1 border-r border-zinc-400 text-right">{totalPayments.toFixed(2)}</td>
                      <td className="p-1 text-right">{totalCharges.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. GST TABLE & PAYMENTS TABLE (LEFT) + TOTALS SUMMARY (RIGHT) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                {/* Left Block: GST Breakdown & Receipt Breakdown */}
                <div className="sm:col-span-7 space-y-2.5">
                  {/* GST Table */}
                  <div className="border border-zinc-900 overflow-hidden w-full max-w-xs">
                    <table className="w-full text-left font-mono text-[10px] border-collapse">
                      <thead className="bg-zinc-100 border-b border-zinc-900 font-bold">
                        <tr>
                          <th className="p-1 border-r border-zinc-400">GST(%)</th>
                          <th className="p-1 border-r border-zinc-400 text-right">Amount</th>
                          <th className="p-1 border-r border-zinc-400 text-right">CGST</th>
                          <th className="p-1 border-r border-zinc-400 text-right">SGST</th>
                          <th className="p-1 text-right">To.Amt.</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-1 border-r border-zinc-300 font-bold">12.00</td>
                          <td className="p-1 border-r border-zinc-300 text-right">
                            {totalTaxable.toFixed(2)}
                          </td>
                          <td className="p-1 border-r border-zinc-300 text-right">
                            {(totalTaxes / 2).toFixed(2)}
                          </td>
                          <td className="p-1 border-r border-zinc-300 text-right">
                            {(totalTaxes / 2).toFixed(2)}
                          </td>
                          <td className="p-1 text-right font-bold">{totalCharges.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Payment Receipts Grid */}
                  <div className="border border-zinc-900 overflow-hidden">
                    <table className="w-full text-left font-mono text-[9px] border-collapse">
                      <thead className="bg-zinc-100 border-b border-zinc-900 font-bold">
                        <tr>
                          <th className="p-1 border-r border-zinc-400">R.Date</th>
                          <th className="p-1 border-r border-zinc-400">Receipt No.</th>
                          <th className="p-1 border-r border-zinc-400">Pay Mode</th>
                          <th className="p-1 border-r border-zinc-400 text-right">Pay Amount</th>
                          <th className="p-1 border-r border-zinc-400">Bank / Account</th>
                          <th className="p-1 border-r border-zinc-400">Trans No.</th>
                          <th className="p-1">Room</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-300">
                        {payments.map((p: any) => (
                          <tr key={p.id}>
                            <td className="p-1 border-r border-zinc-300">{p.receivedAt?.slice(0, 10)}</td>
                            <td className="p-1 border-r border-zinc-300 font-bold">{p.receiptNo}</td>
                            <td className="p-1 border-r border-zinc-300 font-bold">{p.method}</td>
                            <td className="p-1 border-r border-zinc-300 text-right font-bold">{(p.amount || 0).toFixed(2)}</td>
                            <td className="p-1 border-r border-zinc-300">{p.method === "CASH" ? "Cash Account" : "Bank Account"}</td>
                            <td className="p-1 border-r border-zinc-300">{p.reference || "—"}</td>
                            <td className="p-1">{activeStay?.roomAssignments?.[0]?.room?.number || "229"}</td>
                          </tr>
                        ))}
                        {payments.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-1 text-center text-zinc-500 italic">
                              No payments recorded yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Block: Totals Calculation */}
                <div className="sm:col-span-5 flex flex-col justify-between font-mono text-xs border border-zinc-900 p-2.5 bg-zinc-50">
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-zinc-900">
                      <span>Total Amount</span>
                      <span className="text-sm font-black">{totalCharges.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-700">
                      <span>Less Adv. Amount</span>
                      <span>- {totalPayments.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-700">
                      <span>Less Bill Discount</span>
                      <span>- 0.00</span>
                    </div>
                    <div className="flex justify-between text-zinc-700">
                      <span>Round Off (+/-)</span>
                      <span>0.00</span>
                    </div>
                  </div>

                  <div className="flex justify-between font-black text-base text-zinc-950 pt-1.5 border-t-2 border-zinc-900 mt-2">
                    <span>Net Amount</span>
                    <span>₹ {Math.max(0, currentBalance).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 4. AMOUNT IN WORDS */}
              <div className="font-mono text-[11px] font-bold uppercase pt-1">
                Amount : {numberToWordsINR(totalCharges)}
              </div>

              {/* 5. HOTEL POLICIES & SIGNATURE BLOCK */}
              <div className="pt-2 border-t border-zinc-400 space-y-6 text-[10px] font-mono">
                <div className="space-y-0.5 text-zinc-600">
                  <div>* CHECK OUT TIME 12 NOON.</div>
                  <div>* PLEASE HANDOVER YOUR ROOM KEY WHEN YOU CHECK OUT FROM THE HOTEL.</div>
                </div>

                <div className="flex justify-between items-end pt-4 font-bold text-xs">
                  <div className="border-t border-zinc-800 pt-1 w-48 text-center">
                    Guest's Signature
                  </div>
                  <div className="border-t border-zinc-800 pt-1 w-56 text-center">
                    For {activeProperty?.displayName?.toUpperCase() || "HOTEL DIVINE VIEW"}
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

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-mono text-zinc-500">
          Loading Billing & Invoicing Engine...
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
