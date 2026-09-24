"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import { apiCache } from "@/lib/cache/api-cache";

export function usePmsOperations() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProperty, refreshKey, refreshData } = useHotel();

  const [rooms, setRooms] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // View & Filter States
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"grid" | "inhouse" | "registrations" | "reservations">(
    tabParam === "inhouse" || tabParam === "registrations" || tabParam === "reservations" ? tabParam : "grid"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState<string>("ALL");
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "VACANT_READY" | "OCCUPIED" | "DIRTY" | "MAINTENANCE">("ALL");
  const [bedFilter, setBedFilter] = useState<"ALL" | "TWIN" | "KING" | "SUITE">("ALL");
  const [sortBy, setSortBy] = useState<"ROOM_NUMBER" | "FLOOR" | "CATEGORY" | "STATUS">("ROOM_NUMBER");

  // Selection & Modal States
  const [selectedRoomForInspect, setSelectedRoomForInspect] = useState<any | null>(null);
  const [selectedStayForMove, setSelectedStayForMove] = useState<any | null>(null);
  const [selectedRoomForMove, setSelectedRoomForMove] = useState<any | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const [showNewResModal, setShowNewResModal] = useState(false);
  const [showGrcModal, setShowGrcModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRegForReview, setSelectedRegForReview] = useState<any | null>(null);
  const [selectedRegForPrint, setSelectedRegForPrint] = useState<any | null>(null);

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [selectedStayForCompany, setSelectedStayForCompany] = useState<any | null>(null);

  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [activeStayForAddRoom, setActiveStayForAddRoom] = useState<any | null>(null);

  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedResForVoucher, setSelectedResForVoucher] = useState<any | null>(null);

  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [resForCheckIn, setResForCheckIn] = useState<any | null>(null);
  const [checkInRoomId, setCheckInRoomId] = useState<string>("");

  const reviewIdParam = searchParams.get("reviewId");

  // Load PMS data with instant SWR cache
  const loadData = async (forceFresh = false) => {
    if (!activeProperty?.id) {
      setRooms([]);
      setStays([]);
      setReservations([]);
      setRegistrations([]);
      setLoading(false);
      return;
    }

    const roomsUrl = `/api/v1/rooms?propertyId=${activeProperty.id}`;
    const staysUrl = `/api/v1/stays?propertyId=${activeProperty.id}`;
    const resUrl = `/api/v1/reservations?propertyId=${activeProperty.id}`;
    const regUrl = `/api/v1/registrations?propertyId=${activeProperty.id}`;

    if (!forceFresh) {
      const cachedRooms = apiCache.get(roomsUrl);
      const cachedStays = apiCache.get(staysUrl);
      const cachedRes = apiCache.get(resUrl);
      const cachedReg = apiCache.get(regUrl);

      if (cachedRooms && Array.isArray(cachedRooms)) setRooms(cachedRooms);
      if (cachedStays && Array.isArray(cachedStays)) setStays(cachedStays);
      if (cachedRes && Array.isArray(cachedRes)) setReservations(cachedRes);
      if (cachedReg && Array.isArray(cachedReg)) setRegistrations(cachedReg);

      if (cachedRooms && cachedStays) {
        setLoading(false);
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
    if (activeProperty?.id) {
      setRooms([]);
      setStays([]);
      setReservations([]);
      setRegistrations([]);
      loadData();
    }
  }, [activeProperty?.id, refreshKey]);

  // URL reviewId handler
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

  // Housekeeping Status Toggle
  const handleQuickHKToggle = async (roomId: string, currentHK: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextHK = currentHK === "CLEAN" ? "DIRTY" : "CLEAN";
    try {
      await fetch(`/api/v1/rooms/${roomId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          housekeepingStatus: nextHK,
          reason: `Quick toggle from Front Desk: ${nextHK}`,
        }),
      });
      await loadData();
    } catch (err) {
      console.error("Failed to toggle housekeeping status:", err);
    }
  };

  // Folio Navigation Fix: Navigate directly with both stayId and room parameter
  const handleOpenFolio = (stay: any, room?: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const stayId = stay?.id || stay?.stayId;
    if (!stayId) return;
    const roomNumber = room?.number || stay?.roomAssignments?.[0]?.room?.number || "";
    const query = new URLSearchParams();
    query.set("stayId", stayId);
    if (roomNumber) query.set("room", roomNumber);
    router.push(`/billing?${query.toString()}`);
  };

  // Direct Checkout Handler
  const handleDirectCheckout = async (
    stayId: string,
    e: React.MouseEvent,
    roomId?: string,
    roomNumber?: string
  ) => {
    e.stopPropagation();
    const stay = stays.find((s) => s.id === stayId);
    const activeRooms = stay?.roomAssignments?.filter((a: any) => !a.endsAt) || [];
    const isGroup = activeRooms.length > 1;

    let checkoutTargetRoomId = roomId;
    let checkoutTargetRoomNo = roomNumber;

    if (isGroup && roomId) {
      const confirmSingle = window.confirm(
        `Room ${roomNumber} is part of a multi-room group stay (${activeRooms.map((a: any) => a.room?.number).join(", ")}).\n\n` +
        `Click OK to check out Room ${roomNumber} ONLY.\n` +
        `Click CANCEL to check out ALL rooms in the group together.`
      );
      if (!confirmSingle) {
        checkoutTargetRoomId = undefined;
        checkoutTargetRoomNo = undefined;
      }
    } else {
      const promptText = checkoutTargetRoomNo
        ? `Confirm checkout for Room ${checkoutTargetRoomNo} and issue GST Tax Invoice?`
        : "Confirm guest checkout and issue GST Tax Invoice?";
      if (!confirm(promptText)) return;
    }

    try {
      setActionLoading(true);
      let res = await fetch(`/api/v1/stays/${stayId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: checkoutTargetRoomId,
          roomNumber: checkoutTargetRoomNo,
          applyGroupAdvance: false,
        }),
      });

      let data = await res.json();
      if (!res.ok && data.error && (data.error.includes("outstanding balance") || data.error.includes("balance due"))) {
        const isGroupRoom = Boolean(checkoutTargetRoomNo);
        let handled = false;

        if (isGroupRoom) {
          const groupChoice = window.confirm(
            `${data.error}\n\nClick OK to settle this room from the Group Advance Pool.\nClick CANCEL to pay separately or transfer balance.`
          );

          if (groupChoice) {
            res = await fetch(`/api/v1/stays/${stayId}/checkout`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                roomId: checkoutTargetRoomId,
                roomNumber: checkoutTargetRoomNo,
                applyGroupAdvance: true,
              }),
            });
            data = await res.json();
            if (!res.ok) throw new Error(data.error || "Checkout failed");
            handled = true;
          } else {
            const openBilling = window.confirm(
              `Would you like to open Billing & Folio to collect separate payment (UPI/Cash/Card) from the guest for Room ${checkoutTargetRoomNo}?`
            );
            if (openBilling) {
              router.push(`/billing?stayId=${stayId}&room=${checkoutTargetRoomNo}`);
              return;
            }

            const transferChoice = window.confirm(
              `Click OK to TRANSFER balance to Group Master Folio.\nClick CANCEL for City Ledger / Debtors Checkout.`
            );
            if (transferChoice) {
              res = await fetch(`/api/v1/stays/${stayId}/checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  roomId: checkoutTargetRoomId,
                  roomNumber: checkoutTargetRoomNo,
                  transferBalanceToGroup: true,
                  transferRemarks: "Transferred to Group Master at PMS checkout",
                }),
              });
              data = await res.json();
              if (!res.ok) throw new Error(data.error || "Checkout failed");
              handled = true;
            }
          }
        }

        if (!handled) {
          const allowOut = window.confirm(
            `Do you want to check out this guest with an OUTSTANDING BALANCE (City Ledger / Debtors)?`
          );
          if (allowOut) {
            const reason = window.prompt("Enter reason for Outstanding Checkout:", "Guest Due") || "Guest Due";
            res = await fetch(`/api/v1/stays/${stayId}/checkout`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                roomId: checkoutTargetRoomId,
                roomNumber: checkoutTargetRoomNo,
                allowOutstanding: true,
                outstandingReason: reason,
              }),
            });
            data = await res.json();
            if (!res.ok) throw new Error(data.error || "Checkout failed");
          } else {
            return;
          }
        }
      } else if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      const invNo = data.invoice?.invoiceNo || data.invoiceNo || "";
      const outMsg = data.outstandingAmount > 0 ? ` (Recorded with Outstanding Due: ₹${data.outstandingAmount})` : "";
      alert(`Checkout successful! Invoice ${invNo} generated.${outMsg}`);
      await loadData();
      await refreshData();
      setSelectedRoomForInspect(null);
    } catch (err: any) {
      alert(`Checkout error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Room Move Modal
  const handleOpenMoveModal = (stay: any, currentRoom?: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRoomForInspect(null);
    setSelectedStayForMove(stay);
    const roomToMove = currentRoom || (stay.roomAssignments && stay.roomAssignments[0]?.room) || null;
    setSelectedRoomForMove(roomToMove);
    setShowMoveModal(true);
  };

  // Metrics computation
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

    const occPercent = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const inHouseStays = stays.filter((s) => s.status === "IN_HOUSE");
    const totalPax = inHouseStays.reduce((acc, s) => acc + (s.adults || 1) + (s.children || 0), 0);

    return {
      total,
      occupied,
      vacantClean,
      vacantDirty,
      outOfOrder,
      occPercent,
      totalPax,
    };
  }, [rooms, stays]);

  // Bed Info Categorizer
  const getRoomBedInfo = (room: any) => {
    const rawBed = room?.roomType?.bedType || "";
    const bedLower = rawBed.toLowerCase();
    const wingLower = (room?.wing || "").toLowerCase();
    const codeLower = (room?.roomType?.code || "").toLowerCase();

    let kind: "TWIN" | "QUEEN" | "KING" | "FAMILY" | "SUITE" | "OTHER" = "OTHER";
    if (bedLower.includes("twin") || wingLower.includes("twin") || codeLower.includes("twin")) kind = "TWIN";
    else if (bedLower.includes("queen") || wingLower.includes("queen") || codeLower.includes("queen")) kind = "QUEEN";
    else if (bedLower.includes("king") || wingLower.includes("king") || codeLower.includes("king")) kind = "KING";
    else if (bedLower.includes("double") || bedLower.includes("family") || wingLower.includes("family") || codeLower.includes("fam")) kind = "FAMILY";
    else if (bedLower.includes("suite") || wingLower.includes("suite") || codeLower.includes("suite")) kind = "SUITE";

    const label = rawBed || (kind === "TWIN" ? "Twin Beds" : kind === "QUEEN" ? "Queen Bed" : kind === "KING" ? "King Bed" : kind === "FAMILY" ? "Family Bed" : kind === "SUITE" ? "Suite" : "Standard Bed");

    return { kind, label };
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    const filtered = rooms.filter((r) => {
      const activeStay = stays.find((s) =>
        s.status === "IN_HOUSE" && s.roomAssignments?.some((ra: any) => ra.roomId === r.id && !ra.endsAt)
      ) || r.assignments?.find((a: any) => a.stay?.status === "IN_HOUSE" && !a.endsAt)?.stay;

      const guestName = activeStay?.primaryGuest?.name || r.assignments?.[0]?.stay?.primaryGuest?.name || "";
      const matchesSearch =
        !searchQuery ||
        r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.roomType?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (r.roomType?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        guestName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFloor = floorFilter === "ALL" || String(r.floor) === String(floorFilter);
      const matchesType = roomTypeFilter === "ALL" || r.roomTypeId === roomTypeFilter;

      const isOcc = r.roomState?.occupancyStatus === "OCCUPIED" || Boolean(activeStay);
      const isClean = r.roomState?.housekeepingStatus === "CLEAN";
      const isDirty = r.roomState?.housekeepingStatus === "DIRTY";
      const isOOO =
        r.roomState?.sellabilityStatus === "OUT_OF_ORDER" ||
        (r.blocks && r.blocks.length > 0) ||
        (r.maintenanceIssues && r.maintenanceIssues.length > 0);

      let matchesStatus = true;
      if (statusFilter === "VACANT_READY") matchesStatus = !isOcc && isClean && !isOOO;
      else if (statusFilter === "OCCUPIED") matchesStatus = isOcc;
      else if (statusFilter === "DIRTY") matchesStatus = isDirty && !isOcc;
      else if (statusFilter === "MAINTENANCE") matchesStatus = isOOO;

      let matchesBed = true;
      if (bedFilter !== "ALL") {
        const bedInfo = getRoomBedInfo(r);
        matchesBed = bedInfo.kind === bedFilter;
      }

      return matchesSearch && matchesFloor && matchesType && matchesStatus && matchesBed;
    });

    const naturalRoomCompare = (a: any, b: any) => {
      const numA = parseInt(a.number, 10);
      const numB = parseInt(b.number, 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
    };

    return [...filtered].sort((a, b) => {
      if (sortBy === "FLOOR") {
        const floorA = a.floor ?? 1;
        const floorB = b.floor ?? 1;
        if (floorA !== floorB) return floorA - floorB;
        return naturalRoomCompare(a, b);
      }
      if (sortBy === "CATEGORY") {
        const catA = a.roomType?.name || "";
        const catB = b.roomType?.name || "";
        const catCmp = catA.localeCompare(catB);
        if (catCmp !== 0) return catCmp;
        return naturalRoomCompare(a, b);
      }
      if (sortBy === "STATUS") {
        const getStatusPriority = (r: any) => {
          const isOcc = r.roomState?.occupancyStatus === "OCCUPIED";
          const isDirty = r.roomState?.housekeepingStatus === "DIRTY";
          const isOOO = r.roomState?.sellabilityStatus === "OUT_OF_ORDER";
          if (isOcc) return 1;
          if (isDirty) return 2;
          if (isOOO) return 4;
          return 3;
        };
        const pA = getStatusPriority(a);
        const pB = getStatusPriority(b);
        if (pA !== pB) return pA - pB;
        return naturalRoomCompare(a, b);
      }
      // Default: ROOM_NUMBER natural numeric sort
      return naturalRoomCompare(a, b);
    });
  }, [rooms, stays, searchQuery, floorFilter, roomTypeFilter, statusFilter, bedFilter, sortBy]);

  // Unique floors and room types for dropdown filters
  const floors = useMemo(() => {
    const set = new Set<number>();
    rooms.forEach((r) => {
      if (r.floor !== undefined && r.floor !== null) set.add(r.floor);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  const roomTypes = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach((r) => {
      if (r.roomType?.id && r.roomType?.name) {
        map.set(r.roomType.id, r.roomType.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rooms]);

  return {
    rooms,
    stays,
    reservations,
    registrations,
    loading,
    actionLoading,
    activeProperty,
    refreshKey,
    refreshData,
    loadData,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    handleTabChange,
    searchQuery,
    setSearchQuery,
    floorFilter,
    setFloorFilter,
    roomTypeFilter,
    setRoomTypeFilter,
    statusFilter,
    setStatusFilter,
    bedFilter,
    setBedFilter,
    sortBy,
    setSortBy,
    metrics,
    filteredRooms,
    floors,
    roomTypes,
    getRoomBedInfo,
    handleQuickHKToggle,
    handleOpenFolio,
    handleDirectCheckout,
    handleOpenMoveModal,
    selectedRoomForInspect,
    setSelectedRoomForInspect,
    selectedStayForMove,
    setSelectedStayForMove,
    selectedRoomForMove,
    setSelectedRoomForMove,
    showMoveModal,
    setShowMoveModal,
    showNewResModal,
    setShowNewResModal,
    showGrcModal,
    setShowGrcModal,
    showReviewModal,
    setShowReviewModal,
    selectedRegForReview,
    setSelectedRegForReview,
    selectedRegForPrint,
    setSelectedRegForPrint,
    showCompanyModal,
    setShowCompanyModal,
    showCompanySelector,
    setShowCompanySelector,
    selectedStayForCompany,
    setSelectedStayForCompany,
    showAddRoomModal,
    setShowAddRoomModal,
    activeStayForAddRoom,
    setActiveStayForAddRoom,
    showVoucherModal,
    setShowVoucherModal,
    selectedResForVoucher,
    setSelectedResForVoucher,
    showCheckInModal,
    setShowCheckInModal,
    resForCheckIn,
    setResForCheckIn,
    checkInRoomId,
    setCheckInRoomId,
  };
}
