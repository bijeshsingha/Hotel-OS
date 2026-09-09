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
    <div className="space-y-4 max-w-[1500px] mx-auto w-full text-zinc-900 dark:text-zinc-100">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ScrollText className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400" />
              Audit Log Trail
            </h1>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 uppercase">
              A16
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Immutable log of operations, charges, check-ins & date rollovers
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search action or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 pl-9 pr-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Event History</h2>
          <span className="text-xs font-mono text-zinc-500">{filteredLogs.length} Events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Actor</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Action</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Target</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Target ID</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">
                    {new Date(log.occurredAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {log.actorName || log.actorId || "System"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-medium whitespace-nowrap">{log.targetType}</td>
                  <td className="px-4 py-3 font-mono text-zinc-500 text-[11px] max-w-[140px] truncate">{log.targetId}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 max-w-md truncate">
                    {log.afterJson || log.reason || "—"}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-400 dark:text-zinc-500 font-sans">
                    No audit logs recorded for this property.
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
