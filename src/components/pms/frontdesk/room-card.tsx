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
  const isBlocked = Boolean(room.blocks && room.blocks.length > 0);
  const isOutOfOrder =
    room.roomState?.sellabilityStatus === "OUT_OF_ORDER" ||
    isBlocked ||
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

  // Status visual treatment: colored cards with clean contrast in light & dark mode
  const statusTheme = isOutOfOrder
    ? {
        card: "bg-rose-50/70 hover:bg-rose-100/60 dark:bg-rose-950/25 dark:hover:bg-rose-950/35 border-rose-200/90 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-700",
        number: "text-rose-950 dark:text-rose-50",
        subtext: "text-rose-800/80 dark:text-rose-300/80",
        badge: "bg-rose-100/90 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300/80 dark:border-rose-800/80",
        dot: "bg-rose-500",
        divider: "border-rose-200/70 dark:border-rose-900/40",
        primaryBtn: "bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white shadow-xs",
        secondaryBtn: "bg-rose-100/90 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/70 text-rose-800 dark:text-rose-200 border border-rose-200/80 dark:border-rose-800/60",
        label: isBlocked ? "Blocked" : activeIssue ? "Maintenance" : "Out of Order",
      }
    : isOccupied
    ? {
        card: "bg-blue-50/70 hover:bg-blue-100/60 dark:bg-blue-950/25 dark:hover:bg-blue-950/35 border-blue-200/90 dark:border-blue-900/60 hover:border-blue-400 dark:hover:border-blue-700",
        number: "text-blue-950 dark:text-blue-50",
        subtext: "text-blue-800/80 dark:text-blue-300/80",
        badge: "bg-blue-100/90 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-300/80 dark:border-blue-800/80",
        dot: "bg-blue-600 dark:bg-blue-400",
        divider: "border-blue-200/70 dark:border-blue-900/40",
        primaryBtn: "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-xs",
        secondaryBtn: "bg-blue-100/90 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/70 text-blue-800 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/60",
        label: "Occupied",
      }
    : hkStatus === "DIRTY"
    ? {
        card: "bg-amber-50/70 hover:bg-amber-100/60 dark:bg-amber-950/25 dark:hover:bg-amber-950/35 border-amber-200/90 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-700",
        number: "text-amber-950 dark:text-amber-50",
        subtext: "text-amber-800/80 dark:text-amber-300/80",
        badge: "bg-amber-100/90 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/80",
        dot: "bg-amber-500",
        divider: "border-amber-200/70 dark:border-amber-900/40",
        primaryBtn: "bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs",
        secondaryBtn: "bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-zinc-950 font-bold border border-amber-400",
        label: "Turnover Dirty",
      }
    : {
        card: "bg-emerald-50/70 hover:bg-emerald-100/60 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/35 border-emerald-200/90 dark:border-emerald-900/60 hover:border-emerald-400 dark:hover:border-emerald-700",
        number: "text-emerald-950 dark:text-emerald-50",
        subtext: "text-emerald-800/80 dark:text-emerald-300/80",
        badge: "bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-800/80",
        dot: "bg-emerald-500",
        divider: "border-emerald-200/70 dark:border-emerald-900/40",
        primaryBtn: "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs",
        secondaryBtn: "bg-emerald-100/90 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/60",
        label: "Vacant Ready",
      };

  return (
    <div
      onClick={() => onSelectInspect(room)}
      className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-150 hover:shadow-xs cursor-pointer ${statusTheme.card}`}
    >
      <div className="space-y-3.5">
        {/* Header: Room Number & Status Pill */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight leading-none ${statusTheme.number}`}>
              {room.number}
            </div>
            <div className={`text-sm font-medium mt-1 ${statusTheme.subtext}`}>
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
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">{inHouseGuest.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
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
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300 truncate">
                <Wrench className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {activeIssue?.description || (room.blocks?.[0]?.reason ?? "Room Out of Service")}
                </span>
              </div>
              <div className="text-xs text-rose-600/80 dark:text-rose-400/80 font-medium">
                {isBlocked ? "Room blocked from reservations" : "Room out of service"}
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className={`text-sm font-semibold ${hkStatus === "DIRTY" ? "text-amber-900 dark:text-amber-200" : "text-emerald-900 dark:text-emerald-200"}`}>
                {bedInfo.label || "Double Bed"}
              </div>
              <div className={`text-xs ${hkStatus === "DIRTY" ? "text-amber-700/80 dark:text-amber-300/80" : "text-emerald-700/80 dark:text-emerald-300/80"}`}>
                {hkStatus === "DIRTY" ? "Needs housekeeping cleaning" : "Ready for guest check-in"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Strip: Comfortable, large touch targets */}
      <div className={`pt-4 mt-2 flex items-center justify-between gap-2 border-t ${statusTheme.divider}`}>
        {isOccupied && activeStay ? (
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={(e) => onOpenFolio(activeStay, room, e)}
              className={`flex-1 h-10 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${statusTheme.primaryBtn}`}
              title="Open Guest Folio & Billing"
            >
              <Receipt className="h-4 w-4" />
              <span>Folio</span>
            </button>

            <button
              onClick={(e) => onOpenMoveModal(activeStay, room, e)}
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${statusTheme.secondaryBtn}`}
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
              className={`flex-1 h-10 px-4 rounded-xl font-semibold text-sm flex items-center justify-center transition cursor-pointer ${statusTheme.primaryBtn}`}
            >
              Check-In
            </button>

            <button
              onClick={(e) => onToggleHK(room.id, hkStatus, e)}
              className={`h-10 px-3.5 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${statusTheme.secondaryBtn}`}
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
