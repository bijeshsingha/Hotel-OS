"use client";

import React, { useEffect, useState } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import {
  Wrench,
  Plus,
  X,
} from "lucide-react";

export default function MaintenancePage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [issues, setIssues] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    roomId: "",
    locationText: "",
    assetText: "",
    category: "PLUMBING",
    priority: "NORMAL",
    description: "",
    blockRoom: false,
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

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              Maintenance & Room Blocks
            </h1>
            <span className="rounded px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-semibold">
              M01–M03
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Defect tickets, technician repairs & room blocking
          </p>
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
              blockRoom: false,
            });
            setShowCreateModal(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Report Issue
        </button>
      </div>

      {/* Issues Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Maintenance Tickets</h2>
          <span className="text-xs text-zinc-500 font-mono font-semibold">{issues.length} Tickets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-3">Issue #</th>
                <th className="p-3">Location / Room</th>
                <th className="p-3">Asset</th>
                <th className="p-3">Category</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
              {issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition">
                  <td className="p-3 font-mono text-blue-600 dark:text-blue-400 font-bold">{issue.issueNo}</td>
                  <td className="p-3 font-bold text-zinc-900 dark:text-zinc-200">
                    {issue.room ? `Room ${issue.room.number}` : issue.locationText || "Public Area"}
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400 font-medium">{issue.assetText || "—"}</td>
                  <td className="p-3 text-zinc-500 font-mono text-[11px]">{issue.category}</td>
                  <td className="p-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                        issue.priority === "URGENT"
                          ? "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {issue.priority}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="rounded px-2 py-0.5 text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {issue.status}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-700 dark:text-zinc-300 max-w-sm font-medium">{issue.description}</td>
                </tr>
              ))}
              {issues.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400 dark:text-zinc-600 italic font-mono">
                    No active maintenance tickets
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                Report Maintenance Issue
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase">Associated Room</label>
                  <select
                    value={form.roomId}
                    onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">No Room (Public Area)</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase">Location Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Lobby Washroom"
                    value={form.locationText}
                    onChange={(e) => setForm({ ...form, locationText: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="HVAC">HVAC / Air Conditioning</option>
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="CARPENTRY">Carpentry</option>
                    <option value="APPLIANCE">Appliance</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase">Asset / Equipment Name</label>
                <input
                  type="text"
                  placeholder="e.g. Daikin 1.5T AC Unit"
                  value={form.assetText}
                  onChange={(e) => setForm({ ...form, assetText: e.target.value })}
                  className="mt-1 w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase">Defect Description *</label>
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description of the issue"
                  className="mt-1 w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-5 py-2 font-bold transition disabled:opacity-50 shadow-xs cursor-pointer"
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
