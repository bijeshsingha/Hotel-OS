"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import { APP_VERSION } from "@/lib/app-version";
import { authRequest } from "@/lib/auth/client-request";
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
  LogOut,
  Plus,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Lock,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

export function AppHeader() {
  const {
    user,
    activeProperty,
    availableProperties,
    allUsers,
    switchProperty,
    switchUser,
    logout,
    refreshData,
    sidebarCollapsed,
    toggleSidebar,
    toggleMobileMenu,
  } = useHotel();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [showPropMenu, setShowPropMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // User Switch Password Verification State
  const [targetSwitchUser, setTargetSwitchUser] = useState<any | null>(null);
  const [switchPassword, setSwitchPassword] = useState("");
  const [showSwitchPassword, setShowSwitchPassword] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState("");

  const handleConfirmSwitch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetSwitchUser) return;
    if (!switchPassword.trim()) {
      setSwitchError("Please enter the user password or PIN.");
      return;
    }

    setSwitchLoading(true);
    setSwitchError("");

    try {
      const { response: res, data } = await authRequest("/api/v1/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: targetSwitchUser.username || targetSwitchUser.email,
          password: switchPassword.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Invalid password or PIN.");
      }

      // Successful verification -> apply user switch
      await switchUser(targetSwitchUser.username || targetSwitchUser.email);
      setTargetSwitchUser(null);
      setSwitchPassword("");
      setSwitchError("");
    } catch (err: any) {
      setSwitchError(err.message || "Failed to switch user.");
    } finally {
      setSwitchLoading(false);
    }
  };

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
    const controller = new AbortController();

    const fetchCheckIns = async () => {
      try {
        const res = await fetch(`/api/v1/registrations?propertyId=${activeProperty.id}`, {
          signal: controller.signal,
        });
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
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        // Suppress transient dev reloads/network dropouts from triggering error overlay
      }
    };

    fetchCheckIns();
    const interval = setInterval(fetchCheckIns, 5000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
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
      <header className="ui-app-header sticky top-0 z-40 w-full bg-white dark:bg-[#191f29] border-b border-zinc-200/80 dark:border-zinc-800 px-2.5 sm:px-4 lg:px-5 py-2 text-zinc-900 dark:text-zinc-100 shadow-xs transition-colors duration-150 ui-shadow-quiet">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Clean Brand & Property Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {/* Desktop Sidebar Collapse Toggle */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100/90 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer shrink-0 ui-control ui-control-sized"
              title={sidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"} aria-label={sidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={toggleMobileMenu}
              aria-label="Open mobile menu"
              className="lg:hidden flex p-1.5 rounded-lg text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-zinc-200/80 dark:border-zinc-800 cursor-pointer shrink-0 ui-control"
              title="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" aria-label="ROVESTA dashboard" className="flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition shrink-0">
              <img
                src="/brand/rovesta-mark.png"
                alt="ROVESTA"
                className="h-6 w-auto object-contain"
              />
              <span className="text-base font-black tracking-tight text-zinc-900 dark:text-white font-sans hidden sm:inline ui-weight-medium">
                ROVESTA
              </span>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hidden md:inline-block ui-text-meta">
                OS v{APP_VERSION}
              </span>
            </Link>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5 hidden md:block" />

            {/* Property Switcher */}
            <div className="relative min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPropMenu(!showPropMenu);
                  setShowUserMenu(false);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-1 sm:gap-1.5 rounded-lg bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 transition shadow-xs cursor-pointer max-w-[110px] xs:max-w-[135px] sm:max-w-[170px] md:max-w-[210px] ui-text-body ui-shadow-quiet ui-control" data-ui="property-switcher"
              >
                <Building2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <span suppressHydrationWarning className="font-bold text-zinc-900 dark:text-white truncate ui-weight-medium">{activeProperty?.displayName || "Select Property"}</span>
                <ChevronDown className="h-3 w-3 text-zinc-500 dark:text-zinc-400 shrink-0" />
              </button>

              {showPropMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPropMenu(false)} />
                  <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-2.5 shadow-2xl z-50    duration-75 space-y-1 ui-radius-panel ui-dialog-surface ui-surface">
                    <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 ui-text-meta">
                      Switch Property
                    </div>
                    {availableProperties.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          switchProperty(p.id);
                          setShowPropMenu(false);
                        }}
                        className={`w-full text-left rounded-xl px-3 py-2 text-xs flex items-center justify-between transition  ui-text-body ${
                          p.id === activeProperty?.id
                            ? "bg-blue-50 dark:bg-zinc-800 text-blue-900 dark:text-white font-bold border border-blue-200 dark:border-zinc-600 ui-weight-medium"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                        } ui-control`}
                      >
                        <div>
                          <div className="font-bold ui-weight-medium">{p.displayName}</div>
                          <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-mono ui-text-meta ui-font-body">
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
                        className="w-full text-left rounded-xl px-3 py-2 text-xs flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-600/10 font-bold transition border border-dashed border-blue-400 dark:border-blue-500/30 ui-text-body ui-weight-medium"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add hotel</span>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Business Date Badge - visible on large screens */}
            <div className="hidden xl:flex items-center gap-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 shrink-0 ui-text-body">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block " />
              <span suppressHydrationWarning className="font-mono font-bold text-zinc-900 dark:text-white ui-font-body ui-weight-medium">
                {activeProperty?.businessDate || "2026-08-31"}
              </span>
            </div>
          </div>

          {/* Right: Theme Switcher, Guest QR Portal, Role Simulator, Notifications */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* THEME TOGGLE SWITCH */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-xs transition  cursor-pointer ui-text-body ui-shadow-quiet ui-control"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`} aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden md:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="hidden md:inline">Dark</span>
                </>
              )}
            </button>

            {/* Guest Portal Link - only visible on xl */}
            <a
              href={activeProperty?.code ? `/order?property=${encodeURIComponent(activeProperty.code)}` : activeProperty?.id ? `/order?propertyId=${activeProperty.id}` : "/order"}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:flex items-center gap-1.5 rounded-lg bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition font-medium shadow-xs ui-text-body ui-shadow-quiet"
              title={`Open In-Room Guest Dining QR Portal for ${activeProperty?.displayName || "hotel"}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 " />
              <span>Dining Portal ↗</span>
            </a>

            {/* Role Simulator Pill */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextState = !showUserMenu;
                  setShowUserMenu(nextState);
                  if (nextState) {
                    refreshData();
                  }
                  setShowPropMenu(false);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-1 sm:gap-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-800 px-2 sm:px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-700 transition shadow-sm ui-text-body ui-shadow-quiet ui-control"
                title="Account and sign-in options" data-ui="property-switcher" aria-label="Account and sign-in options"
              >
                <UserCheck className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <div className="text-left flex items-center gap-1">
                  <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[65px] sm:max-w-[95px] hidden sm:inline ui-weight-medium">{user?.name}</span>
                  <span className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-800 dark:text-zinc-300 font-mono font-bold ui-text-meta ui-font-body ui-weight-medium">
                    {user?.activeRole}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-zinc-500 dark:text-zinc-400 shrink-0" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-2.5 shadow-2xl z-50 max-h-[420px] overflow-y-auto space-y-1.5    duration-75 ui-radius-panel ui-dialog-surface ui-surface">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1.5 ui-text-meta ui-font-body ui-weight-medium">
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
                            if (isSelected) {
                              setShowUserMenu(false);
                              return;
                            }
                            setTargetSwitchUser(u);
                            setSwitchPassword("");
                            setSwitchError("");
                            setShowUserMenu(false);
                          }}
                          className={`w-full text-left rounded-xl p-2.5 text-xs transition space-y-1  ui-text-body ${
                            isSelected
                              ? "bg-blue-50 dark:bg-zinc-800 text-blue-950 dark:text-white font-bold border border-blue-200 dark:border-zinc-600 shadow-sm ui-weight-medium ui-shadow-quiet"
                              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white border border-transparent"
                          } ui-control`}
                        >
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <span className="font-bold text-zinc-900 dark:text-white leading-tight text-xs flex-1 ui-weight-medium ui-text-body">
                              {u.name}
                            </span>
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 ui-text-meta ui-font-body ui-weight-medium">
                              {u.role}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 pt-0.5 ui-text-meta ui-font-body">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate ui-weight-medium">@{u.username}</span>
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
                      className="w-full rounded-xl bg-zinc-100 hover:bg-rose-50 text-zinc-700 hover:text-rose-700 dark:bg-zinc-900 dark:hover:bg-rose-950/40 dark:text-zinc-400 dark:hover:text-rose-300 border border-zinc-300 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-800/40 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ui-radius-control ui-text-body ui-weight-medium ui-control"
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
                className="relative rounded-lg p-2 text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-[#18181b] shadow-sm ui-shadow-quiet ui-control"
                title="View active notifications and incoming digital check-ins" data-ui="property-switcher" aria-label="View active notifications and incoming digital check-ins"
              >
                <Bell className="h-4 w-4" />
                {pendingCheckIns.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-black text-[9px] font-mono shadow-md  ui-weight-medium ui-text-meta ui-font-body ui-shadow-quiet">
                    {pendingCheckIns.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-3.5 shadow-2xl z-50 space-y-3 ui-radius-panel ui-dialog-surface ui-surface">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white ui-text-body ui-weight-medium">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-amber-500" />
                      <span>Live Reception Alerts</span>
                    </div>
                    <span className="rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-bold ui-text-meta ui-font-body ui-weight-medium">
                      {pendingCheckIns.length} Pending
                    </span>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5 text-xs ui-text-body">
                    {pendingCheckIns.map((reg) => (
                      <div
                        key={reg.id}
                        onClick={() => {
                          setShowNotifications(false);
                          router.push(`/pms?tab=registrations&reviewId=${reg.id}`);
                        }}
                        className="rounded-xl bg-amber-50/60 dark:bg-zinc-900/90 hover:bg-amber-100/80 dark:hover:bg-zinc-800/90 p-3 border border-amber-200 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-600/60 cursor-pointer transition space-y-1.5 group shadow-sm ui-shadow-quiet"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[11px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/40 px-1.5 py-0.5 rounded ui-font-body ui-weight-medium ui-text-meta">
                            {reg.registrationNo}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono ui-text-meta ui-font-body">
                            {reg.createdAt ? new Date(reg.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-200 transition ui-weight-medium">
                              {reg.fullName}
                            </div>
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 ui-text-meta">
                              {reg.preAssignedRoom ? `Requested Room ${reg.preAssignedRoom}` : "Unassigned Room"} • {reg.city || "Guest"}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-bold shrink-0 ui-text-meta ui-weight-medium">
                            <span>Review</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    ))}

                    {pendingCheckIns.length === 0 && (
                      <div className="py-6 text-center text-xs text-zinc-500 font-mono ui-text-body ui-font-body">
                        No pending digital check-ins
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <Link
                      href="/pms?tab=registrations"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition flex items-center gap-1 ui-text-body ui-weight-medium"
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
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-[#18181b] border-2 border-amber-500 rounded-2xl p-4 shadow-2xl text-zinc-900 dark:text-white  slide-in-from-bottom-5 duration-200 ui-radius-panel ui-dialog-surface ui-surface">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ScrollText className="h-5 w-5 " />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800/40 ui-text-meta ui-font-body ui-weight-medium">
                    New Guest Check-In
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 ui-font-body ui-text-meta">
                    {activeToast.registrationNo}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate ui-weight-medium">
                  {activeToast.fullName}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 ui-text-body">
                  {activeToast.preAssignedRoom ? `Requested Room ${activeToast.preAssignedRoom}` : "Reception assignment requested"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveToast(null)}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 ui-control"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-700/80 flex items-center justify-between">
            <button
              onClick={() => setActiveToast(null)}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-semibold ui-text-body ui-control"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                setActiveToast(null);
                router.push(`/pms?tab=registrations&reviewId=${activeToast.id}`);
              }}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-3.5 py-1.5 text-xs transition flex items-center gap-1.5 shadow-md  ui-radius-control ui-weight-medium ui-text-body ui-shadow-quiet ui-control"
            >
              <span>Review & Check-In</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Secure User Switch Authorization Modal */}
      {targetSwitchUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm   duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-5   duration-150 text-zinc-900 dark:text-zinc-100 ui-radius-panel ui-dialog-surface ui-surface">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold ui-weight-medium">Switch Account Security Check</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 ui-text-body">
                    Authentication required to switch terminal session
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTargetSwitchUser(null);
                  setSwitchPassword("");
                  setSwitchError("");
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg transition ui-control"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Target Account Badge */}
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold ui-text-meta ui-font-body ui-weight-medium">
                  Switching To
                </span>
                <span className="rounded bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/50 px-2 py-0.5 text-[9px] font-mono font-bold text-blue-700 dark:text-blue-300 ui-text-meta ui-font-body ui-weight-medium">
                  {targetSwitchUser.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-white ui-weight-medium">
                    {targetSwitchUser.name}
                  </div>
                  <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 ui-text-body ui-font-body">
                    @{targetSwitchUser.username || targetSwitchUser.email}
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-zinc-500 dark:text-zinc-400 max-w-[170px] truncate ui-text-meta ui-font-body" title={targetSwitchUser.propertyScope}>
                  {targetSwitchUser.propertyScope || "All Properties"}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {switchError && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 ui-text-body">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{switchError}</span>
              </div>
            )}

            {/* Password / PIN Form */}
            <form onSubmit={handleConfirmSwitch} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between ui-text-body ui-weight-medium ui-label">
                  <span>Password or Security PIN</span>
                  <span className="text-[10px] text-zinc-400 font-normal ui-text-meta">Master demo fallback active</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type={showSwitchPassword ? "text" : "password"}
                    autoFocus
                    required
                    placeholder="Enter password or 4-6 digit PIN"
                    value={switchPassword}
                    onChange={(e) => setSwitchPassword(e.target.value)}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700/80 pl-10 pr-10 py-2.5 text-xs text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition ui-radius-control ui-text-body ui-font-body ui-field" aria-label="Enter password or 4-6 digit PIN"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                    className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ui-control"
                  >
                    {showSwitchPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5 ui-text-meta">
                  Default credentials: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px] ui-text-meta">hotelos@2026</code> or user PIN
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTargetSwitchUser(null);
                    setSwitchPassword("");
                    setSwitchError("");
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ui-radius-control ui-text-body ui-weight-medium ui-control"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={switchLoading || !switchPassword.trim()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 transition shadow-md disabled:opacity-50 flex items-center gap-2 ui-radius-control ui-weight-medium ui-text-body ui-shadow-quiet ui-control"
                >
                  {switchLoading ? "Verifying..." : "Verify & Switch"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
