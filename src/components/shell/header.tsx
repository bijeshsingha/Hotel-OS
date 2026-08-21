"use client";

import React, { useState } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import {
  Building2,
  Calendar,
  UserCheck,
  Bell,
  ChevronDown,
  Check,
  Zap,
} from "lucide-react";

export function AppHeader() {
  const { user, activeProperty, availableProperties, allUsers, switchProperty, switchUser } = useHotel();
  const [showPropMenu, setShowPropMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#09090b]/90 backdrop-blur-md border-b border-[#27272a] px-4 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Clean Brand & Property Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-950 font-bold text-xs tracking-tight">
              H
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                Hotel OS
              </span>
              <span className="rounded px-1.5 py-0.2 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-800 border border-zinc-700/60">
                v1.0
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-800 mx-1 hidden sm:block" />

          {/* Property Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowPropMenu(!showPropMenu)}
              className="flex items-center gap-2 rounded-md bg-[#18181b] px-2.5 py-1.5 text-xs font-medium text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition"
            >
              <Building2 className="h-3.5 w-3.5 text-zinc-400" />
              <span className="font-medium text-zinc-200">{activeProperty?.displayName || "Select Property"}</span>
              <span className="text-[11px] text-zinc-500 font-mono">({activeProperty?.code})</span>
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </button>

            {showPropMenu && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-lg border border-zinc-800 bg-[#121215] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-75">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Select Property
                </div>
                {availableProperties.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      switchProperty(p.id);
                      setShowPropMenu(false);
                    }}
                    className={`w-full text-left rounded-md px-2.5 py-1.5 text-xs flex items-center justify-between transition ${
                      p.id === activeProperty?.id
                        ? "bg-zinc-800 text-zinc-100 font-medium"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{p.displayName}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {p.code} • GSTIN: {p.gstin || "N/A"}
                      </div>
                    </div>
                    {p.id === activeProperty?.id && <Check className="h-3.5 w-3.5 text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Business Date Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-[#18181b] border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span className="text-zinc-500 text-[11px]">DATE:</span>
            <span className="font-medium text-zinc-200">{activeProperty?.businessDate || "2026-08-20"}</span>
          </div>
        </div>

        {/* Right: Guest QR Portal, Role Simulator, Notifications */}
        <div className="flex items-center gap-2">
          {/* Guest Portal Link */}
          <a
            href="/order?room=201"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20 transition font-medium"
            title="Open In-Room Guest Dining QR Portal"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Guest Dining Portal ↗</span>
          </a>

          {/* Role Simulator Pill */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-md bg-[#18181b] border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 transition"
              title="Simulate user role"
            >
              <UserCheck className="h-3.5 w-3.5 text-zinc-400" />
              <div className="text-left flex items-center gap-1.5">
                <span className="font-medium text-zinc-200">{user?.name}</span>
                <span className="rounded bg-zinc-800 px-1 py-0.2 text-[10px] text-zinc-400 font-mono">
                  {user?.activeRole}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-1.5 w-72 rounded-lg border border-zinc-800 bg-[#121215] p-1.5 shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                  <span>Simulate Role</span>
                  <span className="text-[10px] text-zinc-500 font-normal">14 Profiles</span>
                </div>
                <div className="space-y-0.5 mt-1">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.email);
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-left rounded-md px-2.5 py-1.5 text-xs flex items-center justify-between transition ${
                        u.email === user?.email
                          ? "bg-zinc-800 text-zinc-100 font-medium"
                          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {u.email}
                        </div>
                      </div>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition border border-zinc-800"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-1.5 w-80 rounded-lg border border-zinc-800 bg-[#121215] p-3 shadow-xl z-50">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs font-medium text-zinc-300">
                  <span>Operational Alerts</span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono">2 Active</span>
                </div>
                <div className="space-y-2 mt-2 text-xs">
                  <div className="rounded-md bg-zinc-900 p-2.5 border border-zinc-800">
                    <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Maintenance Block
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Room 302 blocked for AC repair.
                    </div>
                  </div>
                  <div className="rounded-md bg-zinc-900 p-2.5 border border-zinc-800">
                    <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      KOT Sent (Table 4)
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      2x Murgh Malai Tikka sent to Kitchen.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
