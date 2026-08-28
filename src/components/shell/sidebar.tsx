"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import {
  LayoutDashboard,
  BedDouble,
  Sparkles,
  Receipt,
  Moon,
  Wrench,
  BarChart3,
  ScrollText,
  Building2,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

function SidebarNav({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard, badge: "D01" },
    { label: "PMS & Front Desk", href: "/pms", icon: BedDouble, badge: "P01" },
    { label: "Housekeeping", href: "/housekeeping", icon: Sparkles, badge: "H01" },
    { label: "Folio & Invoicing", href: "/billing", icon: Receipt, badge: "B01" },
    { label: "Night Audit", href: "/night-audit", icon: Moon, badge: "N01" },
    { label: "Maintenance", href: "/maintenance", icon: Wrench, badge: "M01" },
    { label: "Reports & Exports", href: "/reports", icon: BarChart3, badge: "R01" },
    { label: "Audit Trail", href: "/audit-log", icon: ScrollText, badge: "A01" },
    { label: "Onboard Hotel", href: "/onboarding", icon: Building2, badge: "NEW" },
  ];

  return (
    <div className="space-y-1">
      {!isCollapsed && (
        <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">
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
              isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
            } rounded-xl text-xs transition group relative ${
              isActive
                ? "bg-blue-50 dark:bg-zinc-800 text-blue-950 dark:text-white font-black border border-blue-200 dark:border-zinc-700 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-950 dark:hover:text-white border border-transparent font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-blue-600 dark:text-white" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white"
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </div>

            {!isCollapsed && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                  isActive
                    ? "bg-blue-600 text-white dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"
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
        sidebarCollapsed ? "w-14 p-2" : "w-56 p-3"
      } shrink-0 border-r border-zinc-200 dark:border-[#27272a] bg-white dark:bg-[#09090b] min-h-[calc(100vh-49px)] flex flex-col justify-between transition-all duration-200 shadow-sm relative group/sidebar`}
    >
      <Suspense fallback={<div className="p-2 text-xs text-zinc-400 font-mono">Loading...</div>}>
        <SidebarNav isCollapsed={sidebarCollapsed} />
      </Suspense>

      {/* Footer / Toggle Section */}
      <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        {!sidebarCollapsed && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121215] p-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-0.5 shadow-xs">
            <div className="font-bold text-zinc-900 dark:text-white flex items-center justify-between text-xs">
              <span>Hotel OS</span>
              <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="text-[9.5px] text-zinc-500 font-mono truncate">
              GST Rule 46 • Multi-Prop
            </div>
          </div>
        )}

        {/* Sidebar Collapse/Expand Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={`w-full h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs font-semibold flex items-center ${
            sidebarCollapsed ? "justify-center" : "justify-between px-2.5"
          } transition`}
          title={sidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
        >
          {!sidebarCollapsed && <span className="text-[11px] font-mono">Collapse Sidebar</span>}
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
