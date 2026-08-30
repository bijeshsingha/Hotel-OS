"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import { useTheme } from "@/lib/context/theme-context";
import {
  Building2,
  Calendar,
  UserCheck,
  Bell,
  ChevronDown,
  Check,
  Zap,
  ScrollText,
  User,
  BedDouble,
  ArrowRight,
  X,
  Sparkles,
  LogOut,
  Plus,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export function AppHeader() {
  const { user, activeProperty, availableProperties, allUsers, switchProperty, switchUser, logout, sidebarCollapsed, toggleSidebar } = useHotel();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [showPropMenu, setShowPropMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Digital Check-in real-time notification state
  const [pendingCheckIns, setPendingCheckIns] = useState<any[]>([]);
  const [activeToast, setActiveToast] = useState<any | null>(null);
  const knownRegIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Web Audio chime player
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio context might be restricted by browser autoplay policy
    }
  };

  // Poll for new guest registrations
  useEffect(() => {
    if (!activeProperty?.id) return;

    const fetchCheckIns = async () => {
      try {
        const res = await fetch(`/api/v1/registrations?propertyId=${activeProperty.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          const pending = data.filter((r: any) => r.status === "PENDING_REVIEW");
          setPendingCheckIns(pending);

          // Detect newly arrived registrations
          if (!isFirstLoadRef.current) {
            const newlyArrived = pending.find((r: any) => !knownRegIdsRef.current.has(r.id));
            if (newlyArrived) {
              setActiveToast(newlyArrived);
              playNotificationChime();
            }
          }

          // Update known IDs
          data.forEach((r: any) => knownRegIdsRef.current.add(r.id));
          isFirstLoadRef.current = false;
        }
      } catch (err) {
        console.error("Failed to poll check-ins:", err);
      }
    };

    fetchCheckIns();
    const interval = setInterval(fetchCheckIns, 4000);
    return () => clearInterval(interval);
  }, [activeProperty?.id]);

  // Handle outside click for menus
  useEffect(() => {
    const handleOutside = () => {
      setShowPropMenu(false);
      setShowUserMenu(false);
      setShowNotifications(false);
    };
    window.addEventListener("click", (e: any) => {
      if (!e.target.closest("header") && !e.target.closest("[data-modal]")) {
        handleOutside();
      }
    });
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 px-3.5 sm:px-5 py-2 text-zinc-900 dark:text-zinc-100 shadow-xs transition-colors duration-150">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Clean Brand & Property Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Sidebar Collapse/Expand Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition border border-zinc-200/60 dark:border-zinc-800"
              title={sidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
              <img
                src="/brand/rovesta-mark.png"
                alt="ROVESTA"
                className="h-6 w-auto object-contain"
              />
              <span className="text-base font-black tracking-tight text-zinc-900 dark:text-white font-sans">
                ROVESTA
              </span>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hidden sm:inline-block">
                OS
              </span>
            </Link>


            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5 hidden sm:block" />

            {/* Property Switcher */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPropMenu(!showPropMenu);
                  setShowUserMenu(false);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 rounded-lg bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 transition shadow-xs cursor-pointer"
              >
                <Building2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <span className="font-bold text-zinc-900 dark:text-white">{activeProperty?.displayName || "Select Property"}</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">({activeProperty?.code})</span>
                <ChevronDown className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
              </button>

              {showPropMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPropMenu(false)} />
                  <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-75 space-y-1">
                    <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Switch Property
                    </div>
                    {availableProperties.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          switchProperty(p.id);
                          setShowPropMenu(false);
                        }}
                        className={`w-full text-left rounded-xl px-3 py-2 text-xs flex items-center justify-between transition ${
                          p.id === activeProperty?.id
                            ? "bg-blue-50 dark:bg-zinc-800 text-blue-900 dark:text-white font-bold border border-blue-200 dark:border-zinc-600"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        <div>
                          <div className="font-bold">{p.displayName}</div>
                          <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-mono">
                            {p.code} • GSTIN: {p.gstin || "N/A"}
                          </div>
                        </div>
                        {p.id === activeProperty?.id && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    ))}

                    <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800">
                      <Link
                        href="/onboarding"
                        onClick={() => setShowPropMenu(false)}
                        className="w-full text-left rounded-xl px-3 py-2 text-xs flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-600/10 font-bold transition border border-dashed border-blue-400 dark:border-blue-500/30"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Onboard New Hotel Property</span>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Business Date Badge */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span suppressHydrationWarning className="font-mono font-bold text-zinc-900 dark:text-white">
                {activeProperty?.businessDate || "2026-08-31"}
              </span>
            </div>
          </div>

          {/* Right: Theme Switcher, Guest QR Portal, Role Simulator, Notifications */}
          <div className="flex items-center gap-2">
            {/* THEME TOGGLE SWITCH */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-xs transition active:scale-95 cursor-pointer"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {/* Guest Portal Link */}
            <a
              href={activeProperty?.code ? `/order?property=${encodeURIComponent(activeProperty.code)}` : activeProperty?.id ? `/order?propertyId=${activeProperty.id}` : "/order"}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 rounded-lg bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition font-medium shadow-xs"
              title={`Open In-Room Guest Dining QR Portal for ${activeProperty?.displayName || "hotel"}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Dining Portal ↗</span>
            </a>

            {/* Role Simulator Pill */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(!showUserMenu);
                  setShowPropMenu(false);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-sm"
                title="Simulate user role"
              >
                <UserCheck className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <div className="text-left flex items-center gap-1.5">
                  <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[100px]">{user?.name}</span>
                  <span className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-800 dark:text-zinc-300 font-mono font-bold">
                    {user?.activeRole}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-2.5 shadow-2xl z-50 max-h-[420px] overflow-y-auto space-y-1.5 animate-in fade-in zoom-in-95 duration-75">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
                    <span>Simulate Role</span>
                    <span className="text-zinc-400 dark:text-zinc-500 font-normal">{allUsers.length} Profiles</span>
                  </div>
                  <div className="space-y-1">
                    {allUsers.map((u) => {
                      const isSelected = u.username === user?.username || u.email === user?.email;
                      let shortScope = u.propertyScope || "";
                      shortScope = shortScope.replace(/^Hotel\s+/i, "");
                      shortScope = shortScope.replace(/Grand Residency/i, "Grand");
                      shortScope = shortScope.replace(/Multi-Property/i, "Multi-Prop");

                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUser(u.username || u.email);
                            setShowUserMenu(false);
                          }}
                          className={`w-full text-left rounded-xl p-2.5 text-xs transition space-y-1 ${
                            isSelected
                              ? "bg-blue-50 dark:bg-zinc-800 text-blue-950 dark:text-white font-bold border border-blue-200 dark:border-zinc-600 shadow-sm"
                              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white border border-transparent"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <span className="font-bold text-zinc-900 dark:text-white leading-tight text-xs flex-1">
                              {u.name}
                            </span>
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                              {u.role}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 pt-0.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate">@{u.username}</span>
                            {u.propertyScope && (
                              <span className="text-zinc-400 dark:text-zinc-500 truncate max-w-[160px] shrink-0" title={u.propertyScope}>
                                • {shortScope}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full rounded-xl bg-zinc-100 hover:bg-rose-50 text-zinc-700 hover:text-rose-700 dark:bg-zinc-900 dark:hover:bg-rose-950/40 dark:text-zinc-400 dark:hover:text-rose-300 border border-zinc-300 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-800/40 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out / Switch Terminal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifications(!showNotifications);
                  setShowPropMenu(false);
                  setShowUserMenu(false);
                }}
                className="relative rounded-lg p-2 text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-[#18181b] shadow-sm"
                title="View active notifications and incoming digital check-ins"
              >
                <Bell className="h-4 w-4" />
                {pendingCheckIns.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-black text-[9px] font-mono shadow-md animate-bounce">
                    {pendingCheckIns.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-3.5 shadow-2xl z-50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-amber-500" />
                      <span>Live Reception Alerts</span>
                    </div>
                    <span className="rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-bold">
                      {pendingCheckIns.length} Pending
                    </span>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5 text-xs">
                    {pendingCheckIns.map((reg) => (
                      <div
                        key={reg.id}
                        onClick={() => {
                          setShowNotifications(false);
                          router.push(`/pms?tab=registrations&reviewId=${reg.id}`);
                        }}
                        className="rounded-xl bg-amber-50/60 dark:bg-zinc-900/90 hover:bg-amber-100/80 dark:hover:bg-zinc-800/90 p-3 border border-amber-200 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-600/60 cursor-pointer transition space-y-1.5 group shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[11px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/40 px-1.5 py-0.5 rounded">
                            {reg.registrationNo}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            {reg.createdAt ? new Date(reg.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-200 transition">
                              {reg.fullName}
                            </div>
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              {reg.preAssignedRoom ? `Requested Room ${reg.preAssignedRoom}` : "Unassigned Room"} • {reg.city || "Guest"}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-bold shrink-0">
                            <span>Review</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    ))}

                    {pendingCheckIns.length === 0 && (
                      <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                        No pending digital check-ins
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <Link
                      href="/pms?tab=registrations"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition flex items-center gap-1"
                    >
                      <span>Open Full Registration Queue</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* FLOATING REAL-TIME TOAST POPUP WHEN GUEST SUBMITS CHECK-IN */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-[#18181b] border-2 border-amber-500 rounded-2xl p-4 shadow-2xl text-zinc-900 dark:text-white animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ScrollText className="h-5 w-5 animate-pulse" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800/40">
                    New Guest Check-In
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                    {activeToast.registrationNo}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {activeToast.fullName}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  {activeToast.preAssignedRoom ? `Requested Room ${activeToast.preAssignedRoom}` : "Reception assignment requested"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveToast(null)}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-700/80 flex items-center justify-between">
            <button
              onClick={() => setActiveToast(null)}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-semibold"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                setActiveToast(null);
                router.push(`/pms?tab=registrations&reviewId=${activeToast.id}`);
              }}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-3.5 py-1.5 text-xs transition flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <span>Review & Check-In</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
