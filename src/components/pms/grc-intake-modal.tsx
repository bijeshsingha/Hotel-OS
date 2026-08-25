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
  Trash2,
  Globe,
  Share2,
  Copy,
  Check,
  BedDouble,
  Sparkles,
  Clock,
} from "lucide-react";

interface GrcIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  rooms: any[];
  activeProperty: any;
  initialRoomId?: string;
}

export function GrcIntakeModal({
  isOpen,
  onClose,
  onSuccess,
  rooms,
  activeProperty,
  initialRoomId,
}: GrcIntakeModalProps) {
  // Method Switcher: "PHYSICAL_ENTRY" vs "QR_DIGITAL"
  const [activeMethod, setActiveMethod] = useState<"PHYSICAL_ENTRY" | "QR_DIGITAL">("PHYSICAL_ENTRY");
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Stay & Room
    roomId: initialRoomId || "",
    arrivalDateTime: new Date().toISOString().replace("T", " ").slice(0, 16),
    departureDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    mealPlan: "EP", // EP, CP, MAP, AP
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

      setFormData((prev) => ({
        ...prev,
        roomId: initialRoomId || prev.roomId,
        arrivalDateTime: currentDateTime,
        departureDate: prev.departureDate || defaultDepDate,
      }));
    }
  }, [isOpen, initialRoomId]);

  if (!isOpen) return null;

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

      const res = await fetch("/api/v1/stays/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          roomId: formData.roomId,
          guestData: {
            name: `${formData.title} ${formData.fullName}`.trim(),
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
          arrivalAt: formData.arrivalDateTime,
          expectedDepartureAt: formData.departureDate,
          adults: Number(formData.adults) || 2,
          children: Number(formData.children) || 0,
          paxM: Number(formData.paxM) || 0,
          paxF: Number(formData.paxF) || 0,
          paxC: Number(formData.paxC) || 0,
          depositAmount: Number(formData.depositAmount) || 0,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl border border-zinc-700 bg-[#121215] text-zinc-100 p-5 sm:p-7 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Guest Check-In & GRC Intake
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {activeProperty?.displayName || "Hotel Ambarish Grand Residency"} • {activeProperty?.code || "GUW-01"}
              </p>
            </div>
          </div>

          {/* Intake Method Switcher Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveMethod("PHYSICAL_ENTRY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeMethod === "PHYSICAL_ENTRY"
                    ? "bg-blue-600 text-white shadow-md font-black"
                    : "text-zinc-400 hover:text-white"
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
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Digital QR Kiosk</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* METHOD 1: PHYSICAL GRC DATA ENTRY FORM (KEYED IN BY RECEPTIONIST) */}
        {activeMethod === "PHYSICAL_ENTRY" && (
          <form onSubmit={handleSubmit} className="overflow-y-auto space-y-6 pt-4 pr-1 text-xs">
            
            {/* 1. ROOM & STAY PERIOD SECTION */}
            <div className="rounded-xl border border-zinc-800 bg-[#09090b] p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  1. Room Assignment & Stay Schedule
                </span>
                {selectedRoom && (
                  <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Floor {selectedRoom.floor} • {selectedRoom.roomType?.bedType || "King Bed"}
                  </span>
                )}
              </div>

              {/* Row 1: Room Assignment & Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Select Vacant Room *</label>
                  <select
                    required
                    value={formData.roomId}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose Vacant Room --</option>
                    {rooms
                      .filter((r) => r.roomState?.occupancyStatus === "VACANT" || r.id === formData.roomId)
                      .map((r) => {
                        const bedType = r.roomType?.bedType || (r.wing === "TWIN" ? "Twin Beds" : "King Bed");
                        return (
                          <option key={r.id} value={r.id}>
                            Room {r.number} — {r.roomType?.name} [{bedType}] (Floor {r.floor})
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Check-In Time
                  </label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={formData.arrivalDateTime}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono text-xs cursor-not-allowed select-none opacity-80"
                    title="Auto-filled with current system timestamp"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Expected Departure *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none [color-scheme:dark] cursor-pointer"
                  />
                </div>
              </div>

              {/* Row 2: Meal Plan & Pax Breakdown (5 Dedicated Columns) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Meal Plan</label>
                  <select
                    value={formData.mealPlan}
                    onChange={(e) => setFormData({ ...formData, mealPlan: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="EP">EP (Room Only)</option>
                    <option value="CP">CP (Breakfast)</option>
                    <option value="MAP">MAP (Half Board)</option>
                    <option value="AP">AP (Full Board)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Total Adults *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 2"
                    value={formData.adults}
                    onChange={(e) => setFormData({ ...formData, adults: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Male Pax</label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    min="0"
                    value={formData.paxM}
                    onChange={(e) => setFormData({ ...formData, paxM: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Female Pax</label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    min="0"
                    value={formData.paxF}
                    onChange={(e) => setFormData({ ...formData, paxF: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Children</label>
                  <input
                    type="number"
                    placeholder="e.g. 0"
                    min="0"
                    value={formData.children}
                    onChange={(e) => setFormData({ ...formData, children: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. PRIMARY GUEST DOSSIER */}
            <div className="rounded-xl border border-zinc-800 bg-[#09090b] p-4 space-y-3.5">
              <div className="border-b border-zinc-800 pb-2">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Users className="h-4 w-4 text-emerald-400" />
                  2. Primary Guest Profile (From Physical GRC Card)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Title</label>
                  <select
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Prof.">Prof.</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Guest Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suman Roy, Vikash Kumar"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-bold text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Father / Spouse Name</label>
                  <input
                    type="text"
                    placeholder="S/O, D/O, W/O"
                    value={formData.fatherSpouseName}
                    onChange={(e) => setFormData({ ...formData, fatherSpouseName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9864341211"
                    value={formData.mobilePhone}
                    onChange={(e) => setFormData({ ...formData, mobilePhone: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Alternate Phone</label>
                  <input
                    type="tel"
                    placeholder="Optional phone"
                    value={formData.alternatePhone}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Age (Years) *</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="Age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Nationality *</label>
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
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Indian">Indian</option>
                    <option value="Foreign">Foreign</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Email Address</label>
                  <input
                    type="email"
                    placeholder="guest@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">Profession / Occupation</label>
                  <input
                    type="text"
                    placeholder="e.g. Business Executive"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* MANDATORY FOREIGN NATIONAL SECTION (FORM C) - SHOWN IF FOREIGN */}
            {formData.nationality === "Foreign" && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/10 p-4 space-y-3.5 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-400" />
                    <span className="font-bold text-white uppercase tracking-wider text-xs">
                      Foreign National Form C Details (Mandatory for Foreign Guests)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded font-bold">
                    Govt Form C Compliance
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Row 1: Passport & Citizenship */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">
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
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">
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
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">
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
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Row 2: Visa & Arrival Record */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">
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
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">
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
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none [color-scheme:dark]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">
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
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Row 3: Stay Details & Itinerary */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">
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
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">
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
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-300 uppercase text-[11px] whitespace-nowrap">
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
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. RESIDENTIAL ADDRESS */}
            <div className="rounded-xl border border-zinc-800 bg-[#09090b] p-4 space-y-3.5">
              <div className="border-b border-zinc-800 pb-2">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <MapPin className="h-4 w-4 text-amber-400" />
                  3. Residential Address
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Street / House Address</label>
                  <input
                    type="text"
                    placeholder="Flat / Building / Road / Locality"
                    value={formData.streetAddress}
                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Police Station</label>
                  <input
                    type="text"
                    placeholder="Local P.S."
                    value={formData.policeStation}
                    onChange={(e) => setFormData({ ...formData, policeStation: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Guwahati / Kolkata"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Assam"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">PIN / Zip Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 781008"
                    value={formData.pinZipCode}
                    onChange={(e) => setFormData({ ...formData, pinZipCode: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Country</label>
                  <input
                    type="text"
                    placeholder="e.g. India"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 4. TRAVEL & ID VERIFICATION */}
            <div className="rounded-xl border border-zinc-800 bg-[#09090b] p-4 space-y-3.5">
              <div className="border-b border-zinc-800 pb-2">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Compass className="h-4 w-4 text-cyan-400" />
                  4. Travel Details, ID Proof & Vehicle
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Arrived From</label>
                  <input
                    type="text"
                    placeholder="e.g. Airport / Railway Station"
                    value={formData.arrivedFrom}
                    onChange={(e) => setFormData({ ...formData, arrivedFrom: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Going To</label>
                  <input
                    type="text"
                    placeholder="e.g. City Center / Local"
                    value={formData.goingTo}
                    onChange={(e) => setFormData({ ...formData, goingTo: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Purpose of Visit</label>
                  <select
                    value={formData.purposeOfVisit}
                    onChange={(e) => setFormData({ ...formData, purposeOfVisit: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  >
                    <option value="Tourism / Holiday">Tourism / Holiday</option>
                    <option value="Business / Official">Business / Official</option>
                    <option value="Medical">Medical Treatment</option>
                    <option value="Transit">Transit / Layover</option>
                    <option value="Event / Wedding">Event / Wedding</option>
                    <option value="Exam / Interview">Exam / Interview</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="e.g. AS 01 EX 1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">ID Document Type</label>
                  <select
                    value={formData.idType}
                    onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-semibold"
                  >
                    <option value="AADHAAR">Aadhaar Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                    <option value="VOTER_ID">Voter ID</option>
                    <option value="GOVT_ID">Govt Issued ID</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">ID Number / Last 4 Digits</label>
                  <input
                    type="text"
                    placeholder="e.g. 4521 or full ID"
                    value={formData.idLast4}
                    onChange={(e) => setFormData({ ...formData, idLast4: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Company Name</label>
                  <input
                    type="text"
                    placeholder="Corporate Billing (Optional)"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Guest GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 18AAAAA0000A1Z5"
                    value={formData.guestGstin}
                    onChange={(e) => setFormData({ ...formData, guestGstin: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 5. ACCOMPANYING CO-GUESTS */}
            <div className="rounded-xl border border-zinc-800 bg-[#09090b] p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Users className="h-4 w-4 text-cyan-400" />
                  5. Accompanying Co-Guests ({formData.coGuests.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddCoGuest}
                  className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[11px] flex items-center gap-1 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Companion</span>
                </button>
              </div>

              {formData.coGuests.length > 0 ? (
                <div className="space-y-2">
                  {formData.coGuests.map((cg, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800 items-center">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Companion Name *"
                          value={cg.name}
                          onChange={(e) => handleCoGuestChange(idx, "name", e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs font-semibold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          placeholder="Age"
                          value={cg.age}
                          onChange={(e) => handleCoGuestChange(idx, "age", e.target.value)}
                          className="w-full h-9 px-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={cg.gender}
                          onChange={(e) => handleCoGuestChange(idx, "gender", e.target.value)}
                          className="w-full h-9 px-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <select
                          value={cg.relation}
                          onChange={(e) => handleCoGuestChange(idx, "relation", e.target.value)}
                          className="w-full h-9 px-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs"
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
                          className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-900/50 transition"
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
            <div className="rounded-xl border border-zinc-800 bg-[#09090b] p-4 space-y-3.5">
              <div className="border-b border-zinc-800 pb-2">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                  6. Check-In Advance Payment & Receipt
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Advance Deposit Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0.00"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono font-bold text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Payment Mode</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-bold text-xs"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash Drawer</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="DIRECT_BILL">Company Bill</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 uppercase text-[11px]">Transaction / UTR Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR/98127391"
                    value={formData.transactionRef}
                    onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-mono">
                Complies with Form GRC Rule 46 • Instant Folio & Registration Creation
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-extrabold text-white text-xs transition shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{loading ? "Checking In Guest..." : "Complete Check-In & Issue GRC"}</span>
                </button>
              </div>
            </div>

          </form>
        )}

        {/* METHOD 2: DIGITAL QR KIOSK / GUEST SELF CHECK-IN */}
        {activeMethod === "QR_DIGITAL" && (
          <div className="overflow-y-auto space-y-6 pt-6 text-center max-w-lg mx-auto">
            <div className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto shadow-inner">
                <QrCode className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Contactless Guest Self Check-In</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Guests can scan this QR code on their smartphone to fill out their GRC, upload ID photos, and sign digitally before reaching the counter.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl max-w-[200px] mx-auto shadow-md">
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
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 inline-flex items-center gap-1.5 transition"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
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
