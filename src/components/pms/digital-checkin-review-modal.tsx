"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  Compass,
  FileText,
  CreditCard,
  BedDouble,
  Calendar,
  DollarSign,
  Users,
  ShieldCheck,
  Eye,
  Check,
  ChevronRight,
  Printer,
  Plus,
  Trash2,
} from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";

interface DigitalCheckInReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: any | null;
  rooms: any[];
  onFulfilled?: () => void;
  onOpenGrcPrint?: (reg: any) => void;
}

export function DigitalCheckInReviewModal({
  isOpen,
  onClose,
  registration,
  rooms,
  onFulfilled,
  onOpenGrcPrint,
}: DigitalCheckInReviewModalProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [additionalRoomIds, setAdditionalRoomIds] = useState<string[]>([]);
  const [roomRates, setRoomRates] = useState<Record<string, string>>({});
  const [extraBedRoomIds, setExtraBedRoomIds] = useState<string[]>([]);
  const [roomExtraBedRates, setRoomExtraBedRates] = useState<Record<string, string>>({});
  const [groupBilling, setGroupBilling] = useState<boolean>(true);
  const [departureDate, setDepartureDate] = useState<string>("");
  const [agreedTariff, setAgreedTariff] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("0");
  const [depositMethod, setDepositMethod] = useState<string>("UPI");
  const [depositRef, setDepositRef] = useState<string>("");
  const [staffNotes, setStaffNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [viewPhotoModal, setViewPhotoModal] = useState(false);

  // Vacant rooms
  const vacantRooms = rooms.filter((r) => r.roomState?.occupancyStatus === "VACANT");

  useEffect(() => {
    if (registration && isOpen) {
      setError(null);
      setSuccessData(null);
      setAdditionalRoomIds([]);
      setRoomRates({});
      setExtraBedRoomIds([]);
      setRoomExtraBedRates({});
      setGroupBilling(true);
      setDepositAmount(registration.depositAmount ? String(registration.depositAmount) : "0");
      setStaffNotes(registration.internalNotes || "");
      setDepositRef(`GRC-${registration.registrationNo}`);

      // Set Departure Date
      const defaultDep = registration.expectedDepartureDate
        ? registration.expectedDepartureDate.split("T")[0]
        : new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0];
      setDepartureDate(defaultDep);

      // Try to match preAssignedRoom with a vacant room
      if (registration.preAssignedRoom) {
        const match = vacantRooms.find(
          (r) => String(r.number).trim() === String(registration.preAssignedRoom).trim()
        );
        if (match) {
          setSelectedRoomId(match.id);
          setAgreedTariff(match.roomType?.basePrice ? String(match.roomType.basePrice) : "3200");
          return;
        }
      }

      // Default to first vacant room
      if (vacantRooms.length > 0) {
        setSelectedRoomId(vacantRooms[0].id);
        setAgreedTariff(vacantRooms[0].roomType?.basePrice ? String(vacantRooms[0].roomType.basePrice) : "3200");
      } else {
        setSelectedRoomId("");
        setAgreedTariff("3200");
      }
    }
  }, [registration, isOpen]);

  // When room changes, auto-populate default tariff
  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const r = rooms.find((rm) => rm.id === roomId);
    if (r?.roomType?.basePrice) {
      setAgreedTariff(String(r.roomType.basePrice));
    }
  };

  const toggleExtraBedForRoom = (roomId: string) => {
    setExtraBedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  if (!isOpen || !registration) return null;

  const isAlreadyCheckedIn = registration.status === "CHECKED_IN";

  // Parse Co-Guests
  let coGuests: any[] = [];
  if (registration.coGuestsJson) {
    try {
      const parsed = JSON.parse(registration.coGuestsJson);
      if (Array.isArray(parsed)) coGuests = parsed;
    } catch {}
  }

  // Common UI styles
  const inputClass =
    "w-full h-11 px-3.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClass = "block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] tracking-wider mb-1.5";

  // Compute selected rooms and capacity math
  const allSelectedRooms = rooms.filter(
    (r) => r.id === selectedRoomId || additionalRoomIds.includes(r.id)
  );
  const totalRoomsCount = Math.max(1, allSelectedRooms.length);
  const baseCap = allSelectedRooms.reduce(
    (acc, r) => acc + (r.roomType?.capacity || 2),
    0
  ) || totalRoomsCount * 2;
  
  // Total extra beds enabled across all assigned rooms
  const activeExtraBedRooms = extraBedRoomIds.filter((id) =>
    allSelectedRooms.some((r) => r.id === id)
  );
  const totalExtraBedsCount = activeExtraBedRooms.length;
  const totalCap = baseCap + totalExtraBedsCount;
  const absoluteMax = baseCap + totalRoomsCount;

  // Calculate total guests from registration
  const totalPax = 1 + coGuests.length;
  const isOver = totalPax > totalCap;
  const isBeyondMax = totalPax > absoluteMax;
  const diff = totalPax - totalCap;

  const handleFulfillCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setError("Please select a vacant primary room to assign to this guest.");
      return;
    }

    setLoading(true);
    setError(null);

    const allRoomIds = [selectedRoomId, ...additionalRoomIds];
    const finalRoomRates = { ...roomRates, [selectedRoomId]: agreedTariff };

    try {
      const res = await fetch(`/api/v1/registrations/${registration.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomIds: allRoomIds,
          roomRates: finalRoomRates,
          groupBilling,
          agreedTariff: Number(agreedTariff) || undefined,
          extraBeds: totalExtraBedsCount,
          extraBedRate: 500,
          departureDate,
          depositAmount: Number(depositAmount) || 0,
          depositMethod,
          depositRef,
          notes: staffNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete check-in");
      }

      setSuccessData(data);
      if (onFulfilled) onFulfilled();
    } catch (err: any) {
      console.error("Fulfill error:", err);
      setError(err.message || "An unexpected error occurred during check-in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181b] shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">Digital Check-In Review</h2>
                <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/40 px-2.5 py-0.5 rounded-md">
                  {registration.registrationNo}
                </span>
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    isAlreadyCheckedIn
                      ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30"
                      : "bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/30"
                  }`}
                >
                  {isAlreadyCheckedIn ? "✓ CHECKED IN" : "⏳ PENDING REVIEW"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Submitted via Digital Kiosk / Guest Smartphone • {registration.arrivalDateTime || "Today"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Success Banner if Fulfilled */}
          {successData && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-600/60 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in shadow-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
                    {registration.fullName} Successfully Checked In!
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 font-mono mt-0.5">
                    Assigned Room(s): {registration.assignedRoomNumber || successData.room?.number || "Ready"} • Stay #{successData.stayId?.slice(-6) || "Active"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {onOpenGrcPrint && (
                  <button
                    onClick={() => {
                      onOpenGrcPrint(successData.registration || registration);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-white text-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-200 font-bold text-xs flex items-center gap-1.5 transition shadow"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Official GRC</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition shadow"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* BALANCED 2-COLUMN GRID (50% / 50%) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN: GUEST SUBMITTED DOSSIER */}
            <div className="space-y-4">
              {/* Primary Guest Details Box */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#151518] p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Guest Profile & Contact
                  </span>
                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                    {registration.nationality || "Indian"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 text-[11px] block font-semibold">Full Name</span>
                    <strong className="text-zinc-900 dark:text-white text-sm font-bold block mt-0.5">{registration.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[11px] block font-semibold">Father / Spouse Name</span>
                    <span className="text-zinc-700 dark:text-zinc-200 font-medium block mt-0.5">{registration.fatherSpouseName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[11px] block font-semibold">Age / Gender</span>
                    <span className="text-zinc-700 dark:text-zinc-200 font-mono font-medium block mt-0.5">
                      {registration.age ? `${registration.age} Yrs` : "—"} • {registration.gender || "Male"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[11px] block font-semibold">Mobile Phone</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" />
                      {registration.mobilePhone}
                    </span>
                  </div>
                  {registration.alternatePhone && (
                    <div>
                      <span className="text-zinc-500 text-[11px] block font-semibold">Alternate Contact</span>
                      <span className="text-zinc-700 dark:text-zinc-300 font-mono block mt-0.5">{registration.alternatePhone}</span>
                    </div>
                  )}
                  {registration.email && (
                    <div>
                      <span className="text-zinc-500 text-[11px] block font-semibold">Email</span>
                      <span className="text-zinc-700 dark:text-zinc-300 truncate block mt-0.5">{registration.email}</span>
                    </div>
                  )}
                </div>

                {/* Residential Address */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                  <span className="text-zinc-500 text-[11px] font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                    Residential Address
                  </span>
                  <p className="text-zinc-800 dark:text-zinc-200 mt-1 font-medium leading-relaxed">
                    {[
                      registration.streetAddress,
                      registration.city,
                      registration.state,
                      registration.pinZipCode,
                      registration.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </div>
              </div>

              {/* ID Proof & Digital Signature Box */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#151518] p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Government ID & Signature
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-300 px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
                    {registration.idDocumentType || "AADHAAR"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* ID Document Photo Preview */}
                  <div className="space-y-1.5">
                    <span className="text-zinc-600 dark:text-zinc-400 text-[11px] font-bold block">Photo ID Document</span>
                    {registration.idPhotoUrl ? (
                      <div className="relative group rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-black aspect-video flex items-center justify-center">
                        <img
                          src={registration.idPhotoUrl}
                          alt="Government ID"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setViewPhotoModal(true)}
                          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-xs text-white font-bold transition"
                        >
                          <Eye className="h-4 w-4" /> View Full ID
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center text-xs text-zinc-500 font-mono aspect-video flex items-center justify-center">
                        No ID photo uploaded
                      </div>
                    )}
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block">
                      Doc #: <strong className="text-zinc-800 dark:text-zinc-200">{registration.idDocumentNumber || "Physical ID Verified"}</strong>
                    </span>
                  </div>

                  {/* Digital Signature Preview */}
                  <div className="space-y-1.5">
                    <span className="text-zinc-600 dark:text-zinc-400 text-[11px] font-bold block">Guest E-Signature</span>
                    {registration.signatureDataUrl ? (
                      <div className="rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-white p-2.5 aspect-video flex items-center justify-center shadow-inner">
                        <img
                          src={registration.signatureDataUrl}
                          alt="Signature"
                          className="max-h-full max-w-full object-contain filter invert"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center text-xs text-zinc-500 font-mono aspect-video flex items-center justify-center">
                        Physical sign on file
                      </div>
                    )}
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono block font-semibold">
                      ✓ House Rules Accepted
                    </span>
                  </div>
                </div>
              </div>

              {/* Travel & Vehicle Info */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#151518] p-5 space-y-3 shadow-xs text-xs">
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <Compass className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Travel & Vehicle Particulars
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-zinc-500 text-[11px] block font-semibold">Arrived From</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium block mt-0.5">{registration.arrivedFrom || "—"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[11px] block font-semibold">Going To</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium block mt-0.5">{registration.goingTo || "—"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[11px] block font-semibold">Purpose</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium block mt-0.5">{registration.purposeOfVisit || "Tourism"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[11px] block font-semibold">Vehicle No.</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-mono font-medium block mt-0.5">{registration.vehicleNumber || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Co-Guests (If Any) */}
              {coGuests.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#151518] p-5 space-y-3 shadow-xs text-xs">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Accompanying Co-Guests ({coGuests.length})
                  </span>
                  <div className="space-y-2">
                    {coGuests.map((cg: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                      >
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {idx + 1}. {cg.name}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                          {cg.age ? `${cg.age} Yrs` : ""} • {cg.gender} • {cg.relation}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: FRONT DESK FULFILLMENT & ROOM ALLOCATION */}
            <div className="space-y-4">
              <form onSubmit={handleFulfillCheckIn} className="space-y-5">
                {/* ROOM ASSIGNMENT & GROUP BOOKING BOX */}
                <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-[#141824] p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-900/50 pb-3">
                    <span className="font-bold text-xs text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Room Allocation & Extra Beds
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-800 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/80 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800/60">
                      {allSelectedRooms.length} Room{allSelectedRooms.length > 1 ? "s" : ""} Total
                    </span>
                  </div>

                  {/* Primary Room Card */}
                  <div className="p-4 rounded-xl bg-white dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 space-y-3 shadow-xs">
                    <div className="space-y-1.5">
                      <label className="block font-bold text-blue-950 dark:text-blue-200 uppercase text-[11px] tracking-wider">
                        Primary Room *
                      </label>
                      <select
                        required
                        disabled={isAlreadyCheckedIn || loading}
                        value={selectedRoomId}
                        onChange={(e) => handleRoomChange(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">-- Select Vacant Primary Room --</option>
                        {vacantRooms.map((r) => {
                          const isPreAssigned =
                            registration.preAssignedRoom &&
                            String(r.number).trim() === String(registration.preAssignedRoom).trim();
                          return (
                            <option key={r.id} value={r.id}>
                              Room {r.number} — {r.roomType?.name} (Floor {r.floor})
                              {isPreAssigned ? " ★ [Guest Requested]" : ""}
                            </option>
                          );
                        })}
                      </select>
                      {registration.preAssignedRoom && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono font-medium">
                          ★ Guest requested: Room {registration.preAssignedRoom}
                        </p>
                      )}
                    </div>

                    {/* Primary Room Tariff & Extra Bed Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-zinc-600 dark:text-zinc-400 text-[11px] font-bold block">
                          Room Tariff (₹/nt)
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-zinc-400 font-bold font-mono text-xs">₹</span>
                          <input
                            type="number"
                            required
                            min="1"
                            disabled={isAlreadyCheckedIn || loading}
                            value={agreedTariff}
                            onChange={(e) => setAgreedTariff(e.target.value)}
                            className="w-full h-10 pl-7 pr-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Primary Room Extra Bed Toggle */}
                      <div className="space-y-1">
                        <label className="text-zinc-600 dark:text-zinc-400 text-[11px] font-bold block">
                          Extra Bed for Primary Room
                        </label>
                        <div className="h-10 flex items-center justify-between px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            <input
                              type="checkbox"
                              disabled={isAlreadyCheckedIn || loading}
                              checked={extraBedRoomIds.includes(selectedRoomId)}
                              onChange={() => toggleExtraBedForRoom(selectedRoomId)}
                              className="w-4 h-4 rounded bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-blue-600 cursor-pointer"
                            />
                            <span>+ 1 Extra Bed</span>
                          </label>
                          {extraBedRoomIds.includes(selectedRoomId) && (
                            <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400">
                              +₹500/nt
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group Booking - Additional Rooms with Per-Room Extra Bed */}
                  <div className="space-y-3 border-t border-blue-200 dark:border-blue-900/40 pt-3.5">
                    <label className={labelClass}>
                      Additional Rooms (Group Booking)
                    </label>

                    {/* Selected Additional Rooms List */}
                    {additionalRoomIds.length > 0 && (
                      <div className="flex flex-col gap-3 mb-2">
                        {additionalRoomIds.map((id) => {
                          const r = rooms.find((room) => room.id === id);
                          const hasExtraBed = extraBedRoomIds.includes(id);
                          return (
                            <div
                              key={id}
                              className="p-3.5 rounded-xl bg-white dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 space-y-2.5 shadow-xs"
                            >
                              {/* Top row: Room & Tariff & Remove */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 font-bold font-mono text-xs border border-blue-200 dark:border-blue-500/30">
                                    Room {r?.number}
                                  </span>
                                  <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                                    {r?.roomType?.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="relative flex items-center">
                                    <span className="absolute left-2.5 text-xs text-zinc-400 font-bold font-mono">₹</span>
                                    <input
                                      type="number"
                                      placeholder="Rate"
                                      value={roomRates[id] || ""}
                                      onChange={(e) =>
                                        setRoomRates((prev) => ({ ...prev, [id]: e.target.value }))
                                      }
                                      className="w-24 h-9 pl-6 pr-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdditionalRoomIds((prev) => prev.filter((rid) => rid !== id));
                                      setExtraBedRoomIds((prev) => prev.filter((rid) => rid !== id));
                                    }}
                                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition"
                                    title="Remove Room"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Bottom row: Extra bed for this specific room */}
                              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-800 dark:text-zinc-300">
                                  <input
                                    type="checkbox"
                                    checked={hasExtraBed}
                                    onChange={() => toggleExtraBedForRoom(id)}
                                    className="w-4 h-4 rounded bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-blue-600 cursor-pointer"
                                  />
                                  <span>+ 1 Extra Bed for Room {r?.number}</span>
                                </label>
                                {hasExtraBed && (
                                  <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400">
                                    +₹500/nt
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Dropdown to add more */}
                    <select
                      value=""
                      disabled={isAlreadyCheckedIn || loading}
                      onChange={(e) => {
                        if (e.target.value) {
                          const newId = e.target.value;
                          setAdditionalRoomIds((prev) => [...prev, newId]);
                          const r = rooms.find((rm) => rm.id === newId);
                          if (r?.roomType?.basePrice) {
                            setRoomRates((prev) => ({ ...prev, [newId]: String(r.roomType.basePrice) }));
                          }
                        }
                      }}
                      className={inputClass}
                    >
                      <option value="">+ Click to Add Additional Vacant Room to Group...</option>
                      {vacantRooms
                        .filter((r) => r.id !== selectedRoomId && !additionalRoomIds.includes(r.id))
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            Room {r.number} — {r.roomType?.name} (Floor {r.floor})
                          </option>
                        ))}
                    </select>

                    {additionalRoomIds.length > 0 && (
                      <div className="flex items-center gap-2.5 bg-blue-100/60 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800/60 mt-1">
                        <input
                          type="checkbox"
                          id="reviewGroupBilling"
                          checked={groupBilling}
                          onChange={(e) => setGroupBilling(e.target.checked)}
                          className="w-4 h-4 rounded bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500/50 cursor-pointer"
                        />
                        <label
                          htmlFor="reviewGroupBilling"
                          className="text-xs font-bold text-blue-900 dark:text-blue-200 cursor-pointer"
                        >
                          Consolidate Bill (Single Master Folio for all {allSelectedRooms.length} rooms)
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Departure Date */}
                  <div className="space-y-1.5 border-t border-blue-200 dark:border-blue-900/40 pt-3.5">
                    <label className={labelClass}>
                      Expected Departure Date *
                    </label>
                    <input
                      type="date"
                      required
                      disabled={isAlreadyCheckedIn || loading}
                      min={new Date().toISOString().split("T")[0]}
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {/* Live Accommodation Capacity Verification Card */}
                  <div
                    className={`rounded-xl p-3.5 border text-xs transition-all ${
                      isBeyondMax
                        ? "bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-600 text-rose-800 dark:text-rose-200"
                        : isOver
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600/60 text-amber-900 dark:text-amber-200"
                        : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{isBeyondMax ? "⛔" : isOver ? "⚠️" : "✅"}</span>
                        <div>
                          <span className="font-bold block">
                            {isBeyondMax
                              ? "Capacity Exceeded (Add Room)"
                              : isOver
                              ? "Overcapacity Warning"
                              : "Capacity Verification Passed"}
                          </span>
                          <p className="text-[11px] opacity-90 mt-0.5">
                            {isBeyondMax
                              ? `${totalPax} Guests registered, but ${totalRoomsCount} room(s) can only fit max ${absoluteMax} Pax (1 extra bed/room max). Please add another room.`
                              : isOver
                              ? `${totalPax} Guests registered, but current setup fits ${totalCap} Pax. Check the "+ 1 Extra Bed" box on room(s).`
                              : `${totalPax} Guest(s) fit across ${totalRoomsCount} room(s) (Base: ${baseCap} + ${totalExtraBedsCount} Extra Bed = Capacity: ${totalCap} Pax).`}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg font-mono font-bold shrink-0 border ${
                        isBeyondMax
                          ? "bg-rose-100 dark:bg-rose-900/60 border-rose-300 dark:border-rose-500 text-rose-900 dark:text-white"
                          : "bg-white dark:bg-black/40 border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white"
                      }`}>
                        {totalPax} / {totalCap} Pax
                      </span>
                    </div>
                  </div>
                </div>

                {/* Advance Deposit Box */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#151518] p-5 space-y-4 shadow-xs">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Collect Advance Deposit
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className={labelClass}>
                        Deposit Amount (₹)
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-zinc-400 font-bold font-mono text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          disabled={isAlreadyCheckedIn || loading}
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className={`${inputClass} pl-8 font-mono font-bold`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>
                        Payment Mode
                      </label>
                      <select
                        disabled={isAlreadyCheckedIn || loading}
                        value={depositMethod}
                        onChange={(e) => setDepositMethod(e.target.value)}
                        className={inputClass}
                      >
                        <option value="UPI">UPI / QR Payment</option>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Debit / Credit Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelClass}>
                      Payment Reference / UTR / Note
                    </label>
                    <input
                      type="text"
                      disabled={isAlreadyCheckedIn || loading}
                      placeholder="e.g. UPI/123456789"
                      value={depositRef}
                      onChange={(e) => setDepositRef(e.target.value)}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                </div>

                {/* Staff Notes */}
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    Front Desk Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    disabled={isAlreadyCheckedIn || loading}
                    placeholder="e.g. Guest requested upper floor, VIP group"
                    value={staffNotes}
                    onChange={(e) => setStaffNotes(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700 p-3 text-zinc-900 dark:text-white text-xs focus:border-blue-500 focus:outline-none transition shadow-xs"
                  />
                </div>

                {/* Action Buttons */}
                {!isAlreadyCheckedIn && !successData && (
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition shadow-xs"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={loading || !selectedRoomId}
                      className="px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 font-black text-zinc-950 text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{loading ? "Fulfilling Check-In..." : "Approve & Complete Check-In"}</span>
                    </button>
                  </div>
                )}

                {isAlreadyCheckedIn && (
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <Check className="h-4 w-4" /> Checked In (Room {registration.assignedRoomNumber})
                    </span>
                    {onOpenGrcPrint && (
                      <button
                        type="button"
                        onClick={() => onOpenGrcPrint(registration)}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Print Official GRC</span>
                      </button>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* FULL PHOTO ZOOM MODAL */}
      {viewPhotoModal && registration.idPhotoUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewPhotoModal(false)}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img
              src={registration.idPhotoUrl}
              alt="ID Document"
              className="max-h-[85vh] max-w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 object-contain shadow-2xl"
            />
            <button
              onClick={() => setViewPhotoModal(false)}
              className="absolute -top-3 -right-3 p-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-full border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
