import React, { useState, useMemo } from "react";
import {
  X,
  ArrowLeft,
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
  Briefcase,
  Layers,
  Info,
} from "lucide-react";
import { calculateGST, formatINR } from "@/lib/gst/calculator";
import { BOOKING_SOURCES, POPULAR_TOUR_AGENCIES, PAYMENT_METHODS } from "@/data";
import { CompanySelector } from "./company-selector";

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
    roomCount: 1,
    assignedRoomId: "",
    arrivalDate: todayStr,
    departureDate: tomorrowStr,
    adults: 2,
    children: 0,
    source: "DIRECT_PHONE",
    selectedAgencyPreset: "",
    agencyName: "",
    agencyPhone: "",
    companyName: "",
    channelRef: "",
    ratePerNight: 3200,
    isComplimentary: false,
    depositAmount: 0,
    depositMethod: "UPI",
    kitchenDining: "NO" as "NO" | "YES",
    diningFixedRate: "",
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

  // Pricing calculation (Nights x Rooms x Rate)
  const pricingQuote = useMemo(() => {
    if (!form.arrivalDate || !form.departureDate) {
      return { nightsCount: 1, roomCount: 1, subtotal: 0, taxAmount: 0, totalAmount: 0, balanceDue: 0, effectiveTaxRate: 5 };
    }
    const start = new Date(form.arrivalDate);
    const end = new Date(form.departureDate);
    const diffTime = end.getTime() - start.getTime();
    const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const roomCount = Math.max(1, Number(form.roomCount) || 1);

    const rate = form.isComplimentary ? 0 : (Number(form.ratePerNight) || 0);
    const subtotal = rate * nightsCount * roomCount;

    const gst = form.isComplimentary
      ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: { effectiveTaxRate: 0 } }
      : calculateGST({
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
      roomCount,
      subtotal: gst.taxableAmount,
      taxAmount: gst.taxAmount,
      totalAmount,
      balanceDue,
      effectiveTaxRate: gst.components?.effectiveTaxRate || 5,
    };
  }, [form.arrivalDate, form.departureDate, form.roomCount, form.ratePerNight, form.depositAmount, form.isComplimentary, activeProperty?.stateCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.guestName.trim()) {
      setError("Primary Guest / Booker Name is required.");
      return;
    }
    if (!form.guestPhone.trim()) {
      setError("Mobile Phone Number is required.");
      return;
    }
    if (!form.roomTypeId) {
      setError("Please select a Room Category.");
      return;
    }
    if (!form.arrivalDate || !form.departureDate) {
      setError("Check-In and Check-Out dates are mandatory.");
      return;
    }

    setLoading(true);
    try {
      const isAgency = form.source === "TRAVEL_AGENT";
      const isCorporate = form.source === "CORPORATE";

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
          roomCount: Number(form.roomCount) || 1,
          assignedRoomId: form.assignedRoomId || undefined,
          arrivalDate: form.arrivalDate,
          departureDate: form.departureDate,
          adults: Number(form.adults) || 2,
          children: Number(form.children) || 0,
          source: form.source,
          agencyName: isAgency ? (form.agencyName || form.selectedAgencyPreset) : undefined,
          agencyPhone: isAgency ? form.agencyPhone : undefined,
          companyName: isCorporate ? form.companyName : undefined,
          channelRef: form.channelRef.trim() || undefined,
          ratePerNight: form.isComplimentary ? 0 : (Number(form.ratePerNight) || 3200),
          depositAmount: Number(form.depositAmount) || 0,
          depositMethod: form.depositMethod,
          kitchenDining: form.kitchenDining || "NO",
          diningFixedRate: form.diningFixedRate ? Number(form.diningFixedRate) : undefined,
          notes: [
            form.notes.trim() || null,
            form.kitchenDining === "YES" ? `Kitchen Dining Plan: Fixed @ ₹${form.diningFixedRate || 0}/Day` : null,
          ].filter(Boolean).join(" • ") || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create reservation");

      onSuccess(data?.reservation || data);
    } catch (err: any) {
      setError(err.message || "Failed to book reservation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-150">
      <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Return to Front Desk"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Room Rack</span>
            </button>

            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <span>New Advance / Future Reservation</span>
                <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/30">
                  Advance Booking
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                {activeProperty?.displayName || "Hotel Ambarish Grand Residency"} • {activeProperty?.code || "GUW-01"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Explain Future Reservation vs GRC Banner */}
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-snug space-y-0.5">
            <strong className="block text-blue-950 dark:text-blue-100 font-bold">
              ℹ️ Future Reservation Workflow (No GRC needed right now)
            </strong>
            <p className="text-[11px] text-blue-800/90 dark:text-blue-300">
              Saving this form confirms the future booking and reserves room inventory. When the guest physically arrives on the check-in date, click <strong>"Check-In"</strong> to verify ID and fill the official GRC.
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          
          {/* Section 1: Booking Source & Tour Agency Selection */}
          <div className="space-y-3">
            <div className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
              <span>1. Booking Source & Tour Agency</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Booking Source / Channel *
                </label>
                <select
                  value={form.source}
                  onChange={(e) => {
                    const src = e.target.value;
                    setForm({
                      ...form,
                      source: src,
                      agencyName: src === "TRAVEL_AGENT" ? form.agencyName || "Yashraj Travels" : "",
                    });
                  }}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-bold focus:border-indigo-500 focus:outline-none transition shadow-xs cursor-pointer"
                >
                  {BOOKING_SOURCES.map((src) => (
                    <option key={src.code} value={src.code}>
                      {src.name} ({src.tag})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tour Agency Selector (Shown when source is TRAVEL_AGENT) */}
              {form.source === "TRAVEL_AGENT" && (
                <>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                      <span>Select Tour Agency / Agent Master *</span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">24+ Agencies</span>
                    </label>
                    <CompanySelector
                      filterType="TRAVEL_AGENT"
                      value={form.agencyName}
                      activeProperty={activeProperty}
                      placeholder="Search agency, agent name, GSTIN..."
                      onSelect={(comp) => {
                        if (!comp) {
                          setForm((prev) => ({
                            ...prev,
                            agencyName: "",
                            agencyPhone: "",
                          }));
                          return;
                        }
                        setForm((prev) => ({
                          ...prev,
                          agencyName: comp.accountName,
                          agencyPhone: comp.mobile || comp.phone || "",
                          guestCity: comp.city || prev.guestCity,
                          notes: comp.remarks ? `Agency terms: ${comp.remarks}` : prev.notes,
                        }));
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      Agency Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="Agency phone number"
                      value={form.agencyPhone}
                      onChange={(e) => setForm({ ...form, agencyPhone: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      Agency Voucher / Booking Ref #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. YSH-2026-9812 / Agoda YCS Ref"
                      value={form.channelRef}
                      onChange={(e) => setForm({ ...form, channelRef: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
                    />
                  </div>
                </>
              )}

              {/* Corporate Company Master Selector (Shown when source is CORPORATE) */}
              {form.source === "CORPORATE" && (
                <>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                      <span>Select Corporate Company Master *</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">24+ Companies</span>
                    </label>
                    <CompanySelector
                      filterType="COMPANY"
                      value={form.companyName}
                      activeProperty={activeProperty}
                      placeholder="Search company (e.g. ABB, Asian Paints, Patanjali...)"
                      onSelect={(comp) => {
                        if (!comp) {
                          setForm((prev) => ({
                            ...prev,
                            companyName: "",
                            guestGstin: "",
                          }));
                          return;
                        }
                        setForm((prev) => ({
                          ...prev,
                          companyName: comp.accountName,
                          guestGstin: comp.gstin || "",
                          guestPhone: comp.mobile || comp.phone || prev.guestPhone || "",
                          guestCity: comp.city || prev.guestCity,
                          notes: comp.remarks ? `Company terms: ${comp.remarks}` : prev.notes,
                        }));
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      Company GSTIN (B2B Tax Credit)
                    </label>
                    <input
                      type="text"
                      placeholder="15-digit GSTIN"
                      value={form.guestGstin}
                      onChange={(e) => setForm({ ...form, guestGstin: e.target.value.toUpperCase() })}
                      className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono uppercase focus:border-indigo-500 focus:outline-none transition shadow-xs"
                    />
                  </div>
                </>
              )}

              {/* OTA Reference ID */}
              {(form.source === "MAKEMYTRIP" || form.source === "BOOKING_COM" || form.source === "AGODA" || form.source === "EXPEDIA") && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    OTA Booking / Confirmation ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MMT-891238912"
                    value={form.channelRef}
                    onChange={(e) => setForm({ ...form, channelRef: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Section 2: Guest Profile Information */}
          <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-indigo-500" />
              <span>2. Guest / Booker Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Guest Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BIJESH SINGHA"
                  value={form.guestName}
                  onChange={(e) => setForm({ ...form, guestName: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs font-semibold uppercase"
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
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Email Address (Optional)
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
                  City (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. GUWAHATI / KOLKATA"
                  value={form.guestCity}
                  onChange={(e) => setForm({ ...form, guestCity: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  State / Origin
                </label>
                <input
                  type="text"
                  placeholder="e.g. ASSAM, INDIA"
                  value={form.guestState}
                  onChange={(e) => setForm({ ...form, guestState: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Nationality
                </label>
                <input
                  type="text"
                  value={form.guestNationality}
                  onChange={(e) => setForm({ ...form, guestNationality: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none transition shadow-xs uppercase"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Dates, Room Count & Room Category */}
          <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Building className="h-3.5 w-3.5 text-indigo-500" />
              <span>3. Stay Dates, Room Count & Category</span>
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
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs font-bold"
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
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs font-bold"
                />
              </div>

              {/* Number of Rooms Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Number of Rooms *</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                    {form.roomCount} Room{Number(form.roomCount) > 1 ? "s" : ""}
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={form.roomCount}
                  onChange={(e) => setForm({ ...form, roomCount: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono font-bold focus:border-indigo-500 focus:outline-none transition shadow-xs"
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
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-semibold focus:border-indigo-500 focus:outline-none transition shadow-xs cursor-pointer"
                >
                  {roomCategories.map((rc) => (
                    <option key={rc.id} value={rc.id}>
                      {rc.name} ({rc.code}) • ₹{rc.basePrice || 3200}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Pre-Assign Room (Optional)
                </label>
                <select
                  value={form.assignedRoomId}
                  onChange={(e) => setForm({ ...form, assignedRoomId: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none transition shadow-xs cursor-pointer"
                >
                  <option value="">Auto-Assign at Check-In</option>
                  {selectableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.number} (Floor {r.floor} • {r.roomState?.housekeepingStatus || "CLEAN"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Adults per Room
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
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Children per Room</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Free (₹0)</span>
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
            </div>
          </div>

          {/* Section 4: Agreed Tariff & Advance Deposit */}
          <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                <span>4. Agreed Rate & Advance Deposit</span>
              </div>

              {/* Complimentary Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <input
                  type="checkbox"
                  checked={form.isComplimentary}
                  onChange={(e) => setForm({ ...form, isComplimentary: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                />
                <span>🎁 Complimentary (₹0 Free Stay)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Agreed Rate / Room (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-400 font-bold font-mono text-xs">₹</span>
                  <input
                    type="number"
                    required={!form.isComplimentary}
                    disabled={form.isComplimentary}
                    placeholder={form.isComplimentary ? "0 (Complimentary)" : "Rate"}
                    value={form.isComplimentary ? 0 : form.ratePerNight}
                    onChange={(e) => setForm({ ...form, ratePerNight: Number(e.target.value) })}
                    className="w-full h-9 pl-7 pr-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono font-bold focus:border-indigo-500 focus:outline-none transition shadow-xs disabled:opacity-60 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
                  />
                </div>
              </div>

              {/* Kitchen Dining Yes/No & Fixed Rate */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Kitchen Dining
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={form.kitchenDining || "NO"}
                    onChange={(e: any) => setForm({ ...form, kitchenDining: e.target.value })}
                    className="h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-bold focus:border-indigo-500 focus:outline-none transition shadow-xs cursor-pointer flex-1"
                  >
                    <option value="NO">No</option>
                    <option value="YES">Yes</option>
                  </select>
                  {form.kitchenDining === "YES" && (
                    <div className="relative w-24 shrink-0">
                      <span className="absolute left-2.5 top-2 text-zinc-400 font-bold font-mono text-xs">₹</span>
                      <input
                        type="number"
                        placeholder="Rate"
                        value={form.diningFixedRate || ""}
                        onChange={(e) => setForm({ ...form, diningFixedRate: e.target.value })}
                        className="w-full h-9 pl-6 pr-2 rounded-xl bg-white dark:bg-zinc-900 border border-amber-400 dark:border-amber-600 text-xs text-zinc-900 dark:text-white font-mono font-bold focus:border-indigo-500 focus:outline-none transition shadow-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Advance Deposit Paid (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-400 font-bold font-mono text-xs">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.depositAmount}
                    onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })}
                    className="w-full h-9 pl-7 pr-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-emerald-700 dark:text-emerald-400 font-mono font-bold focus:border-indigo-500 focus:outline-none transition shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  Deposit Channel
                </label>
                <select
                  value={form.depositMethod}
                  onChange={(e) => setForm({ ...form, depositMethod: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-bold focus:border-indigo-500 focus:outline-none transition shadow-xs cursor-pointer"
                >
                  <option value="UPI">UPI / QR</option>
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="DIRECT_BILL">BTC (Company)</option>
                  <option value="OTA_VCC">OTA VCC</option>
                </select>
              </div>
            </div>

            {/* Special Requests / Notes */}
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

          {/* Pricing & GST Breakdown Box */}
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/20 p-4 space-y-2 text-xs">
            <div className="font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider text-[11px] flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Estimated Billing: {pricingQuote.roomCount} Room{pricingQuote.roomCount > 1 ? "s" : ""} x {pricingQuote.nightsCount} Night{pricingQuote.nightsCount > 1 ? "s" : ""}</span>
              </span>
              <span className="font-mono text-indigo-800 dark:text-indigo-300 font-extrabold">
                {formatINR(form.ratePerNight)}/room/night
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-indigo-200 dark:border-indigo-900/40 text-zinc-700 dark:text-zinc-300 font-mono">
              <div>
                <span className="text-[10px] text-zinc-500 block">Base Taxable ({pricingQuote.roomCount} Rms):</span>
                <strong className="text-zinc-900 dark:text-white font-bold">{formatINR(pricingQuote.subtotal)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">GST ({pricingQuote.effectiveTaxRate || 5}%):</span>
                <strong className="text-zinc-900 dark:text-white font-bold">{formatINR(pricingQuote.taxAmount)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Total Tariff:</span>
                <strong className="text-indigo-700 dark:text-indigo-400 font-black text-sm">{formatINR(pricingQuote.totalAmount)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Balance on Arrival:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-black text-sm">{formatINR(pricingQuote.balanceDue)}</strong>
              </div>
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50/70 dark:bg-zinc-900/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Saving Reservation...</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Confirm Future Booking</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
