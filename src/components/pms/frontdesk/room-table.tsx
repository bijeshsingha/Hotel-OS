"use client";

import React from "react";
import { formatINR } from "@/lib/gst/calculator";
import { Receipt, ArrowRightLeft, User } from "lucide-react";

interface RoomTableProps {
  rooms: any[];
  stays: any[];
  onSelectInspect: (room: any) => void;
  onOpenFolio: (stay: any, room: any, e: React.MouseEvent) => void;
  onOpenMoveModal: (stay: any, room: any, e: React.MouseEvent) => void;
  onToggleHK: (roomId: string, currentHK: string, e: React.MouseEvent) => void;
  onQuickCheckIn: (room: any, e: React.MouseEvent) => void;
}

export function RoomTable({
  rooms,
  stays,
  onSelectInspect,
  onOpenFolio,
  onOpenMoveModal,
  onToggleHK,
  onQuickCheckIn,
}: RoomTableProps) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Room</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Housekeeping</th>
              <th className="px-5 py-3.5">Resident Guest</th>
              <th className="px-4 py-3.5">Folio Balance</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {rooms.map((room) => {
              const hkStatus = room.roomState?.housekeepingStatus || "CLEAN";
              const isOOO = room.roomState?.sellabilityStatus === "OUT_OF_ORDER";

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
              const balance = activeStay?.folio?.balance ?? 0;

              return (
                <tr
                  key={room.id}
                  onClick={() => onSelectInspect(room)}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4 font-bold font-mono text-base sm:text-lg text-zinc-950 dark:text-zinc-50">
                    {room.number}
                    <span className="text-xs text-zinc-400 font-normal ml-1.5 font-sans">
                      (Fl {room.floor})
                    </span>
                  </td>
                  <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300 font-medium">
                    {room.roomType?.name || "Standard"}
                  </td>
                  <td className="px-4 py-4">
                    {isOOO ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Out of Order
                      </span>
                    ) : isOccupied ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                        Occupied
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Vacant
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={(e) => onToggleHK(room.id, hkStatus, e)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        hkStatus === "CLEAN"
                          ? "text-zinc-600 dark:text-zinc-400 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                          : "text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60"
                      }`}
                    >
                      {hkStatus}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    {guest ? (
                      <div className="flex items-center gap-2 font-semibold text-zinc-950 dark:text-zinc-100">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{guest.name}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-xs">Vacant</span>
                    )}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm tabular-nums">
                    {isOccupied ? (
                      <span
                        className={
                          balance > 0.5
                            ? "font-bold text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400 font-semibold"
                        }
                      >
                        {formatINR(balance)}
                      </span>
                    ) : (
                      <span className="text-zinc-400">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    {isOccupied && activeStay ? (
                      <>
                        <button
                          onClick={(e) => onOpenFolio(activeStay, room, e)}
                          className="px-3.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-semibold text-xs transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          title="Open Folio"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Folio</span>
                        </button>
                        <button
                          onClick={(e) => onOpenMoveModal(activeStay, room, e)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer"
                          title="Move Room"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => onQuickCheckIn(room, e)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
                      >
                        Check-In
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
