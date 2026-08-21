"use client";

import React from "react";
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

export function AppSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard, badge: "D01" },
    { label: "PMS & Front Desk", href: "/pms", icon: BedDouble, badge: "P01" },
    { label: "Guest Check-In Form", href: "/checkin", icon: ScrollText, badge: "GRC" },
    { label: "Housekeeping", href: "/housekeeping", icon: Sparkles, badge: "H01" },
    { label: "Restaurant POS", href: "/pos", icon: UtensilsCrossed, badge: "F01" },
    { label: "Folio & Invoicing", href: "/billing", icon: Receipt, badge: "B01" },
    { label: "Night Audit", href: "/night-audit", icon: Moon, badge: "N01" },
    { label: "Maintenance", href: "/maintenance", icon: Wrench, badge: "M01" },
    { label: "Reports & Exports", href: "/reports", icon: BarChart3, badge: "R01" },
    { label: "Audit Trail", href: "/audit-log", icon: ScrollText, badge: "A01" },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-[#27272a] bg-[#09090b] min-h-[calc(100vh-49px)] p-2.5 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          Modules
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/60"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-zinc-100" : "text-zinc-400"}`} />
                <span>{item.label}</span>
              </div>
              <span
                className={`rounded px-1 py-0.2 text-[9px] font-mono ${
                  isActive ? "bg-zinc-700 text-zinc-200" : "text-zinc-600"
                }`}
              >
                {item.badge}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="rounded-md border border-zinc-800 bg-[#121215] p-2.5 text-[11px] text-zinc-500 space-y-1">
        <div className="font-medium text-zinc-300 flex items-center justify-between">
          <span>Hotel OS</span>
          <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
        </div>
        <div className="text-[10px] text-zinc-500 font-mono">
          GST Rule 46 • Multi-Property
        </div>
      </div>
    </aside>
  );
}
