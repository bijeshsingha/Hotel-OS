"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DigitalCheckInQueueRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pms?tab=registrations");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-2 text-zinc-400 font-mono text-xs">
      <div className="h-6 w-6 border-2 border-zinc-500 border-t-zinc-100 rounded-full animate-spin" />
      <span>Loading Integrated Digital Check-In Queue...</span>
    </div>
  );
}
