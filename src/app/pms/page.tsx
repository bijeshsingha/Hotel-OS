"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR } from "@/lib/gst/calculator";
import { formatGuestDisplayName } from "@/lib/domain/name-utils";
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
  Minus,
  ArrowRight,
  Receipt,
  Sparkles,
  ChevronRight,
  Check,
  Bed,
  Crown,
  Wrench,
  Briefcase,
  Building2,
  DollarSign,
  TrendingUp,
  Filter,
  ArrowUpDown,
  Tag,
  Globe,
} from "lucide-react";

import { useSearchParams, useRouter } from "next/navigation";
import { PrintableGrcModal, GrcData } from "@/components/pms/printable-grc";
import { GrcIntakeModal } from "@/components/pms/grc-intake-modal";
import { DigitalCheckInReviewModal } from "@/components/pms/digital-checkin-review-modal";
import { NewReservationModal } from "@/components/pms/new-reservation-modal";
import { ReservationVoucherModal } from "@/components/pms/reservation-voucher-modal";
import { CompanyDirectoryModal } from "@/components/pms/company-directory-modal";
import { apiCache } from "@/lib/cache/api-cache";

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

  // Future Reservations Suite state
  const [showNewResModal, setShowNewResModal] = useState(false);
  const [showResVoucherModal, setShowResVoucherModal] = useState(false);
  const [showCompanyDirectoryModal, setShowCompanyDirectoryModal] = useState(false);
  const [selectedResForVoucher, setSelectedResForVoucher] = useState<any | null>(null);
  const [resForCheckIn, setResForCheckIn] = useState<any | null>(null);
  const [resStatusFilter, setResStatusFilter] = useState<"ALL" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED">("CONFIRMED");
  const [resDateScope, setResDateScope] = useState<"UPCOMING" | "TODAY" | "TOMORROW" | "NEXT_7_DAYS" | "THIS_MONTH" | "SPECIFIC_DATE" | "ALL_TIME">("UPCOMING");
  const [resSpecificDate, setResSpecificDate] = useState<string>("");
  const [resCategoryFilter, setResCategoryFilter] = useState<string>("ALL");
  const [resSearchQuery, setResSearchQuery] = useState("");


  // Digital Check-In Review Modal state
  const reviewIdParam = searchParams.get("reviewId");
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [selectedRegForReview, setSelectedRegForReview] = useState<any | null>(null);
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<"ALL" | "PENDING_REVIEW" | "CHECKED_IN">("ALL");
  const [regSearchQuery, setRegSearchQuery] = useState<string>("");

  const [moveForm, setMoveForm] = useState({
    fromRoomId: "",
    fromRoomNumber: "",
    targetRoomId: "",
    reason: "Guest requested room change",
    rateHandling: "RETAIN_RATE" as "RETAIN_RATE" | "USE_TARGET_BASE" | "COMPLIMENTARY",
  });

  // Add Room to In-House Guest Modal State
  const [showAddRoomModal, setShowAddRoomModal] = useState<boolean>(false);
  const [addRoomForm, setAddRoomForm] = useState({
    stayId: "",
    roomId: "",
    agreedTariff: "",
    isComplimentary: false,
    extraBeds: 0,
    extraBedRate: 500,
  });

  const [actionLoading, setActionLoading] = useState(false);

  // Global Escape key listener to close active modals

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedRoomForInspect) setSelectedRoomForInspect(null);
        if (showCheckInModal) setShowCheckInModal(false);
        if (showMoveModal) setShowMoveModal(false);
        if (showGrcModal) setShowGrcModal(false);
        if (showNewResModal) setShowNewResModal(false);
        if (showResVoucherModal) setShowResVoucherModal(false);
        if (showCompanyDirectoryModal) setShowCompanyDirectoryModal(false);
        if (showReviewModal) setShowReviewModal(false);
        if (showAddRoomModal) setShowAddRoomModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedRoomForInspect,
    showCheckInModal,
    showMoveModal,
    showGrcModal,
    showNewResModal,
    showResVoucherModal,
    showCompanyDirectoryModal,
    showReviewModal,
    showAddRoomModal,
  ]);

  const loadData = async (forceFresh = false) => {
    const propId = activeProperty?.id || "prop_ambarish";
    const roomsUrl = `/api/v1/rooms?propertyId=${propId}`;
    const staysUrl = `/api/v1/stays?propertyId=${propId}`;
    const resUrl = `/api/v1/reservations?propertyId=${propId}`;
    const regUrl = `/api/v1/registrations?propertyId=${propId}`;

    // Instant SWR cache lookup (0ms render)
    if (!forceFresh) {
      const cachedRooms = apiCache.get(roomsUrl);
      const cachedStays = apiCache.get(staysUrl);
      const cachedRes = apiCache.get(resUrl);
      const cachedReg = apiCache.get(regUrl);
      if (cachedRooms && cachedStays) {
        setRooms(cachedRooms);
        setStays(cachedStays);
        if (cachedRes) setReservations(cachedRes);
        if (cachedReg) setRegistrations(cachedReg);
      } else {
        setLoading(true);
      }
    }

    try {
      const [roomsData, staysData, resData, regData] = await Promise.allSettled([
        apiCache.swrFetch(roomsUrl, undefined, (cached) => setRooms(cached)),
        apiCache.swrFetch(staysUrl, undefined, (cached) => setStays(cached)),
        apiCache.swrFetch(resUrl, undefined, (cached) => setReservations(cached)),
        apiCache.swrFetch(regUrl, undefined, (cached) => setRegistrations(cached)),
      ]);

      if (roomsData.status === "fulfilled" && Array.isArray(roomsData.value)) {
        setRooms(roomsData.value);
      }
      if (staysData.status === "fulfilled" && Array.isArray(staysData.value)) {
        setStays(staysData.value);
      }
      if (resData.status === "fulfilled" && Array.isArray(resData.value)) {
        setReservations(resData.value);
      }
      if (regData.status === "fulfilled" && Array.isArray(regData.value)) {
        setRegistrations(regData.value);
      }
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

  // Open Move Room Modal & safely dismiss any open room inspection popups
  const handleOpenMoveModal = (stay: any, currentRoom?: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRoomForInspect(null); // Cleanly dismiss room inspector modal
    setSelectedStayForMove(stay);

    const roomToMove = currentRoom || (stay.roomAssignments && stay.roomAssignments[0]?.room) || null;

    setMoveForm({
      fromRoomId: roomToMove?.id || (stay.roomAssignments && stay.roomAssignments[0]?.roomId) || "",
      fromRoomNumber: roomToMove?.number || (stay.roomAssignments && stay.roomAssignments[0]?.room?.number) || "",
      targetRoomId: "",
      reason: "Guest requested room change",
      rateHandling: "RETAIN_RATE",
    });

    setShowMoveModal(true);
  };

  // Handle Move Room Submit
  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayForMove || !moveForm.targetRoomId) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/stays/${selectedStayForMove.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromRoomId: moveForm.fromRoomId || undefined,
          targetRoomId: moveForm.targetRoomId,
          reason: moveForm.reason || "Guest requested room change",
          rateHandling: moveForm.rateHandling || "RETAIN_RATE",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Room move failed");

      setShowMoveModal(false);
      setSelectedStayForMove(null);
      setSelectedRoomForInspect(null);
      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Move error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel Reservation
  const handleCancelReservation = async (reservationId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to cancel this future reservation?")) return;
    const reason = prompt("Enter cancellation reason (optional):", "Guest requested cancellation") || "Guest requested cancellation";
    try {
      setActionLoading(true);
      const res = await fetch("/api/v1/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reservationId, status: "CANCELLED", reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel reservation");
      alert("Reservation cancelled successfully.");
      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Cancellation error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle 1-Click Fulfill Reservation to Check-In
  const handleFulfillReservation = (res: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setResForCheckIn(res);
    setCheckInRoomId(res.rooms?.[0]?.assignedRoomId || "");
    setShowCheckInModal(true);
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

  const todayStr = activeProperty?.businessDate || (typeof window !== "undefined" ? new Date().toLocaleDateString("en-CA") : new Date().toISOString().split("T")[0]);

  // Future Reservations KPI Metrics
  const resMetrics = useMemo(() => {
    const upcomingList = reservations.filter((r) => {
      const arr = r.arrivalDate || r.checkInDate;
      const arrDateStr = arr ? new Date(arr).toISOString().split("T")[0] : "";
      return r.status === "CONFIRMED" && (!arrDateStr || arrDateStr >= todayStr);
    });

    const todayArrivals = reservations.filter((r) => {
      const arr = r.arrivalDate || r.checkInDate;
      const arrDateStr = arr ? new Date(arr).toISOString().split("T")[0] : "";
      return r.status === "CONFIRMED" && arrDateStr === todayStr;
    });

    const totalUpcomingRevenue = upcomingList.reduce((acc, r) => acc + (r.totalSnapshot || 0), 0);
    const totalDepositsCollected = upcomingList.reduce((acc, r) => acc + (r.deposits?.[0]?.payment?.amount || r.deposits?.[0]?.originalAmount || 0), 0);
    const totalUpcomingPax = upcomingList.reduce((acc, r) => acc + (r.adults || r.rooms?.[0]?.adults || 2) + (r.children || r.rooms?.[0]?.children || 0), 0);

    return {
      upcomingCount: upcomingList.length,
      todayArrivalsCount: todayArrivals.length,
      totalUpcomingRevenue,
      totalDepositsCollected,
      totalUpcomingPax,
      totalAllCount: reservations.length,
      confirmedCount: reservations.filter((r) => r.status === "CONFIRMED").length,
      checkedInCount: reservations.filter((r) => r.status === "CHECKED_IN").length,
      cancelledCount: reservations.filter((r) => r.status === "CANCELLED").length,
    };
  }, [reservations, todayStr]);

  // Filtered reservations calculation with Date Scopes, Specific Date Picker, and Search
  const filteredReservations = useMemo(() => {
    return reservations.filter((res: any) => {
      // 1. Status Filter
      if (resStatusFilter !== "ALL" && res.status !== resStatusFilter) return false;

      // 2. Room Category Filter
      if (resCategoryFilter !== "ALL") {
        const catId = res.rooms?.[0]?.roomTypeId || res.roomTypeId;
        const catName = res.roomTypeName || res.roomType?.name;
        if (catId !== resCategoryFilter && catName !== resCategoryFilter) return false;
      }

      // 3. Date & Scope Filter
      const arr = res.arrivalDate || res.checkInDate;
      const arrDateStr = arr ? new Date(arr).toISOString().split("T")[0] : "";

      if (resDateScope === "UPCOMING") {
        // Show all upcoming arrivals from today onward (or confirmed arrivals)
        if (arrDateStr && arrDateStr < todayStr && res.status !== "CONFIRMED") return false;
      } else if (resDateScope === "TODAY") {
        if (arrDateStr !== todayStr) return false;
      } else if (resDateScope === "TOMORROW") {
        const tomorrow = new Date(todayStr);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        if (arrDateStr !== tomorrowStr) return false;
      } else if (resDateScope === "NEXT_7_DAYS") {
        const in7Days = new Date(todayStr);
        in7Days.setDate(in7Days.getDate() + 7);
        const in7DaysStr = in7Days.toISOString().split("T")[0];
        if (arrDateStr < todayStr || arrDateStr > in7DaysStr) return false;
      } else if (resDateScope === "THIS_MONTH") {
        const currentMonthPrefix = todayStr.slice(0, 7); // "YYYY-MM"
        if (!arrDateStr.startsWith(currentMonthPrefix)) return false;
      } else if (resDateScope === "SPECIFIC_DATE") {
        if (resSpecificDate && arrDateStr !== resSpecificDate) return false;
      }
      // ALL_TIME passes all records

      // 4. Search Filter
      if (resSearchQuery.trim()) {
        const q = resSearchQuery.toLowerCase();
        const name = (res.primaryGuest?.name || res.guestName || "").toLowerCase();
        const phone = (res.primaryGuest?.phone || res.phone || "").toLowerCase();
        const ref = (res.confirmationNo || res.reservationNo || res.id || "").toLowerCase();
        const cat = (res.roomTypeName || res.roomType?.name || "").toLowerCase();
        const src = (res.source || "").toLowerCase();
        const comp = (res.primaryGuest?.companyName || "").toLowerCase();
        const channel = (res.channelRef || "").toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          ref.includes(q) ||
          cat.includes(q) ||
          src.includes(q) ||
          comp.includes(q) ||
          channel.includes(q)
        );
      }

      return true;
    });
  }, [reservations, resStatusFilter, resCategoryFilter, resDateScope, resSpecificDate, resSearchQuery, todayStr]);


  // RENDER TRADITIONAL HIGH-LEGIBILITY FRONT DESK ROOM CARD WITH BED CONFIGURATION
  const renderTraditionalRoomCard = (room: any) => {
    const hkStatus = room.roomState?.housekeepingStatus || "CLEAN";
    const activeIssue = room.maintenanceIssues?.[0];
    const isOutOfOrder =
      room.roomState?.sellabilityStatus === "OUT_OF_ORDER" ||
      (room.blocks && room.blocks.length > 0) ||
      Boolean(activeIssue);
    const bedCat = getBedCategory(room);

    // Find active in-house stay for this room
    const activeStay = stays.find(s => 
      s.status === "IN_HOUSE" && s.roomAssignments?.some((ra: any) => ra.roomId === room.id && (!ra.endsAt || new Date(ra.endsAt) > new Date()))
    ) || room.assignments?.find((a: any) => a.stay?.status === "IN_HOUSE" && (!a.endsAt || new Date(a.endsAt) > new Date()))?.stay;

    const inHouseGuest = activeStay?.primaryGuest;
    const isOccupied = Boolean(activeStay);
    const baseTariff = room.roomType?.ratePlans?.[0]?.versions?.[0]?.pricingJson 
      ? JSON.parse(room.roomType.ratePlans[0].versions[0].pricingJson).basePrice 
      : (bedCat === "SUITE" ? 5000 : (room.roomType?.code?.includes("EXEC") ? 2500 : 2000));

    return (
      <div
        key={room.id}
        onClick={() => setSelectedRoomForInspect(room)}
        className={`rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between p-3.5 shadow-xs hover:shadow-md relative group ${
          isOutOfOrder
            ? "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-400"
            : isOccupied
            ? "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 hover:border-blue-400"
            : hkStatus === "DIRTY"
            ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 hover:border-amber-400"
            : "bg-white dark:bg-[#121215] border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-400 dark:hover:border-emerald-500/50"
        }`}
      >
        {/* Top Header Row: Room Number & Prominent Bed Badge */}
        <div>
          <div className="flex items-start justify-between gap-1.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white leading-none">
                  {room.number}
                </span>

                {/* VISIBLE BED CONFIGURATION BADGE */}
                {bedCat === "TWIN" ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300 uppercase tracking-wide">
                    <span>Twin Bed</span>
                  </span>
                ) : bedCat === "SUITE" ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                    <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <span>Suite</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                    <Bed className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span>King Bed</span>
                  </span>
                )}
              </div>

              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[150px] mt-1">
                {room.roomType?.name || (bedCat === "TWIN" ? "Deluxe Twin Room" : "Deluxe King Room")}
              </div>
            </div>

            {/* Status Pill */}
            {isOutOfOrder ? (
              <div className="flex flex-col items-end shrink-0">
                <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 shadow-xs flex items-center gap-1 whitespace-nowrap">
                  <Wrench className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                  <span>{activeIssue ? activeIssue.issueNo : "OOO"}</span>
                </span>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 font-medium whitespace-nowrap">
                  {activeIssue ? activeIssue.status : "Out of Order"}
                </span>
              </div>
            ) : isOccupied ? (
              <div className="flex flex-col items-end shrink-0">
                <span className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white bg-blue-600 shadow-xs whitespace-nowrap">
                  Occupied
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium whitespace-nowrap">Floor {room.floor}</span>
              </div>
            ) : hkStatus === "DIRTY" ? (
              <div className="flex flex-col items-end shrink-0">
                <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 shadow-xs whitespace-nowrap">
                  Dirty
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium whitespace-nowrap">Turnover</span>
              </div>
            ) : (
              <div className="flex flex-col items-end shrink-0">
                <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 shadow-xs whitespace-nowrap">
                  Vacant Ready
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium whitespace-nowrap">Clean</span>
              </div>
            )}
          </div>

          {/* Body Content Area */}
          <div className="mt-2.5 min-h-[44px]">
            {isOccupied && inHouseGuest ? (
              <div className="rounded-xl bg-white/90 dark:bg-black/30 border border-blue-100 dark:border-blue-500/20 p-2 space-y-1 shadow-xs">
                <div className="font-semibold text-xs text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">{inHouseGuest.name}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="flex items-center gap-1 text-[11px] truncate">
                    <Users className="h-3 w-3 text-zinc-400 shrink-0" />
                    {activeStay.adults || 1} Pax
                  </span>
                  <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400 text-xs shrink-0">
                    ₹{baseTariff}/nt
                  </span>
                </div>
              </div>
            ) : isOutOfOrder ? (
              <div className="rounded-xl bg-rose-100/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 p-2 space-y-1 text-xs text-rose-900 dark:text-rose-200 shadow-xs">
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1 text-xs">
                    <Wrench className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="font-mono text-xs">{activeIssue?.issueNo || "Defect Block"}</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-300 font-semibold uppercase">
                    {activeIssue?.priority || "OUT OF ORDER"}
                  </span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300 line-clamp-1">
                  {activeIssue ? `${activeIssue.assetText ? `${activeIssue.assetText} • ` : ""}${activeIssue.description}` : "Room Blocked for Maintenance"}
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-zinc-50/70 dark:bg-black/20 border border-zinc-100 dark:border-white/5 p-2 space-y-0.5 text-xs shadow-xs">
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-xs">
                  <span>Tariff (EP):</span>
                  <strong className="text-zinc-900 dark:text-white font-mono font-bold text-xs">₹{baseTariff}</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Bed Setup:</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[130px]">
                    {bedCat === "TWIN" ? "2x Single (Twin)" : bedCat === "SUITE" ? "1x King + Lounge" : "1x King (Double)"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Actions Footer: Big, Easy Click Targets */}
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-1.5">
          {isOccupied && activeStay ? (
            <div className="flex items-center gap-1.5 w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/billing?stayId=${activeStay.id}`);
                }}
                className="flex-1 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1 transition shadow-xs"
                title="Open Folio & GST Billing"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Folio</span>
              </button>

              <button
                onClick={(e) => handleOpenMoveModal(activeStay, room, e)}
                className="h-8 px-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                title="Move Room"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={(e) => handleDirectCheckout(activeStay.id, e)}
                className="h-8 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold text-xs flex items-center justify-center gap-1 transition"
                title="Checkout Guest"
              >
                Out
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
                className="flex-1 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1 transition shadow-xs"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Check-In</span>
              </button>

              <button
                onClick={(e) => handleQuickHKToggle(room.id, hkStatus, e)}
                className={`h-8 px-2.5 rounded-xl text-xs font-semibold transition border ${
                  hkStatus === "DIRTY"
                    ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                }`}
                title="Toggle Clean/Dirty Status"
              >
                {hkStatus === "DIRTY" ? "Make Clean" : "Dirty"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/maintenance");
                }}
                className="flex-1 h-8 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold text-xs text-white transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                title="View & Resolve Maintenance Issue"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Ticket ({activeIssue?.issueNo || "Defect"})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto w-full text-zinc-900 dark:text-zinc-100">
      
      {/* 1. TOP MASTER HEADER & ACTION BAR */}
      <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold text-base flex items-center justify-center shadow-xs">
                P
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  Front Desk & Room Inventory Rack
                </h1>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {activeProperty?.displayName || "Hotel Ambarish Grand Residency"}
                  </span>
                  <span>•</span>
                  <span>GSTIN: <span className="font-mono">{activeProperty?.gstin || "18AACCB2447F1ZX"}</span></span>
                  <span>•</span>
                  <span>Date: <span className="font-mono">{activeProperty?.businessDate || new Date().toISOString().split("T")[0]}</span></span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Dining QRs */}
            <button
              onClick={() => setShowDiningQrModal(true)}
              className="h-9 px-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 transition shadow-xs"
            >
              <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Dining QRs</span>
            </button>

            {/* Self Check-In QR */}
            <button
              onClick={() => setShowQrModal(true)}
              className="h-9 px-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition shadow-xs"
            >
              <QrCode className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Kiosk QR</span>
            </button>

            {/* Add Room to In-House Guest */}
            <button
              onClick={() => {
                const inHouse = stays.filter(s => s.status === "IN_HOUSE");
                const firstStayId = inHouse[0]?.id || "";
                const vacantRoom = rooms.find(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN");
                setAddRoomForm({
                  stayId: firstStayId,
                  roomId: vacantRoom?.id || "",
                  agreedTariff: "",
                  isComplimentary: false,
                  extraBeds: 0,
                  extraBedRate: 500,
                });
                setShowAddRoomModal(true);
              }}
              className="h-9 px-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Room to Guest</span>
            </button>

            {/* Walk-in Check-in Primary Action */}
            <button
              onClick={() => {
                const vacantRoom = rooms.find(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN");
                setCheckInRoomId(vacantRoom?.id || "");
                setShowCheckInModal(true);
              }}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Walk-In Check-In</span>
            </button>
          </div>
        </div>

        {/* 2. MASTER RECEPTIONIST OPERATIONAL KPI RACK */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-2.5 space-y-0.5 shadow-xs">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">Total Rooms</div>
            <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tabular-nums leading-none">{metrics.total}</div>
            <div className="text-[10px] text-zinc-500">Floors 1 to 5</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "OCCUPIED" ? "ALL" : "OCCUPIED")}
            className={`rounded-xl border p-2.5 space-y-0.5 cursor-pointer transition ${
              statusFilter === "OCCUPIED"
                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 shadow-xs"
                : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-600"
            }`}
          >
            <div className="text-[10px] uppercase font-semibold tracking-wider text-blue-700 dark:text-blue-400 flex items-center justify-between">
              <span>Occupied</span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 tabular-nums leading-none">{metrics.occupied}</div>
            <div className="text-[10px] text-blue-700 dark:text-blue-300 font-medium truncate">{metrics.occPercent}% Occ ({metrics.totalPax} Pax)</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "VACANT_CLEAN" ? "ALL" : "VACANT_CLEAN")}
            className={`rounded-xl border p-2.5 space-y-0.5 cursor-pointer transition ${
              statusFilter === "VACANT_CLEAN"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 shadow-xs"
                : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-600"
            }`}
          >
            <div className="text-[10px] uppercase font-semibold tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
              <span>Vacant Ready</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">{metrics.vacantClean}</div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">Ready to Sell</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "VACANT_DIRTY" ? "ALL" : "VACANT_DIRTY")}
            className={`rounded-xl border p-2.5 space-y-0.5 cursor-pointer transition ${
              statusFilter === "VACANT_DIRTY"
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 shadow-xs"
                : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600"
            }`}
          >
            <div className="text-[10px] uppercase font-semibold tracking-wider text-amber-700 dark:text-amber-400 flex items-center justify-between">
              <span>Housekeeping</span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums leading-none">{metrics.vacantDirty}</div>
            <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Dirty / Turnover</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "OUT_OF_ORDER" ? "ALL" : "OUT_OF_ORDER")}
            className={`rounded-xl border p-2.5 space-y-0.5 cursor-pointer transition ${
              statusFilter === "OUT_OF_ORDER"
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-400 shadow-xs"
                : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-rose-400 dark:hover:border-rose-600"
            }`}
          >
            <div className="text-[10px] uppercase font-semibold tracking-wider text-rose-700 dark:text-rose-400 flex items-center justify-between">
              <span>Maintenance</span>
              <Wrench className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400 tabular-nums leading-none">{metrics.outOfOrder}</div>
            <div className="text-[10px] text-rose-700 dark:text-rose-300 font-medium">Blocked / Repairs</div>
          </div>

          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-2.5 space-y-0.5 shadow-xs">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center justify-between">
              <span>Due Arrivals</span>
              <ArrowRightLeft className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-cyan-700 dark:text-cyan-300 tabular-nums leading-none">0</div>
            <div className="text-[10px] text-zinc-500">Due In Today</div>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleTabChange("grid")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "grid"
                ? "bg-blue-600 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Room Rack Grid ({filteredRooms.length})</span>
          </button>

          <button
            onClick={() => handleTabChange("inhouse")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "inhouse"
                ? "bg-blue-600 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>In-House Guests ({stays.filter(s => s.status === "IN_HOUSE").length})</span>
          </button>

          <button
            onClick={() => handleTabChange("registrations")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "registrations"
                ? "bg-blue-600 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
            <span>Digital GRC Queue ({registrations.length})</span>
            {registrations.filter((r) => r.status === "PENDING_REVIEW").length > 0 && (
              <span className="rounded-full bg-amber-500 text-zinc-950 px-1.5 py-0.5 text-[9.5px] font-bold font-mono animate-pulse">
                {registrations.filter((r) => r.status === "PENDING_REVIEW").length} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange("reservations")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "reservations"
                ? "bg-blue-600 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Future Bookings ({resMetrics.upcomingCount})</span>
            {resMetrics.todayArrivalsCount > 0 && (
              <span className="rounded-full bg-indigo-500 text-white px-1.5 py-0.5 text-[9.5px] font-bold font-mono animate-pulse">
                {resMetrics.todayArrivalsCount} Today
              </span>
            )}
          </button>

        </div>

        {/* View Switcher & Search Bar for Room Grid */}
        {activeTab === "grid" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs text-xs">
              <button
                onClick={() => setGroupBy("FLOOR")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  groupBy === "FLOOR" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Floor Racks
              </button>
              <button
                onClick={() => setGroupBy("STATUS")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  groupBy === "STATUS" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                By Status
              </button>
              <button
                onClick={() => setGroupBy("ROOM_TYPE")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  groupBy === "ROOM_TYPE" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                By Category
              </button>
              <button
                onClick={() => setGroupBy("COMPACT")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  groupBy === "COMPACT" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Unified
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search Room #, Guest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 pl-8 pr-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 w-44 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. TAB CONTENT 1: ROOM RACK GRID */}
      {activeTab === "grid" && (
        <div className="space-y-6">
          {/* DISPLAY MODE 1: TRADITIONAL FLOOR-BY-FLOOR RACKS */}
          {groupBy === "FLOOR" && (
            <div className="space-y-5">
              {Array.from(new Set(filteredRooms.map((r) => r.floor)))
                .filter(Boolean)
                .sort((a, b) => a - b)
                .map((floorNum) => {
                  const floorRooms = filteredRooms.filter((r) => r.floor === floorNum);
                  const occCount = floorRooms.filter((r) => r.roomState?.occupancyStatus === "OCCUPIED").length;

                  return (
                    <div key={floorNum} className="space-y-2.5">
                      {/* Floor Header Bar with Bed Breakdown */}
                      <div className="flex items-center justify-between pb-1.5 border-b-2 border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-md bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-mono font-black text-xs text-zinc-900 dark:text-white">
                            F{floorNum}
                          </div>
                          <div>
                            <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white">
                              Floor {floorNum} Racks ({floorRooms.length} Rooms)
                            </h2>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs font-mono">
                          <span className="text-blue-700 dark:text-blue-400 font-bold">{occCount} Occupied</span>
                          <span className="text-zinc-400 dark:text-zinc-600">|</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">{floorRooms.length - occCount} Vacant Ready</span>
                        </div>
                      </div>

                      {/* Floor Rooms Rack */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                        {floorRooms.map(renderTraditionalRoomCard)}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* DISPLAY MODE 2: STATUS GROUPING */}
          {groupBy === "STATUS" && (
            <div className="space-y-5">
              {filteredRooms.filter(r => r.roomState?.occupancyStatus === "OCCUPIED").length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-blue-200 dark:border-blue-900/60">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 font-mono">
                      Occupied Rooms ({filteredRooms.filter(r => r.roomState?.occupancyStatus === "OCCUPIED").length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {filteredRooms.filter(r => r.roomState?.occupancyStatus === "OCCUPIED").map(renderTraditionalRoomCard)}
                  </div>
                </div>
              )}

              {filteredRooms.filter(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN").length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-emerald-200 dark:border-emerald-900/60">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono">
                      Vacant Clean & Ready ({filteredRooms.filter(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN").length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {filteredRooms.filter(r => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN").map(renderTraditionalRoomCard)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DISPLAY MODE 3: BY CATEGORY / ROOM TYPE */}
          {groupBy === "ROOM_TYPE" && (
            <div className="space-y-5">
              {roomTypesList.map((rt) => {
                const typeRooms = filteredRooms.filter((r) => r.roomTypeId === rt.id);
                if (typeRooms.length === 0) return null;
                const occCount = typeRooms.filter((r) => r.roomState?.occupancyStatus === "OCCUPIED").length;

                return (
                  <div key={rt.id} className="space-y-2.5">
                    <div className="flex items-center justify-between pb-1.5 border-b-2 border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2.5">
                        <div className="h-6 w-6 rounded-md bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-mono font-black text-xs text-zinc-900 dark:text-white">
                          {rt.code.slice(0, 3)}
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                            <span>{rt.name}</span>
                            <span className="text-xs font-mono font-normal text-zinc-500 dark:text-zinc-400">({rt.bedType})</span>
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs font-mono">
                        <span className="text-blue-700 dark:text-blue-400 font-bold">{occCount} Occupied</span>
                        <span className="text-zinc-400 dark:text-zinc-600">|</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">{typeRooms.length - occCount} Vacant</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                      {typeRooms.map(renderTraditionalRoomCard)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DISPLAY MODE 4: UNIFIED */}
          {groupBy === "COMPACT" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filteredRooms.map(renderTraditionalRoomCard)}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT 2: IN-HOUSE GUEST LEDGER ROSTER */}
      {activeTab === "inhouse" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden shadow-sm dark:shadow-xl">
          <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                In-House Guest Roster
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Active resident guests currently staying in the property with live folio balances.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20 whitespace-nowrap self-start sm:self-auto">
              {stays.filter(s => s.status === "IN_HOUSE").length} Active Stays ({metrics.totalPax} Guests)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase font-mono text-[10.5px] border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-3.5 py-2.5 font-bold">Room #</th>
                  <th className="px-3.5 py-2.5 font-bold">Bed Setup</th>
                  <th className="px-3.5 py-2.5 font-bold">Guest Name</th>
                  <th className="px-3.5 py-2.5 font-bold">Phone Number</th>
                  <th className="px-3.5 py-2.5 font-bold">Pax</th>
                  <th className="px-3.5 py-2.5 font-bold">Arrival Date</th>
                  <th className="px-3.5 py-2.5 font-bold">Departure</th>
                  <th className="px-3.5 py-2.5 font-bold">Folio / Tariff</th>
                  <th className="px-3.5 py-2.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium">
                {stays.filter(s => s.status === "IN_HOUSE").map((stay) => {
                  const roomAssignment = stay.roomAssignments?.[0]?.room;
                  const roomNumber = roomAssignment?.number || "N/A";
                  const bedCat = roomAssignment ? getBedCategory(roomAssignment) : "KING";
                  const guestName = formatGuestDisplayName(stay.primaryGuest?.name) || "Valued Guest";
                  const guestPhone = stay.primaryGuest?.phone || "N/A";
                  const arrival = stay.arrivalAt ? new Date(stay.arrivalAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
                  const departure = stay.expectedDepartureAt ? new Date(stay.expectedDepartureAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";

                  return (
                    <tr key={stay.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                      <td className="px-3.5 py-2.5 font-bold text-sm font-mono text-zinc-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/40 text-blue-800 dark:text-blue-300">
                          {roomNumber}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">
                        {bedCat === "TWIN" ? (
                          <span className="text-cyan-700 dark:text-cyan-400 font-bold">🛏️🛏️ Twin</span>
                        ) : bedCat === "SUITE" ? (
                          <span className="text-purple-700 dark:text-purple-400 font-bold">👑 Suite</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-bold">🛏️ King</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-zinc-900 dark:text-white text-xs">{guestName}</td>
                      <td className="px-3.5 py-2.5 font-mono text-zinc-600 dark:text-zinc-300">{guestPhone}</td>
                      <td className="px-3.5 py-2.5 font-mono text-zinc-600 dark:text-zinc-300">{stay.adults || 1} Adults</td>
                      <td className="px-3.5 py-2.5 font-mono text-zinc-600 dark:text-zinc-300">{arrival}</td>
                      <td className="px-3.5 py-2.5 font-mono text-zinc-600 dark:text-zinc-300">{departure}</td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatINR(stay.folio?.balance || 0)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right space-x-1.5">
                        <button
                          onClick={() => router.push(`/billing?stayId=${stay.id}`)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs transition shadow-xs cursor-pointer"
                        >
                          Folio
                        </button>
                        <button
                          onClick={(e) => handleOpenMoveModal(stay, stay.roomAssignments?.[0]?.room, e)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 text-xs transition shadow-xs cursor-pointer"
                          title="Move Room / Room Change"
                        >
                          Move
                        </button>
                        <button
                          onClick={(e) => handleDirectCheckout(stay.id, e)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 font-bold text-white text-xs transition shadow-xs cursor-pointer"
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
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden shadow-sm dark:shadow-xl space-y-3">
          <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    registrationStatusFilter === "ALL"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-black"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  All ({registrations.length})
                </button>
                <button
                  onClick={() => setRegistrationStatusFilter("PENDING_REVIEW")}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
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
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
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
          <div className="px-3.5 sm:px-5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by guest name, mobile phone, registration number, or room..."
                value={regSearchQuery}
                onChange={(e) => setRegSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 transition font-mono shadow-xs"
              />
              {regSearchQuery && (
                <button
                  onClick={() => setRegSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase font-mono text-[10.5px] border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-3.5 py-2.5 font-bold min-w-[120px]">Status</th>
                  <th className="px-3.5 py-2.5 font-bold min-w-[140px]">GRC Number</th>
                  <th className="px-3.5 py-2.5 font-bold min-w-[160px]">Guest Full Name</th>
                  <th className="px-3.5 py-2.5 font-bold min-w-[120px]">Contact Mobile</th>
                  <th className="px-3.5 py-2.5 font-bold min-w-[120px]">Room Allocated</th>
                  <th className="px-3.5 py-2.5 font-bold min-w-[130px]">Submission Date</th>
                  <th className="px-3.5 py-2.5 font-bold min-w-[140px]">City / State</th>
                  <th className="px-3.5 py-2.5 font-bold text-right min-w-[140px]">Actions</th>
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
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border whitespace-nowrap inline-flex items-center gap-1 shrink-0 ${
                              isPending
                                ? "bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 animate-pulse"
                                : "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30"
                            }`}
                          >
                            {isPending ? "⏳ PENDING REVIEW" : "✓ CHECKED IN"}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{reg.registrationNo}</td>
                        <td className="px-3.5 py-2.5 font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{reg.fullName}</span>
                            {reg.idPhotoUrl && (
                              <span className="text-[9.5px] bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-mono">
                                ID Photo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-zinc-600 dark:text-zinc-300 whitespace-nowrap">{reg.mobilePhone || "N/A"}</td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded border whitespace-nowrap inline-block text-[11px] ${
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
                        <td className="px-3.5 py-2.5 font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{reg.arrivalDateTime || "N/A"}</td>
                        <td className="px-3.5 py-2.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{reg.city || "—"}, {reg.state || "—"}</td>
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Primary Review Button */}
                            <button
                              onClick={() => {
                                setSelectedRegForReview(reg);
                                setShowReviewModal(true);
                              }}
                              className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition shadow-xs ${
                                isPending
                                  ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20 font-black active:scale-95"
                                  : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700"
                              }`}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              <span>{isPending ? "Review & Check-In" : "Review"}</span>
                            </button>

                            {/* View / Print GRC */}
                            <button
                              onClick={() => {
                                setSelectedRegForPrint(reg);
                                setShowGrcModal(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/40 border border-blue-200 dark:border-blue-500/40 font-bold text-blue-700 dark:text-blue-300 text-xs inline-flex items-center gap-1 transition shadow-xs"
                              title="View & Print Official GRC"
                            >
                              <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
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

      {/* TAB CONTENT 4: FUTURE RESERVATIONS SUITE */}
      {activeTab === "reservations" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Top 4 KPI Cards for Advance Pipeline */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Total Upcoming Reservations */}
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-950/20 dark:to-[#121215] p-3.5 sm:p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  Upcoming Bookings
                </span>
                <div className="h-7 w-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
                {resMetrics.upcomingCount}
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                {resMetrics.totalUpcomingPax} Expected Guests (Pax)
              </p>
            </div>

            {/* Card 2: Arrivals Today */}
            <div className={`rounded-2xl border p-3.5 sm:p-4 shadow-xs space-y-1 ${
              resMetrics.todayArrivalsCount > 0
                ? "border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-50/90 to-white dark:from-emerald-950/30 dark:to-[#121215]"
                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215]"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Arrivals Today</span>
                  {resMetrics.todayArrivalsCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  )}
                </span>
                <div className="h-7 w-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
                {resMetrics.todayArrivalsCount}
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                Scheduled for {todayStr}
              </p>
            </div>

            {/* Card 3: Expected Revenue Pipeline */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-3.5 sm:p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Tariff Pipeline
                </span>
                <div className="h-7 w-7 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
                {formatINR(resMetrics.totalUpcomingRevenue)}
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                Gross upcoming booking value
              </p>
            </div>

            {/* Card 4: Advance Deposits in Hand */}
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/20 dark:to-[#121215] p-3.5 sm:p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  Advance Collected
                </span>
                <div className="h-7 w-7 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatINR(resMetrics.totalDepositsCollected)}
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                Pre-paid advance deposits
              </p>
            </div>
          </div>

          {/* Main Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden shadow-sm dark:shadow-xl space-y-3.5">
            {/* Header & Quick Action Buttons */}
            <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Future Guest Reservations & Advance Bookings</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Manage upcoming reservations, pre-allocate room categories, collect advance deposits, and execute 1-click check-ins.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowCompanyDirectoryModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Company Directory</span>
                </button>

                <button
                  onClick={() => setShowNewResModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Reservation</span>
                </button>

              </div>
            </div>

            {/* Date-Wise Filtering Toolbar */}
            <div className="px-3.5 sm:px-5 space-y-2.5">
              {/* Row 1: Date Scopes & Exact Date Picker */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                {/* Date Scope Pills */}
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs overflow-x-auto max-w-full">
                  <button
                    onClick={() => {
                      setResDateScope("UPCOMING");
                      setResSpecificDate("");
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                      resDateScope === "UPCOMING"
                        ? "bg-indigo-600 text-white shadow-xs font-black"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    🌟 Upcoming / Future ({resMetrics.upcomingCount})
                  </button>

                  <button
                    onClick={() => {
                      setResDateScope("TODAY");
                      setResSpecificDate("");
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                      resDateScope === "TODAY"
                        ? "bg-emerald-600 text-white shadow-xs font-black"
                        : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10"
                    }`}
                  >
                    ⚡ Today's Arrivals ({resMetrics.todayArrivalsCount})
                  </button>

                  <button
                    onClick={() => {
                      setResDateScope("TOMORROW");
                      setResSpecificDate("");
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                      resDateScope === "TOMORROW"
                        ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-950 shadow-xs font-black"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    🌅 Tomorrow
                  </button>

                  <button
                    onClick={() => {
                      setResDateScope("NEXT_7_DAYS");
                      setResSpecificDate("");
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                      resDateScope === "NEXT_7_DAYS"
                        ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-950 shadow-xs font-black"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    🗓️ Next 7 Days
                  </button>

                  <button
                    onClick={() => {
                      setResDateScope("THIS_MONTH");
                      setResSpecificDate("");
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                      resDateScope === "THIS_MONTH"
                        ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-950 shadow-xs font-black"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    📆 This Month
                  </button>

                  <button
                    onClick={() => {
                      setResDateScope("ALL_TIME");
                      setResSpecificDate("");
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                      resDateScope === "ALL_TIME"
                        ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-950 shadow-xs font-black"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    📋 All History ({resMetrics.totalAllCount})
                  </button>
                </div>

                {/* Specific Date Picker Input */}
                <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="font-bold text-zinc-600 dark:text-zinc-400 text-[11px]">Filter Date:</span>
                  <input
                    type="date"
                    value={resSpecificDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setResSpecificDate(val);
                      if (val) setResDateScope("SPECIFIC_DATE");
                    }}
                    className="bg-transparent text-zinc-900 dark:text-white font-mono font-bold text-xs focus:outline-none cursor-pointer"
                  />
                  {resSpecificDate && (
                    <button
                      onClick={() => {
                        setResSpecificDate("");
                        setResDateScope("UPCOMING");
                      }}
                      className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      title="Clear date filter"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Status Filter, Category Filter, and Live Search Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                {/* Search Bar */}
                <div className="md:col-span-6 relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search by guest name, mobile, confirmation #, channel, or company..."
                    value={resSearchQuery}
                    onChange={(e) => setResSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 transition font-mono shadow-xs"
                  />
                  {resSearchQuery && (
                    <button
                      onClick={() => setResSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter Tabs */}
                <div className="md:col-span-4 flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                  <button
                    onClick={() => setResStatusFilter("CONFIRMED")}
                    className={`flex-1 py-1 rounded-lg font-bold text-center transition cursor-pointer ${
                      resStatusFilter === "CONFIRMED"
                        ? "bg-indigo-600 text-white shadow-xs font-black"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                    }`}
                  >
                    Confirmed ({resMetrics.confirmedCount})
                  </button>
                  <button
                    onClick={() => setResStatusFilter("CHECKED_IN")}
                    className={`flex-1 py-1 rounded-lg font-bold text-center transition cursor-pointer ${
                      resStatusFilter === "CHECKED_IN"
                        ? "bg-emerald-600 text-white shadow-xs font-black"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                    }`}
                  >
                    Checked In ({resMetrics.checkedInCount})
                  </button>
                  <button
                    onClick={() => setResStatusFilter("ALL")}
                    className={`flex-1 py-1 rounded-lg font-bold text-center transition cursor-pointer ${
                      resStatusFilter === "ALL"
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-black"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                    }`}
                  >
                    All ({resMetrics.totalAllCount})
                  </button>
                </div>

                {/* Room Category Select */}
                <div className="md:col-span-2">
                  <select
                    value={resCategoryFilter}
                    onChange={(e) => setResCategoryFilter(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Categories</option>
                    {roomTypesList.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Reservations Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase font-mono text-[10.5px] border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-3.5 py-2.5 font-bold min-w-[110px]">Status</th>
                    <th className="px-3.5 py-2.5 font-bold min-w-[130px]">Confirmation #</th>
                    <th className="px-3.5 py-2.5 font-bold min-w-[170px]">Guest Information</th>
                    <th className="px-3.5 py-2.5 font-bold min-w-[160px]">Arrival & Stay</th>
                    <th className="px-3.5 py-2.5 font-bold min-w-[150px]">Room Category & Pre-Allocation</th>
                    <th className="px-3.5 py-2.5 font-bold min-w-[120px]">Channel / Source</th>
                    <th className="px-3.5 py-2.5 font-bold min-w-[140px]">Tariff & Advance</th>
                    <th className="px-3.5 py-2.5 font-bold text-right min-w-[150px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium">
                  {filteredReservations.map((res: any) => {
                    const checkInRaw = res.arrivalDate || res.checkInDate;
                    const checkOutRaw = res.departureDate || res.checkOutDate;
                    const checkInStr = checkInRaw ? new Date(checkInRaw).toISOString().split("T")[0] : "";
                    
                    const checkInFormatted = checkInRaw
                      ? new Date(checkInRaw).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "N/A";
                    const checkOutFormatted = checkOutRaw
                      ? new Date(checkOutRaw).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "N/A";

                    const isTodayArrival = checkInStr === todayStr;
                    const isConfirmed = res.status === "CONFIRMED";
                    const isCheckedIn = res.status === "CHECKED_IN";
                    const isCancelled = res.status === "CANCELLED";

                    const nightsCount = res.rooms?.[0]?.nights?.length || 1;
                    const deposit = res.deposits?.[0]?.payment?.amount || res.deposits?.[0]?.originalAmount || 0;
                    const total = res.totalSnapshot || 0;
                    const balanceDue = Math.max(0, total - deposit);

                    // Compute relative arrival text
                    let relativeBadge = null;
                    if (isTodayArrival) {
                      relativeBadge = (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-bold font-mono text-[9.5px] border border-amber-300 dark:border-amber-500/40 inline-flex items-center gap-1">
                          ⚡ ARRIVING TODAY
                        </span>
                      );
                    }

                    return (
                      <tr key={res.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                        {/* Status Badge */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border whitespace-nowrap inline-flex items-center gap-1 shrink-0 ${
                              isCheckedIn
                                ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30"
                                : isCancelled
                                ? "bg-rose-100 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-500/30"
                                : "bg-indigo-100 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30"
                            }`}
                          >
                            {isCheckedIn ? "✓ CHECKED IN" : isCancelled ? "✕ CANCELLED" : "● CONFIRMED"}
                          </span>
                        </td>

                        {/* Confirmation # */}
                        <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {res.confirmationNo || res.reservationNo || res.id.slice(0, 8)}
                        </td>

                        {/* Guest Information */}
                        <td className="px-3.5 py-2.5 text-zinc-900 dark:text-white whitespace-nowrap">
                          <div className="font-bold uppercase">{formatGuestDisplayName(res.primaryGuest?.name || res.guestName) || "VALUED GUEST"}</div>
                          <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 uppercase">
                            <span>{res.primaryGuest?.phone || res.phone || "No Phone"}</span>
                            {res.primaryGuest?.city && <span>• {res.primaryGuest.city}</span>}
                            {res.primaryGuest?.companyName && (
                              <span className="text-amber-600 font-bold">• {res.primaryGuest.companyName}</span>
                            )}
                          </div>
                        </td>

                        {/* Stay Dates */}
                        <td className="px-3.5 py-2.5 font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-zinc-900 dark:text-white">{checkInFormatted}</span>
                            <span>→</span>
                            <span className="font-bold text-zinc-900 dark:text-white">{checkOutFormatted}</span>
                          </div>
                          <div className="text-[10.5px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                            <span>
                              {nightsCount} Night{nightsCount > 1 ? "s" : ""} • {res.adults || res.rooms?.[0]?.adults || 2} Adults
                              {(res.rooms?.length > 1 || res.roomCount > 1) && ` (${res.rooms?.length || res.roomCount} Rooms)`}
                            </span>
                            {relativeBadge}
                          </div>
                        </td>

                        {/* Room Category & Allocation */}
                        <td className="px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                          <div className="font-bold">
                            {(res.rooms?.length > 1 || res.roomCount > 1) && `${res.rooms?.length || res.roomCount} × `}
                            {res.roomTypeName || res.roomType?.name || "Standard Room"}
                          </div>
                          <div className="text-[10.5px] text-zinc-500 font-mono">
                            {res.rooms?.[0]?.assignedRoomId ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                Assigned Room {rooms.find((r) => r.id === res.rooms[0].assignedRoomId)?.number || ""}
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic">
                                {(res.rooms?.length > 1 || res.roomCount > 1)
                                  ? `${res.rooms?.length || res.roomCount} Rooms Auto-Assigned at Check-In`
                                  : "Auto-Assign at Check-In"}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Channel Source */}
                        <td className="px-3.5 py-2.5 font-mono text-[11px] whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 inline-block">
                            {res.source || "DIRECT"}
                          </span>
                          {res.channelRef && (
                            <div className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-[130px]" title={res.channelRef}>
                              {res.channelRef}
                            </div>
                          )}
                        </td>

                        {/* Tariff & Deposit */}
                        <td className="px-3.5 py-2.5 font-mono whitespace-nowrap">
                          <div className="font-bold text-zinc-900 dark:text-white">{formatINR(total)}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {deposit > 0 ? (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 inline-block">
                                Adv: {formatINR(deposit)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400">No Advance</span>
                            )}
                            {balanceDue > 0 && deposit > 0 && (
                              <span className="text-[10px] text-zinc-500">
                                (Due: {formatINR(balanceDue)})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1-Click Check-In Button */}
                            {isConfirmed && (
                              <button
                                onClick={(e) => handleFulfillReservation(res, e)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition shadow-xs active:scale-95 cursor-pointer ${
                                  isTodayArrival
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/40"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                }`}
                                title="Check-In this guest now"
                              >
                                <UserPlus className="h-3 w-3" />
                                <span>Check-In</span>
                              </button>
                            )}

                            {/* View / Print Voucher */}
                            <button
                              onClick={() => {
                                setSelectedResForVoucher(res);
                                setShowResVoucherModal(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/40 border border-indigo-200 dark:border-indigo-500/40 font-bold text-indigo-700 dark:text-indigo-300 text-xs inline-flex items-center gap-1 transition shadow-xs cursor-pointer"
                              title="View & Print Confirmation Voucher"
                            >
                              <FileText className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                              <span className="hidden sm:inline">Voucher</span>
                            </button>

                            {/* Cancel Button */}
                            {isConfirmed && (
                              <button
                                onClick={(e) => handleCancelReservation(res.id, e)}
                                className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                title="Cancel Reservation"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredReservations.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-zinc-500 font-mono text-xs">
                        <div className="max-w-sm mx-auto space-y-2">
                          <Calendar className="h-8 w-8 text-zinc-400 mx-auto opacity-50" />
                          <p className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">
                            No reservations found
                          </p>
                          <p className="text-zinc-500 text-xs">
                            No bookings match the selected date scope ({resDateScope.replace(/_/g, " ")}) or search filters.
                          </p>
                          <div className="pt-2 flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setResDateScope("ALL_TIME");
                                setResStatusFilter("ALL");
                                setResCategoryFilter("ALL");
                                setResSearchQuery("");
                                setResSpecificDate("");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition cursor-pointer"
                            >
                              Reset All Filters
                            </button>
                            <button
                              onClick={() => setShowNewResModal(true)}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>New Reservation</span>
                            </button>

                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showCheckInModal && (
        <GrcIntakeModal
          isOpen={showCheckInModal}
          initialRoomId={checkInRoomId}
          initialReservation={resForCheckIn}
          rooms={rooms}
          activeProperty={activeProperty}
          onClose={() => {
            setShowCheckInModal(false);
            setResForCheckIn(null);
          }}
          onSuccess={async (result) => {
            setShowCheckInModal(false);
            setResForCheckIn(null);
            await loadData();
            await refreshData();
            if (result?.registration) {
              setSelectedRegForPrint(result.registration);
              setShowGrcModal(true);
            }
          }}
        />
      )}

      {/* 8.1 NEW FUTURE RESERVATION INTAKE MODAL */}
      {showNewResModal && (
        <NewReservationModal
          isOpen={showNewResModal}
          rooms={rooms}
          activeProperty={activeProperty}
          onClose={() => setShowNewResModal(false)}
          onSuccess={async (result) => {
            setShowNewResModal(false);
            await loadData();
            await refreshData();
            const resObj = result?.reservation || result;
            if (resObj) {
              setSelectedResForVoucher(resObj);
              setShowResVoucherModal(true);
            }
          }}
        />
      )}

      {/* 8.2 RESERVATION CONFIRMATION VOUCHER MODAL */}
      {showResVoucherModal && selectedResForVoucher && (
        <ReservationVoucherModal
          isOpen={showResVoucherModal}
          reservation={selectedResForVoucher}
          activeProperty={activeProperty}
          onClose={() => {
            setShowResVoucherModal(false);
            setSelectedResForVoucher(null);
          }}
          onCheckInNow={(res) => {
            setShowResVoucherModal(false);
            setResForCheckIn(res);
            setShowCheckInModal(true);
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
            grcNo: selectedRegForPrint.registrationNo || selectedRegForPrint.grcNo,
            roomNumber: selectedRegForPrint.assignedRoomNumber || selectedRegForPrint.preAssignedRoom || selectedRegForPrint.roomNumber || "—",
            arrivalDateTime: selectedRegForPrint.arrivalDateTime,
            expectedDepartureDate: selectedRegForPrint.expectedDepartureDate,
            paxM: selectedRegForPrint.paxM,
            paxF: selectedRegForPrint.paxF,
            paxC: selectedRegForPrint.paxC,
            fullName: selectedRegForPrint.fullName || "Guest",
            mobilePhone: selectedRegForPrint.mobilePhone || selectedRegForPrint.phone || "—",
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
            idType: selectedRegForPrint.idType || selectedRegForPrint.idDocumentType,
            idLast4: selectedRegForPrint.idLast4 || selectedRegForPrint.idDocumentNumber,
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
      {showMoveModal && selectedStayForMove && (() => {
        const guestName = formatGuestDisplayName(selectedStayForMove.primaryGuest?.name);
        const stayRooms = selectedStayForMove.roomAssignments?.map((ra: any) => ra.room).filter(Boolean) || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <ArrowRightLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                      Move Room / Room Change
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Relocate resident guest or specific room in group booking.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setSelectedStayForMove(null);
                  }}
                  className="h-8 w-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Resident Guest & Moving Room Info Card */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">Resident Guest:</span>
                  <strong className="text-zinc-900 dark:text-white font-bold text-sm">{guestName}</strong>
                </div>

                {stayRooms.length > 1 ? (
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Room to Move Out:</span>
                    <select
                      value={moveForm.fromRoomId}
                      onChange={(e) => {
                        const selectedRoom = stayRooms.find((r: any) => r.id === e.target.value);
                        setMoveForm({
                          ...moveForm,
                          fromRoomId: e.target.value,
                          fromRoomNumber: selectedRoom?.number || "",
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono font-bold text-blue-600 dark:text-blue-400 text-xs"
                    >
                      {stayRooms.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          Room {r.number} (Floor {r.floor})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Current Room:</span>
                    <strong className="font-mono font-bold text-zinc-900 dark:text-white">
                      Room {moveForm.fromRoomNumber || stayRooms[0]?.number || "—"}
                    </strong>
                  </div>
                )}
              </div>

              {/* Move Form */}
              <form onSubmit={handleMoveSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1.5 uppercase text-[10.5px] tracking-wider">
                    Select Destination Room *
                  </label>
                  <select
                    required
                    value={moveForm.targetRoomId}
                    onChange={(e) => setMoveForm({ ...moveForm, targetRoomId: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono font-bold focus:border-blue-500 focus:outline-none shadow-xs text-xs"
                  >
                    <option value="">-- Choose New Vacant Room --</option>
                    {rooms
                      .filter((r) => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.housekeepingStatus === "CLEAN" && r.id !== moveForm.fromRoomId)
                      .map((r) => {
                        const bedCat = getBedCategory(r);
                        return (
                          <option key={r.id} value={r.id}>
                            Room {r.number} — {r.roomType?.name || "Room"} [{bedCat === "TWIN" ? "🛏️🛏️ Twin" : "🛏️ King"}] (Floor {r.floor})
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* Preset Reason Quick Buttons */}
                <div>
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1.5 uppercase text-[10.5px] tracking-wider">
                    Reason for Room Change
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      "Guest requested room change",
                      "AC / Maintenance defect",
                      "Noise complaint / Disturbance",
                      "Upgrade to higher category",
                      "Bed configuration preference",
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setMoveForm({ ...moveForm, reason: preset })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
                          moveForm.reason === preset
                            ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300 font-bold"
                            : "bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={moveForm.reason}
                    onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })}
                    placeholder="Enter or select reason..."
                    className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Tariff Handling Option */}
                <div>
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1.5 uppercase text-[10.5px] tracking-wider">
                    Tariff Policy for Moved Room
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs ${
                      moveForm.rateHandling === "RETAIN_RATE"
                        ? "bg-blue-50 border-blue-400 dark:bg-blue-950/60 dark:border-blue-700 font-bold text-blue-900 dark:text-blue-200"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}>
                      <input
                        type="radio"
                        name="ratePolicy"
                        value="RETAIN_RATE"
                        checked={moveForm.rateHandling === "RETAIN_RATE"}
                        onChange={() => setMoveForm({ ...moveForm, rateHandling: "RETAIN_RATE" })}
                        className="text-blue-600 cursor-pointer"
                      />
                      <span>Retain Agreed Rate</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs ${
                      moveForm.rateHandling === "USE_TARGET_BASE"
                        ? "bg-blue-50 border-blue-400 dark:bg-blue-950/60 dark:border-blue-700 font-bold text-blue-900 dark:text-blue-200"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}>
                      <input
                        type="radio"
                        name="ratePolicy"
                        value="USE_TARGET_BASE"
                        checked={moveForm.rateHandling === "USE_TARGET_BASE"}
                        onChange={() => setMoveForm({ ...moveForm, rateHandling: "USE_TARGET_BASE" })}
                        className="text-blue-600 cursor-pointer"
                      />
                      <span>New Base Rate</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs ${
                      moveForm.rateHandling === "COMPLIMENTARY"
                        ? "bg-blue-50 border-blue-400 dark:bg-blue-950/60 dark:border-blue-700 font-bold text-blue-900 dark:text-blue-200"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}>
                      <input
                        type="radio"
                        name="ratePolicy"
                        value="COMPLIMENTARY"
                        checked={moveForm.rateHandling === "COMPLIMENTARY"}
                        onChange={() => setMoveForm({ ...moveForm, rateHandling: "COMPLIMENTARY" })}
                        className="text-blue-600 cursor-pointer"
                      />
                      <span>🎁 Free (₹0)</span>
                    </label>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200/80 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoveModal(false);
                      setSelectedStayForMove(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !moveForm.targetRoomId}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    <span>{actionLoading ? "Moving Room..." : "Confirm Room Move"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}


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

      {/* 13. UNIFIED ROOM & GUEST INSPECTION MODAL */}
      {selectedRoomForInspect && (() => {
        const room = selectedRoomForInspect;
        const isDirty = room.roomState?.housekeepingStatus === "DIRTY";
        const isOutOfOrder = room.roomState?.sellabilityStatus === "OUT_OF_ORDER" || (room.maintenanceIssues && room.maintenanceIssues.length > 0);
        const bedCat = getBedCategory(room);

        // Find active in-house stay for this room
        const activeStay = stays.find(s => 
          s.status === "IN_HOUSE" && s.roomAssignments?.some((ra: any) => (ra.roomId === room.id || ra.room?.number === room.number) && (!ra.endsAt || new Date(ra.endsAt) > new Date()))
        ) || room.assignments?.find((a: any) => a.stay?.status === "IN_HOUSE" && (!a.endsAt || new Date(a.endsAt) > new Date()))?.stay;

        const isOccupied = Boolean(activeStay);
        const assignedRoomObj = activeStay?.roomAssignments?.find((ra: any) => ra.roomId === room.id || ra.room?.number === room.number);
        const inHouseGuest = activeStay?.primaryGuest;

        // Find matching GRC record if available
        const matchingGrc = registrations.find(r => 
          r.mobilePhone === inHouseGuest?.phone ||
          r.fullName === inHouseGuest?.name ||
          (r.preAssignedRoom && r.preAssignedRoom.includes(room.number))
        );

        // Calculate agreed rate for this specific room
        let agreedRateDisplay = "₹3,200/night";
        if (assignedRoomObj?.rateHandling === "COMPLIMENTARY" || assignedRoomObj?.moveReason === "AGREED_RATE:0") {
          agreedRateDisplay = "🎁 Complimentary (₹0)";
        } else if (assignedRoomObj?.moveReason?.startsWith("AGREED_RATE:")) {
          const parsedRate = Number(assignedRoomObj.moveReason.replace("AGREED_RATE:", ""));
          if (!isNaN(parsedRate)) {
            agreedRateDisplay = parsedRate === 0 ? "🎁 Complimentary (₹0)" : `₹${parsedRate.toLocaleString()}/night`;
          }
        } else if (matchingGrc?.agreedRoomTariff !== undefined) {
          agreedRateDisplay = matchingGrc.agreedRoomTariff === 0 ? "🎁 Complimentary (₹0)" : `₹${matchingGrc.agreedRoomTariff.toLocaleString()}/night`;
        }

        // Multi-room group check
        const groupRooms = activeStay?.roomAssignments?.map((ra: any) => ra.room?.number).filter(Boolean) || [];
        const isGroupBooking = groupRooms.length > 1;

        // Checkin / checkout dates formatting
        const checkInFormatted = activeStay?.arrivalAt
          ? new Date(activeStay.arrivalAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
            ", " +
            new Date(activeStay.arrivalAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
          : matchingGrc?.arrivalDateTime || "—";

        const departureFormatted = activeStay?.expectedDepartureAt
          ? new Date(activeStay.expectedDepartureAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
          : matchingGrc?.expectedDepartureDate || "—";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 max-w-xl w-full space-y-4 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-zinc-900 dark:text-white">
                      Room {room.number}
                    </span>
                    <span className="rounded-lg px-2.5 py-1 text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      Floor {room.floor}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                      isOccupied
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                    }`}>
                      {isOccupied ? "🔴 Occupied" : "🟢 Vacant Ready"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
                    <span>{room.roomType?.name || (bedCat === "TWIN" ? "Deluxe Twin Room" : "Deluxe King Room")}</span>
                    <span>•</span>
                    <span>{bedCat === "TWIN" ? "🛏️🛏️ Twin Beds" : bedCat === "SUITE" ? "👑 King + Lounge" : "🛏️ King Bed (Double)"}</span>
                    <span>•</span>
                    <span className="text-zinc-500 font-mono">Max {room.roomType?.capacity || 2} Pax</span>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedRoomForInspect(null)}
                  className="h-8 w-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status & Housekeeping Tile Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block">Occupancy</span>
                  <span className={`text-xs sm:text-sm font-extrabold font-mono block ${
                    isOccupied ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {isOccupied ? "Occupied (In-House)" : "Vacant Clean"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-bold text-zinc-500">Housekeeping</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const newStatus = isDirty ? "CLEAN" : "DIRTY";
                        await handleQuickHKToggle(room.id, room.roomState?.housekeepingStatus || "CLEAN");
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
                  <span className={`text-xs sm:text-sm font-extrabold font-mono block ${
                    !isDirty ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {!isDirty ? "✨ Clean" : "🧹 Dirty / Turnover"}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block">Standard Tariff</span>
                  <span className="text-xs sm:text-sm font-extrabold font-mono text-zinc-900 dark:text-white block">
                    ₹3,200<span className="text-[10px] font-normal text-zinc-500">/nt</span>
                  </span>
                </div>
              </div>

              {/* OCCUPIED GUEST CARD */}
              {isOccupied && activeStay ? (
                <div className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-blue-200/70 dark:border-blue-900/50 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wider">
                        In-House Resident Guest
                      </span>
                    </div>
                    {isGroupBooking && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Group ({groupRooms.length} Rooms: {groupRooms.join(", ")})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 block">Primary Guest</span>
                      <strong className="text-sm font-bold text-zinc-950 dark:text-white block">
                        {formatGuestDisplayName(inHouseGuest?.name)}
                      </strong>
                      {inHouseGuest?.companyName && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 dark:text-amber-300 mt-0.5">
                          <Building2 className="h-3 w-3" />
                          <span>{inHouseGuest.companyName}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 block">Mobile Phone</span>
                      <strong className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 block">
                        {inHouseGuest?.phone ? (
                          <a href={`tel:${inHouseGuest.phone}`} className="hover:underline text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {inHouseGuest.phone}
                          </a>
                        ) : "—"}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 block">Check-In Arrival</span>
                      <strong className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 block">
                        {checkInFormatted}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 block">Expected Departure</span>
                      <strong className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 block">
                        {departureFormatted}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 block">Agreed Room Rate</span>
                      <strong className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 block">
                        {agreedRateDisplay}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 block">Occupants / Pax</span>
                      <strong className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 block">
                        {activeStay.adults || 2} Adults{activeStay.children > 0 ? `, ${activeStay.children} Children` : ""}
                      </strong>
                    </div>
                  </div>

                  {/* Folio Balance & Actions */}
                  <div className="pt-3 border-t border-blue-200/70 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium block">Live Folio Balance</span>
                      <span className={`text-base font-extrabold font-mono ${
                        (activeStay.folio?.balance ?? 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {(activeStay.folio?.balance ?? 0) > 0 ? `Due: ${formatINR(activeStay.folio?.balance)}` : "✓ Fully Cleared"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setSelectedRoomForInspect(null);
                          router.push(`/billing?stayId=${activeStay.id}`);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>View Folio & Bill</span>
                      </button>

                      {matchingGrc && (
                        <button
                          onClick={() => {
                            setSelectedRegForPrint(matchingGrc);
                            setShowGrcModal(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                          title="Print / View GRC Form"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>GRC</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => handleOpenMoveModal(activeStay, room, e)}
                        className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                        title="Move Room"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        <span>Move</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : !isOutOfOrder ? (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                        Room Ready for Check-In
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      Clean & Sanitized
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    This room is vacant, clean, and ready for immediate guest arrival or walk-in registration.
                  </p>

                  <button
                    onClick={() => {
                      setCheckInRoomId(room.id);
                      setSelectedRoomForInspect(null);
                      setShowCheckInModal(true);
                    }}
                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Check-In Guest to Room {room.number}</span>
                  </button>
                </div>
              ) : null}

              {/* Maintenance & Defects Summary */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3.5 space-y-2.5 text-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 uppercase text-[11px] tracking-wide">
                      Maintenance Status
                    </span>
                  </div>
                  <span className={`font-mono text-xs font-bold ${
                    (room.maintenanceIssues?.length || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}>
                    {(room.maintenanceIssues?.length || 0) > 0 ? `${room.maintenanceIssues.length} Open Ticket(s)` : "✓ 0 Defects"}
                  </span>
                </div>

                {room.maintenanceIssues && room.maintenanceIssues.length > 0 ? (
                  <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                    {room.maintenanceIssues.map((issue: any) => (
                      <div key={issue.id} className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold font-mono text-rose-600 mr-2">{issue.issueNo}</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-medium">{issue.category} — {issue.description}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-800 font-mono">
                          {issue.priority}
                        </span>
                      </div>
                    ))}
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedRoomForInspect(null);
                          router.push("/maintenance");
                        }}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Maintenance Desk</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500">
                    No active defect tickets or maintenance blocks logged for this room.
                  </p>
                )}
              </div>

              {/* Footer Close */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setSelectedRoomForInspect(null)}
                  className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 14. ADD ROOM TO EXISTING IN-HOUSE GUEST MODAL */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-700 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                    Add Room to Checked-In Guest
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Attach an additional room to an existing in-house guest's stay & folio.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddRoomModal(false)}
                className="h-8 w-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!addRoomForm.stayId) {
                  alert("Please select a checked-in guest.");
                  return;
                }
                if (!addRoomForm.roomId) {
                  alert("Please select a vacant room to add.");
                  return;
                }
                setActionLoading(true);
                try {
                  const res = await fetch("/api/v1/stays/add-room", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      stayId: addRoomForm.stayId,
                      roomId: addRoomForm.roomId,
                      agreedTariff: addRoomForm.isComplimentary ? 0 : (addRoomForm.agreedTariff !== "" ? Number(addRoomForm.agreedTariff) : undefined),
                      isComplimentary: addRoomForm.isComplimentary,
                      extraBeds: Number(addRoomForm.extraBeds) || 0,
                      extraBedRate: 500,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed to add room to stay");
                  alert(data.message || `Room ${data.roomNumber} added to guest stay successfully!`);
                  setShowAddRoomModal(false);
                  await loadData();
                  await refreshData();
                } catch (err: any) {
                  alert(`Error: ${err.message}`);
                } finally {
                  setActionLoading(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              {/* 1. Select In-House Guest (GRC # and Name only) */}
              <div className="space-y-2">
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px]">
                  Select Checked-In Guest (GRC # & Name) *
                </label>
                <select
                  required
                  value={addRoomForm.stayId}
                  onChange={(e) => setAddRoomForm({ ...addRoomForm, stayId: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-semibold text-xs focus:border-purple-500 focus:outline-none cursor-pointer shadow-xs"
                >
                  <option value="">-- Choose In-House Guest --</option>
                  {stays
                    .filter((s) => s.status === "IN_HOUSE")
                    .map((s) => {
                      const reg = registrations.find(
                        (r) => r.stayId === s.id || (s.primaryGuest?.phone && r.mobilePhone === s.primaryGuest.phone)
                      );
                      const grcNo = reg?.registrationNo || `GRC-${s.id.slice(-6).toUpperCase()}`;
                      const displayName = formatGuestDisplayName(s.primaryGuest?.name) || "Guest";
                      return (
                        <option key={s.id} value={s.id}>
                          {grcNo} — {displayName}
                        </option>
                      );
                    })}
                </select>

                {/* Selected Guest Details Display Box */}
                {(() => {
                  const selectedStay = stays.find((s) => s.id === addRoomForm.stayId);
                  if (!selectedStay) return null;
                  const reg = registrations.find(
                    (r) => r.stayId === selectedStay.id || (selectedStay.primaryGuest?.phone && r.mobilePhone === selectedStay.primaryGuest.phone)
                  );
                  const roomNos = selectedStay.roomAssignments?.map((a: any) => a.room?.number).filter(Boolean).join(", ") || "Unassigned";
                  const phone = selectedStay.primaryGuest?.phone || reg?.mobilePhone || "N/A";
                  const checkInTime = selectedStay.arrivalAt
                    ? new Date(selectedStay.arrivalAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "Today";

                  return (
                    <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 grid grid-cols-3 gap-2 text-xs shadow-xs animate-in fade-in duration-200">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">
                          Current Room(s)
                        </span>
                        <span className="font-bold font-mono text-zinc-900 dark:text-white">
                          Room {roomNos}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">
                          Phone Number
                        </span>
                        <span className="font-mono text-zinc-800 dark:text-zinc-200">
                          {phone}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">
                          Check-in Date
                        </span>
                        <span className="text-zinc-800 dark:text-zinc-200">
                          {checkInTime}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {stays.filter((s) => s.status === "IN_HOUSE").length === 0 && (
                  <p className="text-amber-600 dark:text-amber-400 text-[11px] italic">
                    No guests are currently checked in.
                  </p>
                )}
              </div>

              {/* 2. Select Vacant Room to Add */}
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px]">
                  Select Vacant Room to Add *
                </label>
                <select
                  required
                  value={addRoomForm.roomId}
                  onChange={(e) => {
                    const rid = e.target.value;
                    const r = rooms.find((rm) => rm.id === rid);
                    let base = "";
                    if (r?.roomType?.basePrice) base = String(r.roomType.basePrice);
                    setAddRoomForm({
                      ...addRoomForm,
                      roomId: rid,
                      agreedTariff: addRoomForm.agreedTariff || base,
                    });
                  }}
                  className="w-full h-11 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono font-bold text-xs focus:border-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Vacant Room --</option>
                  {rooms
                    .filter((r) => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.sellabilityStatus !== "OUT_OF_ORDER")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.number} — {r.roomType?.name} [{getBedCategory(r) === "TWIN" ? "Twin Beds" : "King Bed"}] (Floor {r.floor} • {r.roomState?.housekeepingStatus || "CLEAN"})
                      </option>
                    ))}
                </select>
              </div>

              {/* 3. Tariff & Complimentary Options */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                    Room Rate & Pricing
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <input
                      type="checkbox"
                      checked={addRoomForm.isComplimentary}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAddRoomForm({
                          ...addRoomForm,
                          isComplimentary: checked,
                          agreedTariff: checked ? "0" : addRoomForm.agreedTariff,
                        });
                      }}
                      className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                    />
                    <span>🎁 Complimentary Room (₹0 Free Stay)</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px]">
                      Agreed Rate / Night (₹)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-zinc-400 font-bold font-mono text-xs">₹</span>
                      <input
                        type="number"
                        placeholder={addRoomForm.isComplimentary ? "0 (Complimentary)" : "Enter rate"}
                        disabled={addRoomForm.isComplimentary}
                        value={addRoomForm.isComplimentary ? "0" : addRoomForm.agreedTariff}
                        onChange={(e) => setAddRoomForm({ ...addRoomForm, agreedTariff: e.target.value })}
                        className="w-full h-10 pl-7 pr-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono font-bold text-sm focus:border-purple-500 focus:outline-none disabled:opacity-60 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px]">
                      Extra Pax (₹500/Pax)
                    </label>
                    <div className="h-10 flex items-center justify-between px-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-xs">
                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = addRoomForm.extraBeds || 0;
                            const next = Math.max(0, cur - 1);
                            setAddRoomForm({ ...addRoomForm, extraBeds: next });
                          }}
                          className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                          title="Decrease Extra Pax"
                        >
                          <Minus className="h-3 w-3 stroke-[2.5]" />
                        </button>
                        <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white px-2 min-w-[20px] text-center select-none">
                          {addRoomForm.extraBeds || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = addRoomForm.extraBeds || 0;
                            const next = cur + 1;
                            setAddRoomForm({ ...addRoomForm, extraBeds: next });
                          }}
                          className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                          title="Increase Extra Pax"
                        >
                          <Plus className="h-3 w-3 stroke-[2.5]" />
                        </button>
                      </div>
                      {(addRoomForm.extraBeds || 0) > 0 ? (
                        <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                          +₹{(addRoomForm.extraBeds || 0) * 500}/nt
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pr-1">₹0</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black transition disabled:opacity-50 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{actionLoading ? "Assigning Room..." : "Assign Room to Stay"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. CORPORATE COMPANIES & TRAVEL AGENTS MASTER DIRECTORY */}
      {showCompanyDirectoryModal && (
        <CompanyDirectoryModal
          isOpen={showCompanyDirectoryModal}
          activeProperty={activeProperty}
          onClose={() => setShowCompanyDirectoryModal(false)}
          onSelectForBooking={() => {
            setShowNewResModal(true);
          }}
        />
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
