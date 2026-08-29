"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import { NAV_ITEMS } from "@/data/navigation";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function SidebarNav({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS;

  return (
    <div className="space-y-1">
      {!isCollapsed && (
        <div className="px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Modules
        </div>
      )}
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            title={isCollapsed ? item.label : undefined}
            className={`flex items-center ${
              isCollapsed ? "justify-center p-3" : "justify-between px-3.5 py-2.5"
            } rounded-xl text-[13.5px] transition-all group relative ${
              isActive
                ? "bg-blue-50/90 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/80 dark:border-blue-800/60 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/90 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-white border border-transparent font-medium"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon
                className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </div>

            {!isCollapsed && (
              <span
                className={`rounded-md px-2 py-0.5 text-[10.5px] font-bold transition-colors ${
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
        );
      })}
    </div>
  );
}

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useHotel();

  return (
    <aside
      className={`${
        sidebarCollapsed ? "w-16 p-2" : "w-60 p-3"
      } shrink-0 border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#09090b] sticky top-[53px] h-[calc(100vh-53px)] flex flex-col justify-between transition-all duration-200 shadow-xs relative group/sidebar z-30`}
    >
      <div className="overflow-y-auto pr-0.5 space-y-1">
        <Suspense fallback={<div className="p-2 text-xs text-zinc-400 font-mono">Loading...</div>}>
          <SidebarNav isCollapsed={sidebarCollapsed} />
        </Suspense>
      </div>

      {/* Footer / Toggle Section */}
      <div className="space-y-2 pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800">
        {!sidebarCollapsed && (
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-[#121215] p-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            <div className="font-bold text-zinc-900 dark:text-white flex items-center justify-between text-xs">
              <span>Hotel OS</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 font-normal truncate">
              GST Rule 46 • Multi-Property
            </div>
          </div>
        )}

        {/* Sidebar Collapse/Expand Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={`w-full h-9 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs font-semibold flex items-center ${
            sidebarCollapsed ? "justify-center" : "justify-between px-3"
          } transition cursor-pointer`}
          title={sidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
        >
          {!sidebarCollapsed && <span className="text-xs font-medium text-zinc-500">Collapse Sidebar</span>}
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
