"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "./header";
import { AppSidebar } from "./sidebar";
import { useHotel } from "@/lib/context/hotel-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toggleSidebar, user, isLoading, sessionError, retrySession } = useHotel();
  const router = useRouter();
  const publicPage = ["/login", "/checkin", "/order", "/guest", "/dining"].includes(pathname);
  useEffect(() => { if (!publicPage && !isLoading && !sessionError && !user) router.replace("/login"); }, [publicPage, isLoading, sessionError, user, router]);

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

  if (!publicPage && sessionError && !isLoading) return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold ui-page-title">Unable to check access</h1>
      <p role="alert">{sessionError}</p>
      <button type="button" onClick={() => void retrySession()} className="rounded-lg bg-blue-600 px-4 py-2 text-white ui-control">Try again</button>
      <a href="/login" className="text-sm underline">Back to sign in</a>
    </main>
  );
  if (!publicPage && (isLoading || !user)) return <main className="min-h-screen flex items-center justify-center">{isLoading ? "Checking access..." : "Opening sign in..."}</main>;

  const isCheckinSubdomain = typeof window !== "undefined" && window.location.hostname.toLowerCase().includes("checkin");

  const isKioskOrGuestPage =
    isCheckinSubdomain ||
    pathname.startsWith("/login") ||
    pathname === "/checkin" ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/guest") ||
    pathname.startsWith("/dining");

  if (isKioskOrGuestPage) {
    return (
      <main className="ui-public min-h-screen bg-slate-50 text-slate-900 dark:bg-[#09090b] dark:text-zinc-100 selection:bg-blue-600 selection:text-white transition-colors duration-150">
        {children}
      </main>
    );
  }

  return (
    <div className="ui-app min-h-screen flex flex-col bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors duration-150">
      <a className="ui-skip" href="#workspace">Skip to page content</a>
      <AppHeader />
      <div className="flex flex-1 min-w-0">
        <AppSidebar />
        <main id="workspace" tabIndex={-1} className="ui-workspace flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
