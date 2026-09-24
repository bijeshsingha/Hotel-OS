"use client";

import React, { useMemo } from "react";
import { RoomCard } from "./room-card";
import { AlertCircle } from "lucide-react";

interface RoomGridProps {
  rooms: any[];
  stays: any[];
  getRoomBedInfo: (room: any) => { kind: string; label: string };
  onSelectInspect: (room: any) => void;
  onOpenFolio: (stay: any, room: any, e: React.MouseEvent) => void;
  onOpenMoveModal: (stay: any, room: any, e: React.MouseEvent) => void;
  onToggleHK: (roomId: string, currentHK: string, e: React.MouseEvent) => void;
  onQuickCheckIn: (room: any, e: React.MouseEvent) => void;
  sortBy?: "ROOM_NUMBER" | "FLOOR" | "CATEGORY" | "STATUS";
}

export function RoomGrid({
  rooms,
  stays,
  getRoomBedInfo,
  onSelectInspect,
  onOpenFolio,
  onOpenMoveModal,
  onToggleHK,
  onQuickCheckIn,
  sortBy = "ROOM_NUMBER",
}: RoomGridProps) {
  // Group rooms dynamically based on active sortBy
  const roomGroups = useMemo(() => {
    if (sortBy === "CATEGORY") {
      const map = new Map<string, any[]>();
      rooms.forEach((r) => {
        const cat = r.roomType?.name || "Standard";
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push(r);
      });
      return Array.from(map.entries()).map(([label, items]) => ({
        key: label,
        title: label,
        rooms: items,
      }));
    }

    if (sortBy === "STATUS") {
      const statusLabels: Record<string, string> = {
        OCCUPIED: "Occupied Rooms",
        VACANT_READY: "Vacant & Clean (Ready)",
        DIRTY: "Turnover Dirty",
        MAINTENANCE: "Out of Order / Maintenance",
      };
      const map = new Map<string, any[]>();
      rooms.forEach((r) => {
        const isOcc = r.roomState?.occupancyStatus === "OCCUPIED";
        const isDirty = r.roomState?.housekeepingStatus === "DIRTY";
        const isOOO = r.roomState?.sellabilityStatus === "OUT_OF_ORDER";
        const key = isOcc ? "OCCUPIED" : isDirty ? "DIRTY" : isOOO ? "MAINTENANCE" : "VACANT_READY";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      });
      return Array.from(map.entries()).map(([key, items]) => ({
        key,
        title: statusLabels[key] || key,
        rooms: items,
      }));
    }

    // Default: Group by floor (for FLOOR and ROOM_NUMBER)
    const map = new Map<number, any[]>();
    rooms.forEach((r) => {
      const floor = r.floor ?? 1;
      if (!map.has(floor)) map.set(floor, []);
      map.get(floor)!.push(r);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([floor, items]) => ({
        key: `floor-${floor}`,
        title: `Floor ${floor}`,
        rooms: items,
      }));
  }, [rooms, sortBy]);

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-14 text-center rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800">
        <AlertCircle className="h-10 w-10 text-zinc-400 dark:text-zinc-600 mb-3" />
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          No rooms match your filter criteria
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
          Try resetting the status filter, clearing the search query, or selecting another floor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {roomGroups.map((group) => (
        <div key={group.key} className="space-y-4">
          <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <span>{group.title}</span>
            <span className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-800" />
            <span className="text-xs font-mono font-medium text-zinc-400">{group.rooms.length} rooms</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {group.rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                stays={stays}
                bedInfo={getRoomBedInfo(room)}
                onSelectInspect={onSelectInspect}
                onOpenFolio={onOpenFolio}
                onOpenMoveModal={onOpenMoveModal}
                onToggleHK={onToggleHK}
                onQuickCheckIn={onQuickCheckIn}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
