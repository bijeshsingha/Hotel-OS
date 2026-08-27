"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error caught by route error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-center space-y-4 shadow-2xl">
        <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <h1 className="text-base font-bold text-white">Something went wrong</h1>
          <p className="text-xs text-zinc-400 font-medium">
            {error?.message || "An unexpected error occurred while rendering this page."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => reset()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2.5 text-xs font-bold transition shadow"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}
