"use client";

import React from "react";
import Link from "next/link";
import { UtensilsCrossed, Receipt, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { useHotel } from "@/lib/context/hotel-context";

export default function POSPage() {
  const { activeProperty } = useHotel();

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-7 sm:p-8 text-center space-y-6 shadow-xl animate-in fade-in">
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <UtensilsCrossed className="w-8 h-8" />
          <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-amber-500 text-white font-mono text-[9px] font-black uppercase">
            Disabled
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
            Restaurant POS is Disabled
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Direct restaurant point-of-sale ordering is currently turned off. All food, beverage, and dining bills are posted directly to guest room folios using <strong>Post Charges</strong>.
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 p-4 text-left space-y-2.5 text-xs">
          <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Recommended Workflow
          </span>
          <div className="space-y-1.5 text-zinc-600 dark:text-zinc-400 text-[11px]">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Go to <strong>Folio & Invoicing</strong></span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Select the guest room from the Directory</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Click <strong>+ Post Charge</strong> → Select <strong>Restaurant / F&B (5% GST)</strong></span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/billing"
            className="w-full py-3 px-5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-extrabold text-xs transition shadow-md flex items-center justify-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            <span>Open Folio & Post Charges</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
