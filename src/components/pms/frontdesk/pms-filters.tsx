"use client";

import React from "react";
import { Search, LayoutGrid, List, X } from "lucide-react";

interface PmsFiltersProps {
  activeTab: "grid" | "inhouse" | "registrations" | "reservations";
  onTabChange: (tab: "grid" | "inhouse" | "registrations" | "reservations") => void;
  statusFilter: "ALL" | "VACANT_READY" | "OCCUPIED" | "DIRTY" | "MAINTENANCE";
  onStatusFilterChange: (status: "ALL" | "VACANT_READY" | "OCCUPIED" | "DIRTY" | "MAINTENANCE") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  floorFilter: string;
  onFloorChange: (f: string) => void;
  floors: number[];
  roomTypeFilter: string;
  onRoomTypeChange: (rt: string) => void;
  roomTypes: { id: string; name: string }[];
  sortBy?: "ROOM_NUMBER" | "FLOOR" | "CATEGORY" | "STATUS";
  onSortByChange?: (sort: "ROOM_NUMBER" | "FLOOR" | "CATEGORY" | "STATUS") => void;
  viewMode: "grid" | "table";
  onViewModeChange: (m: "grid" | "table") => void;
  totalFilteredCount: number;
  inHouseCount: number;
  registrationsCount: number;
  reservationsCount: number;
  statusCounts?: {
    total: number;
    vacantClean: number;
    occupied: number;
    vacantDirty: number;
    outOfOrder: number;
  };
}

const STATUS_FILTER_ITEMS: {
  id: "ALL" | "VACANT_READY" | "OCCUPIED" | "DIRTY" | "MAINTENANCE";
  label: string;
  dotColor?: string;
  activeRing: string;
  activeText: string;
  activeBg: string;
  countKey?: "total" | "vacantClean" | "occupied" | "vacantDirty" | "outOfOrder";
}[] = [
  {
    id: "ALL",
    label: "All Rooms",
    activeRing: "ring-zinc-900/10 dark:ring-white/10",
    activeText: "text-zinc-950 dark:text-white font-bold",
    activeBg: "bg-white dark:bg-zinc-900",
    countKey: "total",
  },
  {
    id: "VACANT_READY",
    label: "Ready",
    dotColor: "bg-emerald-500",
    activeRing: "ring-emerald-500/25 dark:ring-emerald-400/25",
    activeText: "text-emerald-700 dark:text-emerald-300 font-bold",
    activeBg: "bg-white dark:bg-zinc-900",
    countKey: "vacantClean",
  },
  {
    id: "OCCUPIED",
    label: "Occupied",
    dotColor: "bg-blue-500",
    activeRing: "ring-blue-500/25 dark:ring-blue-400/25",
    activeText: "text-blue-700 dark:text-blue-300 font-bold",
    activeBg: "bg-white dark:bg-zinc-900",
    countKey: "occupied",
  },
  {
    id: "DIRTY",
    label: "Dirty",
    dotColor: "bg-amber-500",
    activeRing: "ring-amber-500/25 dark:ring-amber-400/25",
    activeText: "text-amber-700 dark:text-amber-300 font-bold",
    activeBg: "bg-white dark:bg-zinc-900",
    countKey: "vacantDirty",
  },
  {
    id: "MAINTENANCE",
    label: "Out of Order",
    dotColor: "bg-rose-500",
    activeRing: "ring-rose-500/25 dark:ring-rose-400/25",
    activeText: "text-rose-700 dark:text-rose-300 font-bold",
    activeBg: "bg-white dark:bg-zinc-900",
    countKey: "outOfOrder",
  },
];

export function PmsFilters({
  activeTab,
  onTabChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  floorFilter,
  onFloorChange,
  floors,
  roomTypeFilter,
  onRoomTypeChange,
  roomTypes,
  sortBy = "CATEGORY",
  onSortByChange,
  viewMode,
  onViewModeChange,
  totalFilteredCount,
  inHouseCount,
  registrationsCount,
  reservationsCount,
  statusCounts,
}: PmsFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Primary Module Tabs: Large, legible navigation */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800 pb-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTabChange("grid")}
            className={`h-11 px-4.5 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "grid"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <span>Room Rack</span>
            <span className="text-xs opacity-75 font-mono">({totalFilteredCount})</span>
          </button>

          <button
            onClick={() => onTabChange("inhouse")}
            className={`h-11 px-4.5 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "inhouse"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <span>In-House Guests</span>
            <span className="text-xs opacity-75 font-mono">({inHouseCount})</span>
          </button>

          <button
            onClick={() => onTabChange("registrations")}
            className={`h-11 px-4.5 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "registrations"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <span>Digital Check-In</span>
            {registrationsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                {registrationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange("reservations")}
            className={`h-11 px-4.5 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "reservations"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            }`}
          >
            <span>Reservations</span>
            <span className="text-xs opacity-75 font-mono">({reservationsCount})</span>
          </button>
        </div>

        {/* View Mode Toggle */}
        {activeTab === "grid" && (
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl shrink-0">
            <button
              onClick={() => onViewModeChange("grid")}
              className={`p-2 rounded-lg transition cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange("table")}
              className={`p-2 rounded-lg transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Filter Controls (for Room Rack) */}
      {activeTab === "grid" && (
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Status Segmented Dock (Apple / Linear style) */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100/90 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl overflow-x-auto no-scrollbar shrink-0 shadow-2xs">
            {STATUS_FILTER_ITEMS.map((item) => {
              const isActive = statusFilter === item.id;
              const count =
                statusCounts && item.countKey
                  ? statusCounts[item.countKey]
                  : undefined;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onStatusFilterChange(item.id)}
                  className={`group h-9 px-3.5 rounded-lg whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer flex items-center gap-2 text-sm select-none ${
                    isActive
                      ? `${item.activeBg} ${item.activeText} shadow-xs ring-1 ${item.activeRing}`
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-700/50 font-medium"
                  }`}
                >
                  {item.dotColor && (
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 transition-transform ${item.dotColor} ${
                        isActive
                          ? "ring-2 ring-current/40 ring-offset-1 dark:ring-offset-zinc-900 scale-110"
                          : "opacity-80 group-hover:opacity-100"
                      }`}
                    />
                  )}
                  <span>{item.label}</span>
                  {count !== undefined && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-mono leading-none transition-colors ${
                        isActive
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold"
                          : "bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 font-medium"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & Dropdown Filters */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search room # or guest..."
                className="w-full h-9.5 pl-9.5 pr-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {floors.length > 0 && (
              <select
                value={floorFilter}
                onChange={(e) => onFloorChange(e.target.value)}
                className="h-9.5 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none font-medium cursor-pointer shrink-0 whitespace-nowrap"
                title="Filter by Floor"
              >
                <option value="ALL">All Floors</option>
                {floors.map((f) => (
                  <option key={f} value={f}>
                    Floor {f}
                  </option>
                ))}
              </select>
            )}

            {roomTypes.length > 0 && (
              <select
                value={roomTypeFilter}
                onChange={(e) => onRoomTypeChange(e.target.value)}
                className="h-9.5 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none font-medium max-w-[160px] cursor-pointer shrink-0 whitespace-nowrap"
                title="Filter by Room Category"
              >
                <option value="ALL">All Categories</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            )}

            {onSortByChange && (
              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as any)}
                className="h-9.5 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none font-medium cursor-pointer shrink-0 whitespace-nowrap"
                title="Sort & Group Rooms"
              >
                <option value="ROOM_NUMBER">Sort: Room #</option>
                <option value="FLOOR">Sort: Floor</option>
                <option value="CATEGORY">Sort: Category</option>
                <option value="STATUS">Sort: Status</option>
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
