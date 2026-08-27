"use client";

import React, { useEffect, useState } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import {
  ScrollText,
  Search,
} from "lucide-react";

export default function AuditLogPage() {
  const { activeProperty, refreshKey } = useHotel();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!activeProperty) return;
    setLoading(true);
    fetch(`/api/v1/audit-logs?propertyId=${activeProperty.id}`)
      .then((res) => res.json())
      .then((d) => setLogs(Array.isArray(d) ? d : []))
      .catch((err) => console.error("Audit log error:", err))
      .finally(() => setLoading(false));
  }, [activeProperty, refreshKey]);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.targetType.toLowerCase().includes(search.toLowerCase()) ||
      l.targetId.toLowerCase().includes(search.toLowerCase()) ||
      l.actorName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              Audit Log Trail
            </h1>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              A16
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5 font-medium">
            Immutable log of operations, charges, check-ins & date rollovers
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search action or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 pl-8 pr-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-56 font-mono shadow-xs"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] overflow-hidden shadow-xs">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Event History</h2>
          <span className="text-xs text-zinc-500 font-mono font-bold">{filteredLogs.length} Events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-200 dark:border-zinc-800 font-bold">
              <tr>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Actor</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Target</th>
                <th className="p-2.5">Target ID</th>
                <th className="p-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition">
                  <td className="p-2.5 font-mono text-zinc-500 whitespace-nowrap text-[11px]">
                    {new Date(log.occurredAt).toLocaleString("en-IN")}
                  </td>
                  <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-200">
                    {log.actorName || log.actorId || "System"}
                  </td>
                  <td className="p-2.5">
                    <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-zinc-600 dark:text-zinc-400 text-[11px] font-medium">{log.targetType}</td>
                  <td className="p-2.5 font-mono text-zinc-500 text-[11px] max-w-[100px] truncate">{log.targetId}</td>
                  <td className="p-2.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 max-w-sm truncate">
                    {log.afterJson || log.reason || "—"}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-zinc-500 italic font-mono">
                    No audit logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
