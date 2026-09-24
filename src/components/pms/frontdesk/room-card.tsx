"use client";

import React from "react";
import {
  Receipt,
  ArrowRightLeft,
  Brush,
  Check,
  Wrench,
  User,
  Users,
} from "lucide-react";

interface RoomCardProps {
  room: any;
  stays: any[];
  bedInfo: { kind: string; label: string };
  onSelectInspect: (room: any) => void;
  onOpenFolio: (stay: any, room: any, e: React.MouseEvent) => void;
  onOpenMoveModal: (stay: any, room: any, e: React.MouseEvent) => void;
  onToggleHK: (roomId: string, currentHK: string, e: React.MouseEvent) => void;
  onQuickCheckIn: (room: any, e: React.MouseEvent) => void;
}

export function RoomCard({
  room,
  stays,
  bedInfo,
  onSelectInspect,
  onOpenFolio,
  onOpenMoveModal,
  onToggleHK,
  onQuickCheckIn,
}: RoomCardProps) {
  const hkStatus = room.roomState?.housekeepingStatus || "CLEAN";
  const activeIssue = room.maintenanceIssues?.[0];
  const isOutOfOrder =
    room.roomState?.sellabilityStatus === "OUT_OF_ORDER" ||
    (room.blocks && room.blocks.length > 0) ||
    Boolean(activeIssue);

  // Match active stay for this room
  const activeStay =
    stays.find(
      (s) =>
        s.status === "IN_HOUSE" &&
        s.roomAssignments?.some((ra: any) => ra.roomId === room.id && !ra.endsAt)
    ) ||
    room.assignments?.find(
      (a: any) => a.stay?.status === "IN_HOUSE" && !a.endsAt
    )?.stay;

  const inHouseGuest = activeStay?.primaryGuest;
  const isOccupied = Boolean(activeStay);

  // Status visual treatment: soft indicators, no harsh multi-colored boxes
  const statusTheme = isOutOfOrder
    ? {
        badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/50",
        dot: "bg-rose-500",
        label: "Out of Order",
      }
    : isOccupied
    ? {
        badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50",
        dot: "bg-blue-600 dark:bg-blue-400",
        label: "Occupied",
      }
    : hkStatus === "DIRTY"
    ? {
        badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50",
        dot: "bg-amber-500",
        label: "Turnover Dirty",
      }
    : {
        badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/50",
        dot: "bg-emerald-500",
        label: "Vacant Ready",
      };

  return (
    <div
      onClick={() => onSelectInspect(room)}
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 transition-all duration-150 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs cursor-pointer"
    >
      <div className="space-y-3.5">
        {/* Header: Room Number & Status Pill */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-zinc-950 dark:text-zinc-50 leading-none">
              {room.number}
            </div>
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
              Floor {room.floor} • {room.roomType?.name || "Standard"}
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${statusTheme.badge}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusTheme.dot}`} />
            <span>{statusTheme.label}</span>
          </div>
        </div>

        {/* Content Area: Large, readable guest / occupancy details */}
        <div className="min-h-[58px] flex flex-col justify-center">
          {isOccupied && inHouseGuest ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-base font-bold text-zinc-950 dark:text-white truncate">
                <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <span className="truncate">{inHouseGuest.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1 font-medium">
                  <Users className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  {activeStay.adults || 1} Pax
                </span>
                {activeStay.folio?.balance > 0.5 && (
                  <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                    Bal: ₹{Math.round(activeStay.folio.balance).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>
          ) : isOutOfOrder ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400 truncate">
                <Wrench className="h-4 w-4 shrink-0" />
                <span className="truncate">{activeIssue?.description || "Maintenance Required"}</span>
              </div>
              <div className="text-xs text-zinc-400">Room out of service</div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {bedInfo.label || "Double Bed"}
              </div>
              <div className="text-xs text-zinc-400">
                Ready for guest check-in
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Strip: Comfortable, large touch targets */}
      <div className="pt-4 mt-2 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/60">
        {isOccupied && activeStay ? (
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={(e) => onOpenFolio(activeStay, room, e)}
              className="flex-1 h-10 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              title="Open Guest Folio & Billing"
            >
              <Receipt className="h-4 w-4" />
              <span>Folio</span>
            </button>

            <button
              onClick={(e) => onOpenMoveModal(activeStay, room, e)}
              className="h-10 w-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer shrink-0"
              title="Move Room"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickCheckIn(room, e);
              }}
              className="flex-1 h-10 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-semibold text-sm flex items-center justify-center transition cursor-pointer shadow-xs"
            >
              Check-In
            </button>

            <button
              onClick={(e) => onToggleHK(room.id, hkStatus, e)}
              className={`h-10 px-3.5 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                hkStatus === "CLEAN"
                  ? "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                  : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
              }`}
              title="Toggle Clean / Dirty status"
            >
              {hkStatus === "CLEAN" ? <Brush className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              <span>{hkStatus === "CLEAN" ? "Clean" : "Mark Clean"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
