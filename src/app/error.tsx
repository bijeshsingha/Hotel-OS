"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Hotel OS runtime error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
      <div className="h-14 w-14 rounded-2xl bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
        <AlertTriangle className="h-7 w-7" />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
          An Unexpected Application Error Occurred
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
          {error?.message || "A rendering or data error was encountered. You can try refreshing the view or navigating back to the PMS front desk."}
        </p>
        {error?.digest && (
          <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pt-1">
            Digest Code: {error.digest}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 px-4 py-2.5 text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </button>

        <Link
          href="/pms"
          className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white px-4 py-2.5 text-xs font-semibold transition shadow-xs cursor-pointer"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Go to PMS</span>
        </Link>
      </div>
    </div>
  );
}
