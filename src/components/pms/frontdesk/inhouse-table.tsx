"use client";

import React from "react";
import { formatINR } from "@/lib/gst/calculator";
import { formatGuestDisplayName } from "@/lib/domain/name-utils";
import { Receipt, ArrowRightLeft, LogOut, Users } from "lucide-react";

interface InHouseTableProps {
  stays: any[];
  metrics: { totalPax: number };
  onOpenFolio: (stay: any, room: any) => void;
  onOpenMoveModal: (stay: any, room: any, e: React.MouseEvent) => void;
  onDirectCheckout: (stayId: string, e: React.MouseEvent) => void;
}

export function InHouseTable({
  stays,
  metrics,
  onOpenFolio,
  onOpenMoveModal,
  onDirectCheckout,
}: InHouseTableProps) {
  const inHouseStays = stays.filter((s) => s.status === "IN_HOUSE");

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">
            In-House Guest Directory
          </h2>
          <span className="text-sm text-zinc-400 font-normal">
            ({inHouseStays.length} active stays • {metrics.totalPax} guests)
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Room</th>
              <th className="px-5 py-3.5">Guest Name</th>
              <th className="px-4 py-3.5">Contact Phone</th>
              <th className="px-4 py-3.5">Pax</th>
              <th className="px-4 py-3.5">Arrival</th>
              <th className="px-4 py-3.5">Departure</th>
              <th className="px-4 py-3.5">Folio Balance</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-medium">
            {inHouseStays.map((stay) => {
              const activeRoomAssignment =
                stay.roomAssignments?.find((ra: any) => !ra.endsAt) ||
                stay.roomAssignments?.[0];
              const room = activeRoomAssignment?.room;
              const roomNumber = room?.number || "N/A";
              const guestName =
                formatGuestDisplayName(stay.primaryGuest?.name) || "Guest";
              const guestPhone = stay.primaryGuest?.phone || "N/A";
              const arrival = stay.arrivalAt
                ? new Date(stay.arrivalAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })
                : "N/A";
              const departure = stay.expectedDepartureAt
                ? new Date(stay.expectedDepartureAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })
                : "N/A";
              const balance = stay.folio?.balance ?? 0;

              return (
                <tr
                  key={stay.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-5 py-4 font-mono font-bold text-base text-zinc-950 dark:text-zinc-50">
                    Room {roomNumber}
                  </td>
                  <td className="px-5 py-4 text-zinc-950 dark:text-zinc-50 font-semibold text-base">
                    {guestName}
                    {stay.primaryGuest?.companyName && (
                      <span className="block text-xs font-normal text-zinc-400 mt-0.5">
                        {stay.primaryGuest.companyName}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 font-mono text-zinc-500 text-sm">{guestPhone}</td>
                  <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300 text-sm">
                    {stay.adults || 1} Pax
                  </td>
                  <td className="px-4 py-4 font-mono text-zinc-500 text-sm">{arrival}</td>
                  <td className="px-4 py-4 font-mono text-zinc-500 text-sm">
                    {departure}
                    {stay.isExtendedDeparture && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        Extended
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm tabular-nums">
                    <span
                      className={
                        balance > 0.5
                          ? "font-bold text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400 font-semibold"
                      }
                    >
                      {formatINR(balance)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button
                      onClick={() => onOpenFolio(stay, room)}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-semibold text-xs transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                      title="Open Folio"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>Folio</span>
                    </button>
                    <button
                      onClick={(e) => onOpenMoveModal(stay, room, e)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer"
                      title="Move Room"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => onDirectCheckout(stay.id, e)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold transition cursor-pointer"
                      title="Checkout"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
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
