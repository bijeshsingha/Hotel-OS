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
  Minus,
  X,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronRight,
  Database,
  ArrowRight,
  Sparkles,
  UserPlus,
  Globe,
  Compass,
  CreditCard,
  Calendar,
  Car,
  Check,
} from "lucide-react";
import {
  ID_PROOF_TYPES,
  PURPOSE_OF_VISIT_OPTIONS,
  MEAL_PLANS,
  COMMON_NATIONALITIES,
} from "@/data";
import { CompanySelector, CompanyItem } from "@/components/pms/company-selector";
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

  const handleOpenGrcEdit = (data: any) => {
    if (roomsList.length === 0) {
      fetchRooms();
    }
    let parsedCoGuests: any[] = [];
    try {
      if (typeof data.coGuestsJson === "string") {
        parsedCoGuests = JSON.parse(data.coGuestsJson);
      } else if (Array.isArray(data.coGuestsJson)) {
        parsedCoGuests = data.coGuestsJson;
      }
    } catch {}

    let parsedForeignDetails = {
      countryOfCitizenship: "",
      passportNo: "",
      datePlaceOfIssue: "",
      restrictedPermitNo: "",
      dateOfArrivalInIndia: "",
      portOfEntry: "",
      employedInIndia: "No",
      proposedDurationOfStay: "",
      nextDestination: "",
    };
    try {
      if (data.foreignPassportDetailsJson) {
        const p = typeof data.foreignPassportDetailsJson === "string" ? JSON.parse(data.foreignPassportDetailsJson) : data.foreignPassportDetailsJson;
        parsedForeignDetails = { ...parsedForeignDetails, ...p };
      }
    } catch {}

    let extraPaxCount = 0;
    let checkoutType: "24_HOURS" | "FIXED_TIME" = "24_HOURS";
    let gracePeriodMinutes = "60";
    let mealPlan = "EP";
    let adults = "2";
    let paxM = "";
    let paxF = "";
    let children = "0";
    let arrivalDate = data.arrivalDateTime ? data.arrivalDateTime.slice(0, 10) : new Date().toISOString().split("T")[0];
    let arrivalTime = data.arrivalDateTime && data.arrivalDateTime.length >= 16 ? data.arrivalDateTime.slice(11, 16) : "14:00";
    let expectedDepartureDate = data.expectedDepartureDate || new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0];
    let agreedRoomTariff = data.agreedRoomTariff !== undefined ? data.agreedRoomTariff : 3200;
    let isComplimentary = agreedRoomTariff === 0;
    let depositAmount = data.depositAmount !== undefined ? data.depositAmount : 0;
    let advancePaymentMethod = data.advancePaymentMethod || (Number(depositAmount) > 0 ? "UPI" : "");
    let transactionRef = "";
    let policeStation = "";
    let profession = "";
    let title = "Mr.";
    let additionalRoomIds: string[] = [];
    let roomRates: Record<string, any> = data.roomRates ? { ...data.roomRates } : {};
    let roomExtraPax: Record<string, number> = {};
    let groupBilling = true;

    try {
      if (data.internalNotes) {
        const notes = typeof data.internalNotes === "string" ? JSON.parse(data.internalNotes) : data.internalNotes;
        if (notes.extraPaxCount !== undefined) extraPaxCount = Number(notes.extraPaxCount);
        if (notes.checkoutType) checkoutType = notes.checkoutType;
        if (notes.gracePeriodMinutes) gracePeriodMinutes = String(notes.gracePeriodMinutes);
        if (notes.mealPlan) mealPlan = notes.mealPlan;
        if (notes.adults) adults = String(notes.adults);
        if (notes.paxM) paxM = String(notes.paxM);
        if (notes.paxF) paxF = String(notes.paxF);
        if (notes.children) children = String(notes.children);
        if (notes.transactionRef) transactionRef = notes.transactionRef;
        if (notes.policeStation) policeStation = notes.policeStation;
        if (notes.profession) profession = notes.profession;
        if (notes.title) title = notes.title;
        if (notes.agreedTariff !== undefined) agreedRoomTariff = Number(notes.agreedTariff);
        if (Array.isArray(notes.additionalRoomIds)) additionalRoomIds = [...notes.additionalRoomIds];
        if (notes.roomRates && typeof notes.roomRates === "object") roomRates = { ...roomRates, ...notes.roomRates };
        if (notes.roomExtraPax && typeof notes.roomExtraPax === "object") roomExtraPax = notes.roomExtraPax;
        if (notes.groupBilling !== undefined) groupBilling = Boolean(notes.groupBilling);
      }
    } catch {}

    // Extract all room identifiers from data.preAssignedRoom, data.assignedRooms, and notes
    const allParsedRooms: string[] = [];

    if (data.preAssignedRoom) {
      const cleanStr = String(data.preAssignedRoom).replace(/^Room\s+/i, "");
      const rawRooms = cleanStr
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      rawRooms.forEach((rn) => {
        if (!allParsedRooms.includes(rn)) allParsedRooms.push(rn);
      });
    }

    if (Array.isArray(data.assignedRooms)) {
      data.assignedRooms.forEach((ar: any) => {
        const rNum = ar.number || ar.id;
        if (rNum && !allParsedRooms.includes(rNum)) allParsedRooms.push(rNum);
        if (ar.rate !== undefined) {
          roomRates[rNum] = ar.rate;
          if (ar.id) roomRates[ar.id] = ar.rate;
        }
      });
    }

    let parsedPrimaryRoom = allParsedRooms[0] || data.assignedRoomNumber || data.preAssignedRoom || "";
    const extraRooms = allParsedRooms.slice(1);

    extraRooms.forEach((rn) => {
      const found = roomsList.find((r) => r.number === rn || r.id === rn);
      const rKey = found ? found.id : rn;
      if (!additionalRoomIds.includes(rKey) && !additionalRoomIds.includes(rn)) {
        additionalRoomIds.push(rKey);
      }
      if (roomRates[rKey] === undefined && roomRates[rn] === undefined) {
        roomRates[rKey] = found?.roomType?.basePrice || agreedRoomTariff || 3200;
      }
      if (roomRates[rn] === undefined) {
        roomRates[rn] = found?.roomType?.basePrice || agreedRoomTariff || 3200;
      }
    });

    // Ensure roomRates has entry for each additional room
    additionalRoomIds.forEach((rid) => {
      const found = roomsList.find((r) => r.id === rid || r.number === rid);
      const rKey = found ? found.id : rid;
      if (roomRates[rKey] === undefined && roomRates[rid] === undefined) {
        roomRates[rKey] = found?.roomType?.basePrice || agreedRoomTariff || 3200;
      }
    });

    setEditingGrc({
      ...data,
      preAssignedRoom: parsedPrimaryRoom,
      arrivalDate,
      arrivalTime,
      expectedDepartureDate,
      title,
      profession,
      policeStation,
      extraPaxCount,
      checkoutType,
      gracePeriodMinutes,
      mealPlan,
      adults,
      paxM,
      paxF,
      children,
      agreedRoomTariff,
      isComplimentary: agreedRoomTariff === 0,
      depositAmount,
      advancePaymentMethod,
      transactionRef,
      additionalRoomIds,
      roomRates,
      roomExtraPax,
      groupBilling,
      coGuests: parsedCoGuests,
      foreignDetails: parsedForeignDetails,
    });
  };

  const saveGrcEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrc) return;
    setGrcSaving(true);
    try {
      const actualNationality = editingGrc.nationality === "Indian"
        ? "Indian"
        : (editingGrc.foreignDetails?.countryOfCitizenship || editingGrc.country || "Foreign");

      const payload = {
        id: editingGrc.id,
        fullName: editingGrc.fullName?.trim(),
        age: editingGrc.age ? Number(editingGrc.age) : undefined,
        gender: editingGrc.gender,
        nationality: actualNationality,
        fatherSpouseName: editingGrc.fatherSpouseName,
        mobilePhone: editingGrc.mobilePhone,
        alternatePhone: editingGrc.alternatePhone,
        email: editingGrc.email,
        streetAddress: editingGrc.streetAddress,
        city: editingGrc.city,
        state: editingGrc.state,
        pinZipCode: editingGrc.pinZipCode,
        country: editingGrc.country || (actualNationality === "Indian" ? "India" : actualNationality),
        arrivedFrom: editingGrc.arrivedFrom,
        goingTo: editingGrc.goingTo,
        purposeOfVisit: editingGrc.purposeOfVisit,
        referralChannel: editingGrc.referralChannel,
        driverName: editingGrc.driverName,
        vehicleNumber: editingGrc.vehicleNumber,
        idDocumentType: editingGrc.idDocumentType,
        idDocumentNumber: editingGrc.idDocumentNumber,
        arrivalDateTime: `${editingGrc.arrivalDate} ${editingGrc.arrivalTime || "14:00"}`,
        expectedDepartureDate: editingGrc.expectedDepartureDate,
        preAssignedRoom: editingGrc.preAssignedRoom,
        status: editingGrc.status,
        agreedRoomTariff: editingGrc.isComplimentary ? 0 : Number(editingGrc.agreedRoomTariff),
        depositAmount: Number(editingGrc.depositAmount) || 0,
        advancePaymentMethod: editingGrc.advancePaymentMethod,
        coGuestsJson: editingGrc.coGuests,
        foreignPassportDetailsJson: editingGrc.foreignDetails,
        signatureDataUrl: editingGrc.signatureDataUrl,
        companyName: editingGrc.companyName,
        guestGstin: editingGrc.guestGstin,
        internalNotes: {
          extraPaxCount: Number(editingGrc.extraPaxCount) || 0,
          checkoutType: editingGrc.checkoutType,
          gracePeriodMinutes: editingGrc.gracePeriodMinutes,
          mealPlan: editingGrc.mealPlan,
          adults: editingGrc.adults,
          paxM: editingGrc.paxM,
          paxF: editingGrc.paxF,
          children: editingGrc.children,
          transactionRef: editingGrc.transactionRef,
          policeStation: editingGrc.policeStation,
          profession: editingGrc.profession,
          title: editingGrc.title,
          agreedTariff: editingGrc.isComplimentary ? 0 : Number(editingGrc.agreedRoomTariff),
          depositAmount: Number(editingGrc.depositAmount) || 0,
          advancePaymentMethod: editingGrc.advancePaymentMethod,
          additionalRoomIds: editingGrc.additionalRoomIds || [],
          roomRates: editingGrc.roomRates || {},
          roomExtraPax: editingGrc.roomExtraPax || {},
          groupBilling: Boolean(editingGrc.groupBilling),
        },
      };

      const res = await fetch("/api/v1/admin/grc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    fetchRooms();
    fetchRates();
    if (activeTab === "HOTEL") fetchHotelDetails();
    if (activeTab === "GRC") fetchGrcList();
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
                                  onClick={() => handleOpenGrcEdit(data)}
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

          {/* COMPREHENSIVE CHECK-IN GRC EDIT WINDOW (MATCHING CHECK-IN MODAL) */}
          {editingGrc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in">
              <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 p-5 sm:p-7 shadow-2xl flex flex-col overflow-hidden">
                
                {/* Modal Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                          Guest Registration Card (GRC) Editor
                        </h2>
                        <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono font-black text-xs">
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
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        {hotelForm.displayName || activeProperty?.displayName || "Hotel Ambarish Grand Residency"} • {hotelForm.code || activeProperty?.code || "GUW-01"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingGrc(null)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* PHYSICAL GRC DATA ENTRY & EDIT FORM */}
                <form onSubmit={saveGrcEdit} className="overflow-y-auto space-y-6 pt-4 pr-1 text-xs flex-1">
                  
                  {/* 1. ROOM & STAY PERIOD SECTION */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b] p-4 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 flex-wrap gap-2">
                      <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        1. Room Assignment & Stay Schedule
                      </span>
                      {editingGrc.preAssignedRoom && (
                        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                          Room {editingGrc.preAssignedRoom}
                          {(editingGrc.additionalRoomIds || []).length > 0 &&
                            `, ${editingGrc.additionalRoomIds
                              .map((id: string) => {
                                const r = roomsList.find((rm) => rm.id === id || rm.number === id);
                                return r?.number || id;
                              })
                              .join(", ")}`}
                        </span>
                      )}
                    </div>

                    {/* Row 1: Room Assignment & Schedule */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1 sm:col-span-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                          Allocated Room *
                        </label>
                        <select
                          required
                          value={
                            roomsList.find(
                              (r) => r.number === editingGrc.preAssignedRoom || r.id === editingGrc.preAssignedRoom
                            )?.number || editingGrc.preAssignedRoom || ""
                          }
                          onChange={(e) => setEditingGrc({ ...editingGrc, preAssignedRoom: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">-- Choose Room --</option>
                          {roomsList.map((r) => {
                            const bedType = r.roomType?.bedType || (r.wing === "TWIN" ? "Twin Beds" : "King Bed");
                            return (
                              <option key={r.id} value={r.number}>
                                Room {r.number} — {r.roomType?.name} [{bedType}]
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Check-In Date */}
                      <div className="space-y-1 sm:col-span-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap flex items-center justify-between">
                          <span>Check-In Date *</span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">Editable</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={editingGrc.arrivalDate || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, arrivalDate: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none cursor-pointer"
                        />
                      </div>

                      {/* Check-In Time */}
                      <div className="space-y-1 sm:col-span-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap flex items-center justify-between">
                          <span>Check-In Time *</span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">Editable</span>
                        </label>
                        <input
                          type="time"
                          required
                          value={editingGrc.arrivalTime || "14:00"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, arrivalTime: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none cursor-pointer shadow-xs"
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
                          value={editingGrc.expectedDepartureDate || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, expectedDepartureDate: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none cursor-pointer"
                        />
                      </div>

                      {/* Checkout Billing Model */}
                      <div className="space-y-1 sm:col-span-4">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                          Checkout Billing Cycle *
                        </label>
                        <select
                          value={editingGrc.checkoutType || "24_HOURS"}
                          onChange={(e: any) => setEditingGrc({ ...editingGrc, checkoutType: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer"
                        >
                          <option value="24_HOURS">⏱️ 24-Hour Cycle from Check-In (Default)</option>
                          <option value="FIXED_TIME">☀️ Standard 11:00 AM / 12:00 PM Fixed Time</option>
                        </select>
                      </div>
                    </div>

                    {/* Room Rates & Extra Pax Configuration for ALL Allocated Rooms */}
                    <div className="space-y-2.5 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                      <div className="flex items-center justify-between">
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px]">
                          Rooms & Individual Tariff Rates ({(editingGrc.additionalRoomIds || []).length + 1} Rooms)
                        </label>
                        <span className="text-[10.5px] font-mono text-zinc-500">
                          Edit rates & extra pax per room
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-2.5">
                        {/* 1. PRIMARY ALLOCATED ROOM CARD */}
                        {(() => {
                          const primaryRoomObj = roomsList.find(
                            (r) => r.number === editingGrc.preAssignedRoom || r.id === editingGrc.preAssignedRoom
                          );
                          const primaryRoomNumber = primaryRoomObj?.number || editingGrc.preAssignedRoom || "—";
                          const primaryRoomType = primaryRoomObj?.roomType?.name || (primaryRoomObj?.wing === "TWIN" ? "Deluxe Twin Room" : "Deluxe King Room");
                          const primaryPaxCount = Number(editingGrc.extraPaxCount) || 0;
                          const primaryRate = editingGrc.isComplimentary ? 0 : (editingGrc.agreedRoomTariff !== undefined ? editingGrc.agreedRoomTariff : 3200);

                          return (
                            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 space-y-2 shadow-xs">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold font-mono text-xs shadow-xs">
                                    Room {primaryRoomNumber}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-bold uppercase tracking-wider">
                                    Primary Room
                                  </span>
                                  <span className="text-xs text-zinc-800 dark:text-zinc-300 font-medium truncate">
                                    {primaryRoomType}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">Rate:</label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-2.5 text-xs text-zinc-400 font-bold font-mono">₹</span>
                                    <input
                                      type="number"
                                      placeholder={editingGrc.isComplimentary ? "0 (Free)" : "Rate"}
                                      disabled={editingGrc.isComplimentary}
                                      value={primaryRate}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setEditingGrc((prev: any) => ({
                                          ...prev,
                                          agreedRoomTariff: val,
                                          roomRates: {
                                            ...(prev.roomRates || {}),
                                            [primaryRoomNumber]: val,
                                            ...(primaryRoomObj?.id ? { [primaryRoomObj.id]: val } : {}),
                                          },
                                        }));
                                      }}
                                      className="w-28 h-8 pl-6 pr-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-blue-700 dark:text-blue-400 font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Primary Room Extra Pax Stepper */}
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs shadow-xs">
                                <span className="font-bold text-zinc-800 dark:text-zinc-300">
                                  Extra Pax for Room {primaryRoomNumber} (₹500/Pax)
                                </span>
                                <div className="flex items-center gap-2.5">
                                  <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = Math.max(0, primaryPaxCount - 1);
                                        setEditingGrc({ ...editingGrc, extraPaxCount: next });
                                      }}
                                      className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                      title="Decrease Extra Pax"
                                    >
                                      <Minus className="h-3 w-3 stroke-[2.5]" />
                                    </button>
                                    <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white px-2 min-w-[20px] text-center select-none">
                                      {primaryPaxCount}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = primaryPaxCount + 1;
                                        setEditingGrc({ ...editingGrc, extraPaxCount: next });
                                      }}
                                      className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                      title="Increase Extra Pax"
                                    >
                                      <Plus className="h-3 w-3 stroke-[2.5]" />
                                    </button>
                                  </div>
                                  {primaryPaxCount > 0 ? (
                                    <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                                      +₹{primaryPaxCount * 500}/nt
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pr-1">₹0</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* 2. ADDITIONAL ROOMS LIST */}
                        {(editingGrc.additionalRoomIds || []).map((id: string) => {
                          const r = roomsList.find((room) => room.id === id || room.number === id);
                          const roomPaxCount = editingGrc.roomExtraPax?.[id] ?? editingGrc.roomExtraPax?.[r?.number || ""] ?? 0;
                          const currentRoomRate = editingGrc.roomRates?.[id] ?? editingGrc.roomRates?.[r?.number || ""] ?? (r?.roomType?.basePrice || 3200);
                          return (
                            <div
                              key={id}
                              className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 space-y-2 shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 font-bold font-mono text-xs border border-blue-200 dark:border-blue-500/30">
                                    Room {r?.number || id}
                                  </span>
                                  <span className="text-xs text-zinc-800 dark:text-zinc-300 font-medium truncate">
                                    {r?.roomType?.name || (r?.wing === "TWIN" ? "Deluxe Twin Room" : "Deluxe King Room")}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">Rate:</label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-2.5 text-xs text-zinc-400 font-bold font-mono">₹</span>
                                    <input
                                      type="number"
                                      placeholder="Rate"
                                      value={currentRoomRate}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditingGrc((prev: any) => ({
                                          ...prev,
                                          roomRates: {
                                            ...prev.roomRates,
                                            [id]: val,
                                            ...(r?.number ? { [r.number]: val } : {}),
                                          },
                                        }));
                                      }}
                                      className="w-28 h-8 pl-6 pr-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingGrc((prev: any) => {
                                        const nextPax = { ...(prev.roomExtraPax || {}) };
                                        const nextRates = { ...(prev.roomRates || {}) };
                                        delete nextPax[id];
                                        delete nextRates[id];
                                        if (r?.number) {
                                          delete nextPax[r.number];
                                          delete nextRates[r.number];
                                        }
                                        return {
                                          ...prev,
                                          additionalRoomIds: (prev.additionalRoomIds || []).filter((rid: string) => rid !== id && rid !== r?.number),
                                          roomExtraPax: nextPax,
                                          roomRates: nextRates,
                                        };
                                      })
                                    }
                                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Remove Room"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Per-Room Extra Pax Stepper */}
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs shadow-xs">
                                <span className="font-bold text-zinc-800 dark:text-zinc-300">
                                  Extra Pax for Room {r?.number || id} (₹500/Pax)
                                </span>
                                <div className="flex items-center gap-2.5">
                                  <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cur = editingGrc.roomExtraPax?.[id] ?? editingGrc.roomExtraPax?.[r?.number || ""] ?? 0;
                                        const next = Math.max(0, cur - 1);
                                        setEditingGrc((prev: any) => ({
                                          ...prev,
                                          roomExtraPax: {
                                            ...prev.roomExtraPax,
                                            [id]: next,
                                            ...(r?.number ? { [r.number]: next } : {}),
                                          },
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
                                        const cur = editingGrc.roomExtraPax?.[id] ?? editingGrc.roomExtraPax?.[r?.number || ""] ?? 0;
                                        const next = cur + 1;
                                        setEditingGrc((prev: any) => ({
                                          ...prev,
                                          roomExtraPax: {
                                            ...prev.roomExtraPax,
                                            [id]: next,
                                            ...(r?.number ? { [r.number]: next } : {}),
                                          },
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

                      {/* Dropdown to add more rooms */}
                      <div className="flex gap-2 pt-1">
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const roomObj = roomsList.find((r) => r.id === val || r.number === val);
                              const defaultPrice = roomObj?.roomType?.basePrice || 3200;
                              setEditingGrc((prev: any) => ({
                                ...prev,
                                additionalRoomIds: [...(prev.additionalRoomIds || []), val],
                                roomRates: {
                                  ...(prev.roomRates || {}),
                                  [val]: defaultPrice,
                                  ...(roomObj?.number ? { [roomObj.number]: defaultPrice } : {}),
                                },
                                roomExtraPax: {
                                  ...(prev.roomExtraPax || {}),
                                  [val]: 0,
                                  ...(roomObj?.number ? { [roomObj.number]: 0 } : {}),
                                },
                              }));
                            }
                          }}
                          className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-mono focus:border-blue-500 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Select Vacant Room to Add --</option>
                          {roomsList
                            .filter(
                              (r) =>
                                r.number !== editingGrc.preAssignedRoom &&
                                r.id !== editingGrc.preAssignedRoom &&
                                !(editingGrc.additionalRoomIds || []).includes(r.id) &&
                                !(editingGrc.additionalRoomIds || []).includes(r.number)
                            )
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                Room {r.number} — {r.roomType?.name || (r.wing === "TWIN" ? "Twin Room" : "King Room")}
                              </option>
                            ))}
                        </select>
                      </div>
                      
                      {(editingGrc.additionalRoomIds || []).length > 0 && (
                        <div className="flex items-center gap-2 mt-2 bg-blue-50 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/50">
                          <input
                            type="checkbox"
                            id="adminGroupBilling"
                            checked={editingGrc.groupBilling !== false}
                            onChange={(e) => setEditingGrc({ ...editingGrc, groupBilling: e.target.checked })}
                            className="w-4 h-4 rounded bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500/50 cursor-pointer"
                          />
                          <label htmlFor="adminGroupBilling" className="text-xs font-bold text-blue-800 dark:text-blue-300 cursor-pointer">
                            Consolidate Bill (Create a single Master Folio for all {(editingGrc.additionalRoomIds || []).length + 1} rooms)
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Row 2: Meal Plan & Pax Breakdown (5 Dedicated Columns) */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Meal Plan</label>
                        <select
                          value={editingGrc.mealPlan || "EP"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, mealPlan: e.target.value })}
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
                          value={editingGrc.adults || "2"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, adults: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Male Pax</label>
                        <input
                          type="number"
                          placeholder="e.g. 1"
                          min="0"
                          value={editingGrc.paxM || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, paxM: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Female Pax</label>
                        <input
                          type="number"
                          placeholder="e.g. 1"
                          min="0"
                          value={editingGrc.paxF || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, paxF: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Children</label>
                        <input
                          type="number"
                          placeholder="e.g. 0"
                          min="0"
                          value={editingGrc.children || "0"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, children: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Row 3: Live Accommodation Math Calculator */}
                    {(() => {
                      const totalRoomsCount = 1 + (editingGrc.additionalRoomIds?.length || 0);
                      const additionalExtraPax = (editingGrc.additionalRoomIds || []).reduce(
                        (sum: number, rid: string) => sum + (Number(editingGrc.roomExtraPax?.[rid]) || 0),
                        0
                      );
                      const currentExtraPax = (Number(editingGrc.extraPaxCount) || 0) + additionalExtraPax;
                      const totalCapacity = totalRoomsCount * 2 + currentExtraPax;
                      const absoluteMaxRoomCapacity = totalRoomsCount * 4;

                      const totalAdultsCount = Number(editingGrc.adults) || (Number(editingGrc.paxM || 0) + Number(editingGrc.paxF || 0)) || 0;
                      const totalChildrenCount = Number(editingGrc.children || 0);
                      const totalGuests = totalAdultsCount + totalChildrenCount;

                      const hasGuestsEntered = totalGuests > 0;
                      const isOverCapacity = hasGuestsEntered && totalGuests > totalCapacity;
                      const isBeyondMax = hasGuestsEntered && totalGuests > absoluteMaxRoomCapacity;

                      return (
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 space-y-3">
                          <div
                            className={`rounded-xl p-3.5 border transition-all ${
                              isBeyondMax
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
                                  {isBeyondMax ? "⛔" : isOverCapacity ? "⚠️" : hasGuestsEntered ? "✅" : "👥"}
                                </span>
                                <div className="text-xs">
                                  <span className="font-bold">
                                    {isBeyondMax
                                      ? "Room Capacity Exceeded!"
                                      : isOverCapacity
                                      ? "Room Overcapacity Warning!"
                                      : hasGuestsEntered
                                      ? "Capacity Verification Passed"
                                      : "Accommodation Capacity Math"}
                                  </span>
                                  <p className="text-[11px] opacity-90 mt-0.5">
                                    {isBeyondMax
                                      ? `${totalGuests} Guests entered, but standard capacity across ${totalRoomsCount} rooms is max ${absoluteMaxRoomCapacity} Pax.`
                                      : isOverCapacity
                                      ? `${totalGuests} Guests entered, but capacity across ${totalRoomsCount} rooms is ${totalCapacity} Pax. Increment Extra Pax (+₹500/Pax).`
                                      : hasGuestsEntered
                                      ? `${totalGuests} Guests fit across ${totalRoomsCount} Room(s) (Total Capacity: ${totalCapacity} Pax).`
                                      : `Capacity: ${totalCapacity} Pax across ${totalRoomsCount} room(s). Increment Extra Pax if adding extra guests.`}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 font-mono text-xs font-bold shrink-0 self-end sm:self-auto">
                                <span className="px-2.5 py-1 rounded-lg border bg-zinc-200 dark:bg-black/40 border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white">
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Mobile Phone *</label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 9864341211"
                          value={editingGrc.mobilePhone || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, mobilePhone: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Title</label>
                        <select
                          value={editingGrc.title || "Mr."}
                          onChange={(e) => setEditingGrc({ ...editingGrc, title: e.target.value })}
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
                          value={editingGrc.fullName || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, fullName: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-bold text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Father / Spouse Name</label>
                        <input
                          type="text"
                          placeholder="S/O, D/O, W/O"
                          value={editingGrc.fatherSpouseName || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, fatherSpouseName: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Alternate Phone</label>
                        <input
                          type="tel"
                          placeholder="Optional phone"
                          value={editingGrc.alternatePhone || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, alternatePhone: e.target.value })}
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
                          value={editingGrc.age || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, age: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Gender *</label>
                        <select
                          value={editingGrc.gender || "Male"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, gender: e.target.value })}
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
                          value={editingGrc.nationality || "Indian"}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingGrc({
                              ...editingGrc,
                              nationality: val,
                              country: val === "Indian" ? "India" : editingGrc.country,
                              idDocumentType: val === "Indian" ? "AADHAAR" : "PASSPORT",
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
                          value={editingGrc.email || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, email: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Profession / Occupation</label>
                        <input
                          type="text"
                          placeholder="e.g. Business Executive"
                          value={editingGrc.profession || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, profession: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* MANDATORY FOREIGN NATIONAL SECTION (FORM C) - SHOWN IF FOREIGN */}
                  {editingGrc.nationality === "Foreign" && (
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
                        <div className="space-y-1">
                          <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                            Country of Citizenship *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. United Kingdom / USA / Japan"
                            value={editingGrc.foreignDetails?.countryOfCitizenship || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingGrc({
                                ...editingGrc,
                                country: val,
                                foreignDetails: { ...(editingGrc.foreignDetails || {}), countryOfCitizenship: val },
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
                            value={editingGrc.foreignDetails?.passportNo || ""}
                            onChange={(e) =>
                              setEditingGrc({
                                ...editingGrc,
                                foreignDetails: { ...(editingGrc.foreignDetails || {}), passportNo: e.target.value },
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
                            value={editingGrc.foreignDetails?.datePlaceOfIssue || ""}
                            onChange={(e) =>
                              setEditingGrc({
                                ...editingGrc,
                                foreignDetails: { ...(editingGrc.foreignDetails || {}), datePlaceOfIssue: e.target.value },
                              })
                            }
                            className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                            Visa / Permit Number *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. V9876543 / eVisa"
                            value={editingGrc.foreignDetails?.restrictedPermitNo || ""}
                            onChange={(e) =>
                              setEditingGrc({
                                ...editingGrc,
                                foreignDetails: { ...(editingGrc.foreignDetails || {}), restrictedPermitNo: e.target.value },
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
                            value={editingGrc.foreignDetails?.dateOfArrivalInIndia || ""}
                            onChange={(e) =>
                              setEditingGrc({
                                ...editingGrc,
                                foreignDetails: { ...(editingGrc.foreignDetails || {}), dateOfArrivalInIndia: e.target.value },
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
                            value={editingGrc.foreignDetails?.portOfEntry || ""}
                            onChange={(e) =>
                              setEditingGrc({
                                ...editingGrc,
                                foreignDetails: { ...(editingGrc.foreignDetails || {}), portOfEntry: e.target.value },
                              })
                            }
                            className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                            Stay Duration in India (Days)
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="e.g. 15"
                            value={editingGrc.foreignDetails?.proposedDurationOfStay || ""}
                            onChange={(e) =>
                              setEditingGrc({
                                ...editingGrc,
                                foreignDetails: { ...(editingGrc.foreignDetails || {}), proposedDurationOfStay: e.target.value },
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
                            value={editingGrc.foreignDetails?.employedInIndia || "No"}
                            onChange={(e) =>
                              setEditingGrc({
                                ...editingGrc,
                                foreignDetails: { ...(editingGrc.foreignDetails || {}), employedInIndia: e.target.value },
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
                            value={editingGrc.foreignDetails?.nextDestination || ""}
                            onChange={(e) =>
                              setEditingGrc({
                                ...editingGrc,
                                foreignDetails: { ...(editingGrc.foreignDetails || {}), nextDestination: e.target.value },
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
                          value={editingGrc.streetAddress || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, streetAddress: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Police Station</label>
                        <input
                          type="text"
                          placeholder="Local P.S."
                          value={editingGrc.policeStation || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, policeStation: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">City</label>
                        <input
                          type="text"
                          placeholder="e.g. Guwahati / Kolkata"
                          value={editingGrc.city || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, city: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">State</label>
                        <input
                          type="text"
                          placeholder="e.g. Assam"
                          value={editingGrc.state || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, state: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">PIN / Zip Code</label>
                        <input
                          type="text"
                          placeholder="e.g. 781008"
                          value={editingGrc.pinZipCode || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, pinZipCode: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Country</label>
                        <input
                          type="text"
                          placeholder="e.g. India"
                          value={editingGrc.country || "India"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, country: e.target.value })}
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
                          value={editingGrc.arrivedFrom || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, arrivedFrom: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Going To</label>
                        <input
                          type="text"
                          placeholder="e.g. Shillong, Home"
                          value={editingGrc.goingTo || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, goingTo: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Purpose of Visit</label>
                        <select
                          value={editingGrc.purposeOfVisit || "Tourism / Holiday"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, purposeOfVisit: e.target.value })}
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
                          value={editingGrc.vehicleNumber || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, vehicleNumber: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">ID Document Type</label>
                        <select
                          value={editingGrc.idDocumentType || "AADHAAR"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, idDocumentType: e.target.value })}
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
                          value={editingGrc.idDocumentNumber || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, idDocumentNumber: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap flex items-center justify-between">
                          <span>Company / Travel Agent Master</span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">24+ Directory</span>
                        </label>
                        <CompanySelector
                          value={editingGrc.companyName || ""}
                          activeProperty={activeProperty}
                          placeholder="Search corporate company (e.g. ABB, Asian Paints, MMT...)"
                          onSelect={(comp) => {
                            if (!comp) {
                              setEditingGrc((prev: any) => ({
                                ...prev,
                                companyName: "",
                                guestGstin: "",
                              }));
                              return;
                            }
                            setEditingGrc((prev: any) => ({
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
                          value={editingGrc.guestGstin || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, guestGstin: e.target.value.toUpperCase() })}
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
                        5. Accompanying Co-Guests ({(editingGrc.coGuests || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const list = Array.isArray(editingGrc.coGuests) ? [...editingGrc.coGuests] : [];
                          list.push({ name: "", soDoWo: "", age: "", gender: "Male", relation: "Spouse" });
                          setEditingGrc({ ...editingGrc, coGuests: list });
                        }}
                        className="px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Companion</span>
                      </button>
                    </div>

                    {(editingGrc.coGuests || []).length > 0 ? (
                      <div className="space-y-2">
                        {editingGrc.coGuests.map((cg: any, idx: number) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 items-center shadow-xs">
                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                required
                                placeholder="Companion Name *"
                                value={cg.name || ""}
                                onChange={(e) => {
                                  const updated = [...editingGrc.coGuests];
                                  updated[idx] = { ...updated[idx], name: e.target.value.toUpperCase() };
                                  setEditingGrc({ ...editingGrc, coGuests: updated });
                                }}
                                className="w-full h-9 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <input
                                type="number"
                                placeholder="Age"
                                value={cg.age || ""}
                                onChange={(e) => {
                                  const updated = [...editingGrc.coGuests];
                                  updated[idx] = { ...updated[idx], age: e.target.value };
                                  setEditingGrc({ ...editingGrc, coGuests: updated });
                                }}
                                className="w-full h-9 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <select
                                value={cg.gender || "Male"}
                                onChange={(e) => {
                                  const updated = [...editingGrc.coGuests];
                                  updated[idx] = { ...updated[idx], gender: e.target.value };
                                  setEditingGrc({ ...editingGrc, coGuests: updated });
                                }}
                                className="w-full h-9 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                              </select>
                            </div>
                            <div className="sm:col-span-3">
                              <select
                                value={cg.relation || "Spouse"}
                                onChange={(e) => {
                                  const updated = [...editingGrc.coGuests];
                                  updated[idx] = { ...updated[idx], relation: e.target.value };
                                  setEditingGrc({ ...editingGrc, coGuests: updated });
                                }}
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
                                onClick={() => {
                                  const updated = editingGrc.coGuests.filter((_: any, i: number) => i !== idx);
                                  setEditingGrc({ ...editingGrc, coGuests: updated });
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 transition cursor-pointer"
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
                          checked={editingGrc.isComplimentary || editingGrc.agreedRoomTariff === 0}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditingGrc({
                              ...editingGrc,
                              isComplimentary: checked,
                              agreedRoomTariff: checked ? 0 : (editingGrc.agreedRoomTariff || 3200),
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
                          {editingGrc.additionalRoomIds?.length > 0
                            ? `Room ${editingGrc.preAssignedRoom || "Primary"} Rate (₹)`
                            : "Agreed Room Rate (₹)"}
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-zinc-400 font-bold font-mono text-xs">₹</span>
                          <input
                            type="number"
                            placeholder={editingGrc.isComplimentary ? "0 (Complimentary)" : "Enter custom rate"}
                            disabled={editingGrc.isComplimentary}
                            value={editingGrc.isComplimentary ? 0 : (editingGrc.agreedRoomTariff !== undefined ? editingGrc.agreedRoomTariff : 3200)}
                            onChange={(e) => setEditingGrc({ ...editingGrc, agreedRoomTariff: Number(e.target.value) })}
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
                            value={editingGrc.depositAmount !== undefined ? editingGrc.depositAmount : 0}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setEditingGrc({
                                ...editingGrc,
                                depositAmount: val,
                                advancePaymentMethod: val > 0 ? (editingGrc.advancePaymentMethod || "UPI") : "",
                              });
                            }}
                            className="w-full h-10 pl-7 pr-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-sm focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                          Payment Mode
                        </label>
                        <select
                          value={editingGrc.advancePaymentMethod || "UPI"}
                          onChange={(e) => setEditingGrc({ ...editingGrc, advancePaymentMethod: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-bold text-xs focus:border-blue-500 focus:outline-none"
                        >
                          <option value="UPI">UPI / QR Code</option>
                          <option value="CASH">Cash Drawer</option>
                          <option value="CARD">Credit / Debit Card</option>
                          <option value="DIRECT_BILL">🏢 Bill to Company (Company Ledger / BTC)</option>
                          <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                          <option value="ONLINE">Online Portal / Pre-paid OTA</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                          Transaction / UTR / PO Ref
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. UTR/98127391 or PO-2026"
                          value={editingGrc.transactionRef || ""}
                          onChange={(e) => setEditingGrc({ ...editingGrc, transactionRef: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Multi-Room Tariff Breakdown Card */}
                    {(() => {
                      const additionalRooms = editingGrc.additionalRoomIds || [];
                      if (additionalRooms.length === 0) return null;
                      const primaryRate = editingGrc.isComplimentary ? 0 : Number(editingGrc.agreedRoomTariff || 0);
                      const totalDailyTariff = additionalRooms.reduce((sum: number, rid: string) => {
                        const rObj = roomsList.find((r) => r.id === rid || r.number === rid);
                        const rRate = Number(editingGrc.roomRates?.[rid] ?? (rObj?.roomType?.basePrice || 3200));
                        return sum + (isNaN(rRate) ? 0 : rRate);
                      }, primaryRate);

                      return (
                        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 space-y-2.5">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-bold text-xs text-blue-900 dark:text-blue-200 uppercase tracking-wide flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-blue-600" />
                              Multi-Room Group Tariff Breakdown ({additionalRooms.length + 1} Rooms)
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono font-black text-xs shadow-xs">
                              Combined: ₹{totalDailyTariff}/Night
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/60 shadow-2xs">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
                                  Room {editingGrc.preAssignedRoom || "Primary"}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-medium">(Main)</span>
                              </div>
                              <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                                ₹{primaryRate}
                              </span>
                            </div>

                            {additionalRooms.map((rid: string) => {
                              const rObj = roomsList.find((r) => r.id === rid || r.number === rid);
                              const rRate = Number(editingGrc.roomRates?.[rid] ?? (rObj?.roomType?.basePrice || 3200));
                              return (
                                <div key={rid} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/60 shadow-2xs">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
                                      Room {rObj?.number || rid}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 truncate">
                                      ({rObj?.roomType?.name || "Extra"})
                                    </span>
                                  </div>
                                  <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                                    ₹{isNaN(rRate) ? 0 : rRate}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {editingGrc.advancePaymentMethod === "DIRECT_BILL" && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          Billing will be posted to Company Ledger:{" "}
                          <strong>{editingGrc.companyName || "Corporate Account (Please enter Company Name in Section 4)"}</strong>
                          {editingGrc.guestGstin ? ` • GSTIN: ${editingGrc.guestGstin}` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 7. OPERATIONAL STATUS & SIGNATURE */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b] p-4 space-y-3.5 shadow-xs">
                    <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                        <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        7. Registration Operational Status & Signature
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
                          className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold focus:border-blue-500 focus:outline-none"
                        >
                          <option value="CHECKED_IN">CHECKED_IN (In-House / Active Stay)</option>
                          <option value="PENDING_REVIEW">PENDING_REVIEW (Digital Kiosk Submission)</option>
                          <option value="REJECTED">REJECTED (Cancelled / Voided)</option>
                        </select>
                      </div>

                      {editingGrc.signatureDataUrl && (
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
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

                  {/* Bottom Actions */}
                  <div className="pt-3.5 pb-1 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                    <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline truncate">
                      Rule 46 Compliant GRC • Instant Sync Across Database
                    </span>

                    <div className="flex items-center gap-3 ml-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingGrc(null)}
                        className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition cursor-pointer"
                      >
                        Cancel / Discard
                      </button>
                      <button
                        type="submit"
                        disabled={grcSaving}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs sm:text-sm transition shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                      >
                        {grcSaving ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Synchronizing Database...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>Save GRC Changes & Synchronize Everywhere</span>
                          </>
                        )}
                      </button>
                    </div>
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
