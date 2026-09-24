"use client";

import React, { useEffect } from "react";
import { formatINR } from "@/lib/gst/calculator";
import {
  X,
  Receipt,
  ArrowRightLeft,
  LogOut,
  RotateCcw,
  Brush,
  Check,
  Printer,
  User,
} from "lucide-react";

interface RoomInspectDrawerProps {
  room: any | null;
  stays: any[];
  registrations: any[];
  onClose: () => void;
  onOpenFolio: (stay: any, room: any) => void;
  onOpenMoveModal: (stay: any, room: any) => void;
  onDirectCheckout: (stayId: string, e: React.MouseEvent, roomId?: string, roomNumber?: string) => void;
  onToggleHK: (roomId: string, currentHK: string) => void;
  onPrintGrc: (reg: any) => void;
  onQuickCheckIn: (room: any) => void;
}

export function RoomInspectDrawer({
  room,
  stays,
  registrations,
  onClose,
  onOpenFolio,
  onOpenMoveModal,
  onDirectCheckout,
  onToggleHK,
  onPrintGrc,
  onQuickCheckIn,
}: RoomInspectDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!room) return null;

  const activeStay =
    stays.find(
      (s) =>
        s.status === "IN_HOUSE" &&
        s.roomAssignments?.some((ra: any) => ra.roomId === room.id && !ra.endsAt)
    ) ||
    room.assignments?.find(
      (a: any) => a.stay?.status === "IN_HOUSE" && !a.endsAt
    )?.stay;

  const isOccupied = Boolean(activeStay);
  const guest = activeStay?.primaryGuest;
  const hkStatus = room.roomState?.housekeepingStatus || "CLEAN";
  const folioBalance = activeStay?.folio?.balance ?? 0;

  // Matching GRC
  const matchingGrc = registrations.find(
    (reg) =>
      reg.id === activeStay?.registrationId ||
      reg.allocatedRoomNumber === room.number ||
      reg.guestName?.toLowerCase() === guest?.name?.toLowerCase()
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
    >
      <div
        className="w-full max-w-lg h-full bg-white dark:bg-[#121215] border-l border-zinc-200/80 dark:border-zinc-800 shadow-2xl flex flex-col justify-between overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <div className="p-5 sm:p-6 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-3xl font-extrabold font-mono text-zinc-950 dark:text-zinc-50">
                Room {room.number}
              </div>
              <div className="text-sm text-zinc-500 font-medium mt-0.5">
                Floor {room.floor} • {room.roomType?.name || "Standard Room"}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Details Body */}
          <div className="p-5 sm:p-6 space-y-5 text-sm">
            {/* Status Strip: Clean unboxed presentation */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
              <div>
                <span className="text-zinc-400 block text-xs uppercase font-bold tracking-wider mb-0.5">Occupancy</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                  {isOccupied ? "Occupied" : "Vacant"}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 block text-xs uppercase font-bold tracking-wider mb-0.5">Housekeeping</span>
                <span
                  className={`font-bold text-base ${
                    hkStatus === "CLEAN"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {hkStatus}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 block text-xs uppercase font-bold tracking-wider mb-0.5">Daily Tariff</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-base">
                  ₹{room.roomType?.basePrice || room.roomType?.baseRate || 3200}
                </span>
              </div>
            </div>

            {/* Resident Guest Profile if occupied */}
            {isOccupied && activeStay ? (
              <div className="space-y-4 p-5 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-base text-zinc-950 dark:text-zinc-50">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span>{guest?.name || "In-House Guest"}</span>
                  </div>
                  <span className="text-zinc-500 font-mono text-sm font-semibold">
                    {activeStay.adults || 1} Pax
                  </span>
                </div>

                {guest?.phone && (
                  <div className="text-zinc-500 text-sm">Phone: {guest.phone}</div>
                )}
                {guest?.companyName && (
                  <div className="text-amber-700 dark:text-amber-400 text-sm font-semibold">
                    Company: {guest.companyName}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-200/60 dark:border-blue-900/40 text-sm">
                  <div>
                    <span className="text-zinc-400 block text-xs uppercase font-bold tracking-wider mb-0.5">Check-In</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {activeStay.arrivalAt
                        ? new Date(activeStay.arrivalAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 block text-xs uppercase font-bold tracking-wider mb-0.5">Expected Departure</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {activeStay.expectedDepartureAt
                        ? new Date(activeStay.expectedDepartureAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Folio Balance & Direct Action */}
                <div className="pt-4 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-400 block text-xs uppercase font-bold tracking-wider mb-0.5">Folio Balance</span>
                    <span
                      className={`text-lg font-bold font-mono tabular-nums ${
                        folioBalance > 0.5
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {folioBalance > 0.5 ? `Due: ${formatINR(folioBalance)}` : "Settled"}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenFolio(activeStay, room);
                    }}
                    className="h-10 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-semibold text-sm flex items-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Receipt className="h-4 w-4" />
                    <span>View Folio</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900 text-zinc-500 space-y-3">
                <p className="text-sm">This room is currently vacant and available.</p>
                <button
                  onClick={() => {
                    onClose();
                    onQuickCheckIn(room);
                  }}
                  className="h-10 px-5 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-semibold text-sm transition cursor-pointer shadow-xs"
                >
                  Start Check-In
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-zinc-200/80 dark:border-zinc-800 space-y-3">
          {isOccupied && activeStay ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onClose();
                  onOpenMoveModal(activeStay, room);
                }}
                className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Move Room</span>
              </button>

              {matchingGrc && (
                <button
                  onClick={() => {
                    onClose();
                    onPrintGrc(matchingGrc);
                  }}
                  className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print GRC</span>
                </button>
              )}

              <button
                onClick={(e) => onDirectCheckout(activeStay.id, e, room.id, room.number)}
                className="col-span-2 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <LogOut className="h-4 w-4" />
                <span>Check-Out Guest</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onToggleHK(room.id, hkStatus)}
              className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {hkStatus === "CLEAN" ? <RotateCcw className="h-4 w-4 text-zinc-500" /> : <Check className="h-4 w-4 text-emerald-600" />}
              <span>{hkStatus === "CLEAN" ? "Mark Dirty / Turnover" : "Mark Clean & Ready"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
