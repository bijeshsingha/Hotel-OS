"use client";

import React from "react";
import Link from "next/link";
import { Wallet, ArrowDownLeft, ArrowUpRight, Coins, ChevronRight, ShieldCheck } from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";

interface DrawerCashWidgetProps {
  cashDrawerPosition?: {
    openingBalance: number;
    cashIn: number;
    cashOut: number;
    netCashInHand: number;
  };
}

export function DrawerCashWidget({ cashDrawerPosition }: DrawerCashWidgetProps) {
  const drawer = cashDrawerPosition || {
    openingBalance: 0,
    cashIn: 0,
    cashOut: 0,
    netCashInHand: 0,
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Coins className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Front Desk Cash Till
            </h2>
            <p className="text-[11px] text-zinc-500">
              Physical cash position in drawer
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Reconciled
        </span>
      </div>

      {/* BIG PRIMARY NET FLOAT CARD */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
          Net Cash In Hand (Current Till)
        </span>
        <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-900 dark:text-emerald-300 mt-1">
          {formatINR(drawer.netCashInHand)}
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          Opening base plus physical cash receipts minus paid vouchers
        </p>
      </div>

      {/* METRIC BREAKDOWN */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {/* Opening Float */}
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60">
          <span className="text-[10px] font-semibold text-zinc-500 block">Opening Float</span>
          <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-xs">
            {formatINR(drawer.openingBalance)}
          </span>
        </div>

        {/* Cash In */}
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="h-3 w-3" /> In
          </div>
          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
            +{formatINR(drawer.cashIn)}
          </span>
        </div>

        {/* Cash Out */}
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="h-3 w-3" /> Out
          </div>
          <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-xs">
            -{formatINR(drawer.cashOut)}
          </span>
        </div>
      </div>

      {/* LINK TO CASHIER SHIFT */}
      <Link
        href="/cashier-shift"
        className="w-full h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-between px-3 transition cursor-pointer"
      >
        <span>Open Cashier Handover Register</span>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
      </Link>
    </div>
  );
}
