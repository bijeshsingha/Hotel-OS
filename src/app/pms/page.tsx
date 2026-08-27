"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR } from "@/lib/gst/calculator";
import {
  BedDouble,
  Calendar,
  UserPlus,
  ArrowRightLeft,
  Search,
  Users,
  X,
  Layers,
  User,
  AlertCircle,
  QrCode,
  FileText,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  MapPin,
  Phone,
  Car,
  Compass,
  UtensilsCrossed,
  SlidersHorizontal,
  Building,
  Plus,
  ArrowRight,
  Receipt,
  Sparkles,
  ChevronRight,
  Check,
  Bed,
  Crown,
  Wrench,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { PrintableGrcModal, GrcData } from "@/components/pms/printable-grc";
import { GrcIntakeModal } from "@/components/pms/grc-intake-modal";
import { DigitalCheckInReviewModal } from "@/components/pms/digital-checkin-review-modal";

function PMSFrontDeskContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [rooms, setRooms] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"grid" | "inhouse" | "registrations" | "reservations">(
    tabParam === "registrations" || tabParam === "stays" || tabParam === "inhouse" || tabParam === "reservations" 
      ? (tabParam === "stays" ? "inhouse" : (tabParam as any)) 
      : "grid"
  );

  useEffect(() => {
    if (tabParam && ["grid", "inhouse", "stays", "registrations", "reservations"].includes(tabParam)) {
      setActiveTab(tabParam === "stays" ? "inhouse" : (tabParam as any));
    }
  }, [tabParam]);

  // Selected Room for Slide-Over Inspector Drawer
  const [selectedRoomForInspect, setSelectedRoomForInspect] = useState<any | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("ALL");
  const [groupBy, setGroupBy] = useState<"FLOOR" | "STATUS" | "ROOM_TYPE" | "COMPACT">("FLOOR");
  const [showDiningQrModal, setShowDiningQrModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Modals state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInRoomId, setCheckInRoomId] = useState<string>("");
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedStayForMove, setSelectedStayForMove] = useState<any>(null);

  // Digital GRC Modal state
  const [showGrcModal, setShowGrcModal] = useState(false);
  const [selectedRegForPrint, setSelectedRegForPrint] = useState<any | null>(null);

  // Digital Check-In Review Modal state
  const reviewIdParam = searchParams.get("reviewId");
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [selectedRegForReview, setSelectedRegForReview] = useState<any | null>(null);
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<"ALL" | "PENDING_REVIEW" | "CHECKED_IN">("ALL");
  const [regSearchQuery, setRegSearchQuery] = useState<string>("");

  const [moveForm, setMoveForm] = useState({
    targetRoomId: "",
    reason: "Guest requested room change",
  });

  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!activeProperty?.id) return;
    setLoading(true);
    try {
      const [roomsRes, staysRes, resRes, regRes] = await Promise.all([
        fetch(`/api/v1/rooms?propertyId=${activeProperty.id}`),
        fetch(`/api/v1/stays?propertyId=${activeProperty.id}`),
        fetch(`/api/v1/reservations?propertyId=${activeProperty.id}`),
        fetch(`/api/v1/registrations?propertyId=${activeProperty.id}`),
      ]);

      const roomsData = await roomsRes.json();
      const staysData = await staysRes.json();
      const resData = await resRes.json();
      const regData = await regRes.json();

      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setStays(Array.isArray(staysData) ? staysData : []);
      setReservations(Array.isArray(resData) ? resData : []);
      setRegistrations(Array.isArray(regData) ? regData : []);
    } catch (err) {
      console.error("PMS data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProperty?.id, refreshKey]);

  // Handle URL reviewId trigger to immediately open review modal
  useEffect(() => {
    if (reviewIdParam) {
      const reg = registrations.find((r) => r.id === reviewIdParam);
      if (reg) {
        setSelectedRegForReview(reg);
        setShowReviewModal(true);
        setActiveTab("registrations");
      } else if (activeProperty?.id) {
        fetch(`/api/v1/registrations?propertyId=${activeProperty.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setRegistrations(data);
              const found = data.find((r: any) => r.id === reviewIdParam);
              if (found) {
                setSelectedRegForReview(found);
                setShowReviewModal(true);
                setActiveTab("registrations");
              }
            }
          })
          .catch((err) => console.error("Error loading review registration:", err));
      }
    }
  }, [reviewIdParam, registrations.length, activeProperty?.id]);

  // Tab switcher
  const handleTabChange = (newTab: "grid" | "inhouse" | "registrations" | "reservations") => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    if (newTab === "grid") {
      params.delete("tab");
    } else {
      params.set("tab", newTab);
    }
    router.replace(`/pms?${params.toString()}`, { scroll: false });
  };

  // Quick Housekeeping Status Toggle right on card
  const handleQuickHKToggle = async (roomId: string, currentHK: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextHK = currentHK === "CLEAN" ? "DIRTY" : "CLEAN";
    try {
      await fetch(`/api/v1/rooms/${roomId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          housekeepingStatus: nextHK,
          reason: `Quick toggle from Front Desk: ${nextHK}`
        }),
      });
      await loadData();
    } catch (err) {
      console.error("Failed to toggle housekeeping status:", err);
    }
  };

  // Quick Direct Checkout Handler
  const handleDirectCheckout = async (stayId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Confirm guest checkout and issue GST Rule 46 Tax Invoice?")) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/stays/${stayId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      alert(`Checkout successful! Invoice ${data.invoice?.invoiceNo || ""} generated.`);
      await loadData();
      await refreshData();
      setSelectedRoomForInspect(null);
    } catch (err: any) {
      alert(`Checkout error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Move Room Submit
  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayForMove || !moveForm.targetRoomId) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/stays/${selectedStayForMove.id}/move-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRoomId: moveForm.targetRoomId,
          reason: moveForm.reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Room move failed");

      setShowMoveModal(false);
      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Move error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics computation (Logical Front Desk KPIs)
  const metrics = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter((r) => r.roomState?.occupancyStatus === "OCCUPIED").length;
    const outOfOrder = rooms.filter(
      (r) =>
        r.roomState?.sellabilityStatus === "OUT_OF_ORDER" ||
        (r.blocks && r.blocks.length > 0) ||
        (r.maintenanceIssues && r.maintenanceIssues.length > 0)
    ).length;
    const vacantClean = rooms.filter(
      (r) =>
        r.roomState?.occupancyStatus === "VACANT" &&
        r.roomState?.housekeepingStatus === "CLEAN" &&
        r.roomState?.sellabilityStatus !== "OUT_OF_ORDER" &&
        (!r.blocks || r.blocks.length === 0) &&
        (!r.maintenanceIssues || r.maintenanceIssues.length === 0)
    ).length;
    const vacantDirty = rooms.filter(
      (r) =>
        r.roomState?.occupancyStatus === "VACANT" &&
        r.roomState?.housekeepingStatus === "DIRTY" &&
        r.roomState?.sellabilityStatus !== "OUT_OF_ORDER" &&
        (!r.blocks || r.blocks.length === 0) &&
        (!r.maintenanceIssues || r.maintenanceIssues.length === 0)
    ).length;
    
    // Bed Counts & Availability Breakdown
    const twinRooms = rooms.filter(r => (r.roomType?.bedType || "").toLowerCase().includes("twin") || r.wing === "TWIN");
    const twinVacant = twinRooms.filter(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN" && r.roomState?.sellabilityStatus !== "OUT_OF_ORDER").length;

    const kingRooms = rooms.filter(r => (r.roomType?.bedType || "").toLowerCase().includes("king") && !r.roomType?.code?.includes("SUITE") && r.wing !== "TWIN");
    const kingVacant = kingRooms.filter(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN" && r.roomState?.sellabilityStatus !== "OUT_OF_ORDER").length;

    const suiteRooms = rooms.filter(r => r.roomType?.code?.includes("SUITE") || r.wing === "SUITE");
    const suiteVacant = suiteRooms.filter(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN" && r.roomState?.sellabilityStatus !== "OUT_OF_ORDER").length;

    const occPercent = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const inHouseStays = stays.filter(s => s.status === "IN_HOUSE");
    const totalPax = inHouseStays.reduce((acc, s) => acc + (s.adults || 1) + (s.children || 0), 0);

    return {
      total,
      occupied,
      vacantClean,
      vacantDirty,
      outOfOrder,
      occPercent,
      totalPax,
      twinTotal: twinRooms.length,
      twinVacant,
      kingTotal: kingRooms.length,
      kingVacant,
      suiteTotal: suiteRooms.length,
      suiteVacant
    };
  }, [rooms, stays]);

  // Helper to categorize bed type of a room
  const getBedCategory = (room: any): "TWIN" | "KING" | "SUITE" => {
    if (room.wing === "SUITE" || room.roomType?.code?.includes("SUITE")) return "SUITE";
    if (room.wing === "TWIN" || (room.roomType?.bedType || "").toLowerCase().includes("twin") || room.roomType?.code?.includes("TWIN")) return "TWIN";
    return "KING";
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const guestName = r.assignments?.[0]?.stay?.primaryGuest?.name || "";
      const matchesSearch =
        !searchQuery ||
        r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.roomType?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (r.roomType?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (r.roomType?.bedType?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        guestName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFloor = floorFilter === "ALL" || String(r.floor) === String(floorFilter);
      const matchesType = roomTypeFilter === "ALL" || r.roomTypeId === roomTypeFilter;

      const isOcc = r.roomState?.occupancyStatus === "OCCUPIED";
      const isClean = r.roomState?.housekeepingStatus === "CLEAN";
      const isDirty = r.roomState?.housekeepingStatus === "DIRTY";
      const isOOO =
        r.roomState?.sellabilityStatus === "OUT_OF_ORDER" ||
        (r.blocks && r.blocks.length > 0) ||
        (r.maintenanceIssues && r.maintenanceIssues.length > 0);

      let matchesStatus = true;
      if (statusFilter === "OCCUPIED") matchesStatus = isOcc;
      else if (statusFilter === "VACANT_CLEAN") matchesStatus = !isOcc && isClean && !isOOO;
      else if (statusFilter === "VACANT_DIRTY") matchesStatus = !isOcc && isDirty && !isOOO;
      else if (statusFilter === "VACANT") matchesStatus = !isOcc && !isOOO;
      else if (statusFilter === "OUT_OF_ORDER") matchesStatus = isOOO;

      return matchesSearch && matchesFloor && matchesType && matchesStatus;
    });
  }, [rooms, searchQuery, floorFilter, roomTypeFilter, statusFilter]);

  // Derived room types
  const roomTypesList = useMemo(() => {
    const map = new Map<string, any>();
    rooms.forEach((r) => {
      if (r.roomType && !map.has(r.roomType.id)) {
        map.set(r.roomType.id, r.roomType);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  // RENDER TRADITIONAL HIGH-LEGIBILITY FRONT DESK ROOM CARD WITH BED CONFIGURATION
  const renderTraditionalRoomCard = (room: any) => {
    const isOccupied = room.roomState?.occupancyStatus === "OCCUPIED";
    const hkStatus = room.roomState?.housekeepingStatus || "CLEAN";
    const activeIssue = room.maintenanceIssues?.[0];
    const isOutOfOrder =
      room.roomState?.sellabilityStatus === "OUT_OF_ORDER" ||
      (room.blocks && room.blocks.length > 0) ||
      Boolean(activeIssue);
    const bedCat = getBedCategory(room);

    // Find active in-house stay for this room
    const activeStay = stays.find(s => 
      s.status === "IN_HOUSE" && s.roomAssignments?.some((ra: any) => ra.roomId === room.id)
    ) || room.assignments?.[0]?.stay;

    const inHouseGuest = activeStay?.primaryGuest;
    const baseTariff = room.roomType?.ratePlans?.[0]?.versions?.[0]?.pricingJson 
      ? JSON.parse(room.roomType.ratePlans[0].versions[0].pricingJson).basePrice 
      : (bedCat === "SUITE" ? 5000 : (room.roomType?.code?.includes("EXEC") ? 2500 : 2000));

    return (
      <div
        key={room.id}
        onClick={() => setSelectedRoomForInspect(room)}
        className={`rounded-2xl border-2 transition-all duration-150 cursor-pointer flex flex-col justify-between p-4 shadow-sm hover:shadow-xl hover:-translate-y-0.5 relative group ${
          isOutOfOrder
            ? "bg-rose-50/90 dark:bg-[#181114] border-rose-300 dark:border-red-900/80 hover:border-rose-500 dark:hover:border-red-600"
            : isOccupied
            ? "bg-blue-50/90 dark:bg-[#101928] border-blue-400 dark:border-blue-600/70 hover:border-blue-600 dark:hover:border-blue-400"
            : hkStatus === "DIRTY"
            ? "bg-amber-50/90 dark:bg-[#1e1910] border-amber-400 dark:border-amber-600/70 hover:border-amber-600 dark:hover:border-amber-400"
            : "bg-emerald-50/90 dark:bg-[#0f1d18] border-emerald-400 dark:border-emerald-600/70 hover:border-emerald-600 dark:hover:border-emerald-400"
        }`}
      >
        {/* Top Header Row: Room Number & Prominent Bed Badge */}
        <div>
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-black/10 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
                  {room.number}
                </span>

                {/* VISIBLE BED CONFIGURATION BADGE */}
                {bedCat === "TWIN" ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-500/50 text-cyan-900 dark:text-cyan-300 uppercase shadow-sm">
                    <span>🛏️🛏️ TWIN</span>
                  </span>
                ) : bedCat === "SUITE" ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/50 text-amber-900 dark:text-amber-300 uppercase shadow-sm">
                    <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <span>SUITE</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-500/50 text-blue-900 dark:text-blue-300 uppercase shadow-sm">
                    <Bed className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span>KING BED</span>
                  </span>
                )}
              </div>

              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[150px] mt-0.5">
                {room.roomType?.name || (bedCat === "TWIN" ? "Deluxe Twin Room" : "Deluxe King Room")}
              </div>
            </div>

            {/* Status Pill with Solid Visual Identity */}
            {isOutOfOrder ? (
              <div className="flex flex-col items-end">
                <span className="rounded-md px-2.5 py-1 text-[11px] font-mono font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-600 shadow-sm flex items-center gap-1">
                  <Wrench className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                  <span>{activeIssue ? activeIssue.issueNo : "⛔ OOO"}</span>
                </span>
                <span className="text-[10px] text-rose-700 dark:text-rose-400 font-mono mt-1 font-bold">
                  {activeIssue ? activeIssue.status : "Out of Order"}
                </span>
              </div>
            ) : isOccupied ? (
              <div className="flex flex-col items-end">
                <span className="rounded-md px-2.5 py-1 text-[11px] font-mono font-black text-white bg-blue-600 border border-blue-400 shadow-sm animate-pulse">
                  🔴 OCCUPIED
                </span>
                <span className="text-[10px] text-blue-700 dark:text-blue-300 font-mono mt-1 font-bold">Floor {room.floor}</span>
              </div>
            ) : hkStatus === "DIRTY" ? (
              <div className="flex flex-col items-end">
                <span className="rounded-md px-2.5 py-1 text-[11px] font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-500 shadow-sm">
                  🧹 DIRTY
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono mt-1 font-bold">Turnover</span>
              </div>
            ) : (
              <div className="flex flex-col items-end">
                <span className="rounded-md px-2.5 py-1 text-[11px] font-mono font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-500 shadow-sm">
                  🟢 VACANT
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-1 font-bold">Ready</span>
              </div>
            )}
          </div>

          {/* Body Content Area */}
          <div className="mt-3 min-h-[60px]">
            {isOccupied && inHouseGuest ? (
              <div className="rounded-xl bg-white/80 dark:bg-black/40 border border-blue-200 dark:border-blue-500/30 p-2.5 space-y-1.5 shadow-xs">
                <div className="font-extrabold text-sm text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">{inHouseGuest.name}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300 font-mono">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Users className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                    {activeStay.adults || 1} Pax • {bedCat === "TWIN" ? "2 Single Beds" : "1 Double Bed"}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    ₹{baseTariff}/nt
                  </span>
                </div>
              </div>
            ) : isOutOfOrder ? (
              <div className="rounded-xl bg-rose-100/90 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/60 p-2.5 space-y-1 text-xs text-rose-900 dark:text-rose-200 shadow-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="font-mono">{activeIssue?.issueNo || "Defect Block"}</span>
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-300 font-bold uppercase">
                    {activeIssue?.priority || "OUT OF ORDER"}
                  </span>
                </div>
                <p className="text-[11px] text-rose-800 dark:text-rose-300 line-clamp-2 leading-tight">
                  {activeIssue ? `${activeIssue.assetText ? `${activeIssue.assetText} • ` : ""}${activeIssue.description}` : "Room Blocked for Maintenance"}
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-white/80 dark:bg-black/30 border border-zinc-200/80 dark:border-white/5 p-2.5 space-y-1 text-xs shadow-xs">
                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span className="font-semibold">Tariff (EP):</span>
                  <strong className="text-zinc-900 dark:text-white font-mono font-bold text-sm">₹{baseTariff}</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>Bed Setup:</span>
                  <strong className="text-zinc-700 dark:text-zinc-200">
                    {bedCat === "TWIN" ? "2x Single Beds (Twin)" : bedCat === "SUITE" ? "1x King Bed + Lounge" : "1x King Bed (Double)"}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Actions Footer: Big, Easy Click Targets */}
        <div className="mt-3.5 pt-2.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
          {isOccupied && activeStay ? (
            <div className="flex items-center gap-1.5 w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/billing?stayId=${activeStay.id}`);
                }}
                className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition shadow-sm"
                title="Open Folio & GST Billing"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Folio</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStayForMove(activeStay);
                  setShowMoveModal(true);
                }}
                className="h-9 px-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-white/10 dark:hover:bg-white/20 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1 transition"
                title="Move Room"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={(e) => handleDirectCheckout(activeStay.id, e)}
                className="h-9 px-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1 transition"
                title="Checkout Guest"
              >
                Checkout
              </button>
            </div>
          ) : !isOutOfOrder ? (
            <div className="flex items-center gap-1.5 w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCheckInRoomId(room.id);
                  setShowCheckInModal(true);
                }}
                className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>+ Check-In</span>
              </button>

              <button
                onClick={(e) => handleQuickHKToggle(room.id, hkStatus, e)}
                className={`h-9 px-2.5 rounded-xl font-semibold text-xs flex items-center justify-center transition border ${
                  hkStatus === "CLEAN"
                    ? "bg-zinc-200 hover:bg-amber-100 dark:bg-white/10 dark:hover:bg-amber-500/20 text-zinc-700 hover:text-amber-800 dark:text-zinc-300 dark:hover:text-amber-300 border-zinc-300 dark:border-white/10"
                    : "bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40"
                }`}
                title={hkStatus === "CLEAN" ? "Mark Room Dirty" : "Mark Room Clean"}
              >
                {hkStatus === "CLEAN" ? "🧹" : "✨"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/maintenance");
                }}
                className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                title="View & Resolve Maintenance Issue"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>View Ticket ({activeIssue?.issueNo || "Defect"})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 p-3 sm:p-6 space-y-6 transition-colors duration-150">
      
      {/* 1. TOP MASTER HEADER & ACTION BAR */}
      <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 shadow-sm dark:shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-black text-base flex items-center justify-center shadow-md">
                P
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  Front Desk & Room Inventory Rack
                </h1>
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    {activeProperty?.displayName || "Hotel Ambarish Grand Residency"}
                  </span>
                  <span>•</span>
                  <span>GSTIN: {activeProperty?.gstin || "18AACCB2447F1ZX"}</span>
                  <span>•</span>
                  <span>Date: {activeProperty?.businessDate || "2026-08-24"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Dining QRs */}
            <button
              onClick={() => setShowDiningQrModal(true)}
              className="h-10 px-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 transition shadow-sm"
            >
              <UtensilsCrossed className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <span>Dining QRs</span>
            </button>

            {/* Self Check-In QR */}
            <button
              onClick={() => setShowQrModal(true)}
              className="h-10 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition shadow-sm"
            >
              <QrCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Kiosk QR</span>
            </button>

            {/* Walk-in Check-in Primary Action */}
            <button
              onClick={() => {
                const vacantRoom = rooms.find(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN");
                setCheckInRoomId(vacantRoom?.id || "");
                setShowCheckInModal(true);
              }}
              className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-2 transition shadow-lg shadow-blue-600/30"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Walk-In Check-In</span>
            </button>
          </div>
        </div>

        {/* 2. MASTER RECEPTIONIST OPERATIONAL KPI RACK */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-1 shadow-xs">
            <div className="text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Total Rooms</div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white font-mono">{metrics.total}</div>
            <div className="text-[11px] text-zinc-500">Floors 1 to 5</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "OCCUPIED" ? "ALL" : "OCCUPIED")}
            className={`rounded-xl border-2 p-3.5 space-y-1 cursor-pointer transition ${
              statusFilter === "OCCUPIED"
                ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 shadow-md"
                : "bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-700"
            }`}
          >
            <div className="text-[11px] uppercase font-mono font-bold tracking-wider text-blue-700 dark:text-blue-400 flex items-center justify-between">
              <span>Occupied</span>
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-400 font-mono">{metrics.occupied}</div>
            <div className="text-[11px] text-blue-800 dark:text-blue-300 font-medium">{metrics.occPercent}% Occupancy ({metrics.totalPax} Pax)</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "VACANT_CLEAN" ? "ALL" : "VACANT_CLEAN")}
            className={`rounded-xl border-2 p-3.5 space-y-1 cursor-pointer transition ${
              statusFilter === "VACANT_CLEAN"
                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 shadow-md"
                : "bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-700"
            }`}
          >
            <div className="text-[11px] uppercase font-mono font-bold tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
              <span>Vacant Ready</span>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">{metrics.vacantClean}</div>
            <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">Ready to Sell</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "VACANT_DIRTY" ? "ALL" : "VACANT_DIRTY")}
            className={`rounded-xl border-2 p-3.5 space-y-1 cursor-pointer transition ${
              statusFilter === "VACANT_DIRTY"
                ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 shadow-md"
                : "bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-700"
            }`}
          >
            <div className="text-[11px] uppercase font-mono font-bold tracking-wider text-amber-700 dark:text-amber-400 flex items-center justify-between">
              <span>Housekeeping</span>
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">{metrics.vacantDirty}</div>
            <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">Dirty / Turnover</div>
          </div>

          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-1 shadow-xs">
            <div className="text-[11px] uppercase font-mono font-bold tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center justify-between">
              <span>Expected Arrivals</span>
              <ArrowRightLeft className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-700 dark:text-cyan-300 font-mono">0</div>
            <div className="text-[11px] text-zinc-500">Due In Today</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "OUT_OF_ORDER" ? "ALL" : "OUT_OF_ORDER")}
            className={`rounded-xl border-2 p-3.5 space-y-1 cursor-pointer transition ${
              statusFilter === "OUT_OF_ORDER"
                ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 shadow-md"
                : "bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-rose-500 dark:hover:border-rose-700"
            }`}
          >
            <div className="text-[11px] uppercase font-mono font-bold tracking-wider text-rose-700 dark:text-rose-400 flex items-center justify-between">
              <span>Maintenance / OOO</span>
              <Wrench className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">{metrics.outOfOrder}</div>
            <div className="text-[11px] text-rose-800 dark:text-rose-300 font-medium">Blocked / Repairs</div>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleTabChange("grid")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "grid"
                ? "bg-blue-600 dark:bg-white text-white dark:text-zinc-950 shadow-md font-black"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 font-bold"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Room Rack Grid ({filteredRooms.length})</span>
          </button>

          <button
            onClick={() => handleTabChange("inhouse")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "inhouse"
                ? "bg-blue-600 dark:bg-white text-white dark:text-zinc-950 shadow-md font-black"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 font-bold"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>In-House Guest Roster ({stays.filter(s => s.status === "IN_HOUSE").length})</span>
          </button>

          <button
            onClick={() => handleTabChange("registrations")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "registrations"
                ? "bg-blue-600 dark:bg-white text-white dark:text-zinc-950 shadow-md font-black"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 font-bold"
            }`}
          >
            <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <span>Digital GRC & Check-In Queue ({registrations.length})</span>
            {registrations.filter((r) => r.status === "PENDING_REVIEW").length > 0 && (
              <span className="rounded-full bg-amber-500 text-zinc-950 px-2 py-0.5 text-[10px] font-black font-mono animate-pulse">
                {registrations.filter((r) => r.status === "PENDING_REVIEW").length} Pending Review
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange("reservations")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "reservations"
                ? "bg-blue-600 dark:bg-white text-white dark:text-zinc-950 shadow-md font-black"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 font-bold"
            }`}
          >
            <Calendar className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <span>Future Reservations ({reservations.length})</span>
          </button>
        </div>

        {/* View Switcher & Search Bar for Room Grid */}
        {activeTab === "grid" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <button
                onClick={() => setGroupBy("FLOOR")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  groupBy === "FLOOR" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-black" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Floor Racks
              </button>
              <button
                onClick={() => setGroupBy("STATUS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  groupBy === "STATUS" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-black" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                By Status
              </button>
              <button
                onClick={() => setGroupBy("ROOM_TYPE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  groupBy === "ROOM_TYPE" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-black" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                By Category
              </button>
              <button
                onClick={() => setGroupBy("COMPACT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  groupBy === "COMPACT" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-black" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Unified
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search Room #, Guest, Bed..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono w-48 shadow-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. TAB CONTENT 1: ROOM RACK GRID */}
      {activeTab === "grid" && (
        <div className="space-y-8">
          {/* DISPLAY MODE 1: TRADITIONAL FLOOR-BY-FLOOR RACKS */}
          {groupBy === "FLOOR" && (
            <div className="space-y-8">
              {Array.from(new Set(filteredRooms.map((r) => r.floor)))
                .filter(Boolean)
                .sort((a, b) => a - b)
                .map((floorNum) => {
                  const floorRooms = filteredRooms.filter((r) => r.floor === floorNum);
                  const occCount = floorRooms.filter((r) => r.roomState?.occupancyStatus === "OCCUPIED").length;

                  return (
                    <div key={floorNum} className="space-y-3.5">
                      {/* Floor Header Bar with Bed Breakdown */}
                      <div className="flex items-center justify-between pb-2 border-b-2 border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-mono font-black text-xs text-zinc-900 dark:text-white">
                            F{floorNum}
                          </div>
                          <div>
                            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                              Floor {floorNum} Racks ({floorRooms.length} Rooms)
                            </h2>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="text-blue-700 dark:text-blue-400 font-bold">{occCount} Occupied</span>
                          <span className="text-zinc-400 dark:text-zinc-600">|</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">{floorRooms.length - occCount} Vacant Ready</span>
                        </div>
                      </div>

                      {/* Floor Rooms Rack */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {floorRooms.map(renderTraditionalRoomCard)}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* DISPLAY MODE 2: STATUS GROUPING */}
          {groupBy === "STATUS" && (
            <div className="space-y-8">
              {filteredRooms.filter(r => r.roomState?.occupancyStatus === "OCCUPIED").length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-blue-200 dark:border-blue-900/60">
                    <span className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 font-mono">
                      Occupied Rooms ({filteredRooms.filter(r => r.roomState?.occupancyStatus === "OCCUPIED").length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {filteredRooms.filter(r => r.roomState?.occupancyStatus === "OCCUPIED").map(renderTraditionalRoomCard)}
                  </div>
                </div>
              )}

              {filteredRooms.filter(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN").length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-emerald-200 dark:border-emerald-900/60">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono">
                      Vacant Clean & Ready ({filteredRooms.filter(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN").length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {filteredRooms.filter(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN").map(renderTraditionalRoomCard)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DISPLAY MODE 3: BY CATEGORY / ROOM TYPE */}
          {groupBy === "ROOM_TYPE" && (
            <div className="space-y-8">
              {roomTypesList.map((rt) => {
                const typeRooms = filteredRooms.filter((r) => r.roomTypeId === rt.id);
                if (typeRooms.length === 0) return null;
                const occCount = typeRooms.filter((r) => r.roomState?.occupancyStatus === "OCCUPIED").length;

                return (
                  <div key={rt.id} className="space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b-2 border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-mono font-black text-xs text-zinc-900 dark:text-white">
                          {rt.code.slice(0, 3)}
                        </div>
                        <div>
                          <h2 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                            <span>{rt.name}</span>
                            <span className="text-xs font-mono font-normal text-zinc-500 dark:text-zinc-400">({rt.bedType})</span>
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-blue-700 dark:text-blue-400 font-bold">{occCount} Occupied</span>
                        <span className="text-zinc-400 dark:text-zinc-600">|</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">{typeRooms.length - occCount} Vacant</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {typeRooms.map(renderTraditionalRoomCard)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DISPLAY MODE 4: UNIFIED */}
          {groupBy === "COMPACT" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredRooms.map(renderTraditionalRoomCard)}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT 2: IN-HOUSE GUEST LEDGER ROSTER */}
      {activeTab === "inhouse" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden shadow-sm dark:shadow-xl">
          <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                In-House Guest Roster
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Active resident guests currently staying in the property with live folio balances.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
              {stays.filter(s => s.status === "IN_HOUSE").length} Active Stays ({metrics.totalPax} Guests)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Room #</th>
                  <th className="px-4 py-3.5 font-bold">Bed Setup</th>
                  <th className="px-4 py-3.5 font-bold">Guest Name</th>
                  <th className="px-4 py-3.5 font-bold">Phone Number</th>
                  <th className="px-4 py-3.5 font-bold">Pax</th>
                  <th className="px-4 py-3.5 font-bold">Arrival Date</th>
                  <th className="px-4 py-3.5 font-bold">Departure</th>
                  <th className="px-4 py-3.5 font-bold">Folio / Tariff</th>
                  <th className="px-4 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium">
                {stays.filter(s => s.status === "IN_HOUSE").map((stay) => {
                  const roomAssignment = stay.roomAssignments?.[0]?.room;
                  const roomNumber = roomAssignment?.number || "N/A";
                  const bedCat = roomAssignment ? getBedCategory(roomAssignment) : "KING";
                  const guestName = stay.primaryGuest?.name || "Valued Guest";
                  const guestPhone = stay.primaryGuest?.phone || "N/A";
                  const arrival = stay.arrivalAt ? new Date(stay.arrivalAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
                  const departure = stay.expectedDepartureAt ? new Date(stay.expectedDepartureAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";

                  return (
                    <tr key={stay.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                      <td className="px-4 py-3.5 font-bold text-sm font-mono text-zinc-900 dark:text-white">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/40 text-blue-800 dark:text-blue-300">
                          {roomNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs">
                        {bedCat === "TWIN" ? (
                          <span className="text-cyan-700 dark:text-cyan-400 font-bold">🛏️🛏️ Twin Beds</span>
                        ) : bedCat === "SUITE" ? (
                          <span className="text-purple-700 dark:text-purple-400 font-bold">👑 Suite Lounge</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-bold">🛏️ King Bed</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-zinc-900 dark:text-white text-sm">{guestName}</td>
                      <td className="px-4 py-3.5 font-mono text-zinc-600 dark:text-zinc-300">{guestPhone}</td>
                      <td className="px-4 py-3.5 font-mono text-zinc-600 dark:text-zinc-300">{stay.adults || 1} Adults</td>
                      <td className="px-4 py-3.5 font-mono text-zinc-600 dark:text-zinc-300">{arrival}</td>
                      <td className="px-4 py-3.5 font-mono text-zinc-600 dark:text-zinc-300">{departure}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatINR(stay.folio?.balance || 0)}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => router.push(`/billing?stayId=${stay.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs transition shadow-xs"
                        >
                          Folio
                        </button>
                        <button
                          onClick={(e) => handleDirectCheckout(stay.id, e)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 font-bold text-white text-xs transition shadow-xs"
                        >
                          Checkout
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT 3: GRC REGISTRATIONS DIRECTORY & DIGITAL QUEUE */}
      {activeTab === "registrations" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden shadow-sm dark:shadow-xl space-y-4">
          <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Digital Guest Registrations & Self Check-In Review Queue
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Review digital kiosk/smartphone submissions, inspect photo ID & signature, assign rooms, and fulfill 1-click check-ins.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                <button
                  onClick={() => setRegistrationStatusFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    registrationStatusFilter === "ALL"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-black"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  All ({registrations.length})
                </button>
                <button
                  onClick={() => setRegistrationStatusFilter("PENDING_REVIEW")}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                    registrationStatusFilter === "PENDING_REVIEW"
                      ? "bg-amber-500 text-zinc-950 shadow-xs font-black"
                      : "text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/10"
                  }`}
                >
                  <span>⏳ Pending Review</span>
                  <span className="font-mono">
                    ({registrations.filter((r) => r.status === "PENDING_REVIEW").length})
                  </span>
                </button>
                <button
                  onClick={() => setRegistrationStatusFilter("CHECKED_IN")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    registrationStatusFilter === "CHECKED_IN"
                      ? "bg-emerald-600 text-white shadow-xs font-black"
                      : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10"
                  }`}
                >
                  ✓ Checked In ({registrations.filter((r) => r.status === "CHECKED_IN").length})
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar for Registrations */}
          <div className="px-4 sm:px-6">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by guest name, mobile phone, registration number, or room..."
                value={regSearchQuery}
                onChange={(e) => setRegSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-10 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 transition font-mono shadow-xs"
              />
              {regSearchQuery && (
                <button
                  onClick={() => setRegSearchQuery("")}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  <th className="px-4 py-3.5 font-bold">GRC Number</th>
                  <th className="px-4 py-3.5 font-bold">Guest Full Name</th>
                  <th className="px-4 py-3.5 font-bold">Contact Mobile</th>
                  <th className="px-4 py-3.5 font-bold">Room Allocated</th>
                  <th className="px-4 py-3.5 font-bold">Submission Date</th>
                  <th className="px-4 py-3.5 font-bold">City / State</th>
                  <th className="px-4 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium">
                {registrations
                  .filter((reg) => {
                    if (registrationStatusFilter === "PENDING_REVIEW" && reg.status !== "PENDING_REVIEW") return false;
                    if (registrationStatusFilter === "CHECKED_IN" && reg.status !== "CHECKED_IN") return false;
                    if (regSearchQuery.trim()) {
                      const q = regSearchQuery.toLowerCase();
                      const name = (reg.fullName || "").toLowerCase();
                      const phone = (reg.mobilePhone || "").toLowerCase();
                      const grc = (reg.registrationNo || "").toLowerCase();
                      const room = (reg.assignedRoomNumber || reg.preAssignedRoom || "").toLowerCase();
                      return name.includes(q) || phone.includes(q) || grc.includes(q) || room.includes(q);
                    }
                    return true;
                  })
                  .slice(0, 50)
                  .map((reg) => {
                    const isPending = reg.status === "PENDING_REVIEW";
                    return (
                      <tr
                        key={reg.id}
                        className={`transition ${
                          isPending ? "bg-amber-50/70 dark:bg-amber-950/10 hover:bg-amber-100/70 dark:hover:bg-amber-950/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              isPending
                                ? "bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 animate-pulse"
                                : "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30"
                            }`}
                          >
                            {isPending ? "⏳ PENDING REVIEW" : "✓ CHECKED IN"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">{reg.registrationNo}</td>
                        <td className="px-4 py-3.5 font-bold text-zinc-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{reg.fullName}</span>
                            {reg.idPhotoUrl && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-mono">
                                ID Photo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-zinc-600 dark:text-zinc-300">{reg.mobilePhone || "N/A"}</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-zinc-900 dark:text-white">
                          <span
                            className={`px-2 py-0.5 rounded border ${
                              isPending
                                ? "bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300"
                                : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
                            }`}
                          >
                            {reg.assignedRoomNumber
                              ? `Room ${reg.assignedRoomNumber}`
                              : reg.preAssignedRoom
                              ? `Requested ${reg.preAssignedRoom}`
                              : "Unassigned"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-zinc-500 dark:text-zinc-400">{reg.arrivalDateTime || "N/A"}</td>
                        <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">{reg.city || "—"}, {reg.state || "—"}</td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Primary Review Button */}
                            <button
                              onClick={() => {
                                setSelectedRegForReview(reg);
                                setShowReviewModal(true);
                              }}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition shadow-sm ${
                                isPending
                                  ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20 font-black active:scale-95"
                                  : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700"
                              }`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>{isPending ? "Review & Check-In" : "Review Details"}</span>
                            </button>

                            {/* View / Print GRC */}
                            <button
                              onClick={() => {
                                setSelectedRegForPrint(reg);
                                setShowGrcModal(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/40 border border-blue-200 dark:border-blue-500/40 font-bold text-blue-700 dark:text-blue-300 text-xs inline-flex items-center gap-1 transition shadow-xs"
                              title="View & Print Official GRC"
                            >
                              <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span className="hidden sm:inline">GRC</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {registrations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500 font-mono text-xs">
                      No digital registrations recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. SLIDE-OVER ROOM INSPECTOR DRAWER WITH BED SETUP DETAILS */}
      {selectedRoomForInspect && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white dark:bg-[#121215] border-l border-zinc-200 dark:border-zinc-800 p-6 space-y-6 shadow-2xl overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black font-mono text-zinc-900 dark:text-white">
                    Room {selectedRoomForInspect.number}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white">
                    {selectedRoomForInspect.roomType?.code}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedRoomForInspect(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Room & Bed Specifications */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 space-y-2.5 text-xs shadow-xs">
                <div className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px] mb-1 flex items-center justify-between">
                  <span>Physical Bed & Room Configuration</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">Floor {selectedRoomForInspect.floor}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">Bed Configuration:</span>
                  <strong className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                    {getBedCategory(selectedRoomForInspect) === "TWIN" ? "🛏️🛏️ 2x Single Beds (Twin Setup)" : getBedCategory(selectedRoomForInspect) === "SUITE" ? "👑 1x King Bed + Living Lounge" : "🛏️ 1x King Bed (Double Large)"}
                  </strong>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">Category Name:</span>
                  <strong className="text-zinc-900 dark:text-white">{selectedRoomForInspect.roomType?.name}</strong>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">Max Guest Capacity:</span>
                  <strong className="text-zinc-900 dark:text-white font-mono">Max {selectedRoomForInspect.roomType?.capacity || 2} Adults (+1 Extra Bed)</strong>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-zinc-500 dark:text-zinc-400">Housekeeping Status:</span>
                  <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${
                    selectedRoomForInspect.roomState?.housekeepingStatus === "CLEAN" 
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40"
                      : "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40"
                  }`}>
                    {selectedRoomForInspect.roomState?.housekeepingStatus || "CLEAN"}
                  </span>
                </div>
              </div>

              {/* In-House Guest Details if Occupied */}
              {selectedRoomForInspect.roomState?.occupancyStatus === "OCCUPIED" ? (
                <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3 shadow-xs">
                  <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <User className="h-4 w-4" />
                    In-House Guest Information
                  </div>

                  {(() => {
                    const activeStay = stays.find(s => 
                      s.status === "IN_HOUSE" && s.roomAssignments?.some((ra: any) => ra.roomId === selectedRoomForInspect.id)
                    ) || selectedRoomForInspect.assignments?.[0]?.stay;

                    if (!activeStay) return <div className="text-xs text-zinc-500 dark:text-zinc-400">No active stay details found.</div>;

                    return (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Guest Name:</span><strong className="text-zinc-900 dark:text-white font-bold text-sm">{activeStay.primaryGuest?.name}</strong></div>
                        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Mobile Phone:</span><strong className="text-zinc-900 dark:text-white font-mono">{activeStay.primaryGuest?.phone || "N/A"}</strong></div>
                        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Occupants:</span><strong className="text-zinc-900 dark:text-white font-mono">{activeStay.adults} Adults</strong></div>
                        <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">Folio Balance:</span><strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold text-sm">{formatINR(activeStay.folio?.balance || 0)}</strong></div>

                        <div className="pt-3 border-t border-blue-200 dark:border-blue-900/40 flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setSelectedRoomForInspect(null);
                              router.push(`/billing?stayId=${activeStay.id}`);
                            }}
                            className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition flex items-center justify-center gap-2 shadow-xs"
                          >
                            <Receipt className="h-4 w-4" />
                            <span>View Folio & Billing</span>
                          </button>

                          <button
                            onClick={(e) => handleDirectCheckout(activeStay.id, e)}
                            className="w-full h-10 rounded-xl bg-rose-600/90 hover:bg-rose-600 font-bold text-xs text-white transition flex items-center justify-center gap-2 shadow-xs"
                          >
                            <span>Checkout & Print GST Invoice</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setCheckInRoomId(selectedRoomForInspect.id);
                      setSelectedRoomForInspect(null);
                      setShowCheckInModal(true);
                    }}
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-extrabold text-sm text-white transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Check-In Guest to Room {selectedRoomForInspect.number}</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 8. DEDICATED GRC INTAKE MODAL (PHYSICAL GRC PAPER ENTRY & DIGITAL QR KIOSK) */}
      {showCheckInModal && (
        <GrcIntakeModal
          isOpen={showCheckInModal}
          initialRoomId={checkInRoomId}
          rooms={rooms}
          activeProperty={activeProperty}
          onClose={() => setShowCheckInModal(false)}
          onSuccess={async (result) => {
            setShowCheckInModal(false);
            await loadData();
            await refreshData();
            if (result?.registration) {
              setSelectedRegForPrint(result.registration);
              setShowGrcModal(true);
            }
          }}
        />
      )}

      {/* 9. DIGITAL GRC FORM MODAL & POLICE DOSSIER */}
      {showGrcModal && selectedRegForPrint && (
        <PrintableGrcModal
          isOpen={showGrcModal}
          property={{
            displayName: activeProperty?.displayName || "Hotel Ambarish Grand Residency",
            legalName: activeProperty?.legalName || "AMBARISH RESIDENCY",
            address: activeProperty?.address || "MD SHAH ROAD, PALTAN BAZAR, GUWAHATI, ASSAM - 781008",
            phone: activeProperty?.phone || "9864341211",
            code: activeProperty?.code || "GUW-01",
            gstin: activeProperty?.gstin || "18AACCB2447F1ZX",
          }}
          data={{
            grcNo: selectedRegForPrint.registrationNo,
            roomNumber: selectedRegForPrint.assignedRoomNumber || selectedRegForPrint.preAssignedRoom || "301",
            arrivalDateTime: selectedRegForPrint.arrivalDateTime,
            expectedDepartureDate: selectedRegForPrint.expectedDepartureDate,
            fullName: selectedRegForPrint.fullName,
            mobilePhone: selectedRegForPrint.mobilePhone || "N/A",
            alternatePhone: selectedRegForPrint.alternatePhone,
            email: selectedRegForPrint.email,
            city: selectedRegForPrint.city,
            state: selectedRegForPrint.state,
            pinZipCode: selectedRegForPrint.pinZipCode,
            country: selectedRegForPrint.country || "India",
            policeStation: selectedRegForPrint.policeStation,
            age: selectedRegForPrint.age,
            gender: selectedRegForPrint.gender,
            nationality: selectedRegForPrint.nationality || "Indian",
            fatherSpouseName: selectedRegForPrint.fatherSpouseName,
            profession: selectedRegForPrint.profession,
            streetAddress: selectedRegForPrint.streetAddress,
            arrivedFrom: selectedRegForPrint.arrivedFrom,
            goingTo: selectedRegForPrint.goingTo,
            purposeOfVisit: selectedRegForPrint.purposeOfVisit,
            vehicleNumber: selectedRegForPrint.vehicleNumber,
            idType: selectedRegForPrint.idType,
            idLast4: selectedRegForPrint.idLast4,
            idDocumentType: selectedRegForPrint.idDocumentType,
            idDocumentNumber: selectedRegForPrint.idDocumentNumber,
            foreignDetails: selectedRegForPrint.foreignDetails,
            coGuests: selectedRegForPrint.coGuests,
          }}
          onClose={() => setShowGrcModal(false)}
        />
      )}

      {/* 10. DINING & QR MODALS */}
      {showDiningQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 max-w-md w-full space-y-4 text-center shadow-2xl">
            <UtensilsCrossed className="h-8 w-8 text-amber-500 dark:text-amber-400 mx-auto" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">In-Room Dining QR Portals</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Each room has a direct QR code for contactless in-room food ordering.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <a
                href={`/order?property=${activeProperty?.code || "GUW-01"}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-xs text-zinc-950 transition shadow-sm"
              >
                Open Dining Menu ↗
              </a>
              <button
                onClick={() => setShowDiningQrModal(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. GUEST SELF CHECK-IN QR MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 max-w-md w-full space-y-4 text-center shadow-2xl">
            <QrCode className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Guest Self-Check-in Kiosk</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Direct digital check-in portal for guests arriving at the lobby.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <a
                href="/checkin"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition shadow-sm"
              >
                Open Kiosk ↗
              </a>
              <button
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. MOVE ROOM MODAL */}
      {showMoveModal && selectedStayForMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Move Room / Room Change</h3>
              </div>
              <button onClick={() => setShowMoveModal(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMoveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Select New Vacant Room *</label>
                <select
                  required
                  value={moveForm.targetRoomId}
                  onChange={(e) => setMoveForm({ ...moveForm, targetRoomId: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Choose New Vacant Room --</option>
                  {rooms
                    .filter(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN")
                    .map((r) => {
                      const bedCat = getBedCategory(r);
                      return (
                        <option key={r.id} value={r.id}>
                          Room {r.number} - {r.roomType?.name} [{bedCat === "TWIN" ? "🛏️🛏️ Twin" : "🛏️ King"}] (Floor {r.floor})
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Reason for Room Change</label>
                <input
                  type="text"
                  value={moveForm.reason}
                  onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs transition shadow-sm"
                >
                  {actionLoading ? "Moving..." : "Confirm Move"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIGITAL CHECK-IN REVIEW & FULFILLMENT MODAL */}
      <DigitalCheckInReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedRegForReview(null);
          const params = new URLSearchParams(searchParams.toString());
          params.delete("reviewId");
          router.replace(`/pms?${params.toString()}`, { scroll: false });
        }}
        registration={selectedRegForReview}
        rooms={rooms}
        onFulfilled={() => {
          loadData();
          refreshData();
        }}
        onOpenGrcPrint={(reg) => {
          setSelectedRegForPrint(reg);
          setShowGrcModal(true);
        }}
      />

      {/* 13. ROOM INSPECTOR & MAINTENANCE DETAILS MODAL */}
      {selectedRoomForInspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-700 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
                    Room {selectedRoomForInspect.number}
                  </span>
                  <span className="rounded-lg px-2.5 py-1 text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    Floor {selectedRoomForInspect.floor}
                  </span>
                </div>
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1">
                  {selectedRoomForInspect.roomType?.name} • {getBedCategory(selectedRoomForInspect) === "TWIN" ? "🛏️🛏️ Twin Beds" : "🛏️ King Bed"}
                </p>
              </div>

              <button
                onClick={() => setSelectedRoomForInspect(null)}
                className="h-8 w-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Room State & Quick HK Actions */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block">Occupancy</span>
                <span className={`text-sm font-extrabold font-mono mt-0.5 block ${
                  selectedRoomForInspect.roomState?.occupancyStatus === "OCCUPIED"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {selectedRoomForInspect.roomState?.occupancyStatus === "OCCUPIED" ? "🔴 OCCUPIED" : "🟢 VACANT"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block">Housekeeping</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className={`text-sm font-extrabold font-mono ${
                    selectedRoomForInspect.roomState?.housekeepingStatus === "CLEAN"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {selectedRoomForInspect.roomState?.housekeepingStatus === "CLEAN" ? "✨ CLEAN" : "🧹 DIRTY"}
                  </span>
                  <button
                    onClick={async () => {
                      const newStatus = selectedRoomForInspect.roomState?.housekeepingStatus === "CLEAN" ? "DIRTY" : "CLEAN";
                      await handleQuickHKToggle(selectedRoomForInspect.id, selectedRoomForInspect.roomState?.housekeepingStatus || "CLEAN");
                      setSelectedRoomForInspect((prev: any) => ({
                        ...prev,
                        roomState: { ...prev.roomState, housekeepingStatus: newStatus }
                      }));
                    }}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Toggle
                  </button>
                </div>
              </div>
            </div>

            {/* Maintenance & Defects Section */}
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200">
                    Maintenance & Defect Tickets
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400">
                  {selectedRoomForInspect.maintenanceIssues?.length || 0} Open
                </span>
              </div>

              {selectedRoomForInspect.maintenanceIssues && selectedRoomForInspect.maintenanceIssues.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedRoomForInspect.maintenanceIssues.map((issue: any) => (
                    <div
                      key={issue.id}
                      className="p-3 rounded-xl bg-white dark:bg-[#181214] border border-rose-200 dark:border-rose-800/60 text-xs space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-rose-700 dark:text-rose-400">{issue.issueNo}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-300">
                            {issue.priority}
                          </span>
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {issue.status}
                          </span>
                        </div>
                      </div>

                      <div className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                        {issue.assetText ? `${issue.assetText} • ` : ""}{issue.category}
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-snug">
                        {issue.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  ✓ No open maintenance defects for this room.
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-rose-200/60 dark:border-rose-900/30">
                <button
                  onClick={() => {
                    setSelectedRoomForInspect(null);
                    router.push("/maintenance");
                  }}
                  className="rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 px-4 py-2 text-xs font-bold transition hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Go to Maintenance Desk →</span>
                </button>
              </div>
            </div>

            {/* Footer Close */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRoomForInspect(null)}
                className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function PMSPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] text-zinc-400 p-8 font-mono text-xs">Loading Hotel Front Desk PMS...</div>}>
      <PMSFrontDeskContent />
    </Suspense>
  );
}
