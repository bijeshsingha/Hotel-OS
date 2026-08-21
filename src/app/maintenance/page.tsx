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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-lg bg-[#111114] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-zinc-400" />
              Maintenance & Room Blocks
            </h1>
            <span className="rounded px-1.5 py-0.2 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
              M01–M03
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
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
          className="flex items-center gap-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 px-3 py-1.5 text-xs font-medium transition"
        >
          <Plus className="h-3.5 w-3.5" /> Report Issue
        </button>
      </div>

      {/* Issues Table */}
      <div className="rounded-lg border border-zinc-800 bg-[#111114] overflow-hidden">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-200">Maintenance Tickets</h2>
          <span className="text-xs text-zinc-500 font-mono">{issues.length} Tickets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/60 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
              <tr>
                <th className="p-2.5">Issue #</th>
                <th className="p-2.5">Location / Room</th>
                <th className="p-2.5">Asset</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Priority</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-zinc-900/30 transition">
                  <td className="p-2.5 font-mono text-blue-400 font-medium">{issue.issueNo}</td>
                  <td className="p-2.5 font-medium text-zinc-200">
                    {issue.room ? `Room ${issue.room.number}` : issue.locationText || "Public Area"}
                  </td>
                  <td className="p-2.5 text-zinc-400">{issue.assetText || "—"}</td>
                  <td className="p-2.5 text-zinc-500 font-mono text-[11px]">{issue.category}</td>
                  <td className="p-2.5">
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-mono ${
                        issue.priority === "URGENT"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {issue.priority}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[9px] font-mono text-zinc-300">
                      {issue.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-zinc-300 max-w-sm">{issue.description}</td>
                </tr>
              ))}
              {issues.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-zinc-600 italic font-mono">
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
          <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-zinc-400" />
                Report Maintenance Issue
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400">Associated Room</label>
                  <select
                    value={form.roomId}
                    onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
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
                  <label className="text-zinc-400">Location Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Lobby Washroom"
                    value={form.locationText}
                    onChange={(e) => setForm({ ...form, locationText: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  >
                    <option value="HVAC">HVAC / Air Conditioning</option>
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="CARPENTRY">Carpentry</option>
                    <option value="APPLIANCE">Appliance</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-400">Asset / Equipment Name</label>
                <input
                  type="text"
                  placeholder="e.g. Daikin 1.5T AC Unit"
                  value={form.assetText}
                  onChange={(e) => setForm({ ...form, assetText: e.target.value })}
                  className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-zinc-400">Defect Description *</label>
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description of the issue"
                  className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-md bg-zinc-100 px-4 py-1.5 font-medium text-zinc-950 hover:bg-white transition disabled:opacity-50"
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
