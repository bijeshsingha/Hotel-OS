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
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search action or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-8.5 pr-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 w-64 shadow-xs"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#111114] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Event History</h2>
          <span className="text-xs text-zinc-500 font-medium">{filteredLogs.length} Events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 text-xs uppercase font-semibold border-b border-zinc-200/80 dark:border-zinc-800">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Target</th>
                <th className="p-3.5">Target ID</th>
                <th className="p-3.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition">
                  <td className="p-3.5 font-mono text-zinc-500 whitespace-nowrap text-[11px]">
                    {new Date(log.occurredAt).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3.5 font-semibold text-zinc-900 dark:text-white">
                    {log.actorName || log.actorId || "System"}
                  </td>
                  <td className="p-3.5">
                    <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 text-zinc-600 dark:text-zinc-400 font-medium">{log.targetType}</td>
                  <td className="p-3.5 font-mono text-zinc-500 text-[11px] max-w-[120px] truncate">{log.targetId}</td>
                  <td className="p-3.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 max-w-md truncate">
                    {log.afterJson || log.reason || "—"}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400 dark:text-zinc-600 italic">
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
