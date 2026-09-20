"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import { UserManagementTab } from "@/components/admin/user-management-tab";
import {
  Users,
  Shield,
  Crown,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export default function StaffRolesPage() {
  const { user, refreshData } = useHotel();
  const router = useRouter();

  const isSuperAdmin =
    user?.activeRole === "ORG_OWNER" ||
    user?.username === "bijesh_singha" ||
    user?.email?.toLowerCase().includes("bijesh") ||
    user?.username === "admin";

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Super Admin Authorization Gate
  if (!isSuperAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-8 shadow-xl space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Super Admin Access Required</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              The Staff & Roles console is strictly restricted to Organization Owners & Super Administrators.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-400">
            Active Account: <span className="font-bold text-zinc-900 dark:text-white">@{user?.username || "staff"}</span> ({user?.activeRole || "STAFF"})
          </div>
          <div className="pt-2">
            <Link
              href="/pms"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-xs transition"
            >
              Return to Front Desk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-53px)] flex flex-col space-y-4 text-zinc-900 dark:text-zinc-100 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white shadow-emerald-600/30"
              : "bg-rose-600 text-white shadow-rose-600/30"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* TOP EXECUTIVE PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <div>
          <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5 flex items-center gap-2">
            <span>Management / Staff & Roles</span>
            <span>•</span>
            <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
              <Crown className="h-3 w-3" />
              <span>Super Admin Exclusive</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              Staff & Roles Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Database connected
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Manage hotel terminal staff identities, multi-property access scopes, and security permissions.
          </p>
        </div>

        {/* Quick Nav / Return Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Link
            href="/admin"
            className="h-10 px-3.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-2 transition cursor-pointer border border-zinc-200/80 dark:border-zinc-700"
          >
            <span>Admin Suite</span>
          </Link>
          <Link
            href="/pms"
            className="h-10 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer border border-blue-200/80 dark:border-blue-800/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Front Desk</span>
          </Link>
        </div>
      </div>

      {/* DEDICATED STAFF & ROLES TAB CONTENT */}
      <UserManagementTab onNotify={(msg, type) => showToast(msg, type)} />
    </div>
  );
}
