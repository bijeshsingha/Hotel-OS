import React from "react";
import Link from "next/link";
import { SearchX, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
      <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shadow-sm">
        <SearchX className="h-7 w-7" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
          Page Not Found
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
          The requested route or resource could not be found in Hotel OS.
        </p>
      </div>

      <Link
        href="/pms"
        className="flex items-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 px-4 py-2.5 text-xs font-bold transition shadow-sm active:scale-95"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Return to Front Desk</span>
      </Link>
    </div>
  );
}
