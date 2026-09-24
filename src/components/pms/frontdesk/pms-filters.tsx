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
}

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
  sortBy = "ROOM_NUMBER",
  onSortByChange,
  viewMode,
  onViewModeChange,
  totalFilteredCount,
  inHouseCount,
  registrationsCount,
  reservationsCount,
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Segmented Control */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-sm font-medium">
            <button
              onClick={() => onStatusFilterChange("ALL")}
              className={`h-10 px-4 rounded-xl transition cursor-pointer font-semibold ${
                statusFilter === "ALL"
                  ? "bg-zinc-200/90 dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              All Rooms
            </button>
            <button
              onClick={() => onStatusFilterChange("VACANT_READY")}
              className={`h-10 px-4 rounded-xl transition cursor-pointer flex items-center gap-2 font-semibold ${
                statusFilter === "VACANT_READY"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Ready</span>
            </button>
            <button
              onClick={() => onStatusFilterChange("OCCUPIED")}
              className={`h-10 px-4 rounded-xl transition cursor-pointer flex items-center gap-2 font-semibold ${
                statusFilter === "OCCUPIED"
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Occupied</span>
            </button>
            <button
              onClick={() => onStatusFilterChange("DIRTY")}
              className={`h-10 px-4 rounded-xl transition cursor-pointer flex items-center gap-2 font-semibold ${
                statusFilter === "DIRTY"
                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Dirty</span>
            </button>
            <button
              onClick={() => onStatusFilterChange("MAINTENANCE")}
              className={`h-10 px-4 rounded-xl transition cursor-pointer flex items-center gap-2 font-semibold ${
                statusFilter === "MAINTENANCE"
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Out of Order</span>
            </button>
          </div>

          {/* Search & Dropdown Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search room # or guest..."
                className="w-full h-10 pl-9.5 pr-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {floors.length > 0 && (
              <select
                value={floorFilter}
                onChange={(e) => onFloorChange(e.target.value)}
                className="h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none font-medium cursor-pointer"
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
                className="h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none font-medium max-w-[160px] cursor-pointer"
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
                className="h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none font-medium cursor-pointer"
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
