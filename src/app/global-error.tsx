"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global root layout error caught by boundary:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-center space-y-4 shadow-2xl">
          <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <h1 className="text-base font-bold text-white">System Error</h1>
            <p className="text-xs text-zinc-400 font-medium">
              {error?.message || "A critical error occurred while initializing the application."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 py-2.5 text-xs font-bold transition shadow"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reload Application</span>
          </button>
        </div>
      </body>
    </html>
  );
}
