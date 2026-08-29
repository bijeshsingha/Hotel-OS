"use client";

import React, { useState, useEffect } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import {
  Shield,
  Lock,
  Unlock,
  KeyRound,
  Building2,
  FileText,
  DollarSign,
  BedDouble,
  Briefcase,
  Users,
  Search,
  Save,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  MapPin,
  Phone,
  Mail,
  Receipt,
  Plus,
  X,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronRight,
  Database,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { CompanyItem } from "@/components/pms/company-selector";
import initialCompaniesJson from "@/data/initial-companies.json";

export default function AdminPortalPage() {
  const { activeProperty, refreshData, refreshKey } = useHotel();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "HOTEL" | "GRC" | "RATES" | "ROOMS" | "COMPANIES" | "SECURITY"
  >("HOTEL");

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Check existing session
  useEffect(() => {
    const token = sessionStorage.getItem("hotelos_admin_token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch("/api/v1/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid credentials");

      sessionStorage.setItem("hotelos_admin_token", data.token);
      setIsAuthenticated(true);
      showToast("Master Admin unlocked successfully!");
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate as Admin.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("hotelos_admin_token");
    setIsAuthenticated(false);
    setPassword("");
    showToast("Master Admin session locked.", "error");
  };

  // ----------------------------------------------------
  // TAB 1: HOTEL & PROPERTY DETAILS
  // ----------------------------------------------------
  const [hotelForm, setHotelForm] = useState({
    id: "",
    displayName: "",
    legalName: "",
    code: "",
    gstin: "",
    stateCode: "18",
    address: "",
    phone: "",
    email: "",
    checkinTime: "14:00",
    checkoutTime: "11:00",
    auditCutoff: "03:00",
    businessDate: "",
    currency: "INR",
    orgLegalName: "",
    orgPan: "",
  });
  const [hotelLoading, setHotelLoading] = useState(false);
  const [hotelSaving, setHotelSaving] = useState(false);

  const fetchHotelDetails = async () => {
    setHotelLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/hotel?propertyId=${activeProperty?.id || ""}`);
      if (res.ok) {
        const data = await res.json();
        setHotelForm({
          id: data.id || "",
          displayName: data.displayName || "",
          legalName: data.legalName || "",
          code: data.code || "",
          gstin: data.gstin || "",
          stateCode: data.stateCode || "18",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          checkinTime: data.checkinTime || "14:00",
          checkoutTime: data.checkoutTime || "11:00",
          auditCutoff: data.auditCutoff || "03:00",
          businessDate: data.businessDate || new Date().toISOString().split("T")[0],
          currency: data.currency || "INR",
          orgLegalName: data.organization?.legalName || "",
          orgPan: data.organization?.pan || "",
        });
      }
    } catch (e) {
      console.error("Failed to load hotel details:", e);
    } finally {
      setHotelLoading(false);
    }
  };

  const saveHotelDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setHotelSaving(true);
    try {
      const res = await fetch("/api/v1/admin/hotel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hotelForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save hotel details");
      showToast("Hotel & Property master details updated successfully!");
      refreshData();
    } catch (err: any) {
      showToast(err.message || "Failed to save changes", "error");
    } finally {
      setHotelSaving(false);
    }
  };

  // ----------------------------------------------------
  // TAB 2: GRC REGISTRATIONS
  // ----------------------------------------------------
  const [grcList, setGrcList] = useState<any[]>([]);
  const [grcSearch, setGrcSearch] = useState("");
  const [grcLoading, setGrcLoading] = useState(false);
  const [editingGrc, setEditingGrc] = useState<any | null>(null);
  const [grcSaving, setGrcSaving] = useState(false);
  const [grcViewMode, setGrcViewMode] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [selectedArchiveSnapshot, setSelectedArchiveSnapshot] = useState<any | null>(null);

  const fetchGrcList = async () => {
    setGrcLoading(true);
    try {
      const isArchived = grcViewMode === "ARCHIVED";
      const res = await fetch(
        `/api/v1/admin/grc?propertyId=${activeProperty?.id || ""}&query=${encodeURIComponent(grcSearch)}&archived=${isArchived}`
      );
      if (res.ok) {
        const data = await res.json();
        setGrcList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("GRC fetch error:", e);
    } finally {
      setGrcLoading(false);
    }
  };

  const saveGrcEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrc) return;
    setGrcSaving(true);
    try {
      const res = await fetch("/api/v1/admin/grc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingGrc),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update GRC");
      showToast(`GRC ${editingGrc.registrationNo} updated & synchronized everywhere!`);
      setEditingGrc(null);
      fetchGrcList();
      refreshData();
    } catch (err: any) {
      showToast(err.message || "Failed to save GRC", "error");
    } finally {
      setGrcSaving(false);
    }
  };

  const deleteGrc = async (id: string, regNo: string) => {
    if (!confirm(`Delete active GRC ${regNo}? A permanent backup copy will be automatically preserved in /prisma/backups/grc_archives.`)) return;
    try {
      const res = await fetch(`/api/v1/admin/grc?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete GRC");
      showToast(`GRC ${regNo} deleted from active list & preserved in backup archive.`);
      fetchGrcList();
      refreshData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete", "error");
    }
  };

  // ----------------------------------------------------
  // TAB 3: ROOM RATES & TARIFFS
  // ----------------------------------------------------
  const [ratesList, setRatesList] = useState<any[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesSavingId, setRatesSavingId] = useState<string | null>(null);

  const fetchRates = async () => {
    setRatesLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/rates?propertyId=${activeProperty?.id || ""}`);
      if (res.ok) {
        const data = await res.json();
        setRatesList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Rates fetch error:", e);
    } finally {
      setRatesLoading(false);
    }
  };

  const updateRate = async (rt: any) => {
    setRatesSavingId(rt.id);
    try {
      const res = await fetch("/api/v1/admin/rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId: rt.id,
          name: rt.name,
          basePrice: Number(rt.basePrice) || 3200,
          extraAdult: Number(rt.extraAdult) || 500,
          extraChild: Number(rt.extraChild) || 0,
          capacity: Number(rt.capacity) || 2,
          bedType: rt.bedType || "King",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update rate");
      showToast(`Tariff updated for ${rt.name}: ₹${rt.basePrice}/night`);
      fetchRates();
    } catch (err: any) {
      showToast(err.message || "Failed to save rate", "error");
    } finally {
      setRatesSavingId(null);
    }
  };

  // ----------------------------------------------------
  // TAB 4: ROOMS & INVENTORY MASTER
  // ----------------------------------------------------
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [roomSaving, setRoomSaving] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    number: "",
    floor: 1,
    wing: "DELUXE",
    roomTypeId: "",
    name: "",
  });

  const fetchRooms = async () => {
    setRoomsLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/rooms?propertyId=${activeProperty?.id || ""}`);
      if (res.ok) {
        const data = await res.json();
        setRoomsList(data.rooms || []);
        setRoomTypes(data.roomTypes || []);
        if (data.roomTypes?.length > 0 && !newRoomForm.roomTypeId) {
          setNewRoomForm((p) => ({ ...p, roomTypeId: data.roomTypes[0].id }));
        }
      }
    } catch (e) {
      console.error("Rooms fetch error:", e);
    } finally {
      setRoomsLoading(false);
    }
  };

  const saveRoomEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    setRoomSaving(true);
    try {
      const res = await fetch("/api/v1/admin/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRoom),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update room");
      showToast(`Room ${editingRoom.number} updated successfully!`);
      setEditingRoom(null);
      fetchRooms();
    } catch (err: any) {
      showToast(err.message || "Failed to save room", "error");
    } finally {
      setRoomSaving(false);
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRoomForm,
          propertyId: activeProperty?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create room");
      showToast(`Room ${newRoomForm.number} created successfully!`);
      setShowAddRoomModal(false);
      setNewRoomForm({ number: "", floor: 1, wing: "DELUXE", roomTypeId: roomTypes[0]?.id || "", name: "" });
      fetchRooms();
    } catch (err: any) {
      showToast(err.message || "Failed to create room", "error");
    }
  };

  // Initial tab loading
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === "HOTEL") fetchHotelDetails();
    if (activeTab === "GRC") fetchGrcList();
    if (activeTab === "RATES") fetchRates();
    if (activeTab === "ROOMS") fetchRooms();
  }, [isAuthenticated, activeTab, activeProperty?.id, refreshKey]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== "GRC") return;
    const timer = setTimeout(() => {
      fetchGrcList();
    }, 200);
    return () => clearTimeout(timer);
  }, [grcSearch]);

  // ====================================================
  // SCREEN 1: LOCKED AUTHENTICATION GATE
  // ====================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-700 to-zinc-900 text-white flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/30">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
              Master Admin Portal
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Administrative credentials required to edit hotel database, GRC details, rates, and inventory.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Admin Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono font-bold focus:border-indigo-600 focus:outline-none"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3.5 pr-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono font-bold focus:border-indigo-600 focus:outline-none"
                  placeholder="Enter admin password..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 font-mono space-y-1">
              <div className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                <span>Default Admin Login:</span>
              </div>
              <div>Username: <strong className="text-zinc-900 dark:text-white">admin</strong></div>
              <div>Password: <strong className="text-zinc-900 dark:text-white">admin@hotelos2026</strong></div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>Unlock Master Admin</span>
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    );
  }

  // ====================================================
  // SCREEN 2: AUTHENTICATED MASTER ADMIN PORTAL
  // ====================================================
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto w-full text-zinc-900 dark:text-zinc-100 pb-16">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white shadow-emerald-600/30"
              : "bg-rose-600 text-white shadow-rose-600/30"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. TOP EXECUTIVE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-700 to-zinc-900 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                Master Database & Admin Suite
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live DB Connected (SQLite)
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
              Administrative editor for Hotel details, GRC guest records, room rates & tariffs, inventory, and system master data.
            </p>
          </div>
        </div>

        {/* Lock / Logout Button */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <button
            type="button"
            onClick={handleLogout}
            className="h-10 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <Lock className="h-4 w-4 text-zinc-500" />
            <span>Lock Admin</span>
          </button>
        </div>
      </div>

      {/* 2. ADMIN NAVIGATION TABS */}
      <div className="p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-1 overflow-x-auto shadow-xs text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("HOTEL")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "HOTEL"
              ? "bg-white dark:bg-[#18181b] text-indigo-600 dark:text-indigo-400 shadow-sm font-black border border-zinc-200/60 dark:border-zinc-700"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>1. Hotel & Property Master</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("GRC")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "GRC"
              ? "bg-white dark:bg-[#18181b] text-indigo-600 dark:text-indigo-400 shadow-sm font-black border border-zinc-200/60 dark:border-zinc-700"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>2. GRC & Registrations Editor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("RATES")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "RATES"
              ? "bg-white dark:bg-[#18181b] text-indigo-600 dark:text-indigo-400 shadow-sm font-black border border-zinc-200/60 dark:border-zinc-700"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>3. Room Rates & Tariffs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ROOMS")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "ROOMS"
              ? "bg-white dark:bg-[#18181b] text-indigo-600 dark:text-indigo-400 shadow-sm font-black border border-zinc-200/60 dark:border-zinc-700"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <BedDouble className="h-4 w-4" />
          <span>4. Rooms & Bedding Inventory</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SECURITY")}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === "SECURITY"
              ? "bg-white dark:bg-[#18181b] text-indigo-600 dark:text-indigo-400 shadow-sm font-black border border-zinc-200/60 dark:border-zinc-700"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>5. Admin Security & PIN</span>
        </button>
      </div>

      {/* ====================================================
          TAB CONTENT 1: HOTEL DETAILS
      ==================================================== */}
      {activeTab === "HOTEL" && (
        <div className="bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <span>Hotel & Property Master Configuration</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Official property identity, legal entity name, GSTIN Rule 46 data, and business cycle defaults.
              </p>
            </div>
          </div>

          {hotelLoading ? (
            <div className="py-12 text-center font-mono text-xs text-zinc-400 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading hotel configuration...</span>
            </div>
          ) : (
            <form onSubmit={saveHotelDetails} className="space-y-6">
              
              {/* Row 1: Names & Codes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Display / Marketing Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={hotelForm.displayName}
                    onChange={(e) => setHotelForm({ ...hotelForm, displayName: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                    placeholder="e.g. Hotel Ambarish Grand Residency"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Legal / Invoicing Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={hotelForm.legalName}
                    onChange={(e) => setHotelForm({ ...hotelForm, legalName: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                    placeholder="e.g. AMBARISH RESIDENCY"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Property Short Code
                  </label>
                  <input
                    type="text"
                    value={hotelForm.code}
                    onChange={(e) => setHotelForm({ ...hotelForm, code: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                    placeholder="GUW-01"
                  />
                </div>
              </div>

              {/* Row 2: Tax & Legal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Hotel GSTIN Number (15-Digit) *
                  </label>
                  <input
                    type="text"
                    required
                    value={hotelForm.gstin}
                    onChange={(e) => setHotelForm({ ...hotelForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-black text-indigo-700 dark:text-indigo-400 focus:border-indigo-600 focus:outline-none"
                    placeholder="18AACCB2447F1ZX"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    State Code (GST) *
                  </label>
                  <input
                    type="text"
                    required
                    value={hotelForm.stateCode}
                    onChange={(e) => setHotelForm({ ...hotelForm, stateCode: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                    placeholder="18 (Assam)"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Organization PAN
                  </label>
                  <input
                    type="text"
                    value={hotelForm.orgPan}
                    onChange={(e) => setHotelForm({ ...hotelForm, orgPan: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                    placeholder="AACCB2447F"
                  />
                </div>
              </div>

              {/* Row 3: Contact & Address */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Official Contact Phone
                  </label>
                  <input
                    type="text"
                    value={hotelForm.phone}
                    onChange={(e) => setHotelForm({ ...hotelForm, phone: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                    placeholder="+91 361 254 0001"
                  />
                </div>

                <div className="space-y-1 md:col-span-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={hotelForm.email}
                    onChange={(e) => setHotelForm({ ...hotelForm, email: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                    placeholder="reservations@hotelambarish.com"
                  />
                </div>

                <div className="space-y-1 md:col-span-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Full Address (Prints on Tax Invoices)
                  </label>
                  <input
                    type="text"
                    value={hotelForm.address}
                    onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                    placeholder="Paltan Bazaar, Station Road, Guwahati - 781008, Assam"
                  />
                </div>
              </div>

              {/* Row 4: Operational Business Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Active Business Date
                  </label>
                  <input
                    type="date"
                    value={hotelForm.businessDate}
                    onChange={(e) => setHotelForm({ ...hotelForm, businessDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Default Check-In Time
                  </label>
                  <input
                    type="time"
                    value={hotelForm.checkinTime}
                    onChange={(e) => setHotelForm({ ...hotelForm, checkinTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Default Checkout Time
                  </label>
                  <input
                    type="time"
                    value={hotelForm.checkoutTime}
                    onChange={(e) => setHotelForm({ ...hotelForm, checkoutTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Night Audit Cutoff
                  </label>
                  <input
                    type="time"
                    value={hotelForm.auditCutoff}
                    onChange={(e) => setHotelForm({ ...hotelForm, auditCutoff: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Action */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={hotelSaving}
                  className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-2 transition shadow-lg shadow-indigo-600/30 active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {hotelSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Hotel Master Changes</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      )}

      {/* ====================================================
          TAB CONTENT 2: GRC & REGISTRATIONS EDITOR
      ==================================================== */}
      {activeTab === "GRC" && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <span>GRC & Guest Registration Records Editor</span>
                </h2>
                <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1 border border-zinc-200 dark:border-zinc-700 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => { setGrcViewMode("ACTIVE"); }}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      grcViewMode === "ACTIVE"
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    📋 Live Active GRCs
                  </button>
                  <button
                    type="button"
                    onClick={() => { setGrcViewMode("ARCHIVED"); }}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      grcViewMode === "ARCHIVED"
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <Database className="h-3 w-3 text-emerald-500" />
                    <span>Permanent Backup Archive</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                {grcViewMode === "ACTIVE"
                  ? "Live operational records. Edits automatically synchronize across Guest CRM, Stays, and Folios."
                  : "Immutable historical backups preserved in /prisma/backups/grc_archives. Deleted GRCs remain permanently safe here."}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search GRC No, Name, Mobile, Room..."
                value={grcSearch}
                onChange={(e) => setGrcSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          {/* GRC Table */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#111114] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 uppercase font-mono text-[10px] border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-3 px-4 font-bold">GRC No.</th>
                    <th className="py-3 px-3 font-bold">Primary Guest</th>
                    <th className="py-3 px-3 font-bold">Room & Dates</th>
                    <th className="py-3 px-3 font-bold">Agreed Rent & Deposit</th>
                    <th className="py-3 px-3 font-bold">Contact & ID</th>
                    <th className="py-3 px-3 font-bold">City / Address</th>
                    <th className="py-3 px-3 font-bold">{grcViewMode === "ARCHIVED" ? "Backup Action" : "Status"}</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {grcLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-400 font-mono">
                        Loading {grcViewMode === "ARCHIVED" ? "archive backup records" : "GRC records"}...
                      </td>
                    </tr>
                  ) : grcList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-400 font-mono">
                        No {grcViewMode === "ARCHIVED" ? "archived backup" : "GRC"} records found.
                      </td>
                    </tr>
                  ) : (
                    grcList.map((g) => {
                      const data = grcViewMode === "ARCHIVED" ? (g.fullRecord || g) : g;
                      const isArchivedMode = grcViewMode === "ARCHIVED";

                      return (
                        <tr key={data.id || data.registrationNo || Math.random()} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition">
                          <td className="py-3 px-4 font-mono font-black text-indigo-700 dark:text-indigo-400">
                            {data.registrationNo}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-zinc-900 dark:text-white">
                              {data.fullName}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {data.gender || "Male"} • Age: {data.age || "—"} • {data.nationality || "Indian"}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px]">
                            <div className="font-bold text-zinc-800 dark:text-zinc-200">
                              Room {data.preAssignedRoom || "—"}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              In: {data.arrivalDateTime?.slice(0, 16) || "—"} | Out: {data.expectedDepartureDate || "—"}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px]">
                            <div className="font-bold text-zinc-900 dark:text-white">
                              {data.agreedRoomTariff === 0 ? (
                                <span className="text-emerald-600 font-bold">🎁 Complimentary (₹0)</span>
                              ) : (
                                `₹${(data.agreedRoomTariff ?? 3200).toLocaleString()}/nt`
                              )}
                            </div>
                            <div className="text-[10px]">
                              {Number(data.depositAmount || 0) > 0 ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                  Adv: ₹{Number(data.depositAmount).toLocaleString()} ({data.advancePaymentMethod || "UPI"})
                                </span>
                              ) : (
                                <span className="text-zinc-400">No Advance Paid</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px]">
                            <div>{data.mobilePhone}</div>
                            <div className="text-[10px] text-zinc-400">
                              {data.idDocumentType || "ID"}: {data.idDocumentNumber || "—"}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[11px]">
                            <div className="font-bold">{data.city || "Guwahati"}</div>
                            <div className="text-[10px] text-zinc-400 truncate max-w-[150px]">
                              {data.streetAddress || "—"}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {isArchivedMode ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  g.latestAction === "DELETED"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                }`}
                              >
                                {g.latestAction || "ARCHIVED"}
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  data.status === "CHECKED_IN"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                }`}
                              >
                                {data.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                            {isArchivedMode ? (
                              <button
                                type="button"
                                onClick={() => setSelectedArchiveSnapshot(data)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-emerald-950/60 dark:hover:bg-emerald-600 dark:text-emerald-300 font-bold text-[11px] transition cursor-pointer inline-flex items-center gap-1"
                                title="View permanent backup snapshot"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Inspect Backup</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingGrc(data)}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 transition cursor-pointer"
                                  title="Edit GRC record & synchronize everywhere"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteGrc(data.id, data.registrationNo)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white dark:bg-rose-950/60 dark:hover:bg-rose-600 dark:text-rose-300 transition cursor-pointer"
                                  title="Delete active GRC (preserved in archive)"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* COMPREHENSIVE CHECK-IN GRC EDIT WINDOW */}
          {editingGrc && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
              <div className="w-full max-w-4xl bg-zinc-50 dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Modal Top Bar */}
                <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-[#121215] shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                          Guest Registration Card (GRC) Editor
                        </h3>
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono font-black text-xs">
                          {editingGrc.registrationNo}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold ${
                          editingGrc.status === "CHECKED_IN"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}>
                          {editingGrc.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Statutory Form C / GRC Intake • All changes automatically synchronize across Guest CRM, PMS Stays & Billing Folios.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingGrc(null)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* GRC Form Body */}
                <form onSubmit={saveGrcEdit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                  
                  {/* Property Header Preview Card */}
                  <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 space-y-2 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-base font-extrabold text-zinc-900 dark:text-white">
                        {hotelForm.displayName || activeProperty?.displayName || "Hotel Ambarish Grand Residency"}
                      </h4>
                      <span className="text-[11px] font-mono font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                        GSTIN: {hotelForm.gstin || "18AACCB2447F1ZX"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      {hotelForm.address || "Station Road, Paltan Bazaar, Guwahati - 781008, Assam"}
                    </p>
                  </div>

                  {/* Section 01: Primary Guest Details */}
                  <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                        01
                      </span>
                      <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        Primary Guest Information
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          Full Name (Block Letters) *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingGrc.fullName || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, fullName: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold uppercase tracking-wide focus:border-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          Mobile Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={editingGrc.mobilePhone || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, mobilePhone: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          Arrival Date & Time
                        </label>
                        <input
                          type="text"
                          value={editingGrc.arrivalDateTime || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, arrivalDateTime: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold focus:border-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          Expected Departure Date
                        </label>
                        <input
                          type="date"
                          value={editingGrc.expectedDepartureDate || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, expectedDepartureDate: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold focus:border-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          Allocated Room Number
                        </label>
                        <input
                          type="text"
                          value={editingGrc.preAssignedRoom || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, preAssignedRoom: e.target.value.trim() })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold focus:border-indigo-600 focus:outline-none"
                          placeholder="e.g. 305"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Age</label>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={editingGrc.age || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, age: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold focus:border-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Gender</label>
                        <select
                          value={editingGrc.gender || "Male"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, gender: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Nationality</label>
                        <input
                          type="text"
                          value={editingGrc.nationality || "Indian"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, nationality: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Father / Spouse Name</label>
                        <input
                          type="text"
                          value={editingGrc.fatherSpouseName || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, fatherSpouseName: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs uppercase focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 02: Financial & Agreed Billing Terms */}
                  <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono">
                          02
                        </span>
                        <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                          Agreed Room Rent & Advance Payment Terms
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400">
                        GST 5% Inclusive Calculation
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* 1. Agreed Room Tariff */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          Agreed Room Rent (₹ / Night) *
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 font-mono font-bold text-zinc-400 text-xs">₹</span>
                          <input
                            type="number"
                            required
                            min={0}
                            step={1}
                            value={editingGrc.agreedRoomTariff !== undefined ? editingGrc.agreedRoomTariff : 3200}
                            onChange={(e) => setEditingGrc({ ...editingGrc, agreedRoomTariff: Number(e.target.value) })}
                            className="w-full h-10 pl-7 pr-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold focus:border-indigo-600 focus:outline-none"
                            placeholder="3200"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {editingGrc.agreedRoomTariff === 0 ? "Complimentary stay (₹0)" : "Daily room charge for 24h cycle"}
                        </p>
                      </div>

                      {/* 2. Advance / Deposit Paid */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          Advance Paid (₹)
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 font-mono font-bold text-zinc-400 text-xs">₹</span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={editingGrc.depositAmount !== undefined ? editingGrc.depositAmount : 0}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setEditingGrc({
                                ...editingGrc,
                                depositAmount: val,
                                advancePaymentMethod: val > 0 ? (editingGrc.advancePaymentMethod || "UPI") : "",
                              });
                            }}
                            className="w-full h-10 pl-7 pr-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold focus:border-indigo-600 focus:outline-none"
                            placeholder="0"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {Number(editingGrc.depositAmount || 0) > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Advance paid: ₹{editingGrc.depositAmount}</span>
                          ) : (
                            "Set 0 if no advance deposit was collected"
                          )}
                        </p>
                      </div>

                      {/* 3. Mode of Payment (Conditional) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                            Mode of Payment {Number(editingGrc.depositAmount || 0) > 0 ? <span className="text-rose-500">*</span> : ""}
                          </label>
                          {Number(editingGrc.depositAmount || 0) > 0 ? (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold uppercase">
                              Required
                            </span>
                          ) : (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 font-mono font-semibold">
                              Disabled
                            </span>
                          )}
                        </div>

                        <select
                          disabled={Number(editingGrc.depositAmount || 0) <= 0}
                          required={Number(editingGrc.depositAmount || 0) > 0}
                          value={Number(editingGrc.depositAmount || 0) > 0 ? (editingGrc.advancePaymentMethod || "UPI") : ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, advancePaymentMethod: e.target.value })}
                          className={`w-full h-10 px-3.5 rounded-xl border text-xs font-bold transition focus:outline-none ${
                            Number(editingGrc.depositAmount || 0) <= 0
                              ? "bg-zinc-100 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed select-none"
                              : "bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:border-indigo-600 cursor-pointer shadow-xs"
                          }`}
                        >
                          {Number(editingGrc.depositAmount || 0) <= 0 ? (
                            <option value="">No Advance (Payment Mode Disabled)</option>
                          ) : (
                            <>
                              <option value="UPI">UPI / QR (GPay / PhonePe / Paytm)</option>
                              <option value="CASH">Cash at Reception Desk</option>
                              <option value="CARD">Debit / Credit Card POS Machine</option>
                              <option value="DIRECT_BILL">Bill to Company (BTC Direct Bill)</option>
                              <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                              <option value="ONLINE">Online Portal / Pre-paid OTA</option>
                            </>
                          )}
                        </select>

                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {Number(editingGrc.depositAmount || 0) <= 0 ? (
                            "🔒 Disabled when Advance Paid is ₹0"
                          ) : (
                            "Mandatory for recording receipt on folio"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 03: Residential Address */}
                  <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                        03
                      </span>
                      <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        Residential Address & Jurisdiction
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          Street Address / House No.
                        </label>
                        <input
                          type="text"
                          value={editingGrc.streetAddress || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, streetAddress: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs focus:border-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          City / District *
                        </label>
                        <input
                          type="text"
                          value={editingGrc.city || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, city: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold uppercase focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">State</label>
                        <input
                          type="text"
                          value={editingGrc.state || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, state: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs uppercase focus:border-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">PIN / Zip Code</label>
                        <input
                          type="text"
                          value={editingGrc.pinZipCode || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, pinZipCode: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono focus:border-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Country</label>
                        <input
                          type="text"
                          value={editingGrc.country || "India"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, country: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 04: Travel & Purpose Details */}
                  <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                        04
                      </span>
                      <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        Travel & Purpose of Visit
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Arrived From</label>
                        <input
                          type="text"
                          value={editingGrc.arrivedFrom || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, arrivedFrom: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs uppercase focus:border-indigo-600 focus:outline-none"
                          placeholder="e.g. KOLKATA"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Going To / Destination</label>
                        <input
                          type="text"
                          value={editingGrc.goingTo || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, goingTo: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs uppercase focus:border-indigo-600 focus:outline-none"
                          placeholder="e.g. SHILLONG"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Purpose of Visit</label>
                        <select
                          value={editingGrc.purposeOfVisit || "Tourism / Holiday"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, purposeOfVisit: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                        >
                          <option value="Tourism / Holiday">Tourism / Holiday</option>
                          <option value="Business / Work">Business / Work</option>
                          <option value="Medical / Health">Medical / Health</option>
                          <option value="Transit">Transit</option>
                          <option value="Official / Govt">Official / Govt</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Booking / Referral Channel</label>
                        <input
                          type="text"
                          value={editingGrc.referralChannel || "Direct / Walk-In"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, referralChannel: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs focus:border-indigo-600 focus:outline-none"
                          placeholder="e.g. MakeMyTrip, Agoda, Corporate"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 05: Contact & Vehicle Details */}
                  <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                        05
                      </span>
                      <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        Contact & Vehicle Information
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Email Address</label>
                        <input
                          type="email"
                          value={editingGrc.email || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, email: e.target.value.toLowerCase() })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono focus:border-indigo-600 focus:outline-none"
                          placeholder="guest@example.com"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Alternate Phone</label>
                        <input
                          type="tel"
                          value={editingGrc.alternatePhone || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, alternatePhone: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Driver Name</label>
                        <input
                          type="text"
                          value={editingGrc.driverName || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, driverName: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs uppercase focus:border-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Vehicle Number</label>
                        <input
                          type="text"
                          value={editingGrc.vehicleNumber || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, vehicleNumber: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold uppercase focus:border-indigo-600 focus:outline-none"
                          placeholder="e.g. AS-01-AB-1234"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 06: Government ID Document */}
                  <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                        06
                      </span>
                      <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        Government Photo ID & Verification
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          ID Document Type *
                        </label>
                        <select
                          value={editingGrc.idDocumentType || "AADHAAR"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, idDocumentType: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                        >
                          <option value="AADHAAR">Aadhaar Card (UIDAI)</option>
                          <option value="PASSPORT">Indian / Foreign Passport</option>
                          <option value="DRIVING_LICENSE">Driving License (State RTO)</option>
                          <option value="VOTER_ID">Voter Election ID Card</option>
                          <option value="PAN_CARD">Income Tax PAN Card</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          ID Document Number *
                        </label>
                        <input
                          type="text"
                          value={editingGrc.idDocumentNumber || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, idDocumentNumber: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold uppercase focus:border-indigo-600 focus:outline-none"
                          placeholder="e.g. 1234 5678 9012"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 07: Digital Signature & GRC Status */}
                  <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                        07
                      </span>
                      <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        Digital Signature & Operational Status
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          Registration Operational Status
                        </label>
                        <select
                          value={editingGrc.status || "CHECKED_IN"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, status: e.target.value })}
                          className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                        >
                          <option value="CHECKED_IN">CHECKED_IN (In-House / Active Stay)</option>
                          <option value="PENDING_REVIEW">PENDING_REVIEW (Digital Kiosk Submission)</option>
                          <option value="REJECTED">REJECTED (Cancelled / Voided)</option>
                        </select>
                      </div>

                      {editingGrc.signatureDataUrl && (
                        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-zinc-400 block">Digital Signature On File</span>
                          <img
                            src={editingGrc.signatureDataUrl}
                            alt="Guest Signature"
                            className="h-12 border border-zinc-200 dark:border-zinc-700 bg-white rounded p-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setEditingGrc(null)}
                      className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition cursor-pointer"
                    >
                      Cancel / Discard
                    </button>
                    <button
                      type="submit"
                      disabled={grcSaving}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {grcSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Synchronizing Across Database...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save GRC Changes & Synchronize Everywhere</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>

              </div>
            </div>
          )}

          {/* Archived GRC Backup Snapshot Modal */}
          {selectedArchiveSnapshot && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                        Permanent GRC Archive Snapshot: {selectedArchiveSnapshot.registrationNo}
                      </h3>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                        Protected Statutory Backup • Preserved in /prisma/backups/grc_archives
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedArchiveSnapshot(null)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block">Guest Full Name</span>
                      <strong className="text-zinc-900 dark:text-white text-sm">{selectedArchiveSnapshot.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block">Mobile Phone</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{selectedArchiveSnapshot.mobilePhone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block">Room Number</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">Room {selectedArchiveSnapshot.preAssignedRoom || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block">Age / Gender</span>
                      <span>{selectedArchiveSnapshot.age || "—"} yrs • {selectedArchiveSnapshot.gender || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block">ID Document</span>
                      <span className="font-mono font-bold">{selectedArchiveSnapshot.idDocumentType}: {selectedArchiveSnapshot.idDocumentNumber || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block">Nationality</span>
                      <span>{selectedArchiveSnapshot.nationality || "Indian"}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 block">Address & Police Jurisdiction</span>
                    <div className="font-medium text-zinc-800 dark:text-zinc-200">
                      {selectedArchiveSnapshot.streetAddress || "—"}, {selectedArchiveSnapshot.city || "—"}, {selectedArchiveSnapshot.state || "—"} - {selectedArchiveSnapshot.pinZipCode || "—"}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      Arrived From: {selectedArchiveSnapshot.arrivedFrom || "—"} → Going To: {selectedArchiveSnapshot.goingTo || "—"}
                    </div>
                  </div>

                  {selectedArchiveSnapshot.signatureDataUrl && (
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block">Guest Digital Signature</span>
                      <img
                        src={selectedArchiveSnapshot.signatureDataUrl}
                        alt="Guest Digital Signature"
                        className="h-16 border border-zinc-200 dark:border-zinc-700 bg-white rounded-lg p-1"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedArchiveSnapshot(null)}
                      className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs cursor-pointer"
                    >
                      Close Snapshot
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================
          TAB CONTENT 3: ROOM RATES & TARIFFS
      ==================================================== */}
      {activeTab === "RATES" && (
        <div className="bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              <span>Room Category Tariffs & Pricing Master</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Set the base tariff rate, extra adult charges, and max occupancy for each room type.
            </p>
          </div>

          {ratesLoading ? (
            <div className="py-12 text-center text-zinc-400 font-mono text-xs">
              Loading room rates...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ratesList.map((rt) => (
                  <div
                    key={rt.id}
                    className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#18181b] space-y-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                      <div>
                        <div className="font-extrabold text-sm text-zinc-900 dark:text-white">
                          {rt.name}
                        </div>
                        <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          Code: {rt.code} • {rt.roomCount} Rooms Assigned
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono font-bold text-[10.5px]">
                        {rt.bedType}
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                          Base Tariff per Night (₹) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 font-mono font-bold text-indigo-600 text-xs">₹</span>
                          <input
                            type="number"
                            value={rt.basePrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRatesList((prev) =>
                                prev.map((item) => (item.id === rt.id ? { ...item, basePrice: val } : item))
                              );
                            }}
                            className="w-full h-9 pl-7 pr-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono font-black text-xs text-zinc-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[10.5px] font-bold text-zinc-600 dark:text-zinc-400">
                            Extra Bed / Pax (₹)
                          </label>
                          <input
                            type="number"
                            value={rt.extraAdult}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRatesList((prev) =>
                                prev.map((item) => (item.id === rt.id ? { ...item, extraAdult: val } : item))
                              );
                            }}
                            className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10.5px] font-bold text-zinc-600 dark:text-zinc-400">
                            Max Capacity
                          </label>
                          <input
                            type="number"
                            value={rt.capacity}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRatesList((prev) =>
                                prev.map((item) => (item.id === rt.id ? { ...item, capacity: val } : item))
                              );
                            }}
                            className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-400 font-mono truncate">
                        Rooms: {rt.roomNumbers || "None"}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={ratesSavingId === rt.id}
                      onClick={() => updateRate(rt)}
                      className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {ratesSavingId === rt.id ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>Update Tariff</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================
          TAB CONTENT 4: ROOMS & BEDDING INVENTORY
      ==================================================== */}
      {activeTab === "ROOMS" && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-indigo-600" />
                <span>Room Matrix & Inventory Master ({roomsList.length} Rooms)</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Manage room numbers, category assignments, bed types (King/Twin), wings, and operational sellability status.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddRoomModal(true)}
              className="h-9 px-4 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Room</span>
            </button>
          </div>

          {/* Rooms Table */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#111114] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10.5px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/80">
                    <th className="py-3 px-4 font-bold">Room No</th>
                    <th className="py-3 px-3 font-bold">Floor</th>
                    <th className="py-3 px-3 font-bold">Category & Room Type</th>
                    <th className="py-3 px-3 font-bold">Bedding</th>
                    <th className="py-3 px-3 font-bold">Wing</th>
                    <th className="py-3 px-3 font-bold">Live Status</th>
                    <th className="py-3 px-4 font-bold text-right">Quick Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
                  {roomsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400">
                        Loading rooms inventory...
                      </td>
                    </tr>
                  ) : (
                    roomsList.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition">
                        <td className="py-3 px-4 font-black text-sm text-zinc-900 dark:text-white">
                          Room {r.number}
                        </td>
                        <td className="py-3 px-3 font-bold text-zinc-600 dark:text-zinc-400">
                          Floor {r.floor}
                        </td>
                        <td className="py-3 px-3 font-sans font-extrabold text-zinc-900 dark:text-zinc-200">
                          {r.roomType?.name || "Standard Room"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                              r.roomType?.bedType?.toLowerCase().includes("twin") || r.roomType?.code?.includes("TWIN")
                                ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            {r.roomType?.bedType?.toLowerCase().includes("twin") || r.roomType?.code?.includes("TWIN")
                              ? "🛏️🛏️ Twin Bed"
                              : "🛏️ King Bed"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            {r.wing || "DELUXE"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.roomState?.occupancyStatus === "OCCUPIED"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {r.roomState?.occupancyStatus || "VACANT"} • {r.roomState?.housekeepingStatus || "CLEAN"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setEditingRoom({
                              id: r.id,
                              number: r.number,
                              floor: r.floor,
                              wing: r.wing || "DELUXE",
                              name: r.name || "",
                              roomTypeId: r.roomTypeId,
                              occupancyStatus: r.roomState?.occupancyStatus || "VACANT",
                              housekeepingStatus: r.roomState?.housekeepingStatus || "CLEAN",
                              sellabilityStatus: r.roomState?.sellabilityStatus || "SELLABLE",
                            })}
                            className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 transition font-sans font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit Room</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Room Modal */}
          {editingRoom && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                    Edit Room {editingRoom.number}
                  </h3>
                  <button
                    onClick={() => setEditingRoom(null)}
                    className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={saveRoomEdit} className="p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold uppercase text-[10.5px]">Room Number</label>
                      <input
                        type="text"
                        required
                        value={editingRoom.number}
                        onChange={(e) => setEditingRoom({ ...editingRoom, number: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold uppercase text-[10.5px]">Floor</label>
                      <input
                        type="number"
                        required
                        value={editingRoom.floor}
                        onChange={(e) => setEditingRoom({ ...editingRoom, floor: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold uppercase text-[10.5px]">Room Category Type *</label>
                    <select
                      value={editingRoom.roomTypeId}
                      onChange={(e) => setEditingRoom({ ...editingRoom, roomTypeId: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-bold"
                    >
                      {roomTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name} ({rt.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold uppercase text-[10.5px]">Wing / Section</label>
                      <select
                        value={editingRoom.wing}
                        onChange={(e) => setEditingRoom({ ...editingRoom, wing: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-bold"
                      >
                        <option value="DELUXE">DELUXE</option>
                        <option value="EXECUTIVE">EXECUTIVE</option>
                        <option value="SUITE">SUITE</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold uppercase text-[10.5px]">Housekeeping</label>
                      <select
                        value={editingRoom.housekeepingStatus}
                        onChange={(e) => setEditingRoom({ ...editingRoom, housekeepingStatus: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-bold"
                      >
                        <option value="CLEAN">CLEAN</option>
                        <option value="DIRTY">DIRTY</option>
                        <option value="INSPECTED">INSPECTED</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setEditingRoom(null)}
                      className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={roomSaving}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {roomSaving ? "Saving..." : "Save Room"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Room Modal */}
          {showAddRoomModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                    Add New Room to Inventory
                  </h3>
                  <button
                    onClick={() => setShowAddRoomModal(false)}
                    className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={createRoom} className="p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold uppercase text-[10.5px]">Room Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 701"
                        value={newRoomForm.number}
                        onChange={(e) => setNewRoomForm({ ...newRoomForm, number: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold uppercase text-[10.5px]">Floor *</label>
                      <input
                        type="number"
                        required
                        value={newRoomForm.floor}
                        onChange={(e) => setNewRoomForm({ ...newRoomForm, floor: Number(e.target.value) })}
                        className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold uppercase text-[10.5px]">Room Category Type *</label>
                    <select
                      value={newRoomForm.roomTypeId}
                      onChange={(e) => setNewRoomForm({ ...newRoomForm, roomTypeId: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-bold"
                    >
                      {roomTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name} ({rt.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold uppercase text-[10.5px]">Wing / Section</label>
                    <select
                      value={newRoomForm.wing}
                      onChange={(e) => setNewRoomForm({ ...newRoomForm, wing: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-bold"
                    >
                      <option value="DELUXE">DELUXE</option>
                      <option value="EXECUTIVE">EXECUTIVE</option>
                      <option value="SUITE">SUITE</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setShowAddRoomModal(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-md"
                    >
                      Create Room
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================
          TAB CONTENT 5: SECURITY & ADMIN CREDENTIALS
      ==================================================== */}
      {activeTab === "SECURITY" && (
        <div className="bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              <span>Master Admin Security & Role Governance</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage system administrator credentials, security audit trail, and access restrictions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-600" />
                <span>Active Master Admin Account</span>
              </h3>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500">Username:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">admin</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500">Master Password:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">admin@hotelos2026</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500">Access Scope:</span>
                  <span className="font-bold text-emerald-600">FULL_UNRESTRICTED</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-zinc-500">Database Engine:</span>
                  <span className="font-bold text-indigo-600">SQLite (dev.db)</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
              <h3 className="font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-600" />
                <span>Automatic Database Protection</span>
              </h3>
              <p className="text-zinc-500">
                All changes made in the Master Admin Portal automatically create immutable entries in the compliance audit trail (`AuditLog` table).
              </p>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                ✓ Full database snapshot backups are stored in `/prisma/backups`
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
