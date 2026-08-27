import React from "react";

export default function RootLoading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
      <div className="h-7 w-7 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
      <span className="font-semibold">Loading Hotel OS...</span>
    </div>
  );
}
