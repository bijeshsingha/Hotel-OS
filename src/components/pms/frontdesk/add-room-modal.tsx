"use client";

import React, { useState } from "react";
import { Plus, X, Minus } from "lucide-react";
import { formatGuestDisplayName } from "@/lib/domain/name-utils";

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  stays: any[];
  rooms: any[];
  onSuccess: () => void;
}

export function AddRoomModal({
  isOpen,
  onClose,
  stays,
  rooms,
  onSuccess,
}: AddRoomModalProps) {
  const [stayId, setStayId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [agreedTariff, setAgreedTariff] = useState("");
  const [extraBedRate, setExtraBedRate] = useState("300");
  const [isComplimentary, setIsComplimentary] = useState(false);
  const [extraBeds, setExtraBeds] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const vacantRooms = rooms.filter(
    (r) =>
      r.roomState?.occupancyStatus === "VACANT" &&
      r.roomState?.sellabilityStatus !== "OUT_OF_ORDER"
  );

  const selectedRoom = rooms.find((rm) => rm.id === roomId);
  const selectedStay = stays.find((st) => st.id === stayId);

  // Helper to extract stay's existing extra pax rate if available
  const getStayExtraPaxRate = (sId: string): number | null => {
    const s = stays.find((st) => st.id === sId);
    if (!s?.folio?.windows) return null;
    for (const win of s.folio.windows) {
      const paxEntry = win.entries?.find(
        (e: any) =>
          (e.chargeCode === "EXTRA_PAX" || e.chargeCode === "EXTRA_BED") &&
          e.status === "POSTED"
      );
      if (paxEntry?.unitAmount !== undefined && Number(paxEntry.unitAmount) > 0) {
        return Number(paxEntry.unitAmount);
      }
    }
    return null;
  };

  const getRoomDefaultExtraRate = (rm: any): number => {
    if (rm?.roomType?.extraAdult !== undefined) return Number(rm.roomType.extraAdult);
    return 300;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stayId) {
      alert("Please select a checked-in guest.");
      return;
    }
    if (!roomId) {
      alert("Please select a vacant room to add.");
      return;
    }

    setLoading(true);
    try {
      const finalExtraRate = isComplimentary
        ? 0
        : extraBedRate !== ""
        ? Math.max(0, Number(extraBedRate) || 0)
        : (selectedRoom?.roomType?.extraAdult ?? 300);

      const res = await fetch("/api/v1/stays/add-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stayId,
          roomId,
          agreedTariff: isComplimentary
            ? 0
            : agreedTariff !== ""
            ? Number(agreedTariff)
            : undefined,
          isComplimentary,
          extraBeds,
          extraBedRate: finalExtraRate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add room to stay");

      alert(data.message || `Room ${data.roomNumber} added to guest stay successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800/70 pb-3">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Attach Room to In-House Guest
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
              Select In-House Guest *
            </label>
            <select
              required
              value={stayId}
              onChange={(e) => {
                const nextStayId = e.target.value;
                setStayId(nextStayId);
                const stayExtra = getStayExtraPaxRate(nextStayId);
                if (stayExtra !== null) {
                  setExtraBedRate(String(stayExtra));
                }
              }}
              className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            >
              <option value="">-- Choose In-House Guest --</option>
              {stays
                .filter((s) => s.status === "IN_HOUSE")
                .map((s) => {
                  const roomNos =
                    s.roomAssignments
                      ?.map((a: any) => a.room?.number)
                      .filter(Boolean)
                      .join(", ") || "Unassigned";
                  const guestName =
                    formatGuestDisplayName(s.primaryGuest?.name) || "Guest";
                  return (
                    <option key={s.id} value={s.id}>
                      Room {roomNos} ({guestName})
                    </option>
                  );
                })}
            </select>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
              Select Vacant Room to Attach *
            </label>
            <select
              required
              value={roomId}
              onChange={(e) => {
                const rid = e.target.value;
                setRoomId(rid);
                const r = rooms.find((rm) => rm.id === rid);
                if (r?.roomType?.basePrice) setAgreedTariff(String(r.roomType.basePrice));
                const stayExtra = getStayExtraPaxRate(stayId);
                const defaultExtra = stayExtra !== null ? stayExtra : getRoomDefaultExtraRate(r);
                setExtraBedRate(String(defaultExtra));
              }}
              className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            >
              <option value="">Select Vacant Room</option>
              {vacantRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.number} ({r.roomType?.name || "Standard"}, Floor {r.floor}, {r.roomState?.housekeepingStatus || "CLEAN"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                Agreed Rate / Night (₹)
              </label>
              <input
                type="number"
                disabled={isComplimentary}
                value={isComplimentary ? "0" : agreedTariff}
                onChange={(e) => setAgreedTariff(e.target.value)}
                placeholder="0"
                className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none disabled:opacity-50 font-bold"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                Extra Pax (Count)
              </label>
              <div className="h-9 flex items-center justify-between px-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setExtraBeds((b) => Math.max(0, b - 1))}
                  className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                  title="Decrease Extra Pax"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="font-mono font-bold text-xs">{extraBeds} Pax</span>
                <button
                  type="button"
                  onClick={() => setExtraBeds((b) => b + 1)}
                  className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                  title="Increase Extra Pax"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                Extra Pax Rate (₹/Nt)
              </label>
              <input
                type="number"
                disabled={isComplimentary}
                value={isComplimentary ? "0" : extraBedRate}
                onChange={(e) => setExtraBedRate(e.target.value)}
                placeholder="300"
                className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none disabled:opacity-50 font-bold"
              />
            </div>
          </div>

          {extraBeds > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs">
              <span className="text-amber-800 dark:text-amber-300 font-medium">
                Extra Pax Surcharge:
              </span>
              <span className="font-mono font-bold text-amber-900 dark:text-amber-200">
                {extraBeds} Pax x ₹{isComplimentary ? 0 : Number(extraBedRate) || 0} = +₹{extraBeds * (isComplimentary ? 0 : Number(extraBedRate) || 0)} / night
              </span>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isComplimentary}
              onChange={(e) => {
                setIsComplimentary(e.target.checked);
                if (e.target.checked) setAgreedTariff("0");
              }}
              className="rounded border-zinc-300 text-blue-600"
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              Complimentary Room (₹0 Free Stay)
            </span>
          </label>

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
              {loading ? "Adding..." : "Add Room to Stay"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
