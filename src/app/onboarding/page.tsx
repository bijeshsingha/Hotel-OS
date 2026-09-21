"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import { useTheme } from "@/lib/context/theme-context";
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
  SlidersHorizontal,
  Check,
  Sun,
  Moon,
  UploadCloud,
  HardDrive,
  KeyRound,
  FileCheck2,
  Search,
} from "lucide-react";

interface BackupFile {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  type: string;
  isPreRestore?: boolean;
  label?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { switchProperty, refreshData } = useHotel();
  const { theme, toggleTheme } = useTheme();

  // Setup Mode: Preset (Divine View) | Restore (Database Loader) | Custom (Blank Form)
  const [setupMode, setSetupMode] = useState<"preset" | "restore" | "custom">("preset");

  // Form & Wizard Navigation
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [roomFilter, setRoomFilter] = useState<string>("ALL");
  const [floorFilter, setFloorFilter] = useState<number | "ALL">("ALL");

  // Database Loader State
  const [backupsList, setBackupsList] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string>("");
  const [backupSearch, setBackupSearch] = useState<string>("");
  const [restorePassword, setRestorePassword] = useState<string>("admin123");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Fetch available backups when entering Restore mode
  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      const res = await fetch("/api/v1/admin/backups");
      if (res.ok) {
        const data = await res.json();
        const dbBackups = (data.backups || []).filter(
          (b: BackupFile) => b.filename.endsWith(".db") && !b.isPreRestore
        );
        setBackupsList(dbBackups);
        if (dbBackups.length > 0 && !selectedBackup) {
          setSelectedBackup(dbBackups[0].filename);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (setupMode === "restore") {
      fetchBackups();
    }
  }, [setupMode]);

  // Load Preset
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
    setSetupMode("preset");
    setErrorMsg(null);
  };

  // Clear Form for Blank Custom Hotel
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
    setSetupMode("custom");
    setErrorMsg(null);
  };

  // Upload a new database file
  const handleUploadDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".db")) {
      setRestoreMessage({
        type: "error",
        text: "Invalid file type. Please select a valid SQLite database file (.db)."
      });
      return;
    }

    try {
      setIsUploading(true);
      setRestoreMessage(null);
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/v1/admin/backups/upload", {
        method: "POST",
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload database file.");
      }

      await fetchBackups();
      if (data.backup?.filename) {
        setSelectedBackup(data.backup.filename);
      }
      setRestoreMessage({
        type: "success",
        text: `Database "${file.name}" uploaded and validated successfully.`
      });
    } catch (err: any) {
      setRestoreMessage({
        type: "error",
        text: err.message || "Failed to upload database."
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Restore Database Backup
  const handleRestoreDatabase = async () => {
    if (!selectedBackup) {
      setRestoreMessage({ type: "error", text: "Please select a database backup file to restore." });
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreMessage(null);

      const res = await fetch("/api/v1/admin/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedBackup,
          passwordOrPin: restorePassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to restore database.");
      }

      setRestoreMessage({
        type: "success",
        text: `Database restored successfully! Redirecting to PMS...`
      });

      await refreshData();
      setTimeout(() => {
        router.push("/pms");
      }, 1200);
    } catch (err: any) {
      setRestoreMessage({
        type: "error",
        text: err.message || "Database restoration failed. Verify master admin PIN/password."
      });
    } finally {
      setIsRestoring(false);
    }
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

  // Final Submit for new setup
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
    { num: 3, title: "Room Inventory", desc: `${formData.rooms.length} Physical Rooms` },
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
      case "DLX_QUEEN":
      case "DELUXE":
        return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400";
      case "EXEC_KING":
      case "EXECUTIVE":
        return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400";
      case "FAM_2DBL":
      case "FAMILY":
        return "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400";
      case "FAM_KINGSGL":
      case "FAMILY_EXECUTIVE":
        return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400";
      default:
        return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  const filteredBackups = backupsList.filter(b =>
    b.filename.toLowerCase().includes(backupSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-8 transition-colors duration-150">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="h-9 w-9 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-xs">
                <Building2 className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Hotel Onboarding Studio
              </h1>
              <span className="rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 px-2.5 py-0.5 text-xs font-mono font-semibold">
                Multi-Tenancy
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Provision hotel properties with room inventories, GST rate plans, or load an existing SQLite database snapshot.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
              className="flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => router.push("/pms")}
              className="flex items-center gap-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to PMS
            </button>
          </div>
        </header>

        {/* SETUP MODE SELECTOR TABS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Option 1: Divine View Preset */}
          <button
            type="button"
            onClick={handleLoadDivineViewPreset}
            className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
              setupMode === "preset"
                ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-sm ring-1 ring-zinc-900 dark:ring-white"
                : "bg-white/60 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Quick Preset
                </span>
                {setupMode === "preset" && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                )}
              </div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Hotel Divine View</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                75 physical rooms, 8 categories, GST series & verified master preset from DV_Today.bak.
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              <span>75 Rooms</span>
              <span>•</span>
              <span>Assam (18)</span>
              <span>•</span>
              <span>Owner Scoped</span>
            </div>
          </button>

          {/* Option 2: Database Loader (New Feature) */}
          <button
            type="button"
            onClick={() => {
              setSetupMode("restore");
              setSuccessResult(null);
            }}
            className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
              setupMode === "restore"
                ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-sm ring-1 ring-zinc-900 dark:ring-white"
                : "bg-white/60 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <Database className="h-3.5 w-3.5" />
                  Load Existing Database
                </span>
                {setupMode === "restore" && (
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                )}
              </div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Restore Backup Snapshot</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Pick an existing server backup (.db) or upload a new database file to restore hotel data instantly.
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
              <span>Choose Snapshot or Upload</span>
            </div>
          </button>

          {/* Option 3: Custom / Blank Form */}
          <button
            type="button"
            onClick={handleClearForm}
            className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
              setupMode === "custom"
                ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-white shadow-sm ring-1 ring-zinc-900 dark:ring-white"
                : "bg-white/60 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Custom Setup
                </span>
                {setupMode === "custom" && (
                  <span className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-100"></span>
                )}
              </div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Blank Hotel Master</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Start from scratch to configure custom hotel properties, floor inventories, and billing series.
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              <span>Step-by-Step Wizard</span>
            </div>
          </button>
        </div>

        {/* ERROR / SUCCESS ALERTS */}
        {errorMsg && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: DATABASE LOADER / RESTORE WORKFLOW                                */}
        {/* ========================================================================= */}
        {setupMode === "restore" && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Load & Restore Hotel Database
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select an existing database snapshot from the server or upload a new SQLite (.db) file to initialize Hotel OS.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadDatabase}
                  accept=".db"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition"
                >
                  <UploadCloud className="h-4 w-4 text-zinc-500" />
                  <span>{isUploading ? "Uploading & Checking..." : "Upload New Database (.db)"}</span>
                </button>
                <button
                  type="button"
                  onClick={fetchBackups}
                  title="Refresh backups list"
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingBackups ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {restoreMessage && (
              <div
                className={`rounded-xl border p-4 text-xs flex items-center gap-2.5 ${
                  restoreMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
                    : "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                }`}
              >
                {restoreMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                )}
                <span>{restoreMessage.text}</span>
              </div>
            )}

            {/* Backups List & Selection */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Available Database Snapshots ({backupsList.length})
                </label>
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Filter snapshots..."
                    value={backupSearch}
                    onChange={(e) => setBackupSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {loadingBackups ? (
                <div className="p-8 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading snapshots from server...</span>
                </div>
              ) : filteredBackups.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                  No database snapshots found. Click &ldquo;Upload New Database (.db)&rdquo; to add your backup.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {filteredBackups.map((b) => {
                    const isSelected = selectedBackup === b.filename;
                    return (
                      <div
                        key={b.filename}
                        onClick={() => setSelectedBackup(b.filename)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                          isSelected
                            ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 dark:border-blue-500 ring-1 ring-blue-500 shadow-xs"
                            : "bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <HardDrive className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`} />
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-bold text-zinc-900 dark:text-white truncate">
                              {b.filename}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                              <span>{b.sizeFormatted}</span>
                              <span>•</span>
                              <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Restore Confirmation Box */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Super Admin Security Authorization
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    A pre-restore safety snapshot will be taken automatically before replacing the active database.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <KeyRound className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="password"
                      placeholder="Admin PIN or password"
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      className="h-10 pl-8 pr-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isRestoring || !selectedBackup}
                    onClick={handleRestoreDatabase}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-sm disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Restoring Database...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="h-4 w-4" />
                        <span>Restore & Open PMS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Default Master Admin authorization: <code className="font-mono text-zinc-600 dark:text-zinc-400">admin123</code> or <code className="font-mono text-zinc-600 dark:text-zinc-400">hotelos@2026</code>.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: SUCCESS SCREEN                                                    */}
        {/* ========================================================================= */}
        {successResult && (
          <div className="rounded-2xl border border-emerald-300 dark:border-emerald-500/30 bg-white dark:bg-zinc-900 p-8 text-center space-y-6 shadow-sm animate-in zoom-in-95">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Hotel Successfully Onboarded!</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{successResult.propertyName}</span> ({successResult.propertyCode}) is live with {successResult.roomsCreated} rooms and {successResult.roomTypesCreated} room categories.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-xs font-semibold">
                <Lock className="h-3.5 w-3.5" />
                <span>Property scope strictly assigned to Bijesh Singha</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  switchProperty(successResult.propertyId);
                  router.push("/pms");
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>Switch to {successResult.propertyName} & Open PMS</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSuccessResult(null);
                  setCurrentStep(1);
                  handleClearForm();
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-semibold text-sm text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-750"
              >
                Onboard Another Property
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: WIZARD FORM (PRESET OR CUSTOM SETUP)                              */}
        {/* ========================================================================= */}
        {setupMode !== "restore" && !successResult && (
          <div className="space-y-6">

            {/* Step Progress Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {steps.map((s) => {
                const isActive = currentStep === s.num;
                const isDone = currentStep > s.num;

                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setCurrentStep(s.num)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 text-blue-950 dark:text-blue-100 shadow-xs"
                        : isDone
                        ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                        Step 0{s.num}
                      </span>
                      {isDone && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <span className="font-bold text-xs truncate">{s.title}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{s.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Step Card Container */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 space-y-6 shadow-xs">

              {/* STEP 1: Property Identity */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Property Identity & Legal Master
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Official registration details required for GST tax invoices and state legal compliance.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      Step 1 of 6
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Hotel Display Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Hotel Divine View"
                        value={formData.displayName}
                        onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Legal Entity / Firm Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HOTEL DIVINE VIEW"
                        value={formData.legalName}
                        onChange={e => setFormData({ ...formData, legalName: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all uppercase font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Property Short Code * (Unique)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDV-01"
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all uppercase font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                        <span>GSTIN (15 Digits)</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Assam (18)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 18AALFH7867B1Z2"
                        value={formData.gstin}
                        onChange={e => handleGstinChange(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all uppercase font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        State / State Code
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="State Code (18)"
                          value={formData.stateCode}
                          onChange={e => setFormData({ ...formData, stateCode: e.target.value })}
                          className="h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm font-mono"
                        />
                        <input
                          type="text"
                          placeholder="State (Assam)"
                          value={formData.state}
                          onChange={e => setFormData({ ...formData, state: e.target.value })}
                          className="h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Street Address & Area
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Md.Shah Road, Paltan Bazar"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        City / PIN Code
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="City (Guwahati)"
                          value={formData.city}
                          onChange={e => setFormData({ ...formData, city: e.target.value })}
                          className="h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm"
                        />
                        <input
                          type="text"
                          placeholder="PIN (781008)"
                          value={formData.pinCode}
                          onChange={e => setFormData({ ...formData, pinCode: e.target.value })}
                          className="h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Phone Number & Email
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Phone (9706277133)"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          className="h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm font-mono"
                        />
                        <input
                          type="email"
                          placeholder="divineview02@gmail.com"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          className="h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Room Types & Rates */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <BedDouble className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Room Categories & Base Tariffs
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Configured room categories with base occupancy and standard Indian hospitality amenities.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddRoomType}
                      className="flex items-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3.5 py-2 text-xs font-bold transition shadow-xs hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Category</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.roomTypes.map((rt, idx) => (
                      <div key={idx} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getRoomTypeColor(rt.code)}`}>
                              {rt.code}
                            </span>
                            <span className="font-bold text-sm text-zinc-900 dark:text-white">{rt.name}</span>
                          </div>

                          {formData.roomTypes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRoomType(idx)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Base Rate (₹)</label>
                            <input
                              type="number"
                              value={rt.baseRate}
                              onChange={e => {
                                const copy = [...formData.roomTypes];
                                copy[idx].baseRate = Number(e.target.value);
                                setFormData({ ...formData, roomTypes: copy });
                              }}
                              className="w-full h-10 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Extra Adult (₹)</label>
                            <input
                              type="number"
                              value={rt.extraAdultRate}
                              onChange={e => {
                                const copy = [...formData.roomTypes];
                                copy[idx].extraAdultRate = Number(e.target.value);
                                setFormData({ ...formData, roomTypes: copy });
                              }}
                              className="w-full h-10 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Capacity</label>
                            <input
                              type="number"
                              value={rt.capacity}
                              onChange={e => {
                                const copy = [...formData.roomTypes];
                                copy[idx].capacity = Number(e.target.value);
                                setFormData({ ...formData, roomTypes: copy });
                              }}
                              className="w-full h-10 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-mono"
                            />
                          </div>
                        </div>

                        {/* Amenities Pills */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Standard Amenities</label>
                          <div className="flex flex-wrap gap-1.5">
                            {rt.amenities.map((am, aIdx) => (
                              <span key={aIdx} className="text-[10px] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded">
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

              {/* STEP 3: Room Inventory */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Physical Room Inventory ({formData.rooms.length} Rooms)
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formData.rooms.length} physical rooms mapped to inventory categories.
                      </p>
                    </div>

                    {/* Filter chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setRoomFilter("ALL")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          roomFilter === "ALL"
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        All ({formData.rooms.length})
                      </button>
                      {formData.roomTypes.map(rt => (
                        <button
                          key={rt.code}
                          type="button"
                          onClick={() => setRoomFilter(rt.code)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                            roomFilter === rt.code
                              ? "bg-blue-600 text-white"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
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
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        Showing <strong className="text-zinc-900 dark:text-white font-mono">{filteredRooms.length}</strong> of <strong className="text-zinc-900 dark:text-white font-mono">{formData.rooms.length}</strong> rooms:
                      </span>
                      <button
                        type="button"
                        onClick={handleAddRoom}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Room
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 max-h-96 overflow-y-auto pr-1">
                      {filteredRooms.map((rm) => {
                        const realIndex = formData.rooms.findIndex(r => r.number === rm.number);
                        return (
                          <div
                            key={rm.number}
                            className={`rounded-xl border p-2.5 space-y-1.5 transition ${getRoomTypeColor(rm.roomTypeCode)}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                                {rm.number}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveRoom(realIndex)}
                                className="text-zinc-400 hover:text-red-500 p-0.5 opacity-60 hover:opacity-100"
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
                              className="w-full h-6 px-1 rounded bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-[10px] text-zinc-800 dark:text-zinc-200 font-semibold"
                            >
                              {formData.roomTypes.map(rt => (
                                <option key={rt.code} value={rt.code}>{rt.code}</option>
                              ))}
                            </select>

                            <div className="text-[9px] text-zinc-500 dark:text-zinc-400 font-mono flex items-center justify-between">
                              <span>Floor {rm.floor}</span>
                              <span className="text-[8px] opacity-70">VACANT</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bulk Generator */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        Bulk Room Generator
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Total Floors</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={formData.generator.floors}
                          onChange={e => setFormData({
                            ...formData,
                            generator: { ...formData.generator, floors: Number(e.target.value) }
                          })}
                          className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Rooms per Floor</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={formData.generator.roomsPerFloor}
                          onChange={e => setFormData({
                            ...formData,
                            generator: { ...formData.generator, roomsPerFloor: Number(e.target.value) }
                          })}
                          className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Default Category</label>
                        <select
                          value={formData.generator.defaultType}
                          onChange={e => setFormData({
                            ...formData,
                            generator: { ...formData.generator, defaultType: e.target.value }
                          })}
                          className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs"
                        >
                          {formData.roomTypes.map(rt => (
                            <option key={rt.code} value={rt.code}>{rt.name}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateRooms}
                        className="h-9 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs transition"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: GST & Sequences */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      GST Compliance & Financial Series
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Indian GST Rule 46 compliant document numbering and automatic tax rate determination.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 space-y-3">
                      <div className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Active Tax Slabs (Assam - 18)
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                        <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                          <span>Room Rent (Tariff &le; ₹7,500)</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-mono">12% (CGST 6% + SGST 6%)</strong>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800">
                          <span>Room Rent (Tariff &gt; ₹7,500)</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-mono">18% (CGST 9% + SGST 9%)</strong>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span>Restaurant & Room Dining</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-mono">5% (CGST 2.5% + SGST 2.5%)</strong>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 space-y-3">
                      <div className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                        Document Series Prefixes
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div>
                          <label className="text-[10px] text-zinc-500 dark:text-zinc-400">Invoice Series</label>
                          <input
                            type="text"
                            value={formData.documentSequences.invoicePrefix}
                            onChange={e => setFormData({
                              ...formData,
                              documentSequences: { ...formData.documentSequences, invoicePrefix: e.target.value }
                            })}
                            className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 dark:text-zinc-400">Receipt Series</label>
                          <input
                            type="text"
                            value={formData.documentSequences.receiptPrefix}
                            onChange={e => setFormData({
                              ...formData,
                              documentSequences: { ...formData.documentSequences, receiptPrefix: e.target.value }
                            })}
                            className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 dark:text-zinc-400">Reservation GRC</label>
                          <input
                            type="text"
                            value={formData.documentSequences.reservationPrefix}
                            onChange={e => setFormData({
                              ...formData,
                              documentSequences: { ...formData.documentSequences, reservationPrefix: e.target.value }
                            })}
                            className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 dark:text-zinc-400">KOT Prefix</label>
                          <input
                            type="text"
                            value={formData.documentSequences.kotPrefix}
                            onChange={e => setFormData({
                              ...formData,
                              documentSequences: { ...formData.documentSequences, kotPrefix: e.target.value }
                            })}
                            className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs"
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
                  <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      Property Access Control & Multi-Tenancy Isolation
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Configure who can view and switch to this property in Hotel OS.
                    </p>
                  </div>

                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-900 dark:text-white">Restrict Access Exclusively to Bijesh Singha</span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-bold">
                            Recommended
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          When enabled, this hotel property will only be visible to and accessible by user <strong className="text-indigo-600 dark:text-indigo-300">Bijesh Singha</strong> (Super Admin).
                          Other front desk operators will not see this property in their selector.
                        </p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={formData.restrictToBijeshOnly}
                          onChange={e => setFormData({ ...formData, restrictToBijeshOnly: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {formData.restrictToBijeshOnly && (
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/5 p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
                            BS
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-white">Bijesh Singha</div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">bijesh.singha@hotelos.in</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-mono font-bold text-[11px]">
                          ORG_OWNER • Full Property Access
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 6: Review & Final Launch */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      Review Property Master & Final Launch
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Verify parameters before initializing the property in the local SQLite database.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 space-y-2.5 text-xs">
                      <div className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-2 border-b border-zinc-200 dark:border-zinc-800 pb-1 flex items-center justify-between">
                        <span>Property Identity</span>
                        <span className="text-blue-600 dark:text-blue-400 font-mono">{formData.code}</span>
                      </div>
                      <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Hotel Name:</span><strong className="text-zinc-900 dark:text-white">{formData.displayName}</strong></div>
                      <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Legal Entity:</span><strong className="text-zinc-900 dark:text-white">{formData.legalName}</strong></div>
                      <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">GSTIN:</span><strong className="text-zinc-900 dark:text-white font-mono">{formData.gstin}</strong></div>
                      <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Address:</span><strong className="text-zinc-900 dark:text-white">{formData.address}, {formData.city}</strong></div>
                      <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Contact:</span><strong className="text-zinc-900 dark:text-white font-mono">{formData.phone}</strong></div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 space-y-2.5 text-xs">
                      <div className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-2 border-b border-zinc-200 dark:border-zinc-800 pb-1 flex items-center justify-between">
                        <span>Inventory & Scoping</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">{formData.rooms.length} Rooms</span>
                      </div>
                      <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Physical Rooms:</span><strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{formData.rooms.length} Rooms</strong></div>
                      <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Room Categories:</span><strong className="text-zinc-900 dark:text-white font-mono">{formData.roomTypes.length} Types</strong></div>
                      <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Invoice Series:</span><strong className="text-zinc-900 dark:text-white font-mono">{formData.documentSequences.invoicePrefix}</strong></div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 dark:text-zinc-400">Access Scope:</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-500/30 text-[10px]">
                          {formData.restrictToBijeshOnly ? "Bijesh Singha Only" : "Multi-Staff"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>
                ) : <div />}

                {currentStep < 6 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-sm"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleOnboardSubmit}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white transition shadow-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Provisioning Hotel Property...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Launch & Provision Property</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
