"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "./header";
import { AppSidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isKioskOrGuestPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/checkin") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/guest") ||
    pathname.startsWith("/dining");

  if (isKioskOrGuestPage) {
    return (
      <main className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-blue-600 selection:text-white">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
      <AppHeader />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
