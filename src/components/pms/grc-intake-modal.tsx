"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  QrCode,
  UserPlus,
  Users,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Car,
  Compass,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  Globe,
  Share2,
  Copy,
  Check,
  BedDouble,
  Sparkles,
  Clock,
} from "lucide-react";
import {
  ID_PROOF_TYPES,
  PURPOSE_OF_VISIT_OPTIONS,
  MEAL_PLANS,
  COMMON_NATIONALITIES,
} from "@/data";
import { normalizeGuestName } from "@/lib/domain/name-utils";
import { CompanySelector } from "./company-selector";

interface GrcIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  rooms: any[];
  activeProperty: any;
  initialRoomId?: string;
  initialReservation?: any;
}

export function GrcIntakeModal({
  isOpen,
  onClose,
  onSuccess,
  rooms,
  activeProperty,
  initialRoomId,
  initialReservation,
}: GrcIntakeModalProps) {
  // Method Switcher: "PHYSICAL_ENTRY" vs "QR_DIGITAL"
  const [activeMethod, setActiveMethod] = useState<"PHYSICAL_ENTRY" | "QR_DIGITAL">("PHYSICAL_ENTRY");
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [repeatGuest, setRepeatGuest] = useState<any | null>(null);
  const [isLookingUpPhone, setIsLookingUpPhone] = useState(false);

  // Current date & time helper
  const now = new Date();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const currentTimeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  // Form State
  const [formData, setFormData] = useState({
    // Stay & Room
    roomId: initialRoomId || "",
    additionalRoomIds: [] as string[],
    roomRates: {} as Record<string, string>,
    groupBilling: true,
    arrivalDate: todayStr,
    arrivalTime: currentTimeStr,
    departureDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    mealPlan: "EP", // EP, CP, MAP, AP
    extraPaxCount: 0,
    roomExtraPax: {} as Record<string, number>,
    extraBedRate: "500",
    adults: "",
    children: "",
    paxM: "",
    paxF: "",
    paxC: "",

    // Primary Guest
    title: "Mr.",
    fullName: "",
    fatherSpouseName: "",
    age: "",
    gender: "Male",
    nationality: "Indian",
    profession: "",
    mobilePhone: "",
    alternatePhone: "",
    email: "",

    // Address
    streetAddress: "",
    policeStation: "",
    city: "",
    state: "",
    pinZipCode: "",
    country: "India",

    // Travel
    arrivedFrom: "",
    goingTo: "",
    purposeOfVisit: "Tourism / Holiday",
    referralChannel: "Walk-in",
    vehicleNumber: "",
    driverName: "",

    // ID Document & GST
    idType: "AADHAAR",
    idLast4: "",
    companyName: "",
    guestGstin: "",

    // Billing & Advance
    agreedTariff: "",
    isComplimentary: false,
    checkoutType: "24_HOURS" as "24_HOURS" | "FIXED_TIME",
    gracePeriodMinutes: "60",
    depositAmount: "0",
    paymentMethod: "UPI",
    transactionRef: "",

    // Co-Guests
    coGuests: [] as Array<{
      name: string;
      soDoWo: string;
      age: string;
      gender: string;
      relation: string;
    }>,

    // Foreign Details
    foreignDetails: {
      countryOfCitizenship: "",
      passportNo: "",
      datePlaceOfIssue: "",
      restrictedPermitNo: "",
      dateOfArrivalInIndia: "",
      portOfEntry: "",
      employedInIndia: "No",
      proposedDurationOfStay: "",
      nextDestination: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;
      const defaultDepDate = new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0];

      if (initialReservation) {
        const guest = initialReservation.primaryGuest || {};
        const firstRoom = initialReservation.rooms?.[0] || {};
        const firstDeposit = initialReservation.deposits?.[0]?.payment?.amount || 0;
        const assigned = firstRoom.assignedRoomId || initialRoomId;

        setFormData((prev) => ({
          ...prev,
          fullName: guest.name || "",
          mobilePhone: guest.phone || "",
          email: guest.email || "",
          city: guest.city || "",
          state: guest.state || "",
          guestGstin: guest.gstin || "",
          arrivalDateTime: currentDateTime,
          departureDate: initialReservation.departureDate || defaultDepDate,
          adults: String(firstRoom.adults || 2),
          children: String(firstRoom.children || 0),
          referralChannel: initialReservation.source || "DIRECT",
          depositAmount: String(firstDeposit),
          roomId: assigned || prev.roomId || (rooms.find((r) => r.roomState?.occupancyStatus === "VACANT" && (!firstRoom.roomTypeId || r.roomTypeId === firstRoom.roomTypeId))?.id || ""),
          additionalRoomIds: [],
          roomRates: {},
          groupBilling: true,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          roomId: initialRoomId || prev.roomId,
          additionalRoomIds: [],
          roomRates: {},
          groupBilling: true,
          arrivalDateTime: currentDateTime,
          departureDate: prev.departureDate || defaultDepDate,
        }));
      }
      setRepeatGuest(null);
    }
  }, [isOpen, initialRoomId, initialReservation, rooms]);

  if (!isOpen) return null;

  // Handle Instant Repeat Guest Auto-Fill by Phone Number
  const handlePhoneChange = async (val: string) => {
    setFormData((prev) => ({ ...prev, mobilePhone: val }));
    const digits = val.replace(/\D/g, "");
    if (digits.length >= 10) {
      setIsLookingUpPhone(true);
      try {
        const res = await fetch(`/api/v1/guests/lookup?phone=${encodeURIComponent(digits)}&propertyId=${activeProperty?.id || ""}`);
        const data = await res.json();
        if (data.found && data.guest) {
          const g = data.guest;
          setRepeatGuest(g);
          setFormData((prev) => {
            const { title, pureName } = normalizeGuestName(g.fullName || g.name || prev.fullName, g.title || prev.title);

            return {
              ...prev,
              mobilePhone: val,
              fullName: pureName,
              title,
              fatherSpouseName: g.fatherSpouseName || prev.fatherSpouseName,
              age: g.age ? String(g.age) : prev.age,
              gender: g.gender || prev.gender,
              nationality: g.nationality || prev.nationality,
              profession: g.profession || prev.profession,
              alternatePhone: g.alternatePhone || prev.alternatePhone,
              email: g.email || prev.email,

              // Address
              streetAddress: g.streetAddress || prev.streetAddress,
              policeStation: g.policeStation || prev.policeStation,
              city: g.city || prev.city,
              state: g.state || prev.state,
              pinZipCode: g.pinZipCode || prev.pinZipCode,
              country: g.country || prev.country,

              // Travel & ID
              arrivedFrom: g.arrivedFrom || prev.arrivedFrom,
              goingTo: g.goingTo || prev.goingTo,
              purposeOfVisit: g.purposeOfVisit || prev.purposeOfVisit,
              vehicleNumber: g.vehicleNumber || prev.vehicleNumber,
              driverName: g.driverName || prev.driverName,
              idType: g.idType || prev.idType,
              idLast4: g.idLast4 || prev.idLast4,
              guestGstin: g.guestGstin || prev.guestGstin,
              companyName: g.companyName || prev.companyName,
            };
          });
        } else {
          setRepeatGuest(null);
        }
      } catch (err) {
        console.error("Phone auto-lookup failed:", err);
      } finally {
        setIsLookingUpPhone(false);
      }
    } else {
      setRepeatGuest(null);
    }
  };

  // Handle Add Co-Guest Row
  const handleAddCoGuest = () => {
    setFormData({
      ...formData,
      coGuests: [
        ...formData.coGuests,
        { name: "", soDoWo: "", age: "", gender: "Male", relation: "Spouse" },
      ],
    });
  };

  // Handle Remove Co-Guest Row
  const handleRemoveCoGuest = (index: number) => {
    setFormData({
      ...formData,
      coGuests: formData.coGuests.filter((_, i) => i !== index),
    });
  };

  // Handle Co-Guest Field Change
  const handleCoGuestChange = (index: number, field: string, val: string) => {
    const updated = [...formData.coGuests];
    updated[index] = { ...updated[index], [field]: val };
    setFormData({ ...formData, coGuests: updated });
  };

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomId) {
      alert("Please select a vacant room to assign.");
      return;
    }
    if (!formData.adults || Number(formData.adults) < 1) {
      alert("Total Adults is mandatory (minimum 1 pax).");
      return;
    }
    if (!formData.fullName.trim() || !formData.mobilePhone.trim()) {
      alert("Guest Full Name and Mobile Phone are required.");
      return;
    }

    // Form C International Pax Mandatory Validation
    if (formData.nationality === "Foreign") {
      if (!formData.foreignDetails.countryOfCitizenship?.trim() && !formData.country?.trim()) {
        alert("Country of Citizenship / Foreign Nationality is mandatory for international guests.");
        return;
      }
      if (!formData.foreignDetails.passportNo?.trim()) {
        alert("Passport Number is mandatory for foreign guests (Form C compliance).");
        return;
      }
      if (!formData.foreignDetails.datePlaceOfIssue?.trim()) {
        alert("Passport Issue Place/Date is mandatory for foreign guests.");
        return;
      }
      if (!formData.foreignDetails.restrictedPermitNo?.trim()) {
        alert("Visa / Entry Permit Number is mandatory for foreign guests.");
        return;
      }
      if (!formData.foreignDetails.dateOfArrivalInIndia?.trim()) {
        alert("Date of Arrival in India is mandatory for foreign guests.");
        return;
      }
    }

    setLoading(true);
    try {
      const actualNationality = formData.nationality === "Indian"
        ? "Indian"
        : (formData.foreignDetails.countryOfCitizenship || formData.country || "Foreign");

      const { title: finalTitle, pureName: finalPureName } = normalizeGuestName(formData.fullName, formData.title);

      const res = await fetch("/api/v1/stays/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          reservationId: initialReservation?.id,
          roomIds: [formData.roomId, ...formData.additionalRoomIds],
          groupBilling: formData.groupBilling,
          roomRates: formData.roomRates,
          guestData: {
            name: finalPureName,
            title: finalTitle,
            phone: formData.mobilePhone,
            alternatePhone: formData.alternatePhone,
            email: formData.email,
            nationality: actualNationality,
            age: Number(formData.age) || undefined,
            gender: formData.gender,
            fatherSpouseName: formData.fatherSpouseName,
            profession: formData.profession,
            streetAddress: formData.streetAddress,
            policeStation: formData.policeStation,
            city: formData.city,
            state: formData.state,
            pinZipCode: formData.pinZipCode,
            country: actualNationality === "Indian" ? "India" : actualNationality,
            arrivedFrom: formData.arrivedFrom,
            goingTo: formData.goingTo,
            purposeOfVisit: formData.purposeOfVisit,
            driverName: formData.driverName,
            vehicleNumber: formData.vehicleNumber,
            gstin: formData.guestGstin,
            companyName: formData.companyName,
            idType: formData.idType,
            idLast4: formData.idLast4,
          },
          arrivalAt: `${formData.arrivalDate}T${formData.arrivalTime || "14:00"}:00`,
          expectedDepartureAt: formData.departureDate,
          adults: Number(formData.adults) || 2,
          children: Number(formData.children) || 0,
          paxM: Number(formData.paxM) || 0,
          paxF: Number(formData.paxF) || 0,
          paxC: Number(formData.paxC) || 0,
          agreedTariff: formData.isComplimentary ? 0 : (formData.agreedTariff !== "" ? Number(formData.agreedTariff) : undefined),
          isComplimentary: formData.isComplimentary,
          checkoutType: formData.checkoutType,
          gracePeriodMinutes: Number(formData.gracePeriodMinutes) || 60,
          depositAmount: Number(formData.depositAmount) || 0,
          depositMethod: formData.paymentMethod || "CASH",
          depositRef: formData.transactionRef?.trim() || undefined,
          extraBeds: (Number(formData.extraPaxCount) || 0) + formData.additionalRoomIds.reduce((acc, id) => acc + (Number(formData.roomExtraPax?.[id]) || 0), 0),
          extraBedRate: Number(formData.extraBedRate) || 500,
          coGuests: formData.coGuests.filter((cg) => cg.name.trim() !== ""),
          foreignDetails: formData.nationality !== "Indian" ? formData.foreignDetails : undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to complete check-in");

      onSuccess(result);
    } catch (err: any) {
      alert(`Check-in Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKioskLink = () => {
    const link = `${window.location.origin}/checkin?property=${activeProperty?.code || "GUW-01"}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const selectedRoom = rooms.find((r) => r.id === formData.roomId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 p-5 sm:p-7 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                Guest Check-In & GRC Intake
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {activeProperty?.displayName || "Hotel Ambarish Grand Residency"} • {activeProperty?.code || "GUW-01"}
              </p>
            </div>
          </div>

          {/* Intake Method Switcher Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveMethod("PHYSICAL_ENTRY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeMethod === "PHYSICAL_ENTRY"
                    ? "bg-blue-600 text-white shadow-md font-black"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Physical GRC Entry</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMethod("QR_DIGITAL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeMethod === "QR_DIGITAL"
                    ? "bg-blue-600 text-white shadow-md font-black"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Digital QR Kiosk</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* METHOD 1: PHYSICAL GRC DATA ENTRY FORM (KEYED IN BY RECEPTIONIST) */}
        {activeMethod === "PHYSICAL_ENTRY" && (
          <form onSubmit={handleSubmit} className="overflow-y-auto space-y-6 pt-4 pr-1 text-xs">
            
            {/* 1. ROOM & STAY PERIOD SECTION */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b] p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  1. Room Assignment & Stay Schedule
                </span>
                {selectedRoom && (
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                    Floor {selectedRoom.floor} • {selectedRoom.roomType?.bedType || "King Bed"}
                    {formData.additionalRoomIds.length > 0 && ` + ${formData.additionalRoomIds.length} Extra`}
                  </span>
                )}
              </div>

              {/* Row 1: Room Assignment & Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Select Room *
                  </label>
                  <select
                    required
                    value={formData.roomId}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose Room --</option>
                    {rooms
                      .filter((r) => r.roomState?.occupancyStatus === "VACANT" || r.id === formData.roomId)
                      .map((r) => {
                        const bedType = r.roomType?.bedType || (r.wing === "TWIN" ? "Twin Beds" : "King Bed");
                        return (
                          <option key={r.id} value={r.id}>
                            Room {r.number} — {r.roomType?.name} [{bedType}]
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* Non-editable Check-In Date */}
                <div className="space-y-1 sm:col-span-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap flex items-center justify-between">
                    <span>Check-In Date</span>
                    <span className="text-[10px] text-zinc-400 font-mono font-medium">🔒 Locked</span>
                  </label>
                  <input
                    type="date"
                    disabled
                    readOnly
                    value={formData.arrivalDate}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-xs cursor-not-allowed select-none font-bold"
                    title="Check-in date is locked to the current business day"
                  />
                </div>

                {/* Editable Check-In Time */}
                <div className="space-y-1 sm:col-span-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap flex items-center justify-between">
                    <span>Check-In Time *</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">Editable</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.arrivalTime}
                    onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none cursor-pointer shadow-xs"
                    title="Change check-in arrival time"
                  />
                </div>

                {/* Expected Departure Date */}
                <div className="space-y-1 sm:col-span-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Expected Departure *
                  </label>
                  <input
                    type="date"
                    required
                    min={formData.arrivalDate || new Date().toISOString().split("T")[0]}
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Checkout Billing Model */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Checkout Billing Cycle *
                  </label>
                  <select
                    value={formData.checkoutType}
                    onChange={(e: any) => setFormData({ ...formData, checkoutType: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="24_HOURS">⏱️ 24-Hour Cycle from Check-In (Default)</option>
                    <option value="FIXED_TIME">☀️ Standard 11:00 AM / 12:00 PM Fixed Time</option>
                  </select>
                </div>

                {/* Primary Room Extra Pax Stepper */}
                <div className="space-y-1">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Extra Pax (₹500/Pax)
                  </label>
                  <div className="h-10 flex items-center justify-between px-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-xs">
                    {/* Compact Segmented Control */}
                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(formData.extraPaxCount) || 0;
                          const next = Math.max(0, current - 1);
                          setFormData((prev) => ({ ...prev, extraPaxCount: next }));
                        }}
                        className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                        title="Decrease Extra Pax"
                      >
                        <Minus className="h-3 w-3 stroke-[2.5]" />
                      </button>
                      <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white px-2 min-w-[24px] text-center select-none">
                        {Number(formData.extraPaxCount) || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(formData.extraPaxCount) || 0;
                          const next = current + 1;
                          setFormData((prev) => ({ ...prev, extraPaxCount: next }));
                        }}
                        className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                        title="Increase Extra Pax"
                      >
                        <Plus className="h-3 w-3 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Price Badge */}
                    {(Number(formData.extraPaxCount) || 0) > 0 ? (
                      <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                        +₹{(Number(formData.extraPaxCount) || 0) * 500}/nt
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pr-1">₹0</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Group Booking - Additional Rooms */}
              <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px]">
                  Add Additional Rooms (Group Booking)
                </label>
                
                {/* Selected Rooms List */}
                {formData.additionalRoomIds.length > 0 && (
                  <div className="flex flex-col gap-2.5 mb-3">
                    {formData.additionalRoomIds.map((id) => {
                      const r = rooms.find((room) => room.id === id);
                      const roomPaxCount = formData.roomExtraPax?.[id] || 0;
                      return (
                        <div
                          key={id}
                          className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 space-y-2 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 font-bold font-mono text-xs border border-blue-200 dark:border-blue-500/30">
                                Room {r?.number}
                              </span>
                              <span className="text-xs text-zinc-800 dark:text-zinc-300 font-medium truncate">
                                {r?.roomType?.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="relative flex items-center">
                                <span className="absolute left-2 text-xs text-zinc-400 font-bold font-mono">₹</span>
                                <input
                                  type="number"
                                  placeholder="Rate"
                                  value={formData.roomRates[id] || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      roomRates: { ...prev.roomRates, [id]: e.target.value },
                                    }))
                                  }
                                  className="w-24 h-8 pl-5 pr-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => {
                                    const nextPax = { ...(prev.roomExtraPax || {}) };
                                    delete nextPax[id];
                                    return {
                                      ...prev,
                                      additionalRoomIds: prev.additionalRoomIds.filter((rid) => rid !== id),
                                      roomExtraPax: nextPax,
                                    };
                                  })
                                }
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remove Room"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Per-Room Extra Pax Stepper */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs shadow-xs">
                            <span className="font-bold text-zinc-800 dark:text-zinc-300">
                              Extra Pax for Room {r?.number} (₹500/Pax)
                            </span>
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = formData.roomExtraPax?.[id] || 0;
                                    const next = Math.max(0, cur - 1);
                                    setFormData((prev) => ({
                                      ...prev,
                                      roomExtraPax: { ...(prev.roomExtraPax || {}), [id]: next },
                                    }));
                                  }}
                                  className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                  title="Decrease Extra Pax"
                                >
                                  <Minus className="h-3 w-3 stroke-[2.5]" />
                                </button>
                                <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white px-2 min-w-[20px] text-center select-none">
                                  {roomPaxCount}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = formData.roomExtraPax?.[id] || 0;
                                    const next = cur + 1;
                                    setFormData((prev) => ({
                                      ...prev,
                                      roomExtraPax: { ...(prev.roomExtraPax || {}), [id]: next },
                                    }));
                                  }}
                                  className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                  title="Increase Extra Pax"
                                >
                                  <Plus className="h-3 w-3 stroke-[2.5]" />
                                </button>
                              </div>
                              {roomPaxCount > 0 ? (
                                <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                                  +₹{roomPaxCount * 500}/nt
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pr-1">₹0</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown to add more */}
                <div className="flex gap-2">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setFormData((prev) => ({
                          ...prev,
                          additionalRoomIds: [...prev.additionalRoomIds, e.target.value],
                        }));
                      }
                    }}
                    className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select Vacant Room to Add --</option>
                    {rooms
                      .filter(
                        (r) =>
                          r.roomState?.occupancyStatus === "VACANT" &&
                          r.id !== formData.roomId &&
                          !formData.additionalRoomIds.includes(r.id)
                      )
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.number} — {r.roomType?.name}
                        </option>
                      ))}
                  </select>
                </div>
                
                {formData.additionalRoomIds.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 bg-blue-50 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/50">
                    <input
                      type="checkbox"
                      id="groupBilling"
                      checked={formData.groupBilling}
                      onChange={(e) => setFormData({ ...formData, groupBilling: e.target.checked })}
                      className="w-4 h-4 rounded bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500/50 cursor-pointer"
                    />
                    <label htmlFor="groupBilling" className="text-xs font-bold text-blue-800 dark:text-blue-300 cursor-pointer">
                      Consolidate Bill (Create a single Master Folio for all {formData.additionalRoomIds.length + 1} rooms)
                    </label>
                  </div>
                )}
              </div>

              {/* Row 2: Meal Plan & Pax Breakdown (5 Dedicated Columns) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Meal Plan</label>
                  <select
                    value={formData.mealPlan}
                    onChange={(e) => setFormData({ ...formData, mealPlan: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="EP">EP (Room Only)</option>
                    <option value="CP">CP (Breakfast)</option>
                    <option value="MAP">MAP (Half Board)</option>
                    <option value="AP">AP (Full Board)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Total Adults *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 2"
                    value={formData.adults}
                    onChange={(e) => setFormData({ ...formData, adults: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Male Pax</label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    min="0"
                    value={formData.paxM}
                    onChange={(e) => setFormData({ ...formData, paxM: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Female Pax</label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    min="0"
                    value={formData.paxF}
                    onChange={(e) => setFormData({ ...formData, paxF: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Children</label>
                  <input
                    type="number"
                    placeholder="e.g. 0"
                    min="0"
                    value={formData.children}
                    onChange={(e) => setFormData({ ...formData, children: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Live Accommodation Math Calculator */}
              {(() => {
                const selectedRoomsList = rooms.filter(
                  (r) => r.id === formData.roomId || formData.additionalRoomIds.includes(r.id)
                );
                const totalRoomsCount = Math.max(1, selectedRoomsList.length);
                const baseStandardCapacity = selectedRoomsList.reduce(
                  (acc, r) => acc + (r.roomType?.capacity || 2),
                  0
                ) || totalRoomsCount * 2;
                
                const currentExtraPax = (Number(formData.extraPaxCount) || 0) + formData.additionalRoomIds.reduce((sum, id) => sum + (Number(formData.roomExtraPax?.[id]) || 0), 0);
                const totalCapacity = baseStandardCapacity + currentExtraPax;
                const absoluteMaxRoomCapacity = baseStandardCapacity + totalRoomsCount * 2;
                
                const totalAdultsCount =
                  Number(formData.adults) ||
                  (Number(formData.paxM || 0) + Number(formData.paxF || 0)) ||
                  0;
                const totalChildrenCount = Number(formData.children || 0) + Number(formData.paxC || 0);
                const totalGuests = totalAdultsCount + totalChildrenCount;

                const hasGuestsEntered = totalGuests > 0;
                const isOverCapacity = hasGuestsEntered && totalGuests > totalCapacity;
                const isBeyondMaxPhysicalLimit = hasGuestsEntered && totalGuests > absoluteMaxRoomCapacity;

                return (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    {/* Live Room Accommodation Math Card */}
                    <div
                      className={`rounded-xl p-3.5 border transition-all ${
                        isBeyondMaxPhysicalLimit
                          ? "bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-600 text-rose-800 dark:text-rose-200"
                          : isOverCapacity
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600/60 text-amber-900 dark:text-amber-200"
                          : hasGuestsEntered
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
                          : "bg-zinc-100 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">
                            {isBeyondMaxPhysicalLimit ? "⛔" : isOverCapacity ? "⚠️" : hasGuestsEntered ? "✅" : "👥"}
                          </span>
                          <div className="text-xs">
                            <span className="font-bold">
                              {isBeyondMaxPhysicalLimit
                                ? "Room Capacity Exceeded (Additional Room Required)!"
                                : isOverCapacity
                                ? "Room Overcapacity Warning!"
                                : hasGuestsEntered
                                ? "Capacity Verification Passed"
                                : "Accommodation Capacity Math"}
                            </span>
                            <p className="text-[11px] opacity-90 mt-0.5">
                              {isBeyondMaxPhysicalLimit
                                ? `${totalGuests} Guests entered, but ${totalRoomsCount} selected room(s) can only hold max ${absoluteMaxRoomCapacity} Pax. You MUST add another room.`
                                : isOverCapacity
                                ? `${totalGuests} Guests entered, but standard capacity is ${totalCapacity} Pax. Increment Extra Pax (+₹500/Pax) or add an extra room.`
                                : hasGuestsEntered
                                ? `${totalGuests} Guests fit across ${totalRoomsCount} Room(s) (Base: ${baseStandardCapacity} + ${currentExtraPax} Extra Pax = ${totalCapacity} Pax capacity).`
                                : `Base capacity: ${baseStandardCapacity} Pax (${totalRoomsCount} Room${totalRoomsCount > 1 ? "s" : ""}). Increment Extra Pax if adding extra guests.`}
                            </p>
                          </div>
                        </div>

                        {/* Capacity Stats Pill */}
                        <div className="flex items-center gap-2 font-mono text-xs font-bold shrink-0 self-end sm:self-auto">
                          <span className={`px-2.5 py-1 rounded-lg border ${
                            isBeyondMaxPhysicalLimit
                              ? "bg-rose-100 dark:bg-rose-900/60 border-rose-300 dark:border-rose-500 text-rose-900 dark:text-white"
                              : "bg-zinc-200 dark:bg-black/40 border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white"
                          }`}>
                            Pax: {totalGuests || "—"} / {totalCapacity} (Max {absoluteMaxRoomCapacity})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 2. PRIMARY GUEST DOSSIER */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b] p-4 space-y-3.5 shadow-xs">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 flex items-center justify-between">
                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  2. Primary Guest Profile (From Physical GRC Card)
                </span>
                {isLookingUpPhone && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono animate-pulse flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-spin" /> Looking up guest profile...
                  </span>
                )}
              </div>

              {/* Repeat Customer Detected Badge */}
              {repeatGuest && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-300 dark:border-amber-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      ⭐
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-amber-950 dark:text-amber-100">
                          Returning Guest: {repeatGuest.fullName}
                        </span>
                        <span className="rounded px-2 py-0.5 text-[10px] font-bold font-mono uppercase bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                          {repeatGuest.pastStaysCount} Past {repeatGuest.pastStaysCount === 1 ? "Stay" : "Stays"}
                        </span>
                        {repeatGuest.vipStatus && (
                          <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                            VIP Guest
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 font-medium mt-0.5">
                        Profile, address & ID details auto-populated from stay history
                        {repeatGuest.city ? ` (${repeatGuest.city}, ${repeatGuest.state})` : ""}
                        {repeatGuest.companyName ? ` • Company: ${repeatGuest.companyName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setRepeatGuest(null)}
                      className="text-[11px] text-amber-800 dark:text-amber-400 hover:underline font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Mobile Phone *</label>
                  <div className="relative flex items-center">
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9864341211"
                      value={formData.mobilePhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full h-10 px-3 pr-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                    />
                    {repeatGuest && (
                      <span className="absolute right-2.5 text-emerald-500 text-xs" title="Repeat Customer Auto-Filled">
                        ✓
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Title</label>
                  <select
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Prof.">Prof.</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Guest Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suman Roy, Vikash Kumar"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-bold text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Father / Spouse Name</label>
                  <input
                    type="text"
                    placeholder="S/O, D/O, W/O"
                    value={formData.fatherSpouseName}
                    onChange={(e) => setFormData({ ...formData, fatherSpouseName: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Alternate Phone</label>
                  <input
                    type="tel"
                    placeholder="Optional phone"
                    value={formData.alternatePhone}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Age (Years) *</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="Age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Nationality *</label>
                  <select
                    required
                    value={formData.nationality}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        nationality: val,
                        country: val === "Indian" ? "India" : "",
                        idType: val === "Indian" ? "AADHAAR" : "PASSPORT",
                      });
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Indian">Indian</option>
                    <option value="Foreign">Foreign</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Email Address</label>
                  <input
                    type="email"
                    placeholder="guest@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Profession / Occupation</label>
                  <input
                    type="text"
                    placeholder="e.g. Business Executive"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* MANDATORY FOREIGN NATIONAL SECTION (FORM C) - SHOWN IF FOREIGN */}
            {formData.nationality === "Foreign" && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/10 p-4 space-y-3.5 animate-in fade-in shadow-xs">
                <div className="flex items-center justify-between border-b border-blue-200 dark:border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
                      Foreign National Form C Details (Mandatory for Foreign Guests)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-blue-800 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 px-2 py-0.5 rounded font-bold">
                    Govt Form C Compliance
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Row 1: Passport & Citizenship */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Country of Citizenship *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. United Kingdom / USA / Japan"
                      value={formData.foreignDetails.countryOfCitizenship}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          country: val,
                          foreignDetails: { ...formData.foreignDetails, countryOfCitizenship: val },
                        });
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Passport Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Z1234567"
                      value={formData.foreignDetails.passportNo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, passportNo: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono font-bold text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Passport Issue Place & Date *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. London / 2022-05-10"
                      value={formData.foreignDetails.datePlaceOfIssue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, datePlaceOfIssue: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Row 2: Visa & Arrival Record */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Visa / Permit Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. V9876543 / eVisa"
                      value={formData.foreignDetails.restrictedPermitNo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, restrictedPermitNo: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Date of Arrival in India *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.foreignDetails.dateOfArrivalInIndia}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, dateOfArrivalInIndia: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Port / City of Entry in India
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Delhi / Kolkata / Mumbai"
                      value={formData.foreignDetails.portOfEntry || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, portOfEntry: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Row 3: Stay Details & Itinerary */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Stay Duration in India (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 15"
                      value={formData.foreignDetails.proposedDurationOfStay}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, proposedDurationOfStay: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Employed in India?
                    </label>
                    <select
                      value={formData.foreignDetails.employedInIndia}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, employedInIndia: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Next Destination
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kaziranga / Bangkok"
                      value={formData.foreignDetails.nextDestination || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, nextDestination: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. RESIDENTIAL ADDRESS */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b] p-4 space-y-3.5 shadow-xs">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  3. Residential Address
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Street / House Address</label>
                  <input
                    type="text"
                    placeholder="Flat / Building / Road / Locality"
                    value={formData.streetAddress}
                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Police Station</label>
                  <input
                    type="text"
                    placeholder="Local P.S."
                    value={formData.policeStation}
                    onChange={(e) => setFormData({ ...formData, policeStation: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Guwahati / Kolkata"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Assam"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">PIN / Zip Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 781008"
                    value={formData.pinZipCode}
                    onChange={(e) => setFormData({ ...formData, pinZipCode: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Country</label>
                  <input
                    type="text"
                    placeholder="e.g. India"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. TRAVEL & ID VERIFICATION */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b] p-4 space-y-3.5 shadow-xs">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Compass className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  4. Travel Details, ID Proof & Vehicle
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Arrived From</label>
                  <input
                    type="text"
                    placeholder="e.g. Kolkata, Delhi"
                    value={formData.arrivedFrom}
                    onChange={(e) => setFormData({ ...formData, arrivedFrom: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Going To</label>
                  <input
                    type="text"
                    placeholder="e.g. Shillong, Home"
                    value={formData.goingTo}
                    onChange={(e) => setFormData({ ...formData, goingTo: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Purpose of Visit</label>
                  <select
                    value={formData.purposeOfVisit}
                    onChange={(e) => setFormData({ ...formData, purposeOfVisit: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none cursor-pointer font-medium"
                  >
                    {PURPOSE_OF_VISIT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.label}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="e.g. AS 01 EX 1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">ID Document Type</label>
                  <select
                    value={formData.idType}
                    onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    {ID_PROOF_TYPES.map((id) => (
                      <option key={id.id} value={id.id}>
                        {id.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">ID Number / Last 4</label>
                  <input
                    type="text"
                    placeholder="e.g. 4521 or full ID"
                    value={formData.idLast4}
                    onChange={(e) => setFormData({ ...formData, idLast4: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap flex items-center justify-between">
                    <span>Company / Travel Agent Master</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">24+ Directory</span>
                  </label>
                  <CompanySelector
                    value={formData.companyName}
                    activeProperty={activeProperty}
                    placeholder="Search corporate company (e.g. ABB, Asian Paints, MMT...)"
                    onSelect={(comp) => {
                      if (!comp) {
                        setFormData((prev) => ({
                          ...prev,
                          companyName: "",
                          guestGstin: "",
                        }));
                        return;
                      }
                      setFormData((prev) => ({
                        ...prev,
                        companyName: comp.accountName,
                        guestGstin: comp.gstin || "",
                        city: comp.city ? comp.city.toUpperCase() : prev.city,
                        streetAddress: comp.address ? comp.address.toUpperCase() : prev.streetAddress,
                        email: comp.email || prev.email || "",
                        alternatePhone: comp.phone || comp.mobile || prev.alternatePhone || "",
                        referralChannel: comp.accountType === "TRAVEL_AGENT" ? (comp.shortName || comp.accountName) : prev.referralChannel,
                      }));
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Company GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 18AAAAA0000A1Z5"
                    value={formData.guestGstin}
                    onChange={(e) => setFormData({ ...formData, guestGstin: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* 5. ACCOMPANYING CO-GUESTS */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b] p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  5. Accompanying Co-Guests ({formData.coGuests.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddCoGuest}
                  className="px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-[11px] flex items-center gap-1 transition shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Companion</span>
                </button>
              </div>

              {formData.coGuests.length > 0 ? (
                <div className="space-y-2">
                  {formData.coGuests.map((cg, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 items-center shadow-xs">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Companion Name *"
                          value={cg.name}
                          onChange={(e) => handleCoGuestChange(idx, "name", e.target.value.toUpperCase())}
                          className="w-full h-9 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          placeholder="Age"
                          value={cg.age}
                          onChange={(e) => handleCoGuestChange(idx, "age", e.target.value)}
                          className="w-full h-9 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={cg.gender}
                          onChange={(e) => handleCoGuestChange(idx, "gender", e.target.value)}
                          className="w-full h-9 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <select
                          value={cg.relation}
                          onChange={(e) => handleCoGuestChange(idx, "relation", e.target.value)}
                          className="w-full h-9 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                        >
                          <option value="Spouse">Spouse</option>
                          <option value="Child">Child</option>
                          <option value="Parent">Parent</option>
                          <option value="Friend">Friend</option>
                          <option value="Colleague">Colleague</option>
                          <option value="Relative">Relative</option>
                        </select>
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveCoGuest(idx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 italic text-[11px]">
                  No co-guests added. Click "Add Companion" if the guest has family or colleagues sharing the room.
                </p>
              )}
            </div>

            {/* 6. ADVANCE PAYMENT & SETTLEMENT */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b] p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  6. Room Tariff, Complimentary Option & Advance Deposit
                </span>

                {/* Complimentary Room Option */}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <input
                    type="checkbox"
                    checked={formData.isComplimentary}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData({
                        ...formData,
                        isComplimentary: checked,
                        agreedTariff: checked ? "0" : formData.agreedTariff,
                      });
                    }}
                    className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                  />
                  <span>🎁 Complimentary Room (₹0 Free Stay)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Agreed Room Rate (₹)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-zinc-400 font-bold font-mono text-xs">₹</span>
                    <input
                      type="number"
                      placeholder={formData.isComplimentary ? "0 (Complimentary)" : "Enter custom rate"}
                      disabled={formData.isComplimentary}
                      value={formData.isComplimentary ? "0" : formData.agreedTariff}
                      onChange={(e) => setFormData({ ...formData, agreedTariff: e.target.value })}
                      className="w-full h-10 pl-7 pr-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-blue-700 dark:text-blue-400 font-mono font-bold text-sm focus:border-blue-500 focus:outline-none disabled:opacity-60 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Advance Deposit (₹)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-emerald-500 font-bold font-mono text-xs">₹</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.depositAmount}
                      onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                      className="w-full h-10 pl-7 pr-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Payment Mode
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-bold text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash Drawer</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="DIRECT_BILL">🏢 Bill to Company (Company Ledger / BTC)</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Transaction / UTR / PO Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR/98127391 or PO-2026"
                    value={formData.transactionRef}
                    onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {formData.paymentMethod === "DIRECT_BILL" && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Billing will be posted to Company Ledger:{" "}
                    <strong>{formData.companyName || "Corporate Account (Please enter Company Name in Section 4)"}</strong>
                    {formData.guestGstin ? ` • GSTIN: ${formData.guestGstin}` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3.5 pb-1 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
              <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline truncate">
                Rule 46 Compliant GRC • Instant Folio
              </span>

              <div className="flex items-center gap-3 ml-auto shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs sm:text-sm transition shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{loading ? "Checking In..." : "Complete Check-In"}</span>
                </button>
              </div>
            </div>

          </form>
        )}

        {/* METHOD 2: DIGITAL QR KIOSK / GUEST SELF CHECK-IN */}
        {activeMethod === "QR_DIGITAL" && (
          <div className="overflow-y-auto space-y-6 pt-6 text-center max-w-lg mx-auto">
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto shadow-inner">
                <QrCode className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Contactless Guest Self Check-In</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Guests can scan this QR code on their smartphone to fill out their GRC, upload ID photos, and sign digitally before reaching the counter.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl max-w-[200px] mx-auto shadow-md border border-zinc-200 dark:border-zinc-700">
                {/* Visual QR Code Display */}
                <div className="aspect-square bg-zinc-950 rounded-xl flex flex-col items-center justify-center p-3 text-white">
                  <QrCode className="h-28 w-28 text-white" />
                  <span className="text-[9px] font-mono text-zinc-400 mt-1 uppercase font-bold tracking-widest">
                    SCAN TO CHECK-IN
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={handleCopyKioskLink}
                  className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />}
                  <span>{copiedLink ? "Link Copied" : "Copy Kiosk Link"}</span>
                </button>

                <a
                  href={`/checkin?property=${activeProperty?.code || "GUW-01"}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white inline-flex items-center gap-1.5 transition shadow"
                >
                  <span>Open Kiosk Portal ↗</span>
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
