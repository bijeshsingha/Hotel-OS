"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import { NAV_ITEMS } from "@/data/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  X,
} from "lucide-react";

function SidebarNav({ isExpanded, onLinkClick }: { isExpanded: boolean; onLinkClick?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useHotel();

  const isSuperAdmin =
    user?.activeRole === "ORG_OWNER" ||
    user?.username === "bijesh_singha" ||
    user?.email?.toLowerCase().includes("bijesh") ||
    user?.username === "admin";

  const navItems = NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);

  return (
    <div className="space-y-0.5">
      {isExpanded && (
        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none">
          Modules
        </div>
      )}
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        const Icon = item.icon;

        return (
          <div key={item.href} className="space-y-0.5">
            <Link
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center ${
                isExpanded ? "w-full h-8.5 px-2.5 justify-between" : "w-9 h-9 mx-auto justify-center"
              } rounded-xl text-xs transition-colors group relative ${
                isActive
                  ? "bg-blue-50/90 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/70 dark:border-blue-800/60 shadow-2xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/90 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white border border-transparent font-medium"
              }`}
              title={!isExpanded ? item.label : undefined}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                  }`}
                />
                {isExpanded && (
                  <span className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </div>

              {isExpanded && (
                <span
                  className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold shrink-0 transition-colors ${
                    item.badge === "NEW"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                      : isActive
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/70 dark:text-blue-200"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/90 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>

            {item.href === "/billing" && isActive && isExpanded && (() => {
              const currentTab = searchParams.get("tab") || "in-house";
              const isInHouse = currentTab === "in-house";
              const isSettled = currentTab === "settled";

              return (
                <div className="pl-6 pr-1 py-0.5 space-y-0.5 text-[11px] animate-in fade-in">
                  <Link
                    href="/billing?tab=in-house"
                    onClick={onLinkClick}
                    className={`flex items-center justify-between py-1 px-2 rounded-lg font-medium transition ${
                      isInHouse
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`h-1.5 w-1.5 rounded-full ${isInHouse ? "bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-800" : "bg-zinc-400"} shrink-0`} />
                      <span className="truncate">In-House</span>
                    </div>
                    {isInHouse && <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">Live</span>}
                  </Link>

                  <Link
                    href="/billing?tab=settled"
                    onClick={onLinkClick}
                    className={`flex items-center justify-between py-1 px-2 rounded-lg font-medium transition ${
                      isSettled
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-semibold shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`h-1.5 w-1.5 rounded-full ${isSettled ? "bg-blue-500 ring-2 ring-blue-300 dark:ring-blue-800" : "bg-zinc-400"} shrink-0`} />
                      <span className="truncate">Settled</span>
                    </div>
                    {isSettled && <span className="text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">Past</span>}
                  </Link>
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useHotel();
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();

  // Desktop expansion state: expanded if user has pinned it (!sidebarCollapsed) OR if hovered
  const isPinned = !sidebarCollapsed;
  const isExpanded = isPinned || isHovered;

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setIsHovered(false);
  }, [pathname, setMobileMenuOpen]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        setIsHovered(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  return (
    <>
      {/* Desktop Layout Container with Hover-Expand Overlay */}
      <div
        className="hidden lg:block sticky top-[53px] h-[calc(100vh-53px)] shrink-0 z-30"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Fixed layout spacer: reserves dock space so the main page NEVER shifts on hover */}
        <div className={`${isPinned ? "w-52" : "w-[58px]"} h-full transition-[width] duration-150 ease-out`} />

        {/* Floating sidebar panel: expands OVER content cleanly with zero page reflow */}
        <aside
          className={`absolute top-0 left-0 h-full ${
            isExpanded
              ? "w-52 shadow-2xl ring-1 ring-zinc-900/10 dark:ring-white/10"
              : "w-[58px] shadow-none"
          } bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-r border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between p-2 transition-[width,box-shadow] duration-150 ease-out overflow-x-hidden z-40`}
        >
          <div className="overflow-y-auto pr-0.5 space-y-1">
            <Suspense fallback={<div className="p-2 text-xs text-zinc-400 font-mono">Loading...</div>}>
              <SidebarNav isExpanded={isExpanded} />
            </Suspense>
          </div>

          {/* Footer / Status & Pin Section */}
          <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800 space-y-1.5 shrink-0">
            {isExpanded ? (
              <>
                <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-[#121215] px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="font-bold text-zinc-900 dark:text-white flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <img src="/brand/rovesta-mark.png" alt="ROVESTA" className="h-3 w-auto object-contain" />
                      <span className="font-bold tracking-tight">ROVESTA OS</span>
                    </div>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ONLINE
                    </span>
                  </div>
                </div>

                <button
                  onClick={toggleSidebar}
                  className="w-full h-8 px-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-[11px] font-medium flex items-center justify-between transition cursor-pointer"
                  title={isPinned ? "Unpin (Auto-collapse on mouse leave)" : "Pin Sidebar Always Open"}
                >
                  <span className="flex items-center gap-1.5">
                    {isPinned ? <PinOff className="h-3 w-3 text-zinc-400" /> : <Pin className="h-3 w-3 text-zinc-400" />}
                    <span>{isPinned ? "Auto-Collapse" : "Pin Sidebar"}</span>
                  </span>
                  {isPinned ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <button
                  onClick={toggleSidebar}
                  className="w-9 h-9 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Pin Sidebar Open (Ctrl+B)"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-zinc-800 p-4 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200 z-50">
            <div className="space-y-3 overflow-y-auto pr-1">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <img src="/brand/rovesta-mark.png" alt="ROVESTA" className="h-5 w-auto object-contain" />
                  <span className="text-base font-black tracking-tight text-zinc-900 dark:text-white">ROVESTA</span>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">OS</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <Suspense fallback={<div className="p-2 text-xs text-zinc-400 font-mono">Loading...</div>}>
                <SidebarNav isExpanded={true} onLinkClick={() => setMobileMenuOpen(false)} />
              </Suspense>
            </div>

            {/* Mobile Drawer Footer */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 p-2.5 text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-white text-[11px]">System Status</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
