"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import { HOTEL_DIVINE_VIEW_PRESET } from "@/lib/onboarding/divine-view-data";
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
  AlertCircle,
  Database,
  Lock,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Check,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { switchProperty, refreshData } = useHotel();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [isDivinePresetLoaded, setIsDivinePresetLoaded] = useState(true);
  const [roomFilter, setRoomFilter] = useState<string>("ALL");
  const [floorFilter, setFloorFilter] = useState<number | "ALL">("ALL");

  // Form State initialized with Hotel Divine View preset by default
  const [formData, setFormData] = useState({
    // Step 1: Identity & Legal
    displayName: HOTEL_DIVINE_VIEW_PRESET.displayName,
    legalName: HOTEL_DIVINE_VIEW_PRESET.legalName,
    code: HOTEL_DIVINE_VIEW_PRESET.code,
    gstin: HOTEL_DIVINE_VIEW_PRESET.gstin,
    stateCode: HOTEL_DIVINE_VIEW_PRESET.stateCode,
    address: HOTEL_DIVINE_VIEW_PRESET.address,
    city: HOTEL_DIVINE_VIEW_PRESET.city,
    state: HOTEL_DIVINE_VIEW_PRESET.state,
    pinCode: HOTEL_DIVINE_VIEW_PRESET.pinCode,
    phone: HOTEL_DIVINE_VIEW_PRESET.phone,
    email: HOTEL_DIVINE_VIEW_PRESET.email,
    checkinTime: HOTEL_DIVINE_VIEW_PRESET.checkinTime || "12:00",
    checkoutTime: HOTEL_DIVINE_VIEW_PRESET.checkoutTime || "11:00",

    // Step 2: Room Types
    roomTypes: HOTEL_DIVINE_VIEW_PRESET.roomTypes,

    // Step 3: Physical Rooms
    rooms: HOTEL_DIVINE_VIEW_PRESET.rooms,

    // Quick room generator inputs
    generator: {
      floors: 4,
      roomsPerFloor: 20,
      defaultType: "DELUXE"
    },

    // Step 4: Billing Sequences
    documentSequences: {
      invoicePrefix: HOTEL_DIVINE_VIEW_PRESET.documentSequences?.invoicePrefix || "INV-HDV-2627-",
      receiptPrefix: HOTEL_DIVINE_VIEW_PRESET.documentSequences?.receiptPrefix || "REC-HDV-2627-",
      reservationPrefix: HOTEL_DIVINE_VIEW_PRESET.documentSequences?.reservationPrefix || "RES-HDV-2627-",
      kotPrefix: HOTEL_DIVINE_VIEW_PRESET.documentSequences?.kotPrefix || "KOT-HDV-",
      financialYear: HOTEL_DIVINE_VIEW_PRESET.documentSequences?.financialYear || "2026-2027"
    },

    // Step 5: Access Isolation & Staff Accounts
    restrictToBijeshOnly: true,
    staffUsers: [
      {
        name: "Bijesh Singha",
        email: "bijesh.singha@hotelos.in",
        phone: "9706277133",
        roleCode: "ORG_OWNER" as const
      }
    ]
  });

  // Handler to load Hotel Divine View Preset
  const handleLoadDivineViewPreset = () => {
    setFormData({
      displayName: HOTEL_DIVINE_VIEW_PRESET.displayName,
      legalName: HOTEL_DIVINE_VIEW_PRESET.legalName,
      code: HOTEL_DIVINE_VIEW_PRESET.code,
      gstin: HOTEL_DIVINE_VIEW_PRESET.gstin,
      stateCode: HOTEL_DIVINE_VIEW_PRESET.stateCode,
      address: HOTEL_DIVINE_VIEW_PRESET.address,
      city: HOTEL_DIVINE_VIEW_PRESET.city,
      state: HOTEL_DIVINE_VIEW_PRESET.state,
      pinCode: HOTEL_DIVINE_VIEW_PRESET.pinCode,
      phone: HOTEL_DIVINE_VIEW_PRESET.phone,
      email: HOTEL_DIVINE_VIEW_PRESET.email,
      checkinTime: HOTEL_DIVINE_VIEW_PRESET.checkinTime || "12:00",
      checkoutTime: HOTEL_DIVINE_VIEW_PRESET.checkoutTime || "11:00",
      roomTypes: HOTEL_DIVINE_VIEW_PRESET.roomTypes,
      rooms: HOTEL_DIVINE_VIEW_PRESET.rooms,
      generator: {
        floors: 4,
        roomsPerFloor: 20,
        defaultType: "DELUXE"
      },
      documentSequences: {
        invoicePrefix: HOTEL_DIVINE_VIEW_PRESET.documentSequences?.invoicePrefix || "INV-HDV-2627-",
        receiptPrefix: HOTEL_DIVINE_VIEW_PRESET.documentSequences?.receiptPrefix || "REC-HDV-2627-",
        reservationPrefix: HOTEL_DIVINE_VIEW_PRESET.documentSequences?.reservationPrefix || "RES-HDV-2627-",
        kotPrefix: HOTEL_DIVINE_VIEW_PRESET.documentSequences?.kotPrefix || "KOT-HDV-",
        financialYear: HOTEL_DIVINE_VIEW_PRESET.documentSequences?.financialYear || "2026-2027"
      },
      restrictToBijeshOnly: true,
      staffUsers: [
        {
          name: "Bijesh Singha",
          email: "bijesh.singha@hotelos.in",
          phone: "9706277133",
          roleCode: "ORG_OWNER" as const
        }
      ]
    });
    setIsDivinePresetLoaded(true);
    setErrorMsg(null);
  };

  // Handler to clear and use blank form
  const handleClearForm = () => {
    setFormData({
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
          amenities: ["Air Conditioning", "Free Wi-Fi", "Smart TV"]
        }
      ],
      rooms: [
        { number: "101", floor: 1, roomTypeCode: "DELUXE" },
        { number: "102", floor: 1, roomTypeCode: "DELUXE" },
      ],
      generator: { floors: 2, roomsPerFloor: 5, defaultType: "DELUXE" },
      documentSequences: {
        invoicePrefix: "INV-2627-",
        receiptPrefix: "REC-2627-",
        reservationPrefix: "RES-2627-",
        kotPrefix: "KOT-",
        financialYear: "2026-2027"
      },
      restrictToBijeshOnly: true,
      staffUsers: [
        {
          name: "Bijesh Singha",
          email: "bijesh.singha@hotelos.in",
          phone: "",
          roleCode: "ORG_OWNER" as const
        }
      ]
    });
    setIsDivinePresetLoaded(false);
  };

  // Auto-fill state code on GSTIN change
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

  // Room type handlers
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

  const handleRemoveRoomType = (index: number) => {
    if (formData.roomTypes.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      roomTypes: prev.roomTypes.filter((_, i) => i !== index)
    }));
  };

  // Individual room handlers
  const handleAddRoom = () => {
    const nextNum = String(formData.rooms.length > 0 ? Number(formData.rooms[formData.rooms.length - 1].number) + 1 : 201);
    setFormData(prev => ({
      ...prev,
      rooms: [
        ...prev.rooms,
        {
          number: isNaN(Number(nextNum)) ? `R-${prev.rooms.length + 1}` : nextNum,
          floor: 2,
          roomTypeCode: prev.roomTypes[0]?.code || "DELUXE"
        }
      ]
    }));
  };

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

      const cleanCode = formData.code.trim().toUpperCase();

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
        restrictToBijeshOnly: formData.restrictToBijeshOnly,
        staffUsers: formData.restrictToBijeshOnly
          ? [
              {
                name: "Bijesh Singha",
                email: "bijesh.singha@hotelos.in",
                phone: formData.phone,
                roleCode: "ORG_OWNER" as const
              }
            ]
          : formData.staffUsers.map((s, idx) => ({
              name: s.name || `Staff ${idx + 1}`,
              email: s.email.trim() || (idx === 0 ? `admin.${cleanCode.toLowerCase()}@hotelos.in` : `reception.${cleanCode.toLowerCase()}@hotelos.in`),
              phone: s.phone || formData.phone,
              roleCode: s.roleCode
            }))
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
    { num: 3, title: "Room Inventory", desc: "76 Physical Rooms" },
    { num: 4, title: "GST & Sequences", desc: "Tax & Series" },
    { num: 5, title: "Staff & Access", desc: "Bijesh Singha Only" },
    { num: 6, title: "Review & Launch", desc: "Verification" },
  ];

  // Filtered rooms for grid
  const filteredRooms = formData.rooms.filter(r => {
    const matchesType = roomFilter === "ALL" || r.roomTypeCode === roomFilter;
    const matchesFloor = floorFilter === "ALL" || r.floor === floorFilter;
    return matchesType && matchesFloor;
  });

  const getRoomTypeColor = (code: string) => {
    switch (code) {
      case "DELUXE":
        return "border-blue-500/30 bg-blue-500/10 text-blue-400";
      case "EXECUTIVE":
        return "border-amber-500/30 bg-amber-500/10 text-amber-400";
      case "FAMILY":
        return "border-purple-500/30 bg-purple-500/10 text-purple-400";
      case "FAMILY_EXECUTIVE":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      default:
        return "border-zinc-700 bg-zinc-800 text-zinc-300";
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                <Building2 className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Hotel Onboarding Studio</h1>
              <span className="rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 text-xs font-mono font-bold">
                Multi-Tenancy
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              Provision high-compliance hotel properties with automated room inventories, rate plans, and strict user access isolation.
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

        {/* PROMINENT PRESET HERO BANNER: DV_Today.bak */}
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-blue-950/30 to-zinc-900/60 p-5 shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                  <Database className="h-3 w-3" />
                  <span>DV_Today.bak Live Source</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                  <Lock className="h-3 w-3" />
                  <span>Bijesh Singha Only</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                  0 Guest Records Extracted
                </div>
              </div>

              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Hotel Divine View — Extracted Configuration</span>
                {isDivinePresetLoaded && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Loaded
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                Pre-configured with official details from <span className="font-mono text-indigo-300">DV_Today.bak</span>: 
                <strong className="text-white"> 76 Physical Rooms across 4 Floors (101-120, 201-220, 301-321, 401-415)</strong>, 
                <strong className="text-white"> 3 Room Categories</strong> (Deluxe, Executive, Family, Family Executive), 
                GSTIN <strong className="font-mono text-white">18AALFH7867B1Z2</strong>, and strict access granted exclusively to <strong className="text-blue-400">Bijesh Singha</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={handleLoadDivineViewPreset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white transition shadow-lg shadow-indigo-600/30"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Reset to Divine View</span>
              </button>
              <button
                onClick={handleClearForm}
                className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 transition"
                title="Start with blank form"
              >
                Blank Form
              </button>
            </div>
          </div>
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
              <p className="text-sm text-zinc-300 max-w-md mx-auto">
                <span className="font-bold text-emerald-400">{successResult.propertyName}</span> ({successResult.propertyCode}) is live with {successResult.roomsCreated} rooms and {successResult.roomTypesCreated} room categories.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                <Lock className="h-3.5 w-3.5" />
                <span>Property scope strictly assigned to Bijesh Singha</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={() => {
                  switchProperty(successResult.propertyId);
                  router.push("/pms");
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <span>Switch to {successResult.propertyName} & Open PMS</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  setSuccessResult(null);
                  setCurrentStep(1);
                  handleClearForm();
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
                <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-400" />
                      Property Identity & Legal Master
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Official registration details required for GST tax invoices and state legal compliance.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
                    Step 1 of 6
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Hotel Display Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hotel Divine View"
                      value={formData.displayName}
                      onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Legal Entity / Firm Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HOTEL DIVINE VIEW"
                      value={formData.legalName}
                      onChange={e => setFormData({ ...formData, legalName: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Property Short Code * (Unique)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDV-01"
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                      <span>GSTIN (15 Digits)</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Assam (18)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 18AALFH7867B1Z2"
                      value={formData.gstin}
                      onChange={e => handleGstinChange(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase font-bold"
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
                      placeholder="e.g. Md.Shah Road, Paltan Bazar"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                        placeholder="Phone (9706277133)"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="h-11 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white text-sm font-mono"
                      />
                      <input
                        type="email"
                        placeholder="divineview02@gmail.com"
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
                      Room Categories & Base Tariffs
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Discovered categories from database: Deluxe, Executive, Family, and Family Executive.
                    </p>
                  </div>

                  <button
                    onClick={handleAddRoomType}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Category</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.roomTypes.map((rt, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getRoomTypeColor(rt.code)}`}>
                            {rt.code}
                          </span>
                          <span className="font-bold text-sm text-white">{rt.name}</span>
                        </div>

                        {formData.roomTypes.length > 1 && (
                          <button
                            onClick={() => handleRemoveRoomType(idx)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-400 uppercase">Base Rate (₹)</label>
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
                          <label className="text-[10px] font-semibold text-zinc-400 uppercase">Extra Adult (₹)</label>
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

                        <div>
                          <label className="text-[10px] font-semibold text-zinc-400 uppercase">Capacity</label>
                          <input
                            type="number"
                            value={rt.capacity}
                            onChange={e => {
                              const copy = [...formData.roomTypes];
                              copy[idx].capacity = Number(e.target.value);
                              setFormData({ ...formData, roomTypes: copy });
                            }}
                            className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Amenities Pills */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-400 uppercase">Standard Amenities</label>
                        <div className="flex flex-wrap gap-1.5">
                          {rt.amenities.map((am, aIdx) => (
                            <span key={aIdx} className="text-[10px] bg-zinc-950 text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded">
                              {am}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Room Inventory (32 Physical Rooms) */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Layers className="h-5 w-5 text-blue-400" />
                      Physical Room Inventory ({formData.rooms.length} Rooms)
                    </h3>
                    <p className="text-xs text-zinc-400">
                      76 physical rooms across Floors 1 to 4 (61 Deluxe, 7 Executive, 8 Family Executive) from verified master inventory.
                    </p>
                  </div>

                  {/* Filter chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setRoomFilter("ALL")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        roomFilter === "ALL" ? "bg-blue-600 text-white" : "bg-zinc-900 text-zinc-400 hover:text-white"
                      }`}
                    >
                      All ({formData.rooms.length})
                    </button>
                    {formData.roomTypes.map(rt => (
                      <button
                        key={rt.code}
                        onClick={() => setRoomFilter(rt.code)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                          roomFilter === rt.code ? "bg-blue-600 text-white" : "bg-zinc-900 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {rt.code} ({formData.rooms.filter(r => r.roomTypeCode === rt.code).length})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rooms Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400">
                      Showing <strong className="text-white font-mono">{filteredRooms.length}</strong> of <strong className="text-white font-mono">{formData.rooms.length}</strong> rooms:
                    </span>
                    <button
                      onClick={handleAddRoom}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Room
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 max-h-96 overflow-y-auto pr-1">
                    {filteredRooms.map((rm, idx) => {
                      const realIndex = formData.rooms.findIndex(r => r.number === rm.number);
                      return (
                        <div
                          key={rm.number}
                          className={`rounded-xl border p-2.5 space-y-1.5 transition ${getRoomTypeColor(rm.roomTypeCode)}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm text-white">
                              {rm.number}
                            </span>
                            <button
                              onClick={() => handleRemoveRoom(realIndex)}
                              className="text-zinc-500 hover:text-red-400 p-0.5 opacity-60 hover:opacity-100"
                              title="Delete room"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          
                          <select
                            value={rm.roomTypeCode}
                            onChange={e => {
                              const copy = [...formData.rooms];
                              copy[realIndex].roomTypeCode = e.target.value;
                              setFormData({ ...formData, rooms: copy });
                            }}
                            className="w-full h-6 px-1 rounded bg-zinc-950/80 border border-zinc-700/60 text-[10px] text-zinc-200 font-semibold"
                          >
                            {formData.roomTypes.map(rt => (
                              <option key={rt.code} value={rt.code}>{rt.code}</option>
                            ))}
                          </select>

                          <div className="text-[9px] text-zinc-400 font-mono flex items-center justify-between">
                            <span>Floor {rm.floor}</span>
                            <span className="text-[8px] opacity-70">VACANT</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Generator Accordion */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-blue-400" />
                      Bulk Room Generator
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400">Total Floors</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.generator.floors}
                        onChange={e => setFormData({
                          ...formData,
                          generator: { ...formData.generator, floors: Number(e.target.value) }
                        })}
                        className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400">Rooms per Floor</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.generator.roomsPerFloor}
                        onChange={e => setFormData({
                          ...formData,
                          generator: { ...formData.generator, roomsPerFloor: Number(e.target.value) }
                        })}
                        className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400">Default Category</label>
                      <select
                        value={formData.generator.defaultType}
                        onChange={e => setFormData({
                          ...formData,
                          generator: { ...formData.generator, defaultType: e.target.value }
                        })}
                        className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs"
                      >
                        {formData.roomTypes.map(rt => (
                          <option key={rt.code} value={rt.code}>{rt.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleGenerateRooms}
                      className="h-9 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-bold text-xs text-white transition"
                    >
                      Regenerate
                    </button>
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
                    GST Compliance & Financial Series
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Indian GST Rule 46 compliant document numbering and automatic tax rate determination.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                    <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      Active Tax Slabs (Assam - 18)
                    </div>
                    <div className="text-xs text-zinc-400 space-y-2">
                      <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                        <span>Room Rent (Tariff &lt;= ₹7,500)</span>
                        <strong className="text-emerald-400 font-mono">12% (CGST 6% + SGST 6%)</strong>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                        <span>Room Rent (Tariff &gt; ₹7,500)</span>
                        <strong className="text-emerald-400 font-mono">18% (CGST 9% + SGST 9%)</strong>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span>Restaurant & Room Dining</span>
                        <strong className="text-emerald-400 font-mono">5% (CGST 2.5% + SGST 2.5%)</strong>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      Document Series Prefixes
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="text-[10px] text-zinc-400">Invoice Series</label>
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
                        <label className="text-[10px] text-zinc-400">Receipt Series</label>
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
                      <div>
                        <label className="text-[10px] text-zinc-400">Reservation GRC</label>
                        <input
                          type="text"
                          value={formData.documentSequences.reservationPrefix}
                          onChange={e => setFormData({
                            ...formData,
                            documentSequences: { ...formData.documentSequences, reservationPrefix: e.target.value }
                          })}
                          className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400">KOT Prefix</label>
                        <input
                          type="text"
                          value={formData.documentSequences.kotPrefix}
                          onChange={e => setFormData({
                            ...formData,
                            documentSequences: { ...formData.documentSequences, kotPrefix: e.target.value }
                          })}
                          className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Staff & Access Scoping */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="border-b border-zinc-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Lock className="h-5 w-5 text-indigo-400" />
                    Property Access Control & Multi-Tenancy Isolation
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Configure who can access, view, and switch to this property in the Hotel OS navigation.
                  </p>
                </div>

                {/* Strict Access Isolation Banner */}
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Restrict Access Exclusively to Bijesh Singha</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        When enabled, <strong className="text-white">Hotel Divine View</strong> will only be visible to and accessible by user <strong className="text-indigo-300">Bijesh Singha</strong> (Super Admin). 
                        Other front desk operators (e.g., Front Office Suraj) or managers will not see this property in their selector or have permissions to view its stays, folios, or rooms.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={formData.restrictToBijeshOnly}
                        onChange={e => setFormData({ ...formData, restrictToBijeshOnly: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {formData.restrictToBijeshOnly ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                          BS
                        </div>
                        <div>
                          <div className="font-bold text-white">Bijesh Singha</div>
                          <div className="text-[11px] text-zinc-400">bijesh.singha@hotelos.in</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold text-[11px]">
                        ORG_OWNER • Full Property Access
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400">
                      Standard mode: Additional staff user accounts will be created for this property.
                    </div>
                  )}
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
                    Verify all extracted parameters before initializing the property in Hotel OS.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2.5 text-xs">
                    <div className="font-bold text-white uppercase tracking-wider mb-2 border-b border-zinc-800 pb-1 flex items-center justify-between">
                      <span>Property Identity</span>
                      <span className="text-blue-400 font-mono">{formData.code}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-zinc-400">Hotel Name:</span><strong className="text-white">{formData.displayName}</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Legal Entity:</span><strong className="text-white">{formData.legalName}</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">GSTIN:</span><strong className="text-white font-mono">{formData.gstin}</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Address:</span><strong className="text-white">{formData.address}, {formData.city}</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Contact:</span><strong className="text-white font-mono">{formData.phone}</strong></div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2.5 text-xs">
                    <div className="font-bold text-white uppercase tracking-wider mb-2 border-b border-zinc-800 pb-1 flex items-center justify-between">
                      <span>Inventory & Scoping</span>
                      <span className="text-emerald-400 font-mono">{formData.rooms.length} Rooms</span>
                    </div>
                    <div className="flex justify-between"><span className="text-zinc-400">Physical Rooms:</span><strong className="text-emerald-400 font-mono text-sm">{formData.rooms.length} Rooms (Floor 2)</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Room Categories:</span><strong className="text-white font-mono">{formData.roomTypes.length} Types</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Invoice Series:</span><strong className="text-white font-mono">{formData.documentSequences.invoicePrefix}</strong></div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Access Scope:</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 text-[10px]">
                        {formData.restrictToBijeshOnly ? "Bijesh Singha Only" : "Multi-Staff"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-300 flex items-center gap-3">
                  <Database className="h-5 w-5 text-blue-400 shrink-0" />
                  <span>
                    <strong>Zero Remote Database Impact:</strong> All operations are applied exclusively to your local SQLite workspace database (<code className="font-mono text-white">dev.db</code>).
                  </span>
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
                      <span>Provisioning Hotel Divine View...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Launch & Provision Hotel Divine View</span>
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
