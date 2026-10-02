"use client";

import React, { useMemo, useState } from "react";
import { RoomCard } from "./room-card";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ChevronsDownUp,
  LayoutGrid,
} from "lucide-react";

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
  sortBy = "CATEGORY",
}: RoomGridProps) {
  // Track collapsed status for each group key
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Group rooms dynamically based on active sortBy
  const roomGroups = useMemo(() => {
    const sortRoomsByNumber = (items: any[]) => {
      return [...items].sort((a, b) => {
        const numA = parseInt(String(a.number).replace(/\D/g, ""), 10);
        const numB = parseInt(String(b.number).replace(/\D/g, ""), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return (a.number || "").localeCompare(b.number || "");
      });
    };

    if (sortBy === "CATEGORY") {
      const map = new Map<string, any[]>();
      rooms.forEach((r) => {
        const cat = r.roomType?.name || "Standard";
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push(r);
      });
      return Array.from(map.entries()).map(([label, items]) => ({
        key: `cat-${label}`,
        title: label,
        rooms: sortRoomsByNumber(items),
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
        const isOcc =
          r.roomState?.occupancyStatus === "OCCUPIED" ||
          stays.some((s) => s.status === "IN_HOUSE" && s.roomAssignments?.some((ra: any) => ra.roomId === r.id && !ra.endsAt));
        const isDirty = r.roomState?.housekeepingStatus === "DIRTY";
        const isOOO = r.roomState?.sellabilityStatus === "OUT_OF_ORDER" || Boolean(r.blocks && r.blocks.length > 0);
        const key = isOcc ? "OCCUPIED" : isDirty ? "DIRTY" : isOOO ? "MAINTENANCE" : "VACANT_READY";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      });
      return Array.from(map.entries()).map(([key, items]) => ({
        key: `status-${key}`,
        title: statusLabels[key] || key,
        rooms: sortRoomsByNumber(items),
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
        rooms: sortRoomsByNumber(items),
      }));
  }, [rooms, stays, sortBy]);

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allCollapsed = roomGroups.length > 0 && roomGroups.every((g) => collapsedGroups[g.key]);

  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsedGroups({});
    } else {
      const next: Record<string, boolean> = {};
      roomGroups.forEach((g) => {
        next[g.key] = true;
      });
      setCollapsedGroups(next);
    }
  };

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
    <div className="space-y-6">
      {/* Global Grouping Header with Expand/Collapse All */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <LayoutGrid className="h-3.5 w-3.5 text-zinc-400" />
          <span>
            {sortBy === "CATEGORY"
              ? `Room Categories (${roomGroups.length})`
              : sortBy === "FLOOR"
              ? `Floors (${roomGroups.length})`
              : sortBy === "STATUS"
              ? `Status Groups (${roomGroups.length})`
              : `All Rooms by Floor (${roomGroups.length})`}
          </span>
        </div>

        {roomGroups.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 transition cursor-pointer"
            title={allCollapsed ? "Expand all categories" : "Collapse all categories"}
          >
            {allCollapsed ? (
              <>
                <ChevronsUpDown className="h-3.5 w-3.5" />
                <span>Expand All</span>
              </>
            ) : (
              <>
                <ChevronsDownUp className="h-3.5 w-3.5" />
                <span>Collapse All</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Category Groups with Collapsible Accordion Header */}
      {roomGroups.map((group) => {
        const isCollapsed = Boolean(collapsedGroups[group.key]);

        // Compute fast stats for the category header preview
        let occupiedCount = 0;
        let dirtyCount = 0;
        let readyCount = 0;
        let oooCount = 0;

        group.rooms.forEach((r) => {
          const isOcc =
            r.roomState?.occupancyStatus === "OCCUPIED" ||
            stays.some((s) => s.status === "IN_HOUSE" && s.roomAssignments?.some((ra: any) => ra.roomId === r.id && !ra.endsAt));
          const isDirty = r.roomState?.housekeepingStatus === "DIRTY";
          const isOOO = r.roomState?.sellabilityStatus === "OUT_OF_ORDER" || Boolean(r.blocks && r.blocks.length > 0);
          if (isOOO) oooCount++;
          else if (isOcc) occupiedCount++;
          else if (isDirty) dirtyCount++;
          else readyCount++;
        });

        return (
          <div
            key={group.key}
            className="space-y-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/20 p-3 sm:p-4.5 transition-all"
          >
            {/* Clickable Header Bar */}
            <div
              onClick={() => toggleGroupCollapse(group.key)}
              className="flex items-center justify-between gap-3 text-left py-1.5 px-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition cursor-pointer select-none group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleGroupCollapse(group.key);
                }
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80 group-hover:scale-105 transition">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                  )}
                </span>
                <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 truncate">
                  {group.title}
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                  {group.rooms.length} {group.rooms.length === 1 ? "room" : "rooms"}
                </span>
              </div>

              {/* Status summary preview & Expand/Minimize action badge */}
              <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                <div className="hidden md:flex items-center gap-2.5 text-xs font-semibold">
                  {readyCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {readyCount} Ready
                    </span>
                  )}
                  {occupiedCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-900/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      {occupiedCount} Occupied
                    </span>
                  )}
                  {dirtyCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {dirtyCount} Dirty
                    </span>
                  )}
                  {oooCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-900/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      {oooCount} Out of Order
                    </span>
                  )}
                </div>

                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-xs group-hover:bg-zinc-50 dark:group-hover:bg-zinc-700 transition">
                  {isCollapsed ? "Expand" : "Minimize"}
                </span>
              </div>
            </div>

            {/* Room Cards Grid (Visible when not minimized) */}
            {!isCollapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 pt-1 animate-in fade-in duration-150">
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
            )}
          </div>
        );
      })}
    </div>
  );
}
