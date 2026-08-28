"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  CheckCircle2,
  FileText,
  DollarSign,
  Sparkles,
  Users,
  Tag,
  AlertCircle,
} from "lucide-react";
import { calculateGST, formatINR } from "@/lib/gst/calculator";

interface NewReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  rooms: any[];
  activeProperty: any;
}

export function NewReservationModal({
  isOpen,
  onClose,
  onSuccess,
  rooms,
  activeProperty,
}: NewReservationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract unique room categories
  const roomCategories = useMemo(() => {
    const map = new Map<string, any>();
    rooms.forEach((r) => {
      if (r.roomType && !map.has(r.roomType.id)) {
        map.set(r.roomType.id, r.roomType);
      }
    });
    return Array.from(map.values());
  }, [rooms]);

  // Today & Tomorrow
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(
    () => new Date(Date.now() + 86400000).toISOString().split("T")[0],
    []
  );

  const [form, setForm] = useState({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    guestCity: "",
    guestState: "Assam",
    guestGstin: "",
    guestNationality: "Indian",
    roomTypeId: roomCategories[0]?.id || "",
    assignedRoomId: "",
    arrivalDate: todayStr,
    departureDate: tomorrowStr,
    adults: 2,
    children: 0,
    source: "DIRECT",
    channelRef: "",
    ratePerNight: 3500,
    depositAmount: 0,
    depositMethod: "UPI",
    notes: "",
  });

  // Keep roomTypeId updated once categories load
  React.useEffect(() => {
    if (!form.roomTypeId && roomCategories.length > 0) {
      setForm((prev) => ({ ...prev, roomTypeId: roomCategories[0].id }));
    }
  }, [roomCategories, form.roomTypeId]);

  // Filter available rooms matching selected category
  const selectableRooms = useMemo(() => {
    return rooms.filter((r) => !form.roomTypeId || r.roomTypeId === form.roomTypeId);
  }, [rooms, form.roomTypeId]);

  // Pricing calculation
  const pricingQuote = useMemo(() => {
    if (!form.arrivalDate || !form.departureDate) {
      return { nightsCount: 1, subtotal: 0, taxAmount: 0, totalAmount: 0, balanceDue: 0 };
    }
    const start = new Date(form.arrivalDate);
    const end = new Date(form.departureDate);
    const diffTime = end.getTime() - start.getTime();
    const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const rate = Number(form.ratePerNight) || 0;
    const subtotal = rate * nightsCount;

    const gst = calculateGST({
      grossOrBaseAmount: subtotal,
      isInclusive: false,
      sacHsn: "996311",
      supplierStateCode: activeProperty?.stateCode || "18",
    });

    const totalAmount = gst.totalAmount;
    const deposit = Number(form.depositAmount) || 0;
    const balanceDue = Math.max(0, totalAmount - deposit);

    return {
      nightsCount,
      subtotal: gst.taxableAmount,
      taxAmount: gst.taxAmount,
      totalAmount,
      balanceDue,
      effectiveTaxRate: gst.components.effectiveTaxRate,
    };
  }, [form.arrivalDate, form.departureDate, form.ratePerNight, form.depositAmount, activeProperty?.stateCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.guestName.trim()) {
      setError("Primary Guest Name is required.");
      return;
    }
    if (!form.guestPhone.trim()) {
      setError("Primary Guest Mobile Phone is required.");
      return;
    }
    if (!form.roomTypeId) {
      setError("Please select a Room Category.");
      return;
    }
    if (!form.arrivalDate || !form.departureDate) {
      setError("Arrival and Departure dates are mandatory.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          guestName: form.guestName.trim(),
          guestPhone: form.guestPhone.trim(),
          guestEmail: form.guestEmail.trim() || undefined,
          guestCity: form.guestCity.trim() || undefined,
          guestState: form.guestState.trim() || undefined,
          guestGstin: form.guestGstin.trim() || undefined,
          guestNationality: form.guestNationality,
          roomTypeId: form.roomTypeId,
          assignedRoomId: form.assignedRoomId || undefined,
          arrivalDate: form.arrivalDate,
          departureDate: form.departureDate,
          adults: Number(form.adults) || 2,
          children: Number(form.children) || 0,
          source: form.source,
          channelRef: form.channelRef.trim() || undefined,
          ratePerNight: Number(form.ratePerNight) || 3500,
          depositAmount: Number(form.depositAmount) || 0,
          depositMethod: form.depositMethod,
          notes: form.notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create reservation");

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || "Failed to book reservation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Create New Future Reservation</span>
                <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/30">
                  GST Rule 46
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Book advance stay, pre-allocate room category, and collect advance booking deposit.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Section 1: Guest Information */}
          <div className="space-y-3">
            <div className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-indigo-500" />
              <span>1. Guest Profile Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Guest Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bijesh Singha"
                  value={form.guestName}
                  onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Mobile Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={form.guestPhone}
                  onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="guest@example.com"
                  value={form.guestEmail}
                  onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Guwahati / Kolkata"
                  value={form.guestCity}
                  onChange={(e) => setForm({ ...form, guestCity: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  State / Country
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assam, India"
                  value={form.guestState}
                  onChange={(e) => setForm({ ...form, guestState: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Guest GSTIN (for B2B ITC)
                </label>
                <input
                  type="text"
                  placeholder="15-digit GSTIN (optional)"
                  value={form.guestGstin}
                  onChange={(e) => setForm({ ...form, guestGstin: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono uppercase focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dates, Room Category & Allocation */}
          <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Building className="h-3.5 w-3.5 text-indigo-500" />
              <span>2. Stay Dates & Room Category Allocation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Check-In Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.arrivalDate}
                  onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Check-Out Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.departureDate}
                  min={form.arrivalDate}
                  onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Room Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.roomTypeId}
                  onChange={(e) => setForm({ ...form, roomTypeId: e.target.value, assignedRoomId: "" })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-medium focus:border-indigo-500 focus:outline-none transition shadow-xs"
                >
                  {roomCategories.map((rc) => (
                    <option key={rc.id} value={rc.id}>
                      {rc.name} ({rc.code}) • Cap {rc.capacity || 2}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Pre-Assigned Room
                </label>
                <select
                  value={form.assignedRoomId}
                  onChange={(e) => setForm({ ...form, assignedRoomId: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
                >
                  <option value="">Auto-Assign on Check-In</option>
                  {selectableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.number} (Floor {r.floor} • {r.roomState?.housekeepingStatus || "CLEAN"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Adults
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.adults}
                  onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Children
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={form.children}
                  onChange={(e) => setForm({ ...form, children: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Booking Channel Source
                </label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-bold focus:border-indigo-500 focus:outline-none transition shadow-xs"
                >
                  <option value="DIRECT">DIRECT (Front Desk)</option>
                  <option value="PHONE">PHONE RESERVATION</option>
                  <option value="WALK_IN">WALK-IN ADVANCE</option>
                  <option value="BOOKING_COM">OTA - Booking.com</option>
                  <option value="MAKEMYTRIP">OTA - MakeMyTrip</option>
                  <option value="AGODA">OTA - Agoda</option>
                  <option value="GOIBIBO">OTA - Goibibo</option>
                  <option value="CORPORATE">CORPORATE BTC</option>
                  <option value="TRAVEL_AGENT">TRAVEL AGENT</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Channel Ref / OTA Booking ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. MMT-9821382"
                  value={form.channelRef}
                  onChange={(e) => setForm({ ...form, channelRef: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Tariff & Advance Deposit Payment */}
          <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
              <span>3. Agreed Tariff, Rates & Advance Deposit</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Agreed Room Rate / Night (₹)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  value={form.ratePerNight}
                  onChange={(e) => setForm({ ...form, ratePerNight: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono font-bold focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Advance Deposit Paid (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={form.depositAmount}
                  onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-emerald-700 dark:text-emerald-400 font-mono font-bold focus:border-indigo-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Deposit Payment Method
                </label>
                <select
                  value={form.depositMethod}
                  onChange={(e) => setForm({ ...form, depositMethod: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-bold focus:border-indigo-500 focus:outline-none transition shadow-xs"
                >
                  <option value="UPI">UPI (Google Pay / PhonePe)</option>
                  <option value="CASH">CASH</option>
                  <option value="CARD">CREDIT / DEBIT CARD</option>
                  <option value="BANK_TRANSFER">NEFT / RTGS</option>
                  <option value="OTA_VCC">OTA VIRTUAL CARD</option>
                </select>
              </div>
            </div>

            {/* Special Requests */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Special Requests / Front Desk Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Early check-in requested at 10 AM, high floor room, airport pickup needed"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs"
              />
            </div>
          </div>

          {/* Pricing Summary Box */}
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 space-y-2 text-xs">
            <div className="font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Estimated Billing & GST Breakdown ({pricingQuote.nightsCount} Night{pricingQuote.nightsCount > 1 ? "s" : ""})</span>
              <span className="font-mono">{formatINR(form.ratePerNight)}/night</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-indigo-200 dark:border-indigo-900/40 text-zinc-700 dark:text-zinc-300 font-mono">
              <div>
                <span className="text-[10px] text-zinc-500 block">Taxable Base:</span>
                <strong className="text-zinc-900 dark:text-white">{formatINR(pricingQuote.subtotal)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">GST ({pricingQuote.effectiveTaxRate || 5}%):</span>
                <strong className="text-zinc-900 dark:text-white">{formatINR(pricingQuote.taxAmount)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Total Tariff:</span>
                <strong className="text-indigo-700 dark:text-indigo-400 font-bold">{formatINR(pricingQuote.totalAmount)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Balance on Arrival:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatINR(pricingQuote.balanceDue)}</strong>
              </div>
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span>Saving Reservation...</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm & Issue Booking</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
