"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import {
  Building2,
  BedDouble,
  Receipt,
  Users,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  RefreshCw,
  FolderUp,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { switchProperty, refreshData } = useHotel();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Identity & Legal
    displayName: "",
    legalName: "",
    code: "",
    gstin: "",
    stateCode: "18",
    address: "",
    city: "Guwahati",
    state: "Assam",
    pinCode: "781001",
    phone: "",
    email: "",
    checkinTime: "12:00",
    checkoutTime: "11:00",

    // Step 2: Room Types
    roomTypes: [
      {
        code: "DELUXE",
        name: "Deluxe Room",
        capacity: 2,
        extraCapacity: 1,
        baseRate: 2000,
        extraAdultRate: 500,
        extraChildRate: 250,
        bedType: "King Bed",
        amenities: ["Air Conditioning", "Free Wi-Fi", "Smart TV", "Ensuite Bathroom"]
      },
      {
        code: "EXECUTIVE",
        name: "Executive Room",
        capacity: 2,
        extraCapacity: 1,
        baseRate: 2500,
        extraAdultRate: 500,
        extraChildRate: 250,
        bedType: "King Bed",
        amenities: ["Air Conditioning", "Free Wi-Fi", "Work Desk", "Smart TV", "Mini Fridge"]
      },
      {
        code: "SUITE",
        name: "Suite Room",
        capacity: 3,
        extraCapacity: 2,
        baseRate: 5000,
        extraAdultRate: 500,
        extraChildRate: 250,
        bedType: "King Bed + Lounge",
        amenities: ["Air Conditioning", "High Speed Wi-Fi", "Living Area", "Bathtub", "Mini Bar"]
      }
    ],

    // Step 3: Physical Rooms
    rooms: [
      { number: "101", floor: 1, roomTypeCode: "DELUXE" },
      { number: "102", floor: 1, roomTypeCode: "DELUXE" },
      { number: "103", floor: 1, roomTypeCode: "EXECUTIVE" },
      { number: "201", floor: 2, roomTypeCode: "DELUXE" },
      { number: "202", floor: 2, roomTypeCode: "EXECUTIVE" },
      { number: "203", floor: 2, roomTypeCode: "SUITE" },
    ],

    // Quick room generator inputs
    generator: {
      floors: 3,
      roomsPerFloor: 6,
      defaultType: "DELUXE"
    },

    // Step 4: Billing Sequences
    documentSequences: {
      invoicePrefix: "INV-2627-",
      receiptPrefix: "REC-2627-",
      reservationPrefix: "RES-2627-",
      kotPrefix: "KOT-",
      financialYear: "2026-2027"
    },

    // Step 5: Staff Accounts
    staffUsers: [
      {
        name: "General Manager",
        email: "",
        phone: "",
        roleCode: "ADMIN_GM" as const
      },
      {
        name: "Front Office Reception",
        email: "",
        phone: "",
        roleCode: "FD_MGR" as const
      }
    ]
  });

  // Auto-fill state code and uppercase code
  const handleGstinChange = (val: string) => {
    const cleanGst = val.toUpperCase().trim();
    let detectedState = formData.stateCode;
    if (cleanGst.length >= 2 && !isNaN(Number(cleanGst.substring(0, 2)))) {
      detectedState = cleanGst.substring(0, 2);
    }
    setFormData(prev => ({
      ...prev,
      gstin: cleanGst,
      stateCode: detectedState
    }));
  };

  // Quick room generator
  const handleGenerateRooms = () => {
    const newRooms: Array<{ number: string; floor: number; roomTypeCode: string }> = [];
    const floors = Math.max(1, Math.min(20, Number(formData.generator.floors) || 1));
    const perFloor = Math.max(1, Math.min(50, Number(formData.generator.roomsPerFloor) || 1));

    for (let f = 1; f <= floors; f++) {
      for (let r = 1; r <= perFloor; r++) {
        const roomNum = `${f}${String(r).padStart(2, "0")}`;
        newRooms.push({
          number: roomNum,
          floor: f,
          roomTypeCode: formData.generator.defaultType
        });
      }
    }
    setFormData(prev => ({ ...prev, rooms: newRooms }));
  };

  // Add room type
  const handleAddRoomType = () => {
    setFormData(prev => ({
      ...prev,
      roomTypes: [
        ...prev.roomTypes,
        {
          code: `TYPE_${prev.roomTypes.length + 1}`,
          name: `Standard Room Type ${prev.roomTypes.length + 1}`,
          capacity: 2,
          extraCapacity: 1,
          baseRate: 2000,
          extraAdultRate: 500,
          extraChildRate: 250,
          bedType: "King Bed",
          amenities: ["Air Conditioning", "Free Wi-Fi"]
        }
      ]
    }));
  };

  // Remove room type
  const handleRemoveRoomType = (index: number) => {
    if (formData.roomTypes.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      roomTypes: prev.roomTypes.filter((_, i) => i !== index)
    }));
  };

  // Add individual room
  const handleAddRoom = () => {
    const nextNum = String(formData.rooms.length > 0 ? Number(formData.rooms[formData.rooms.length - 1].number) + 1 : 101);
    setFormData(prev => ({
      ...prev,
      rooms: [
        ...prev.rooms,
        {
          number: isNaN(Number(nextNum)) ? `R-${prev.rooms.length + 1}` : nextNum,
          floor: 1,
          roomTypeCode: prev.roomTypes[0]?.code || "DELUXE"
        }
      ]
    }));
  };

  // Remove individual room
  const handleRemoveRoom = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== index)
    }));
  };

  // Final Submit
  const handleOnboardSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      if (!formData.displayName.trim() || !formData.code.trim() || !formData.legalName.trim()) {
        throw new Error("Please complete the Hotel Name, Legal Entity Name, and Property Code.");
      }

      if (formData.rooms.length === 0) {
        throw new Error("Please add at least one physical room for the hotel.");
      }

      // Auto assign staff emails if empty
      const cleanCode = formData.code.trim().toUpperCase();
      const sanitizedStaff = formData.staffUsers.map((s, idx) => ({
        name: s.name || `Staff ${idx + 1}`,
        email: s.email.trim() || (idx === 0 ? `admin.${cleanCode.toLowerCase()}@hotelos.in` : `reception.${cleanCode.toLowerCase()}@hotelos.in`),
        phone: s.phone || formData.phone,
        roleCode: s.roleCode
      }));

      const payload = {
        displayName: formData.displayName.trim(),
        legalName: formData.legalName.trim(),
        code: cleanCode,
        gstin: formData.gstin.trim(),
        stateCode: formData.stateCode,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pinCode: formData.pinCode.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        checkinTime: formData.checkinTime,
        checkoutTime: formData.checkoutTime,
        roomTypes: formData.roomTypes,
        rooms: formData.rooms,
        documentSequences: formData.documentSequences,
        staffUsers: sanitizedStaff
      };

      const res = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to onboard property");
      }

      setSuccessResult(data);
      await refreshData();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during onboarding.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: "Property Identity", desc: "Legal & Location" },
    { num: 2, title: "Room Types & Rates", desc: "Pricing & Plans" },
    { num: 3, title: "Room Inventory", desc: "Floors & Rooms" },
    { num: 4, title: "GST & Sequences", desc: "Tax & Series" },
    { num: 5, title: "Staff & Access", desc: "Users & Roles" },
    { num: 6, title: "Review & Launch", desc: "Verification" },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                <Building2 className="h-4 w-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Hotel Onboarding Wizard</h1>
              <span className="rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 text-xs font-mono font-bold">
                Multi-Property
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              Provision a new hotel property with full GST compliance, inventory, rate plans, and document sequences in minutes.
            </p>
          </div>

          <button
            onClick={() => router.push("/pms")}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to PMS
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {steps.map((s) => {
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;

            return (
              <button
                key={s.num}
                onClick={() => !successResult && setCurrentStep(s.num)}
                className={`flex flex-col text-left p-3 rounded-xl border transition ${
                  isActive
                    ? "bg-blue-600/10 border-blue-500/50 shadow-md shadow-blue-500/5"
                    : isDone
                    ? "bg-zinc-900/60 border-zinc-700 text-zinc-300"
                    : "bg-zinc-950/40 border-zinc-850 text-zinc-500 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-bold ${isActive ? "text-blue-400" : isDone ? "text-emerald-400" : "text-zinc-500"}`}>
                    0{s.num}
                  </span>
                  {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
                <div className={`text-xs font-bold truncate ${isActive ? "text-white" : isDone ? "text-zinc-200" : "text-zinc-400"}`}>
                  {s.title}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">{s.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Modal / Screen */}
        {successResult && (
          <div className="rounded-2xl border border-emerald-500/30 bg-[#121215] p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Hotel Successfully Onboarded!</h2>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                <span className="font-bold text-emerald-400">{successResult.propertyName}</span> ({successResult.propertyCode}) is now live with {successResult.roomsCreated} rooms and {successResult.roomTypesCreated} room types.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={() => {
                  switchProperty(successResult.propertyId);
                  router.push("/pms");
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <span>Go to PMS Room Grid</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  setSuccessResult(null);
                  setCurrentStep(1);
                  setFormData(prev => ({
                    ...prev,
                    displayName: "",
                    legalName: "",
                    code: "",
                    gstin: "",
                    phone: "",
                    email: ""
                  }));
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 font-semibold text-sm text-zinc-300 transition"
              >
                Onboard Another Property
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step Forms */}
        {!successResult && (
          <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-6 sm:p-8 space-y-6 shadow-xl">
            
            {/* STEP 1: Property Identity */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-400" />
                    Property Identity & Legal Master
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Official registration details required for GST tax invoices and state legal compliance.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Hotel Display Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hotel Ambarish Grand Residency, Hotel Pine Vista"
                      value={formData.displayName}
                      onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Legal Entity / Firm Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AMBARISH RESIDENCY, Pine Vista Resorts LLP"
                      value={formData.legalName}
                      onChange={e => setFormData({ ...formData, legalName: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Property Short Code * (Unique)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GUW-01, SHL-01, KAZ-01"
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm font-mono focus:border-blue-500 focus:outline-none uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      GSTIN (15 Digits)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 18AACCB2447F1ZX"
                      value={formData.gstin}
                      onChange={e => handleGstinChange(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm font-mono focus:border-blue-500 focus:outline-none uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      State / State Code
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="State Code (18)"
                        value={formData.stateCode}
                        onChange={e => setFormData({ ...formData, stateCode: e.target.value })}
                        className="h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm font-mono"
                      />
                      <input
                        type="text"
                        placeholder="State (Assam)"
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                        className="h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Street Address & Area
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MD Shah Road, Paltan Bazar"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      City / PIN Code
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="City (Guwahati)"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        className="h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm"
                      />
                      <input
                        type="text"
                        placeholder="PIN (781008)"
                        value={formData.pinCode}
                        onChange={e => setFormData({ ...formData, pinCode: e.target.value })}
                        className="h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Phone Number & Email
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Phone (9864341211)"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm font-mono"
                      />
                      <input
                        type="email"
                        placeholder="reservation@hotel.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Room Types & Rates */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <BedDouble className="h-5 w-5 text-blue-400" />
                      Room Types & Tariff Rate Plans
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Define room categories, base night tariffs, extra adult charges, and standard amenities.
                    </p>
                  </div>

                  <button
                    onClick={handleAddRoomType}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Room Type</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.roomTypes.map((rt, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-mono font-bold text-zinc-300">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-white">{rt.name || "Room Category"}</span>
                        </div>

                        {formData.roomTypes.length > 1 && (
                          <button
                            onClick={() => handleRemoveRoomType(idx)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-zinc-400 uppercase">Code</label>
                          <input
                            type="text"
                            value={rt.code}
                            onChange={e => {
                              const copy = [...formData.roomTypes];
                              copy[idx].code = e.target.value.toUpperCase();
                              setFormData({ ...formData, roomTypes: copy });
                            }}
                            className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs font-mono uppercase"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-400 uppercase">Category Name</label>
                          <input
                            type="text"
                            value={rt.name}
                            onChange={e => {
                              const copy = [...formData.roomTypes];
                              copy[idx].name = e.target.value;
                              setFormData({ ...formData, roomTypes: copy });
                            }}
                            className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-400 uppercase">Base Rate (₹)</label>
                          <input
                            type="number"
                            value={rt.baseRate}
                            onChange={e => {
                              const copy = [...formData.roomTypes];
                              copy[idx].baseRate = Number(e.target.value);
                              setFormData({ ...formData, roomTypes: copy });
                            }}
                            className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-400 uppercase">Extra Bed (₹)</label>
                          <input
                            type="number"
                            value={rt.extraAdultRate}
                            onChange={e => {
                              const copy = [...formData.roomTypes];
                              copy[idx].extraAdultRate = Number(e.target.value);
                              setFormData({ ...formData, roomTypes: copy });
                            }}
                            className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Room Inventory */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-400" />
                    Physical Room Inventory Builder
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Add room numbers or auto-generate rooms across multiple floors in one click.
                  </p>
                </div>

                {/* Quick Generator Card */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    Quick Inventory Generator
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300">Total Floors</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.generator.floors}
                        onChange={e => setFormData({
                          ...formData,
                          generator: { ...formData.generator, floors: Number(e.target.value) }
                        })}
                        className="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300">Rooms per Floor</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.generator.roomsPerFloor}
                        onChange={e => setFormData({
                          ...formData,
                          generator: { ...formData.generator, roomsPerFloor: Number(e.target.value) }
                        })}
                        className="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300">Default Category</label>
                      <select
                        value={formData.generator.defaultType}
                        onChange={e => setFormData({
                          ...formData,
                          generator: { ...formData.generator, defaultType: e.target.value }
                        })}
                        className="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs"
                      >
                        {formData.roomTypes.map(rt => (
                          <option key={rt.code} value={rt.code}>{rt.name} ({rt.code})</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleGenerateRooms}
                      className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition shadow-sm"
                    >
                      Generate ({Number(formData.generator.floors) * Number(formData.generator.roomsPerFloor)} Rooms)
                    </button>
                  </div>
                </div>

                {/* Rooms Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400">
                      Total Configured Rooms: <strong className="text-white font-mono">{formData.rooms.length}</strong>
                    </span>
                    <button
                      onClick={handleAddRoom}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Single Room
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-80 overflow-y-auto pr-1">
                    {formData.rooms.map((rm, idx) => (
                      <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5 space-y-1.5 relative group">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={rm.number}
                            onChange={e => {
                              const copy = [...formData.rooms];
                              copy[idx].number = e.target.value;
                              setFormData({ ...formData, rooms: copy });
                            }}
                            className="w-16 h-7 px-1.5 rounded bg-zinc-950 border border-zinc-700 text-white text-xs font-mono font-bold"
                          />
                          <button
                            onClick={() => handleRemoveRoom(idx)}
                            className="text-zinc-500 hover:text-red-400 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <select
                          value={rm.roomTypeCode}
                          onChange={e => {
                            const copy = [...formData.rooms];
                            copy[idx].roomTypeCode = e.target.value;
                            setFormData({ ...formData, rooms: copy });
                          }}
                          className="w-full h-6 px-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300"
                        >
                          {formData.roomTypes.map(rt => (
                            <option key={rt.code} value={rt.code}>{rt.code}</option>
                          ))}
                        </select>
                        <div className="text-[9px] text-zinc-500 font-mono">Floor {rm.floor}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: GST & Billing Sequences */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-blue-400" />
                    GST Tax Profiles & Billing Series
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Indian GST Rule 46 compliant document numbering and tax slab automation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                    <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      Standard Indian GST Profiles
                    </div>
                    <div className="text-xs text-zinc-400 space-y-1.5">
                      <div className="flex justify-between py-1 border-b border-zinc-800/80">
                        <span>Room Rent (Tariff &lt;= ₹7,500)</span>
                        <strong className="text-emerald-400 font-mono">12% (SAC 996311)</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-800/80">
                        <span>Room Rent (Tariff &gt; ₹7,500)</span>
                        <strong className="text-emerald-400 font-mono">18% (SAC 996311)</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Restaurant & In-Room Dining</span>
                        <strong className="text-emerald-400 font-mono">5% (SAC 996331)</strong>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      Document Series Prefixes
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-zinc-400">Tax Invoice Prefix</label>
                        <input
                          type="text"
                          value={formData.documentSequences.invoicePrefix}
                          onChange={e => setFormData({
                            ...formData,
                            documentSequences: { ...formData.documentSequences, invoicePrefix: e.target.value }
                          })}
                          className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400">Receipt Prefix</label>
                        <input
                          type="text"
                          value={formData.documentSequences.receiptPrefix}
                          onChange={e => setFormData({
                            ...formData,
                            documentSequences: { ...formData.documentSequences, receiptPrefix: e.target.value }
                          })}
                          className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Staff & Access */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    Initial Staff User Accounts
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Define login accounts with designated department roles for this property.
                  </p>
                </div>

                <div className="space-y-4">
                  {formData.staffUsers.map((staff, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{staff.roleCode === "ADMIN_GM" ? "General Manager (Admin)" : "Front Desk Manager"}</span>
                        <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {staff.roleCode}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-zinc-400">Full Name</label>
                          <input
                            type="text"
                            value={staff.name}
                            onChange={e => {
                              const copy = [...formData.staffUsers];
                              copy[idx].name = e.target.value;
                              setFormData({ ...formData, staffUsers: copy });
                            }}
                            className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-400">Login Email</label>
                          <input
                            type="email"
                            placeholder={idx === 0 ? `admin.${(formData.code || 'hotel').toLowerCase()}@hotelos.in` : `reception.${(formData.code || 'hotel').toLowerCase()}@hotelos.in`}
                            value={staff.email}
                            onChange={e => {
                              const copy = [...formData.staffUsers];
                              copy[idx].email = e.target.value;
                              setFormData({ ...formData, staffUsers: copy });
                            }}
                            className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-zinc-400">Contact Number</label>
                          <input
                            type="text"
                            placeholder={formData.phone || "9864341211"}
                            value={staff.phone}
                            onChange={e => {
                              const copy = [...formData.staffUsers];
                              copy[idx].phone = e.target.value;
                              setFormData({ ...formData, staffUsers: copy });
                            }}
                            className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: Review & Final Launch */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    Review Property Master & Final Launch
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Verify all configurations before creating and initializing this property.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 text-xs">
                    <div className="font-bold text-white uppercase tracking-wider mb-2 border-b border-zinc-800 pb-1">
                      Property Identity
                    </div>
                    <div className="flex justify-between"><span className="text-zinc-400">Hotel Name:</span><strong className="text-white">{formData.displayName || "Not specified"}</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Legal Entity:</span><strong className="text-white">{formData.legalName || "Not specified"}</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Property Code:</span><strong className="text-blue-400 font-mono">{formData.code || "Not specified"}</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">GSTIN:</span><strong className="text-white font-mono">{formData.gstin || "Unregistered"}</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Address:</span><strong className="text-white">{formData.city}, {formData.state}</strong></div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 text-xs">
                    <div className="font-bold text-white uppercase tracking-wider mb-2 border-b border-zinc-800 pb-1">
                      Inventory & Rates
                    </div>
                    <div className="flex justify-between"><span className="text-zinc-400">Total Rooms:</span><strong className="text-emerald-400 font-mono text-sm">{formData.rooms.length} Rooms</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Room Categories:</span><strong className="text-white font-mono">{formData.roomTypes.length} Types</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Invoice Series:</span><strong className="text-white font-mono">{formData.documentSequences.invoicePrefix}</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Default Meal Plan:</span><strong className="text-white">EP (Room Only)</strong></div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-xs font-semibold text-zinc-300 transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
              ) : <div />}

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-lg shadow-blue-600/30"
                >
                  <span>Next Step</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleOnboardSubmit}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Provisioning Hotel Property...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Launch & Initialize Property</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
