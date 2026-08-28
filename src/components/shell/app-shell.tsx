"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "./header";
import { AppSidebar } from "./sidebar";
import { useHotel } from "@/lib/context/hotel-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toggleSidebar } = useHotel();

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const isKioskOrGuestPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/checkin") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/guest") ||
    pathname.startsWith("/dining");

  if (isKioskOrGuestPage) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#09090b] dark:text-zinc-100 selection:bg-blue-600 selection:text-white transition-colors duration-150">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 transition-colors duration-150">
      <AppHeader />
      <div className="flex flex-1 min-w-0">
        <AppSidebar />
        <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-6 overflow-x-hidden transition-all duration-200">{children}</main>
      </div>
    </div>
  );
}
