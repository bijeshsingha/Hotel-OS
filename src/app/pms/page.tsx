"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  ExternalLink,
  ShieldCheck,
  MapPin,
  Compass,
  Phone,
  Car,
  Camera,
  Database,
  RefreshCw,
  DownloadCloud,
  Server,
  UtensilsCrossed,
  Copy,
  Check,
  SlidersHorizontal,
  Grid,
  FolderTree,
  Building,
} from "lucide-react";

export default function PMSFrontDeskPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [rooms, setRooms] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"grid" | "registrations" | "stays" | "reservations">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("ALL");
  const [groupBy, setGroupBy] = useState<"STATUS" | "ROOM_TYPE" | "FLOOR" | "COMPACT">("STATUS");
  const [showDiningQrModal, setShowDiningQrModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Modals state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showYashrajModal, setShowYashrajModal] = useState(false);
  const [yashrajStatus, setYashrajStatus] = useState<any>(null);
  const [syncingScope, setSyncingScope] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<any | null>(null);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [selectedStayForMove, setSelectedStayForMove] = useState<any>(null);

  // Registration Review & Fulfill Modal state
  const [selectedRegForReview, setSelectedRegForReview] = useState<any | null>(null);
  const [fulfillForm, setFulfillForm] = useState({
    roomId: "",
    departureDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    depositAmount: "0",
    depositMethod: "UPI",
    depositRef: "",
    notes: "",
  });

  // Printable GRC Modal state
  const [showGrcPrintModal, setShowGrcPrintModal] = useState(false);
  const [selectedRegForPrint, setSelectedRegForPrint] = useState<any | null>(null);

  // Form states
  const [checkInForm, setCheckInForm] = useState({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    guestNationality: "Indian",
    guestGstin: "",
    idType: "AADHAAR",
    idLast4: "",
    roomId: "",
    departureDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    depositAmount: "0",
    adults: "2",
  });

  const [moveForm, setMoveForm] = useState({
    targetRoomId: "",
    reason: "Guest requested quiet room",
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    if (!activeProperty) return;
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

  const checkYashraj = async () => {
    try {
      const res = await fetch("/api/v1/sync/yashraj/status");
      const data = await res.json();
      setYashrajStatus(data);
    } catch {}
  };

  const triggerSync = async (scope: "rooms" | "menu" | "guests" | "all") => {
    if (!activeProperty) return;
    setSyncingScope(scope);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/v1/sync/yashraj/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, propertyId: activeProperty.id }),
      });
      const data = await res.json();
      setSyncFeedback(data);
      if (data.success) {
        loadData();
        checkYashraj();
      }
    } catch (err: any) {
      setSyncFeedback({ success: false, error: err.message });
    } finally {
      setSyncingScope(null);
    }
  };

  useEffect(() => {
    loadData();
    checkYashraj();
    fetch("/api/v1/network/info")
      .then((r) => r.json())
      .then((d) => setNetworkInfo(d))
      .catch(() => {});
  }, [activeProperty, refreshKey]);

  // Handle Check-in submit
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/v1/stays/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          roomId: checkInForm.roomId,
          guestData: {
            name: checkInForm.guestName,
            phone: checkInForm.guestPhone,
            email: checkInForm.guestEmail,
            nationality: checkInForm.guestNationality,
            gstin: checkInForm.guestGstin,
            idType: checkInForm.idType,
            idLast4: checkInForm.idLast4,
          },
          expectedDepartureAt: checkInForm.departureDate,
          depositAmount: Number(checkInForm.depositAmount) || 0,
          adults: Number(checkInForm.adults) || 2,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");

      setActionSuccess(`Check-in successful! Stay ID: ${data.stay?.id}`);
      setShowCheckInModal(false);
      await loadData();
      await refreshData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Room Move submit
  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayForMove) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/stays/${selectedStayForMove.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRoomId: moveForm.targetRoomId,
          reason: moveForm.reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Room move failed");

      setActionSuccess(`Room moved to ${data.newRoomNumber} successfully!`);
      setShowMoveModal(false);
      await loadData();
      await refreshData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Checkout
  const handleCheckout = async (stayId: string) => {
    if (!confirm("Confirm checkout and issue GST Tax Invoice?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/stays/${stayId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      alert(`Checkout complete! Invoice ${data.invoice?.invoiceNo} issued.`);
      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Checkout error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Registration Review & Fulfill (Check-in from Middle Interface)
  const handleFulfillRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegForReview) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/v1/registrations/${selectedRegForReview.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: fulfillForm.roomId,
          departureDate: fulfillForm.departureDate,
          depositAmount: Number(fulfillForm.depositAmount) || 0,
          depositMethod: fulfillForm.depositMethod,
          depositRef: fulfillForm.depositRef,
          notes: fulfillForm.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fulfillment failed");

      alert(`Guest successfully checked in to Room ${data.room?.number}!`);
      setSelectedRegForReview(null);
      await loadData();
      await refreshData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Derived unique Room Types for filtering
  const roomTypesList = useMemo(() => {
    const map = new Map<string, any>();
    rooms.forEach((r) => {
      if (r.roomType && !map.has(r.roomType.id)) {
        map.set(r.roomType.id, r.roomType);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  // Key KPI Room Metrics
  const metrics = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter((r) => r.roomState?.occupancyStatus === "OCCUPIED").length;
    const vacantClean = rooms.filter(
      (r) =>
        r.roomState?.occupancyStatus === "VACANT" &&
        r.roomState?.housekeepingStatus === "CLEAN" &&
        r.roomState?.sellabilityStatus !== "OUT_OF_ORDER" &&
        (!r.blocks || r.blocks.length === 0)
    ).length;
    const vacantDirty = rooms.filter(
      (r) =>
        r.roomState?.occupancyStatus === "VACANT" &&
        (r.roomState?.housekeepingStatus === "DIRTY" || r.roomState?.housekeepingStatus === "IN_PROGRESS") &&
        r.roomState?.sellabilityStatus !== "OUT_OF_ORDER"
    ).length;
    const outOfOrder = rooms.filter(
      (r) => r.roomState?.sellabilityStatus === "OUT_OF_ORDER" || (r.blocks && r.blocks.length > 0)
    ).length;
    const occPercent = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return { total, occupied, vacantClean, vacantDirty, outOfOrder, occPercent };
  }, [rooms]);

  // Filtered rooms with safe optional chaining
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const guestName = r.assignments?.[0]?.stay?.primaryGuest?.name || "";
      const matchesSearch =
        r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.roomType?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (r.roomType?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        guestName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFloor = floorFilter === "ALL" || String(r.floor) === String(floorFilter);

      const matchesType = roomTypeFilter === "ALL" || r.roomTypeId === roomTypeFilter;

      const isOcc = r.roomState?.occupancyStatus === "OCCUPIED";
      const isClean = r.roomState?.housekeepingStatus === "CLEAN";
      const isDirty =
        r.roomState?.housekeepingStatus === "DIRTY" || r.roomState?.housekeepingStatus === "IN_PROGRESS";
      const isOOO =
        r.roomState?.sellabilityStatus === "OUT_OF_ORDER" || (r.blocks && r.blocks.length > 0);

      let matchesStatus = true;
      if (statusFilter === "OCCUPIED") matchesStatus = isOcc;
      else if (statusFilter === "VACANT_CLEAN") matchesStatus = !isOcc && isClean && !isOOO;
      else if (statusFilter === "VACANT_DIRTY") matchesStatus = !isOcc && isDirty && !isOOO;
      else if (statusFilter === "VACANT") matchesStatus = !isOcc && !isOOO;
      else if (statusFilter === "OUT_OF_ORDER") matchesStatus = isOOO;

      return matchesSearch && matchesFloor && matchesType && matchesStatus;
    });
  }, [rooms, searchQuery, floorFilter, roomTypeFilter, statusFilter]);

  // Grouping categorizers
  const occupiedRoomsList = filteredRooms.filter((r) => r.roomState?.occupancyStatus === "OCCUPIED");
  const vacantCleanRoomsList = filteredRooms.filter(
    (r) =>
      r.roomState?.occupancyStatus === "VACANT" &&
      r.roomState?.housekeepingStatus === "CLEAN" &&
      r.roomState?.sellabilityStatus !== "OUT_OF_ORDER" &&
      (!r.blocks || r.blocks.length === 0)
  );
  const vacantDirtyRoomsList = filteredRooms.filter(
    (r) =>
      r.roomState?.occupancyStatus === "VACANT" &&
      (r.roomState?.housekeepingStatus === "DIRTY" || r.roomState?.housekeepingStatus === "IN_PROGRESS") &&
      r.roomState?.sellabilityStatus !== "OUT_OF_ORDER"
  );
  const outOfOrderRoomsList = filteredRooms.filter(
    (r) => r.roomState?.sellabilityStatus === "OUT_OF_ORDER" || (r.blocks && r.blocks.length > 0)
  );

  const pendingRegistrations = registrations.filter((r) => r.status === "PENDING_REVIEW");

  // Single Room Card Component Renderer
  const renderRoomCard = (room: any) => {
    const isOccupied = room.roomState?.occupancyStatus === "OCCUPIED";
    const hkStatus = room.roomState?.housekeepingStatus || "CLEAN";
    const isOutOfOrder =
      room.roomState?.sellabilityStatus === "OUT_OF_ORDER" || (room.blocks?.length || 0) > 0;
    const activeAssignment = room.assignments?.[0];
    const inHouseGuest = activeAssignment?.stay?.primaryGuest;
    const folioBalance = activeAssignment?.stay?.folio?.balance || 0;

    return (
      <div
        key={room.id}
        className={`rounded-xl p-3 border transition flex flex-col justify-between group ${
          isOutOfOrder
            ? "bg-rose-950/15 border-rose-900/60 shadow-sm"
            : isOccupied
            ? "bg-blue-950/20 border-blue-800/60 shadow-sm hover:border-blue-700"
            : hkStatus === "DIRTY"
            ? "bg-amber-950/15 border-amber-900/60 shadow-sm hover:border-amber-750"
            : "bg-[#121215] border-zinc-800 hover:border-zinc-700 hover:bg-[#18181b] shadow-sm"
        }`}
      >
        <div>
          {/* Header Row */}
          <div className="flex items-start justify-between gap-1.5">
            <div>
              <div className="text-sm font-bold text-zinc-100 font-mono flex items-center gap-1.5">
                <span>Room {room.number}</span>
                <span className="text-[10px] font-normal text-zinc-400 font-sans bg-zinc-800/80 border border-zinc-700/60 rounded px-1.5 py-0.2">
                  {room.roomType?.code || "STD"}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 truncate max-w-[120px] mt-0.5">
                {room.roomType?.name}
              </div>
            </div>

            {/* Status Pill */}
            {isOutOfOrder ? (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30">
                OOO
              </span>
            ) : isOccupied ? (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold text-blue-300 bg-blue-500/15 border border-blue-500/30">
                OCCUPIED
              </span>
            ) : hkStatus === "DIRTY" ? (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30">
                DIRTY
              </span>
            ) : (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                CLEAN
              </span>
            )}
          </div>

          {/* Body Content */}
          <div className="mt-2.5 min-h-[40px] text-xs">
            {isOccupied && inHouseGuest ? (
              <div className="space-y-1 bg-zinc-900/80 rounded-lg p-1.5 border border-blue-900/30">
                <div className="font-semibold text-zinc-100 truncate flex items-center gap-1">
                  <User className="h-3 w-3 text-blue-400 shrink-0" />
                  {inHouseGuest.name}
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                  <span>Stay: {activeAssignment?.stay?.stayNo || "In-House"}</span>
                  <span className="font-bold text-zinc-200">{formatINR(folioBalance)}</span>
                </div>
              </div>
            ) : isOutOfOrder ? (
              <div className="text-[11px] text-rose-400/90 line-clamp-2 bg-rose-950/30 rounded-lg p-1.5 border border-rose-900/40">
                {room.blocks?.[0]?.reason || "Maintenance / Repair"}
              </div>
            ) : (
              <div className="space-y-1 text-zinc-400 text-[11px] pt-1">
                <div className="flex items-center justify-between">
                  <span>Floor {room.floor}</span>
                  <span className="text-zinc-500 font-mono">Max {room.roomType?.capacity || 2} Pax</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      hkStatus === "CLEAN" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <span className="capitalize">{hkStatus === "CLEAN" ? "Ready for Guest" : "Turnover Required"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Actions Footer */}
        <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs gap-1">
          {isOccupied && activeAssignment?.stay ? (
            <div className="flex items-center gap-1 w-full justify-between">
              <button
                onClick={() => {
                  setSelectedStayForMove(activeAssignment.stay);
                  setShowMoveModal(true);
                }}
                className="rounded-md bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-[11px] text-zinc-300 font-medium transition"
                title="Move Room"
              >
                Move
              </button>

              <a
                href={`/order?room=${room.number}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 px-1.5 py-1 text-[11px] text-amber-300 font-medium transition"
                title="Open In-Room Dining Menu for this Room"
              >
                <UtensilsCrossed className="h-3 w-3" />
              </a>

              <button
                onClick={() => handleCheckout(activeAssignment.stay.id)}
                className="rounded-md bg-zinc-800 hover:bg-rose-900/60 text-zinc-300 hover:text-rose-200 px-2 py-1 text-[11px] font-medium transition"
                title="Checkout and Print Rule 46 Tax Invoice"
              >
                Checkout
              </button>
            </div>
          ) : !isOutOfOrder ? (
            <div className="flex items-center gap-1 w-full">
              <button
                onClick={() => {
                  setCheckInForm({
                    ...checkInForm,
                    roomId: room.id,
                  });
                  setShowCheckInModal(true);
                }}
                className="flex-1 rounded-md bg-zinc-800 hover:bg-zinc-700 py-1 text-[11px] font-semibold text-zinc-200 transition text-center"
              >
                + Check-in
              </button>
              <a
                href={`/order?room=${room.number}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-zinc-800/80 hover:bg-zinc-700 p-1 text-zinc-400 hover:text-zinc-200 transition"
                title="QR Menu Link"
              >
                <QrCode className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <span className="text-[10px] text-zinc-500 italic w-full text-center py-0.5">
              Under Maintenance
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl bg-[#111114] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-zinc-400" />
              Front Desk & PMS
            </h1>
            <span className="rounded px-1.5 py-0.2 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
              {activeProperty?.displayName || "Hotel Ambarish Grand Residency"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Room Inventory, In-House Guests & Multi-View Operations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Yashraj PMS Sync Button */}
          <button
            onClick={() => {
              checkYashraj();
              setShowYashrajModal(true);
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              yashrajStatus?.connected
                ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/50"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            }`}
            title="Synchronize live state with Yashraj legacy PMS database"
          >
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span>Yashraj Sync</span>
            {yashrajStatus?.connected && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Restaurant QR Codes Button */}
          <button
            onClick={() => setShowDiningQrModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition shadow-sm"
          >
            <UtensilsCrossed className="h-3.5 w-3.5 text-amber-400" />
            Dining & Room QRs
          </button>

          {/* Guest Self Check-In QR Button */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition"
          >
            <QrCode className="h-3.5 w-3.5 text-blue-400" />
            Self Check-In QR
          </button>

          {/* Walk-in Check-in Button */}
          <button
            onClick={() => {
              setCheckInForm({
                guestName: "",
                guestPhone: "",
                guestEmail: "",
                guestNationality: "Indian",
                guestGstin: "",
                idType: "AADHAAR",
                idLast4: "",
                roomId:
                  rooms.find(
                    (r) =>
                      r.roomState?.occupancyStatus === "VACANT" &&
                      r.roomState?.sellabilityStatus === "SELLABLE"
                  )?.id || "",
                departureDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
                depositAmount: "0",
                adults: "2",
              });
              setShowCheckInModal(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-white transition shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Walk-in Check-in
          </button>
        </div>
      </div>

      {/* KPI METRICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        <div className="rounded-xl bg-[#121215] border border-zinc-800 p-3 space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Total Rooms</div>
          <div className="text-lg font-extrabold text-zinc-100 font-mono">{metrics.total}</div>
          <div className="text-[10px] text-zinc-500">48 Inventory Units</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "OCCUPIED" ? "ALL" : "OCCUPIED")}
          className={`rounded-xl border p-3 space-y-1 cursor-pointer transition ${
            statusFilter === "OCCUPIED"
              ? "bg-blue-950/30 border-blue-500 shadow-md"
              : "bg-[#121215] border-zinc-800 hover:border-blue-900/60"
          }`}
        >
          <div className="text-[10px] uppercase font-mono tracking-wider text-blue-400 flex items-center justify-between">
            <span>Occupied</span>
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-lg font-extrabold text-blue-400 font-mono">{metrics.occupied}</div>
          <div className="text-[10px] text-zinc-400">{metrics.occPercent}% Occupancy Rate</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "VACANT_CLEAN" ? "ALL" : "VACANT_CLEAN")}
          className={`rounded-xl border p-3 space-y-1 cursor-pointer transition ${
            statusFilter === "VACANT_CLEAN"
              ? "bg-emerald-950/30 border-emerald-500 shadow-md"
              : "bg-[#121215] border-zinc-800 hover:border-emerald-900/60"
          }`}
        >
          <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 flex items-center justify-between">
            <span>Vacant Clean</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-lg font-extrabold text-emerald-400 font-mono">{metrics.vacantClean}</div>
          <div className="text-[10px] text-zinc-400">Ready for Check-in</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "VACANT_DIRTY" ? "ALL" : "VACANT_DIRTY")}
          className={`rounded-xl border p-3 space-y-1 cursor-pointer transition ${
            statusFilter === "VACANT_DIRTY"
              ? "bg-amber-950/30 border-amber-500 shadow-md"
              : "bg-[#121215] border-zinc-800 hover:border-amber-900/60"
          }`}
        >
          <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400 flex items-center justify-between">
            <span>Dirty / Turnover</span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-amber-400 font-mono">{metrics.vacantDirty}</div>
          <div className="text-[10px] text-zinc-400">Housekeeping Queue</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "OUT_OF_ORDER" ? "ALL" : "OUT_OF_ORDER")}
          className={`rounded-xl border p-3 space-y-1 cursor-pointer transition ${
            statusFilter === "OUT_OF_ORDER"
              ? "bg-rose-950/30 border-rose-500 shadow-md"
              : "bg-[#121215] border-zinc-800 hover:border-rose-900/60"
          }`}
        >
          <div className="text-[10px] uppercase font-mono tracking-wider text-rose-400 flex items-center justify-between">
            <span>Out of Order</span>
            <span className="h-2 w-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-lg font-extrabold text-rose-400 font-mono">{metrics.outOfOrder}</div>
          <div className="text-[10px] text-zinc-400">Maintenance Blocks</div>
        </div>

        <div className="rounded-xl bg-[#121215] border border-zinc-800 p-3 space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Digital Queue</div>
          <div className="text-lg font-extrabold text-purple-400 font-mono">{pendingRegistrations.length}</div>
          <div className="text-[10px] text-zinc-400">Pending Review</div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab("grid")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "grid"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Room Grid ({filteredRooms.length})
          </button>

          <button
            onClick={() => setActiveTab("registrations")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition relative ${
              activeTab === "registrations"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-blue-400" />
            Digital Check-Ins
            {pendingRegistrations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500 text-white font-bold animate-pulse">
                {pendingRegistrations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("stays")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "stays"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            In-House Stays ({stays.filter((s) => s.status === "IN_HOUSE").length})
          </button>

          <button
            onClick={() => setActiveTab("reservations")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "reservations"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Reservations ({reservations.length})
          </button>
        </div>
      </div>

      {/* FILTER & GROUPING CONTROLS FOR GRID */}
      {activeTab === "grid" && (
        <div className="space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#111114] border border-zinc-800">
            {/* Left: Grouping Switcher */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-medium text-zinc-400 mr-1.5 flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" /> Group By:
              </span>
              <button
                onClick={() => setGroupBy("STATUS")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  groupBy === "STATUS"
                    ? "bg-zinc-100 text-zinc-950 shadow-sm"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                Occupied vs Vacant
              </button>

              <button
                onClick={() => setGroupBy("ROOM_TYPE")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  groupBy === "ROOM_TYPE"
                    ? "bg-zinc-100 text-zinc-950 shadow-sm"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                Room Type
              </button>

              <button
                onClick={() => setGroupBy("FLOOR")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  groupBy === "FLOOR"
                    ? "bg-zinc-100 text-zinc-950 shadow-sm"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                Floor
              </button>

              <button
                onClick={() => setGroupBy("COMPACT")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  groupBy === "COMPACT"
                    ? "bg-zinc-100 text-zinc-950 shadow-sm"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                Unified Grid
              </button>
            </div>

            {/* Right: Filters & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search room # or guest..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg bg-zinc-900 border border-zinc-800 pl-8 pr-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-44 font-mono"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1.5 text-zinc-500 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Room Type Filter */}
              <select
                value={roomTypeFilter}
                onChange={(e) => setRoomTypeFilter(e.target.value)}
                className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-mono"
              >
                <option value="ALL">All Room Types</option>
                {roomTypesList.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} ({rt.code})
                  </option>
                ))}
              </select>

              {/* Floor Filter */}
              <select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-mono"
              >
                <option value="ALL">All Floors</option>
                {Array.from(new Set(rooms.map((r) => r.floor)))
                  .filter(Boolean)
                  .sort((a, b) => a - b)
                  .map((f) => (
                    <option key={f} value={String(f)}>
                      Floor {f}
                    </option>
                  ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-mono"
              >
                <option value="ALL">All Statuses</option>
                <option value="OCCUPIED">Occupied ({metrics.occupied})</option>
                <option value="VACANT_CLEAN">Vacant Clean ({metrics.vacantClean})</option>
                <option value="VACANT_DIRTY">Vacant Dirty ({metrics.vacantDirty})</option>
                <option value="OUT_OF_ORDER">Out of Order ({metrics.outOfOrder})</option>
              </select>
            </div>
          </div>

          {/* GROUPED DISPLAY 1: OCCUPIED VS VACANT */}
          {groupBy === "STATUS" && (
            <div className="space-y-6">
              {/* Section 1: Occupied Rooms */}
              {occupiedRoomsList.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-blue-900/40">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-blue-300">
                        Occupied Rooms ({occupiedRoomsList.length})
                      </h2>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Active In-House Stays
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {occupiedRoomsList.map(renderRoomCard)}
                  </div>
                </div>
              )}

              {/* Section 2: Vacant & Clean Rooms */}
              {vacantCleanRoomsList.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-900/40">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Vacant Clean & Ready ({vacantCleanRoomsList.length})
                      </h2>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Available for Instant Check-in
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {vacantCleanRoomsList.map(renderRoomCard)}
                  </div>
                </div>
              )}

              {/* Section 3: Vacant & Dirty (Housekeeping Queue) */}
              {vacantDirtyRoomsList.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-900/40">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        Vacant Dirty / Turnover ({vacantDirtyRoomsList.length})
                      </h2>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Housekeeping Required
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {vacantDirtyRoomsList.map(renderRoomCard)}
                  </div>
                </div>
              )}

              {/* Section 4: Out of Order */}
              {outOfOrderRoomsList.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-rose-900/40">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                        Out of Order / Blocked ({outOfOrderRoomsList.length})
                      </h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {outOfOrderRoomsList.map(renderRoomCard)}
                  </div>
                </div>
              )}

              {filteredRooms.length === 0 && (
                <div className="p-8 text-center text-xs text-zinc-500 rounded-xl bg-[#111114] border border-zinc-800">
                  No rooms match your filter criteria.
                </div>
              )}
            </div>
          )}

          {/* GROUPED DISPLAY 2: BY ROOM TYPE */}
          {groupBy === "ROOM_TYPE" && (
            <div className="space-y-6">
              {roomTypesList.map((rt) => {
                const typeRooms = filteredRooms.filter((r) => r.roomTypeId === rt.id);
                if (typeRooms.length === 0) return null;
                const occCount = typeRooms.filter((r) => r.roomState?.occupancyStatus === "OCCUPIED").length;

                return (
                  <div key={rt.id} className="space-y-2.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-400" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
                          {rt.name} ({typeRooms.length} Rooms)
                        </h2>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          • {rt.code} • Bed: {rt.bedType} • Max {rt.capacity} Pax
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-blue-400 font-semibold">{occCount} Occupied</span>
                        <span className="text-zinc-600">|</span>
                        <span className="text-emerald-400 font-semibold">{typeRooms.length - occCount} Vacant</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                      {typeRooms.map(renderRoomCard)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GROUPED DISPLAY 3: BY FLOOR */}
          {groupBy === "FLOOR" && (
            <div className="space-y-6">
              {Array.from(new Set(filteredRooms.map((r) => r.floor)))
                .filter(Boolean)
                .sort((a, b) => a - b)
                .map((floorNum) => {
                  const floorRooms = filteredRooms.filter((r) => r.floor === floorNum);
                  const occCount = floorRooms.filter((r) => r.roomState?.occupancyStatus === "OCCUPIED").length;

                  return (
                    <div key={floorNum} className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-zinc-400" />
                          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
                            Floor {floorNum} ({floorRooms.length} Rooms)
                          </h2>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className="text-blue-400 font-semibold">{occCount} Occupied</span>
                          <span className="text-zinc-600">|</span>
                          <span className="text-emerald-400 font-semibold">{floorRooms.length - occCount} Vacant</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                        {floorRooms.map(renderRoomCard)}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* GROUPED DISPLAY 4: UNIFIED COMPACT GRID */}
          {groupBy === "COMPACT" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {filteredRooms.map(renderRoomCard)}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DIGITAL CHECK-INS / MIDDLE INTERFACE QUEUE */}
      {activeTab === "registrations" && (
        <div className="rounded-lg border border-zinc-800 bg-[#111114] overflow-hidden space-y-4">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                Digital Check-In Queue (Middle Interface)
              </h2>
              <p className="text-[11px] text-zinc-500 font-mono">
                Customer submissions awaiting room assignment or verification
              </p>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              {pendingRegistrations.length} Pending Review
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-2.5">GRC #</th>
                  <th className="p-2.5">Guest Name</th>
                  <th className="p-2.5">Contact</th>
                  <th className="p-2.5">Arrival / Requested Room</th>
                  <th className="p-2.5">Pax & Purpose</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {registrations.map((reg) => {
                  let coGuestsCount = 0;
                  try {
                    if (reg.coGuestsJson) coGuestsCount = JSON.parse(reg.coGuestsJson).length;
                  } catch {}

                  const isPending = reg.status === "PENDING_REVIEW";

                  return (
                    <tr key={reg.id} className="hover:bg-zinc-900/30 transition">
                      <td className="p-2.5 font-mono font-medium text-blue-400">
                        {reg.registrationNo}
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-zinc-100">{reg.fullName}</div>
                        <div className="text-[10px] text-zinc-500">
                          {reg.age ? `${reg.age} yrs` : ""} • {reg.gender} • {reg.nationality}
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-[11px]">
                        <div className="text-zinc-300">{reg.mobilePhone}</div>
                        <div className="text-zinc-500">{reg.email || "No email"}</div>
                      </td>
                      <td className="p-2.5 font-mono text-[11px]">
                        <div>{reg.arrivalDateTime}</div>
                        {reg.preAssignedRoom ? (
                          <span className="text-emerald-400 font-medium">Req: Room {reg.preAssignedRoom}</span>
                        ) : (
                          <span className="text-zinc-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <div className="font-medium text-zinc-300">{reg.purposeOfVisit}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          1 Primary {coGuestsCount > 0 && `+ ${coGuestsCount} Co-Guests`}
                        </div>
                      </td>
                      <td className="p-2.5">
                        {isPending ? (
                          <span className="rounded px-2 py-0.5 text-[9px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 font-bold">
                            PENDING REVIEW
                          </span>
                        ) : (
                          <span className="rounded px-2 py-0.5 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                            CHECKED IN ({reg.assignedRoomNumber ? `Rm ${reg.assignedRoomNumber}` : "YES"})
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedRegForPrint(reg);
                            setShowGrcPrintModal(true);
                          }}
                          className="rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 px-2 py-1 text-[11px] transition"
                        >
                          <Printer className="h-3 w-3 inline mr-1" />
                          GRC
                        </button>

                        {isPending && (
                          <button
                            onClick={() => {
                              setSelectedRegForReview(reg);
                              // Auto match pre-assigned room if valid
                              const preRoom = rooms.find(
                                (r) =>
                                  r.number === reg.preAssignedRoom &&
                                  r.roomState?.occupancyStatus === "VACANT" &&
                                  r.roomState?.sellabilityStatus === "SELLABLE"
                              );
                              const fallbackRoom = rooms.find(
                                (r) =>
                                  r.roomState?.occupancyStatus === "VACANT" &&
                                  r.roomState?.sellabilityStatus === "SELLABLE"
                              );

                              setFulfillForm({
                                roomId: preRoom?.id || fallbackRoom?.id || "",
                                departureDate:
                                  reg.expectedDepartureDate ||
                                  new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
                                depositAmount: "0",
                                depositMethod: "UPI",
                                depositRef: "",
                                notes: reg.internalNotes || "",
                              });
                            }}
                            className="rounded bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 font-semibold text-[11px] transition shadow-sm"
                          >
                            Review & Check-in
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {registrations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono italic text-xs">
                      No digital check-in submissions recorded yet. Share the QR code with arriving guests to receive check-ins!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: IN-HOUSE STAYS */}
      {activeTab === "stays" && (
        <div className="rounded-lg border border-zinc-800 bg-[#111114] overflow-hidden">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-200">Active In-House Stays</h2>
            <span className="text-xs text-zinc-500 font-mono">{stays.filter((s) => s.status === "IN_HOUSE").length} Stays</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-2.5">Room</th>
                  <th className="p-2.5">Guest</th>
                  <th className="p-2.5">Dates</th>
                  <th className="p-2.5">Pax</th>
                  <th className="p-2.5">Folio Balance</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {stays
                  .filter((s) => s.status === "IN_HOUSE")
                  .map((stay) => {
                    const room = stay.roomAssignments?.[0]?.room;
                    const balance = stay.folio?.balance || 0;
                    return (
                      <tr key={stay.id} className="hover:bg-zinc-900/30 transition">
                        <td className="p-2.5">
                          <span className="font-mono font-semibold text-zinc-100 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                            {room?.number || "N/A"}
                          </span>
                          <span className="text-[11px] text-zinc-500 ml-2">{room?.roomType?.name}</span>
                        </td>
                        <td className="p-2.5">
                          <div className="font-medium text-zinc-200">{stay.primaryGuest?.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{stay.primaryGuest?.phone || stay.primaryGuest?.email}</div>
                        </td>
                        <td className="p-2.5 font-mono text-[11px]">
                          <div>Arr: {stay.arrivalAt?.slice(0, 10)}</div>
                          <div className="text-zinc-500">Dep: {stay.expectedDepartureAt?.slice(0, 10)}</div>
                        </td>
                        <td className="p-2.5 text-zinc-400 font-mono">
                          {stay.adults}A {stay.children > 0 && `${stay.children}C`}
                        </td>
                        <td className="p-2.5">
                          <span className="font-mono font-medium text-rose-400 tabular-nums">
                            {formatINR(balance)}
                          </span>
                        </td>
                        <td className="p-2.5 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedStayForMove(stay);
                              setShowMoveModal(true);
                            }}
                            className="rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-zinc-300 font-medium"
                          >
                            Move
                          </button>
                          <button
                            onClick={() => handleCheckout(stay.id)}
                            className="rounded bg-zinc-100 hover:bg-white text-zinc-950 px-2.5 py-1 font-medium"
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

      {/* TAB 4: RESERVATIONS */}
      {activeTab === "reservations" && (
        <div className="rounded-lg border border-zinc-800 bg-[#111114] overflow-hidden">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-200">Reservations</h2>
            <span className="text-xs text-zinc-500 font-mono">{reservations.length} Bookings</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-2.5">Confirmation #</th>
                  <th className="p-2.5">Guest</th>
                  <th className="p-2.5">Arrival</th>
                  <th className="p-2.5">Departure</th>
                  <th className="p-2.5">Source</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-zinc-900/30 transition">
                    <td className="p-2.5 font-mono font-medium text-blue-400">{res.confirmationNo}</td>
                    <td className="p-2.5 font-medium text-zinc-200">{res.primaryGuest?.name}</td>
                    <td className="p-2.5 text-zinc-400 font-mono">{res.arrivalDate}</td>
                    <td className="p-2.5 text-zinc-400 font-mono">{res.departureDate}</td>
                    <td className="p-2.5 text-zinc-500 font-mono">{res.source}</td>
                    <td className="p-2.5">
                      <span className="rounded px-1.5 py-0.2 text-[9px] font-mono text-zinc-300 bg-zinc-800 border border-zinc-700">
                        {res.status}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-emerald-400 tabular-nums">
                      {formatINR(res.totalSnapshot)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MIDDLE INTERFACE: REVIEW & FULFILL CHECK-IN MODAL */}
      {selectedRegForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl border border-zinc-800 bg-[#121215] p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                  Review & Approve Digital Check-in
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  GRC Number: <span className="text-blue-400 font-bold">{selectedRegForReview.registrationNo}</span>
                </p>
              </div>
              <button onClick={() => setSelectedRegForReview(null)} className="text-zinc-500 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Submitted Customer Data Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Left Column: Personal & Travel Details */}
              <div className="rounded-lg bg-zinc-900/60 p-3.5 border border-zinc-800 space-y-2.5">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                  Primary Guest & Journey
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-zinc-500">Name:</span>{" "}
                    <span className="font-semibold text-zinc-200">{selectedRegForReview.fullName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Age/Gender:</span>{" "}
                    <span className="text-zinc-300">{selectedRegForReview.age} yrs • {selectedRegForReview.gender}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Mobile:</span>{" "}
                    <span className="text-zinc-300 font-mono">{selectedRegForReview.mobilePhone}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Email:</span>{" "}
                    <span className="text-zinc-300 font-mono">{selectedRegForReview.email || "—"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500">Address:</span>{" "}
                    <span className="text-zinc-300">
                      {[
                        selectedRegForReview.streetAddress,
                        selectedRegForReview.city,
                        selectedRegForReview.state,
                        selectedRegForReview.pinZipCode,
                        selectedRegForReview.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">From / To:</span>{" "}
                    <span className="text-zinc-300">
                      {selectedRegForReview.arrivedFrom || "—"} &rarr; {selectedRegForReview.goingTo || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Vehicle:</span>{" "}
                    <span className="text-zinc-300 font-mono">{selectedRegForReview.vehicleNumber || "None"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500">Referral Channel:</span>{" "}
                    <span className="text-blue-400 font-mono">{selectedRegForReview.referralChannel || "Direct"}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: ID Photo & Digital Signature */}
              <div className="rounded-lg bg-zinc-900/60 p-3.5 border border-zinc-800 space-y-2.5">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <Camera className="h-3.5 w-3.5 text-zinc-400" />
                  Government ID & Digital Signature
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] text-zinc-400">
                    <span className="text-zinc-500">Document:</span>{" "}
                    <span className="font-mono text-zinc-200">
                      {selectedRegForReview.idDocumentType} ({selectedRegForReview.idDocumentNumber || "Provided"})
                    </span>
                  </div>

                  {selectedRegForReview.idPhotoUrl ? (
                    <div className="border border-zinc-700 rounded overflow-hidden max-h-24 bg-zinc-950 flex items-center justify-center">
                      <img
                        src={selectedRegForReview.idPhotoUrl}
                        alt="ID Card"
                        className="max-h-24 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-2 text-[11px] text-zinc-500 italic bg-zinc-950 rounded border border-zinc-800">
                      No photo uploaded (Physical ID verified)
                    </div>
                  )}

                  <div className="text-[11px] text-zinc-500">Captured Signature:</div>
                  {selectedRegForReview.signatureDataUrl ? (
                    <div className="border border-zinc-700 rounded bg-zinc-950 p-1 flex items-center justify-center">
                      <img
                        src={selectedRegForReview.signatureDataUrl}
                        alt="Guest Signature"
                        className="max-h-16 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-2 text-[11px] text-zinc-500 italic bg-zinc-950 rounded border border-zinc-800">
                      Signature on arrival
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Front Desk Room Assignment & Fulfillment Form */}
            <form onSubmit={handleFulfillRegistration} className="space-y-4 pt-2 border-t border-zinc-800 text-xs">
              <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <BedDouble className="h-4 w-4 text-emerald-400" />
                Assign Room & Complete Check-In
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-400 font-medium">Assign Room *</label>
                  <select
                    required
                    value={fulfillForm.roomId}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, roomId: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2 text-zinc-100 font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select clean vacant room...</option>
                    {rooms
                      .filter((r) => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.sellabilityStatus === "SELLABLE")
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.number} — {r.roomType?.name} (Floor {r.floor})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 font-medium">Departure Date *</label>
                  <input
                    type="date"
                    required
                    value={fulfillForm.departureDate}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, departureDate: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-medium">Advance Deposit (₹)</label>
                  <input
                    type="number"
                    value={fulfillForm.depositAmount}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, depositAmount: e.target.value })}
                    placeholder="0"
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400">Deposit Method</label>
                  <select
                    value={fulfillForm.depositMethod}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, depositMethod: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 font-mono"
                  >
                    <option value="UPI">UPI / QR Payment</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="BANK_TRANSFER">Bank NEFT/RTGS</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400">Internal Front Desk Notes</label>
                  <input
                    type="text"
                    value={fulfillForm.notes}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, notes: e.target.value })}
                    placeholder="e.g. VIP guest, key card #104 handed over"
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-600"
                  />
                </div>
              </div>

              {actionError && (
                <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-2 text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {actionError}
                </div>
              )}

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRegForReview(null)}
                  className="rounded-md px-3.5 py-2 text-zinc-400 hover:text-zinc-200 transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-md bg-blue-600 hover:bg-blue-500 px-5 py-2 font-semibold text-white transition disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {actionLoading ? "Processing..." : "Approve & Issue Key (Check-in)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE & GUEST CHECK-IN URL MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-[#121215] p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-blue-400" />
                Guest Check-In QR (Wi-Fi)
              </h2>
              <button onClick={() => setShowQrModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Scan with any mobile phone, tablet, or device connected to your hotel Wi-Fi:
            </p>

            {/* Generated QR Code SVG */}
            <div className="p-3.5 rounded-xl bg-white mx-auto inline-block shadow-lg border border-zinc-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  networkInfo?.checkinNetworkUrl || "http://192.168.0.19:3000/checkin"
                )}`}
                alt="Self Check-in QR"
                className="w-44 h-44"
              />
            </div>

            {/* Wi-Fi URL Box */}
            <div className="space-y-1 text-left">
              <div className="text-[10px] font-mono uppercase text-emerald-400 font-semibold flex items-center justify-between">
                <span>Wi-Fi Network URL</span>
                <span>Port 3000</span>
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-200 select-all break-all">
                {networkInfo?.checkinNetworkUrl || "http://192.168.0.19:3000/checkin"}
              </div>
            </div>

            <div className="pt-1 flex gap-2">
              <button
                onClick={() => {
                  const url = networkInfo?.checkinNetworkUrl || "http://192.168.0.19:3000/checkin";
                  navigator.clipboard.writeText(url);
                  alert(`Copied Wi-Fi URL: ${url}`);
                }}
                className="flex-1 rounded-md bg-zinc-800 hover:bg-zinc-700 py-2 text-xs font-medium text-zinc-200 transition"
              >
                Copy Wi-Fi Link
              </button>
              <a
                href={networkInfo?.checkinNetworkUrl || "/checkin"}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-md bg-zinc-100 hover:bg-white py-2 text-xs font-semibold text-zinc-950 transition text-center"
              >
                Open Kiosk
              </a>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE LEGAL GRC MODAL */}
      {showGrcPrintModal && selectedRegForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-lg bg-white text-zinc-950 p-6 shadow-2xl space-y-4 my-8 font-sans">
            <div className="flex items-center justify-between border-b border-zinc-300 pb-3">
              <div>
                <h1 className="text-base font-bold uppercase tracking-wide text-zinc-900">
                  {activeProperty?.displayName || "Hotel Divine View"}
                </h1>
                <div className="text-[10px] text-zinc-600">
                  {activeProperty?.address || "Paltan Bazaar, Station Road, Guwahati, Assam 781008"} • GSTIN:{" "}
                  {activeProperty?.gstin || "18AABCD1234F1Z8"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold font-mono text-zinc-900">GUEST REGISTRATION CARD (GRC)</div>
                <div className="text-[11px] font-mono text-zinc-600">{selectedRegForPrint.registrationNo}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] border border-zinc-300 p-3 rounded">
              <div>
                <strong>Guest Name:</strong> {selectedRegForPrint.fullName}
              </div>
              <div>
                <strong>Age / Gender:</strong> {selectedRegForPrint.age} yrs / {selectedRegForPrint.gender}
              </div>
              <div>
                <strong>Nationality:</strong> {selectedRegForPrint.nationality}
              </div>
              <div>
                <strong>Mobile:</strong> {selectedRegForPrint.mobilePhone}
              </div>
              <div className="col-span-2">
                <strong>Address:</strong>{" "}
                {[
                  selectedRegForPrint.streetAddress,
                  selectedRegForPrint.city,
                  selectedRegForPrint.state,
                  selectedRegForPrint.pinZipCode,
                  selectedRegForPrint.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>
              <div>
                <strong>Arrived From:</strong> {selectedRegForPrint.arrivedFrom || "—"}
              </div>
              <div>
                <strong>Going To:</strong> {selectedRegForPrint.goingTo || "—"}
              </div>
              <div>
                <strong>Vehicle No:</strong> {selectedRegForPrint.vehicleNumber || "None"}
              </div>
              <div>
                <strong>Assigned Room:</strong> {selectedRegForPrint.assignedRoomNumber || selectedRegForPrint.preAssignedRoom || "—"}
              </div>
            </div>

            {/* Signature & Consent */}
            <div className="border border-zinc-300 p-3 rounded space-y-2">
              <p className="text-[9px] text-zinc-600 leading-tight">
                I agree to the hotel check-out time of 11:00 AM and certify that the particulars furnished above are true.
              </p>
              <div className="flex items-center justify-between pt-2">
                <div className="text-[10px] text-zinc-500 font-mono">Date: {selectedRegForPrint.arrivalDateTime}</div>
                <div>
                  {selectedRegForPrint.signatureDataUrl ? (
                    <img
                      src={selectedRegForPrint.signatureDataUrl}
                      alt="Signature"
                      className="max-h-12 border-b border-zinc-400"
                    />
                  ) : (
                    <div className="w-32 border-b border-zinc-400 text-center text-[10px] text-zinc-400">Signature</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-300">
              <button
                onClick={() => setShowGrcPrintModal(false)}
                className="px-3 py-1.5 rounded bg-zinc-200 text-zinc-800 text-xs font-semibold hover:bg-zinc-300"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800"
              >
                Print GRC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECK-IN MODAL (WALK-IN) */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg border border-zinc-800 bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-zinc-400" />
                Front Desk Walk-in Check-in
              </h2>
              <button onClick={() => setShowCheckInModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400">Guest Full Name *</label>
                  <input
                    type="text"
                    required
                    value={checkInForm.guestName}
                    onChange={(e) => setCheckInForm({ ...checkInForm, guestName: e.target.value })}
                    placeholder="e.g. Ramesh Chandra"
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-zinc-400">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={checkInForm.guestPhone}
                    onChange={(e) => setCheckInForm({ ...checkInForm, guestPhone: e.target.value })}
                    placeholder="+91 98000 12345"
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400">Email Address</label>
                  <input
                    type="email"
                    value={checkInForm.guestEmail}
                    onChange={(e) => setCheckInForm({ ...checkInForm, guestEmail: e.target.value })}
                    placeholder="guest@example.com"
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
                <div>
                  <label className="text-zinc-400">Nationality</label>
                  <input
                    type="text"
                    value={checkInForm.guestNationality}
                    onChange={(e) => setCheckInForm({ ...checkInForm, guestNationality: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400">Identity Document</label>
                  <select
                    value={checkInForm.idType}
                    onChange={(e) => setCheckInForm({ ...checkInForm, idType: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  >
                    <option value="AADHAAR">Aadhaar Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                    <option value="VOTER_ID">Voter ID</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400">Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={checkInForm.idLast4}
                    onChange={(e) => setCheckInForm({ ...checkInForm, idLast4: e.target.value })}
                    placeholder="7890"
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400">Assign Room *</label>
                  <select
                    required
                    value={checkInForm.roomId}
                    onChange={(e) => setCheckInForm({ ...checkInForm, roomId: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  >
                    <option value="">Select clean room...</option>
                    {rooms
                      .filter((r) => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.sellabilityStatus === "SELLABLE")
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.number} ({r.roomType?.name})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400">Departure Date *</label>
                  <input
                    type="date"
                    required
                    value={checkInForm.departureDate}
                    onChange={(e) => setCheckInForm({ ...checkInForm, departureDate: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400">Advance Deposit (₹)</label>
                  <input
                    type="number"
                    value={checkInForm.depositAmount}
                    onChange={(e) => setCheckInForm({ ...checkInForm, depositAmount: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
                <div>
                  <label className="text-zinc-400">Adults</label>
                  <select
                    value={checkInForm.adults}
                    onChange={(e) => setCheckInForm({ ...checkInForm, adults: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>
              </div>

              {actionError && (
                <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-2 text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {actionError}
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="rounded-md px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-md bg-zinc-100 px-4 py-1.5 font-medium text-zinc-950 hover:bg-white transition disabled:opacity-50"
                >
                  {actionLoading ? "Checking in..." : "Confirm Check-in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROOM MOVE MODAL */}
      {showMoveModal && selectedStayForMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-zinc-400" />
                Room Move
              </h2>
              <button onClick={() => setShowMoveModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleMoveSubmit} className="space-y-3 text-xs">
              <div className="rounded-md bg-zinc-900 p-2.5 border border-zinc-800 text-zinc-300">
                <div>Current Room: <span className="font-semibold text-zinc-100 font-mono">{selectedStayForMove.roomAssignments?.[0]?.room?.number || "Unassigned"}</span></div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Old room will be marked DIRTY for housekeeping cleanup.</div>
              </div>

              <div>
                <label className="text-zinc-400">Target Vacant Room *</label>
                <select
                  required
                  value={moveForm.targetRoomId}
                  onChange={(e) => setMoveForm({ ...moveForm, targetRoomId: e.target.value })}
                  className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                >
                  <option value="">Select vacant room...</option>
                  {rooms
                    .filter((r) => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.sellabilityStatus === "SELLABLE")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.number} ({r.roomType?.name})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400">Reason</label>
                <input
                  type="text"
                  required
                  value={moveForm.reason}
                  onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })}
                  className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              {actionError && (
                <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-2 text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {actionError}
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="rounded-md px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-md bg-zinc-100 px-4 py-1.5 font-medium text-zinc-950 hover:bg-white transition disabled:opacity-50"
                >
                  {actionLoading ? "Moving..." : "Confirm Move"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* YASHRAJ PMS LIVE SYNCHRONIZATION MODAL */}
      {showYashrajModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Yashraj PMS Synchronization & Migration
                  </h2>
                  <p className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    SQL Server: {yashrajStatus?.server || "localhost\\SQLEXPRESS"} &bull; DB: {yashrajStatus?.database || "DV_20212022"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowYashrajModal(false);
                  setSyncFeedback(null);
                }}
                className="text-zinc-500 hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Non-Destructive Safety Banner */}
            <div className="flex items-start gap-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-blue-200">100% Non-Destructive Parallel Synchronization</div>
                <div className="text-[11px] text-blue-300/80 leading-relaxed">
                  All synchronization queries are strictly read-only (<code className="font-mono">SELECT</code>). Your legacy Yashraj system continues running untouched without interruption.
                </div>
              </div>
            </div>

            {/* Yashraj Database Summary Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5">
                <div className="text-[10px] uppercase font-mono text-zinc-400">Total Rooms</div>
                <div className="text-lg font-bold text-zinc-100 mt-0.5 font-mono">
                  {yashrajStatus?.totalRooms ?? 77}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">Keys 21-67, 201-232</div>
              </div>

              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5">
                <div className="text-[10px] uppercase font-mono text-zinc-400">Guest Records</div>
                <div className="text-lg font-bold text-zinc-100 mt-0.5 font-mono">
                  {(yashrajStatus?.totalGuests || 39045).toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">Historical GRCs</div>
              </div>

              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5">
                <div className="text-[10px] uppercase font-mono text-zinc-400">F&B Menu</div>
                <div className="text-lg font-bold text-zinc-100 mt-0.5 font-mono">
                  {yashrajStatus?.totalMenuItems ?? 87}
                </div>
                <div className="text-[10px] text-amber-400 font-mono">Restaurant Items</div>
              </div>
            </div>

            {/* Sync Feedback Result */}
            {syncFeedback && (
              <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                syncFeedback.success
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-300"
              }`}>
                {syncFeedback.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    {syncFeedback.success ? "Synchronization Successful!" : "Sync Failed"}
                  </div>
                  <div className="text-[11px] mt-0.5 font-mono">
                    {syncFeedback.success
                      ? `Updated scope: ${syncFeedback.scope.toUpperCase()}. Data successfully refreshed in Hotel OS.`
                      : syncFeedback.error}
                  </div>
                </div>
              </div>
            )}

            {/* Sync Action Grid */}
            <div className="space-y-2 text-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider font-mono text-zinc-400">
                Choose Synchronization Scope:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 1. Sync Rooms */}
                <button
                  type="button"
                  disabled={syncingScope !== null}
                  onClick={() => triggerSync("rooms")}
                  className="flex flex-col items-start gap-1 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 transition text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between w-full font-semibold text-zinc-100">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-blue-400" />
                      Sync Room Inventory
                    </span>
                    {syncingScope === "rooms" && <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Pulls 77 rooms, floors, categories, and tariffs into Front Desk.
                  </div>
                </button>

                {/* 2. Sync Menu */}
                <button
                  type="button"
                  disabled={syncingScope !== null}
                  onClick={() => triggerSync("menu")}
                  className="flex flex-col items-start gap-1 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 transition text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between w-full font-semibold text-zinc-100">
                    <span className="flex items-center gap-1.5">
                      <DownloadCloud className="h-3.5 w-3.5 text-amber-400" />
                      Sync Restaurant Menu
                    </span>
                    {syncingScope === "menu" && <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Pulls all 87 food items, categories, and rates into POS.
                  </div>
                </button>

                {/* 3. Sync Guests */}
                <button
                  type="button"
                  disabled={syncingScope !== null}
                  onClick={() => triggerSync("guests")}
                  className="flex flex-col items-start gap-1 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 transition text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between w-full font-semibold text-zinc-100">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-emerald-400" />
                      Import Guest Directory
                    </span>
                    {syncingScope === "guests" && <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Imports guest records & KYC for instant phone number lookups.
                  </div>
                </button>

                {/* 4. Full Sync */}
                <button
                  type="button"
                  disabled={syncingScope !== null}
                  onClick={() => triggerSync("all")}
                  className="flex flex-col items-start gap-1 p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 hover:bg-emerald-900/40 transition text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between w-full font-semibold text-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                      Master Full Sync
                    </span>
                    {syncingScope === "all" && <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />}
                  </div>
                  <div className="text-[11px] text-emerald-300/70">
                    Simultaneously updates Rooms, Stays, Menu, and Guests.
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>Status: Active Connection</span>
              <button
                type="button"
                onClick={() => {
                  setShowYashrajModal(false);
                  setSyncFeedback(null);
                }}
                className="rounded-md bg-zinc-800 px-3 py-1.5 text-zinc-200 hover:bg-zinc-700 font-sans font-medium text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTAURANT MENU & ROOM QR CODES MODAL */}
      {showDiningQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-6 text-zinc-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">
                    Restaurant Menu & In-Room Dining QR Codes
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Hotel Ambarish Grand Residency &bull; Room Service & Restaurant Supply (SAC 996331)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDiningQrModal(false)}
                className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 1. MASTER / GENERIC MENU QR CODE */}
            <div className="rounded-xl bg-[#121215] border border-amber-500/30 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase font-mono">
                      Master Generic Link
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100">
                      Scan & Order (Any Room / Table / Lobby)
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Print this generic QR code for the hotel elevator, reception desk, dining hall, and lobby. Guests scan to open the menu and choose their room in 1 tap.
                  </p>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const genericUrl = `${networkInfo?.localIp ? `http://${networkInfo.localIp}:3000` : window.location.origin}/order`;
                      navigator.clipboard.writeText(genericUrl);
                      setCopiedLink("GENERIC");
                      setTimeout(() => setCopiedLink(null), 2000);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition"
                  >
                    {copiedLink === "GENERIC" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
                    {copiedLink === "GENERIC" ? "Copied!" : "Copy Link"}
                  </button>

                  <a
                    href="/order"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 px-3 py-1.5 text-xs transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Menu
                  </a>
                </div>
              </div>

              {/* Visual Generic QR Box */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/90 rounded-xl p-3.5 border border-zinc-800">
                <div className="h-24 w-24 bg-white p-2 rounded-xl flex items-center justify-center shadow-md shrink-0">
                  <QrCode className="h-20 w-20 text-zinc-950" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-zinc-300 font-medium">
                    Generic Menu URL:
                  </div>
                  <div className="font-mono text-amber-300 break-all select-all bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
                    {networkInfo?.localIp
                      ? `http://${networkInfo.localIp}:3000/order`
                      : "http://localhost:3000/order"}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Guests on the hotel Wi-Fi can scan this single QR from anywhere in the property.
                  </div>
                </div>
              </div>
            </div>

            {/* 2. ROOM-SPECIFIC QR CARDS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Pre-Assigned Room QR Codes ({rooms.length} Rooms)
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Room number is pre-encoded so guests directly order to their room with 1-click folio posting.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition"
                >
                  <Printer className="h-3.5 w-3.5 text-zinc-400" />
                  Print Tent Cards
                </button>
              </div>

              {/* Rooms QR Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {rooms.map((r) => {
                  const roomUrl = `${networkInfo?.localIp ? `http://${networkInfo.localIp}:3000` : window.location.origin}/order?room=${r.number}`;
                  const isCopied = copiedLink === r.number;

                  return (
                    <div
                      key={r.id}
                      className="rounded-xl bg-[#121215] border border-zinc-800 p-2.5 space-y-2 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-zinc-100 font-mono">
                            Room {r.number}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {r.roomType?.name || "Standard Room"}
                          </div>
                        </div>
                        <QrCode className="h-4 w-4 text-amber-400" />
                      </div>

                      <div className="flex items-center gap-1 pt-1 border-t border-zinc-800/80">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(roomUrl);
                            setCopiedLink(r.number);
                            setTimeout(() => setCopiedLink(null), 2000);
                          }}
                          className="flex-1 rounded bg-zinc-800 hover:bg-zinc-700 py-1 text-[10px] font-medium text-zinc-300 transition text-center"
                        >
                          {isCopied ? "Copied!" : "Copy Link"}
                        </button>
                        <a
                          href={`/order?room=${r.number}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 p-1 transition"
                          title="Open Menu"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>Automatic In-Room Delivery & GST 5% SAC 996331 Supply</span>
              <button
                onClick={() => setShowDiningQrModal(false)}
                className="rounded-lg bg-zinc-800 px-4 py-1.5 text-zinc-200 font-medium hover:bg-zinc-700 transition"
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

