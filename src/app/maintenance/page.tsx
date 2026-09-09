"use client";

import React, { useEffect, useState } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import {
  Wrench,
  Plus,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Check,
} from "lucide-react";
import { MAINTENANCE_CATEGORIES, MAINTENANCE_PRIORITIES } from "@/data";

export default function MaintenancePage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [issues, setIssues] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");

  const [form, setForm] = useState({
    roomId: "",
    locationText: "",
    assetText: "",
    category: "HVAC",
    priority: "URGENT",
    description: "",
    blockRoom: true,
  });

  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!activeProperty) return;
    setLoading(true);
    try {
      const [issuesRes, roomsRes] = await Promise.all([
        fetch(`/api/v1/maintenance/issues?propertyId=${activeProperty.id}`),
        fetch(`/api/v1/rooms?propertyId=${activeProperty.id}`),
      ]);

      const issuesData = await issuesRes.json();
      const roomsData = await roomsRes.json();

      setIssues(Array.isArray(issuesData) ? issuesData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
    } catch (err) {
      console.error("Maintenance load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProperty, refreshKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/maintenance/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          ...form,
          roomId: form.roomId || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to log maintenance issue");

      setShowCreateModal(false);
      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (issueId: string, status: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/maintenance/issues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, status }),
      });

      if (!res.ok) throw new Error("Failed to update ticket status");

      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    if (filterStatus === "OPEN") return !["RESOLVED", "VERIFIED", "CLOSED", "CANCELLED"].includes(issue.status);
    if (filterStatus === "RESOLVED") return ["RESOLVED", "VERIFIED", "CLOSED"].includes(issue.status);
    return true;
  });

  return (
    <div className="space-y-4 max-w-[1500px] mx-auto w-full text-zinc-900 dark:text-zinc-100">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Wrench className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
              Maintenance & Room Blocks
            </h1>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 uppercase">
              M01–M03
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Defect tickets, technician repairs & live PMS/Housekeeping synchronization
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterStatus === "ALL"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              All ({issues.length})
            </button>
            <button
              onClick={() => setFilterStatus("OPEN")}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterStatus === "OPEN"
                  ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Open ({issues.filter(i => !["RESOLVED", "VERIFIED", "CLOSED", "CANCELLED"].includes(i.status)).length})
            </button>
            <button
              onClick={() => setFilterStatus("RESOLVED")}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterStatus === "RESOLVED"
                  ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Resolved ({issues.filter(i => ["RESOLVED", "VERIFIED", "CLOSED"].includes(i.status)).length})
            </button>
          </div>

          <button
            onClick={() => {
              setForm({
                roomId: "",
                locationText: "",
                assetText: "",
                category: "HVAC",
                priority: "URGENT",
                description: "",
                blockRoom: true,
              });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-4 py-2 text-xs font-semibold transition shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Report Issue
          </button>
        </div>
      </div>

      {/* Issues Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Maintenance Tickets</h2>
          <span className="text-xs font-mono text-zinc-500">{filteredIssues.length} Tickets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 text-[11px] uppercase font-semibold tracking-wider border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Issue #</th>
                <th className="px-4 py-3">Location / Room</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-300">
              {filteredIssues.map((issue) => {
                const isOpen = !["RESOLVED", "VERIFIED", "CLOSED", "CANCELLED"].includes(issue.status);
                return (
                  <tr key={issue.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition">
                    <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400 font-medium">{issue.issueNo}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {issue.room ? `Room ${issue.room.number}` : issue.locationText || "Public Area"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{issue.assetText || "—"}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{issue.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                          issue.priority === "URGENT" || issue.priority === "HIGH"
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${issue.priority === "URGENT" || issue.priority === "HIGH" ? "bg-rose-500" : "bg-zinc-400"}`} />
                        <span>{issue.priority}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                          issue.status === "RESOLVED" || issue.status === "CLOSED"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                            : issue.status === "IN_PROGRESS"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${issue.status === "RESOLVED" || issue.status === "CLOSED" ? "bg-emerald-500" : issue.status === "IN_PROGRESS" ? "bg-amber-500" : "bg-zinc-400"}`} />
                        <span>{issue.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 max-w-xs truncate" title={issue.description}>
                      {issue.description}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isOpen ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {issue.status === "REPORTED" && (
                            <button
                              onClick={() => handleUpdateStatus(issue.id, "IN_PROGRESS")}
                              disabled={actionLoading}
                              className="h-8 px-2.5 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs transition shadow-xs cursor-pointer flex items-center gap-1"
                              title="Start technician work"
                            >
                              <Play className="h-3.5 w-3.5" />
                              <span>Start</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(issue.id, "RESOLVED")}
                            disabled={actionLoading}
                            className="h-8 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-xs transition shadow-xs cursor-pointer flex items-center gap-1"
                            title="Mark resolved and unblock room"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Resolve & Unblock</span>
                          </button>
                        </div>
                      ) : issue.status === "RESOLVED" ? (
                        <button
                          onClick={() => handleUpdateStatus(issue.id, "CLOSED")}
                          disabled={actionLoading}
                          className="h-8 px-3 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition cursor-pointer"
                        >
                          Close
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">Archived</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredIssues.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-400 dark:text-zinc-600 italic">
                    No tickets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Wrench className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                Report Maintenance Issue
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Associated Room</label>
                  <select
                    value={form.roomId}
                    onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium transition shadow-xs cursor-pointer"
                  >
                    <option value="">No Room (Public Area)</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.number} ({r.roomType?.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Location Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 506 or Lobby"
                    value={form.locationText}
                    onChange={(e) => setForm({ ...form, locationText: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium transition shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium transition shadow-xs cursor-pointer"
                  >
                    {MAINTENANCE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => {
                      const newPriority = e.target.value;
                      const config = MAINTENANCE_PRIORITIES.find((p) => p.id === newPriority);
                      setForm({
                        ...form,
                        priority: newPriority,
                        blockRoom: config?.blocksRoomByDefault ?? form.blockRoom,
                      });
                    }}
                    className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium transition shadow-xs cursor-pointer"
                  >
                    {MAINTENANCE_PRIORITIES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Asset / Equipment Name</label>
                <input
                  type="text"
                  placeholder="e.g. AC, Geyser, TV, Keycard Lock"
                  value={form.assetText}
                  onChange={(e) => setForm({ ...form, assetText: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Defect Description *</label>
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description of the issue"
                  className="w-full p-3 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium transition shadow-xs"
                />
              </div>

              {/* Block Room Checkbox */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                <input
                  type="checkbox"
                  id="blockRoomToggle"
                  checked={form.blockRoom}
                  onChange={(e) => setForm({ ...form, blockRoom: e.target.checked })}
                  className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="blockRoomToggle" className="text-xs font-medium text-rose-900 dark:text-rose-300 cursor-pointer select-none">
                  Block Room from Front Desk Booking (Set Out-of-Order in PMS)
                </label>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-9 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium text-xs cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium shadow-xs transition cursor-pointer"
                >
                  {actionLoading ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
