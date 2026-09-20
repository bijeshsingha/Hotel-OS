"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UsersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/staff");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span>Opening Staff & Permissions Console...</span>
      </div>
    </div>
  );
}
