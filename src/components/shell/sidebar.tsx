"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BedDouble,
  Sparkles,
  UtensilsCrossed,
  Receipt,
  Moon,
  Wrench,
  BarChart3,
  ScrollText,
} from "lucide-react";

function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard, badge: "D01" },
    { label: "PMS & Front Desk", href: "/pms", icon: BedDouble, badge: "P01" },
    { label: "Housekeeping", href: "/housekeeping", icon: Sparkles, badge: "H01" },
    { label: "Restaurant POS", href: "/pos", icon: UtensilsCrossed, badge: "F01" },
    { label: "Folio & Invoicing", href: "/billing", icon: Receipt, badge: "B01" },
    { label: "Night Audit", href: "/night-audit", icon: Moon, badge: "N01" },
    { label: "Maintenance", href: "/maintenance", icon: Wrench, badge: "M01" },
    { label: "Reports & Exports", href: "/reports", icon: BarChart3, badge: "R01" },
    { label: "Audit Trail", href: "/audit-log", icon: ScrollText, badge: "A01" },
  ];

  return (
    <div className="space-y-1">
      <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
        Modules
      </div>
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
              isActive
                ? "bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm"
                : "text-zinc-300 hover:bg-zinc-800/70 hover:text-white border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-zinc-400"}`} />
              <span className="truncate">{item.label}</span>
            </div>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                isActive
                  ? "bg-zinc-700 text-white border border-zinc-600"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800"
              }`}
            >
              {item.badge}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-[#27272a] bg-[#09090b] min-h-[calc(100vh-49px)] p-3 flex flex-col justify-between">
      <Suspense fallback={<div className="p-3 text-xs text-zinc-500 font-mono">Loading Navigation...</div>}>
        <SidebarNav />
      </Suspense>

      {/* Footer Info Box */}
      <div className="rounded-xl border border-zinc-800 bg-[#121215] p-3 text-[11px] text-zinc-400 space-y-1 shadow-sm">
        <div className="font-bold text-white flex items-center justify-between">
          <span>Hotel OS</span>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 font-mono">
          GST Rule 46 • Multi-Property
        </div>
      </div>
    </aside>
  );
}
