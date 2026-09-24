"use client";

import React, { useState, useEffect } from "react";
import { ArrowRightLeft, X, AlertCircle, CheckCircle2, BedDouble, ShieldCheck, Layers } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";

interface TransferRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  stay: any;
  currentRoom?: any;
  folioBalance?: number;
  rooms: any[];
  onSuccess: (targetRoomNumber?: string) => void;
}

export function TransferRoomModal({
  isOpen,
  onClose,
  stay,
  currentRoom,
  folioBalance = 0,
  rooms = [],
  onSuccess,
}: TransferRoomModalProps) {
  // Discover active assignments in this stay
  const activeAssignments = (stay?.roomAssignments || []).filter((ra: any) => !ra.endsAt);

  const [selectedSourceRoomId, setSelectedSourceRoomId] = useState<string>("");
  const [targetRoomId, setTargetRoomId] = useState("");
  const [rateHandling, setRateHandling] = useState<"RETAIN_RATE" | "USE_TARGET_BASE" | "CUSTOM" | "COMPLIMENTARY">("RETAIN_RATE");
  const [customRate, setCustomRate] = useState<string>("");
  const [reasonCategory, setReasonCategory] = useState("Guest Request");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve active source assignment unconditionally before conditional returns
  const activeAssignment =
    activeAssignments.find(
      (ra: any) => ra.roomId === selectedSourceRoomId || ra.room?.id === selectedSourceRoomId || ra.room?.number === selectedSourceRoomId
    ) ||
    activeAssignments.find(
      (ra: any) => ra.roomId === currentRoom?.id || ra.room?.id === currentRoom?.id || ra.room?.number === currentRoom?.number
    ) ||
    activeAssignments[0] ||
    stay?.roomAssignments?.[0];

  const activeRoom = activeAssignment?.room || currentRoom;

  // Initialize selected source room ID when modal opens or currentRoom changes
  useEffect(() => {
    if (isOpen) {
      const initialId =
        currentRoom?.id ||
        activeAssignments.find((ra: any) => ra.room?.number === currentRoom?.number)?.room?.id ||
        activeAssignments[0]?.room?.id ||
        activeAssignments[0]?.roomId ||
        stay?.roomAssignments?.[0]?.room?.id ||
        "";
      setSelectedSourceRoomId(initialId);
      setTargetRoomId("");
      setRateHandling("RETAIN_RATE");
      setCustomRate("");
      setReasonCategory("Guest Request");
      setCustomReason("");
      setError(null);
    }
  }, [isOpen, currentRoom?.id, currentRoom?.number, stay?.id]);

  if (!isOpen || !stay) return null;

  const vacantRooms = rooms
    .filter(
      (r) =>
        r.roomState?.occupancyStatus === "VACANT" &&
        r.roomState?.sellabilityStatus !== "OUT_OF_ORDER" &&
        r.id !== activeRoom?.id
    )
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

  const selectedTargetRoom = rooms.find((r) => r.id === targetRoomId);

  // Accurately infer current room rate for activeAssignment
  let currentRoomRate = 3200;
  if (activeAssignment?.rateHandling === "COMPLIMENTARY" || activeAssignment?.moveReason?.includes("AGREED_RATE:0")) {
    currentRoomRate = 0;
  } else if (activeAssignment?.moveReason?.includes("AGREED_RATE:")) {
    const rateSection = activeAssignment.moveReason.slice(activeAssignment.moveReason.indexOf("AGREED_RATE:"));
    const match = rateSection.match(/AGREED_RATE:(\d+)/);
    if (match) currentRoomRate = Number(match[1]);
  } else {
    // Check if folio has entries or room has base price
    const postedEntry = stay?.folio?.windows?.[0]?.entries?.find(
      (e: any) =>
        e.chargeCode === "ROOM_TARIFF" &&
        e.status === "POSTED" &&
        (activeRoom?.number ? e.description?.includes(activeRoom.number) : true)
    );
    if (postedEntry && postedEntry.unitAmount !== undefined) {
      currentRoomRate = Number(postedEntry.unitAmount);
    } else if (activeRoom?.roomType?.basePrice) {
      currentRoomRate = Number(activeRoom.roomType.basePrice);
    }
  }

  const targetRoomBaseRate = selectedTargetRoom?.roomType?.basePrice || 3200;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRoomId) {
      setError("Please select a destination room to transfer to.");
      return;
    }

    const effectiveReason =
      reasonCategory === "Other"
        ? customReason.trim() || "Room Transfer"
        : customReason.trim()
        ? `${reasonCategory}: ${customReason.trim()}`
        : reasonCategory;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/stays/${stay.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceRoomId: activeRoom?.id,
          fromRoomId: activeRoom?.id,
          targetRoomId,
          reason: effectiveReason,
          rateHandling,
          customRate: rateHandling === "CUSTOM" && customRate ? parseFloat(customRate) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Room transfer failed.");
      }

      onSuccess(selectedTargetRoom?.number);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to transfer room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                In-Folio Room Transfer
              </h2>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Stay #{stay.id.slice(-6).toUpperCase()} • Guest: {stay.primaryGuest?.name || "In-House Guest"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Multi-Room Group Booking: Explicit Source Room Selector */}
          {activeAssignments.length > 1 && (
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <label className="text-xs font-mono uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Group Booking: Select Room to Transfer</span>
                </span>
                <span className="text-[11px] text-zinc-500 font-normal font-sans">
                  {activeAssignments.length} active rooms in booking
                </span>
              </label>
              <select
                value={selectedSourceRoomId}
                onChange={(e) => setSelectedSourceRoomId(e.target.value)}
                className="w-full rounded-xl border border-amber-500/30 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {activeAssignments.map((ra: any) => {
                  let rRate = 3200;
                  if (ra.rateHandling === "COMPLIMENTARY" || ra.moveReason?.includes("AGREED_RATE:0")) {
                    rRate = 0;
                  } else if (ra.moveReason?.includes("AGREED_RATE:")) {
                    const m = ra.moveReason.match(/AGREED_RATE:(\d+)/);
                    if (m) rRate = Number(m[1]);
                  } else if (ra.room?.roomType?.basePrice) {
                    rRate = Number(ra.room.roomType.basePrice);
                  }
                  return (
                    <option key={ra.roomId || ra.id} value={ra.room?.id || ra.roomId}>
                      Room {ra.room?.number || "Unknown"} ({ra.room?.roomType?.name || "Standard"}) - {formatINR(rRate)}/night
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Room Migration Comparison Card */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Current Room</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  Room {activeRoom?.number || "-"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {activeRoom?.roomType?.name || "Standard Room"} • {formatINR(currentRoomRate)}/night
              </p>
            </div>

            <div className="space-y-1 border-l border-zinc-200 dark:border-zinc-800 pl-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-semibold">
                Destination Room
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-amber-500">
                  {selectedTargetRoom ? `Room ${selectedTargetRoom.number}` : "Select Below"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {selectedTargetRoom
                  ? `${selectedTargetRoom.roomType?.name || "Room"} • ${formatINR(targetRoomBaseRate)}/night`
                  : "Pick a vacant room"}
              </p>
            </div>
          </div>

          {/* 1. Destination Room Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase font-bold text-zinc-500 tracking-wider flex items-center justify-between">
              <span>Select Destination Room *</span>
              <span className="text-[11px] text-zinc-400 font-normal font-sans">
                {vacantRooms.length} vacant rooms available
              </span>
            </label>
            <select
              value={targetRoomId}
              onChange={(e) => setTargetRoomId(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              required
            >
              <option value="">-- Choose Vacant Room --</option>
              {vacantRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.number} - {r.roomType?.name || "Room"} ({r.roomState?.housekeepingStatus || "CLEAN"})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Rate Handling (Industry Standard PMS Practice) */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase font-bold text-zinc-500 tracking-wider">
              Nightly Rate Handling
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  rateHandling === "RETAIN_RATE"
                    ? "border-amber-500/50 bg-amber-500/5 text-zinc-900 dark:text-white"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <input
                  type="radio"
                  name="rateHandling"
                  value="RETAIN_RATE"
                  checked={rateHandling === "RETAIN_RATE"}
                  onChange={() => setRateHandling("RETAIN_RATE")}
                  className="mt-0.5 text-amber-500"
                />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-white">Retain Current Rate</div>
                  <div className="text-[11px] text-zinc-400">Keep {formatINR(currentRoomRate)}/night</div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  rateHandling === "USE_TARGET_BASE"
                    ? "border-amber-500/50 bg-amber-500/5 text-zinc-900 dark:text-white"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <input
                  type="radio"
                  name="rateHandling"
                  value="USE_TARGET_BASE"
                  checked={rateHandling === "USE_TARGET_BASE"}
                  onChange={() => setRateHandling("USE_TARGET_BASE")}
                  className="mt-0.5 text-amber-500"
                />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-white">Destination Base Rate</div>
                  <div className="text-[11px] text-zinc-400">{formatINR(targetRoomBaseRate)}/night</div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  rateHandling === "CUSTOM"
                    ? "border-amber-500/50 bg-amber-500/5 text-zinc-900 dark:text-white"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <input
                  type="radio"
                  name="rateHandling"
                  value="CUSTOM"
                  checked={rateHandling === "CUSTOM"}
                  onChange={() => setRateHandling("CUSTOM")}
                  className="mt-0.5 text-amber-500"
                />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-white">Custom Override</div>
                  <div className="text-[11px] text-zinc-400">Input negotiated rate</div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  rateHandling === "COMPLIMENTARY"
                    ? "border-amber-500/50 bg-amber-500/5 text-zinc-900 dark:text-white"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <input
                  type="radio"
                  name="rateHandling"
                  value="COMPLIMENTARY"
                  checked={rateHandling === "COMPLIMENTARY"}
                  onChange={() => setRateHandling("COMPLIMENTARY")}
                  className="mt-0.5 text-amber-500"
                />
                <div className="text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-white">Complimentary</div>
                  <div className="text-[11px] text-zinc-400">0 rate charge</div>
                </div>
              </label>
            </div>

            {rateHandling === "CUSTOM" && (
              <div className="mt-2">
                <input
                  type="number"
                  placeholder="Custom Rate in INR (e.g. 3500)"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
              </div>
            )}
          </div>

          {/* 3. Reason for Transfer */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase font-bold text-zinc-500 tracking-wider">
              Transfer Reason *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="Guest Request">Guest Request</option>
                <option value="Maintenance / AC / Plumbing">Maintenance / AC / Plumbing</option>
                <option value="Noise Disturbance">Noise Disturbance</option>
                <option value="Hotel Operational Move">Hotel Operational Move</option>
                <option value="Complimentary Upgrade">Complimentary Upgrade</option>
                <option value="Paid Room Upgrade">Paid Room Upgrade</option>
                <option value="Other">Other / Custom</option>
              </select>

              <input
                type="text"
                placeholder="Additional notes / details..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* 4. Folio Continuity Notice */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                Folio Continuity
              </span>
              <p className="text-[11px] text-zinc-500">
                All existing charges and recorded advance payments remain intact on this stay folio.
              </p>
            </div>
            <div className="text-right pl-3 shrink-0">
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">Live Balance</span>
              <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                {formatINR(folioBalance)}
              </span>
            </div>
          </div>

          {/* Operational notice */}
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2 px-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              Previous Room {activeRoom?.number || "-"} will be set to VACANT DIRTY with an automated Checkout Cleaning housekeeping task created.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !targetRoomId}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>{loading ? "Transferring..." : "Confirm Room Transfer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
