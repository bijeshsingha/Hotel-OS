"use client";

import React, { useState } from "react";
import { ArrowRightLeft, X } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";

interface MoveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  stay: any;
  currentRoom: any;
  rooms: any[];
  onSuccess: (targetRoomNumber?: string) => void;
}

export function MoveRoomModal({
  isOpen,
  onClose,
  stay,
  currentRoom,
  rooms,
  onSuccess,
}: MoveRoomModalProps) {
  const [targetRoomId, setTargetRoomId] = useState("");
  const [reason, setReason] = useState("Guest requested room change");
  const [rateHandling, setRateHandling] = useState<"RETAIN_RATE" | "USE_TARGET_BASE" | "CUSTOM" | "COMPLIMENTARY">("RETAIN_RATE");
  const [customRate, setCustomRate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !stay) return null;

  const vacantRooms = rooms.filter(
    (r) =>
      r.roomState?.occupancyStatus === "VACANT" &&
      r.roomState?.sellabilityStatus !== "OUT_OF_ORDER" &&
      r.id !== currentRoom?.id
  );

  const selectedTargetRoom = rooms.find((r) => r.id === targetRoomId);

  // Infer current room rate
  const activeAssignment =
    stay?.roomAssignments?.find(
      (ra: any) => !ra.endsAt && (ra.roomId === currentRoom?.id || ra.room?.number === currentRoom?.number)
    ) ||
    stay?.roomAssignments?.find((ra: any) => ra.roomId === currentRoom?.id || ra.room?.number === currentRoom?.number) ||
    stay?.roomAssignments?.[0];

  let currentRate = 3200;
  if (activeAssignment?.rateHandling === "COMPLIMENTARY" || activeAssignment?.moveReason?.includes("AGREED_RATE:0")) {
    currentRate = 0;
  } else if (activeAssignment?.moveReason?.includes("AGREED_RATE:")) {
    const rateSection = activeAssignment.moveReason.slice(activeAssignment.moveReason.indexOf("AGREED_RATE:"));
    const match = rateSection.match(/AGREED_RATE:(\d+)/);
    if (match) currentRate = Number(match[1]);
  } else if (currentRoom?.roomType?.basePrice) {
    currentRate = Number(currentRoom.roomType.basePrice);
  }

  const targetRoomBaseRate = selectedTargetRoom?.roomType?.basePrice || 3200;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRoomId) {
      alert("Please select a target room.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/stays/${stay.id}/move-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceRoomId: currentRoom?.id,
          targetRoomId,
          reason,
          rateHandling,
          customRate: rateHandling === "CUSTOM" && customRate ? parseFloat(customRate) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Room transfer failed");

      alert(`Room moved successfully to Room ${data.targetRoomNumber || "new room"}!`);
      onSuccess(data.targetRoomNumber);
      onClose();
    } catch (err: any) {
      alert(`Transfer Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl text-zinc-900 dark:text-zinc-100">
        <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800/70 pb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Move Room: {stay.primaryGuest?.name || "Guest"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <span className="text-zinc-500 block mb-1">Current Room</span>
            <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 font-mono font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
              <span>Room {currentRoom?.number || "Unassigned"} ({currentRoom?.roomType?.name || "Standard"})</span>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{formatINR(currentRate)}/night</span>
            </div>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
              Select Destination Room *
            </label>
            <select
              required
              value={targetRoomId}
              onChange={(e) => setTargetRoomId(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            >
              <option value="">Select Vacant Clean Room</option>
              {vacantRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.number} ({r.roomType?.name || "Standard"}, Floor {r.floor}, {r.roomState?.housekeepingStatus || "CLEAN"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
              Rate Handling
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <label className={`p-2 rounded-lg border text-[11px] cursor-pointer ${rateHandling === "RETAIN_RATE" ? "border-blue-500 bg-blue-50/20 text-blue-600 dark:text-blue-400 font-semibold" : "border-zinc-200 dark:border-zinc-800"}`}>
                <input type="radio" name="pmsRate" value="RETAIN_RATE" checked={rateHandling === "RETAIN_RATE"} onChange={() => setRateHandling("RETAIN_RATE")} className="sr-only" />
                <div>Retain Current</div>
                <div className="text-[10px] text-zinc-400 font-normal">{formatINR(currentRate)}/night</div>
              </label>

              <label className={`p-2 rounded-lg border text-[11px] cursor-pointer ${rateHandling === "USE_TARGET_BASE" ? "border-blue-500 bg-blue-50/20 text-blue-600 dark:text-blue-400 font-semibold" : "border-zinc-200 dark:border-zinc-800"}`}>
                <input type="radio" name="pmsRate" value="USE_TARGET_BASE" checked={rateHandling === "USE_TARGET_BASE"} onChange={() => setRateHandling("USE_TARGET_BASE")} className="sr-only" />
                <div>Destination Base</div>
                <div className="text-[10px] text-zinc-400 font-normal">{formatINR(targetRoomBaseRate)}/night</div>
              </label>

              <label className={`p-2 rounded-lg border text-[11px] cursor-pointer ${rateHandling === "CUSTOM" ? "border-blue-500 bg-blue-50/20 text-blue-600 dark:text-blue-400 font-semibold" : "border-zinc-200 dark:border-zinc-800"}`}>
                <input type="radio" name="pmsRate" value="CUSTOM" checked={rateHandling === "CUSTOM"} onChange={() => setRateHandling("CUSTOM")} className="sr-only" />
                <div>Custom Override</div>
                <div className="text-[10px] text-zinc-400 font-normal">Negotiated rate</div>
              </label>

              <label className={`p-2 rounded-lg border text-[11px] cursor-pointer ${rateHandling === "COMPLIMENTARY" ? "border-blue-500 bg-blue-50/20 text-blue-600 dark:text-blue-400 font-semibold" : "border-zinc-200 dark:border-zinc-800"}`}>
                <input type="radio" name="pmsRate" value="COMPLIMENTARY" checked={rateHandling === "COMPLIMENTARY"} onChange={() => setRateHandling("COMPLIMENTARY")} className="sr-only" />
                <div>Complimentary</div>
                <div className="text-[10px] text-zinc-400 font-normal">₹0 / night</div>
              </label>
            </div>

            {rateHandling === "CUSTOM" && (
              <div className="mt-2">
                <input
                  type="number"
                  placeholder="Custom Rate in INR"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
              Reason for Room Change
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Guest preference, AC malfunction"
              className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Moving..." : "Confirm Move"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
