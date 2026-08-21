"use client";

import React, { useEffect, useState } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  X,
} from "lucide-react";

export default function HousekeepingPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [tasks, setTasks] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"board" | "tasks">("board");

  // Inspection modal
  const [inspectModal, setInspectModal] = useState<any | null>(null);
  const [inspectionDefectNote, setInspectionDefectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!activeProperty) return;
    setLoading(true);
    try {
      const [tasksRes, roomsRes] = await Promise.all([
        fetch(`/api/v1/housekeeping/tasks?propertyId=${activeProperty.id}`),
        fetch(`/api/v1/rooms?propertyId=${activeProperty.id}`),
      ]);

      const tasksData = await tasksRes.json();
      const roomsData = await roomsRes.json();

      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
    } catch (err) {
      console.error("HK data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProperty, refreshKey]);

  const handleTaskStatus = async (taskId: string, status: string, notes?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/housekeeping/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status, notes }),
      });
      if (!res.ok) throw new Error("Status update failed");

      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Error updating task: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoomHKState = async (roomId: string, housekeepingStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/rooms/${roomId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ housekeepingStatus }),
      });
      if (!res.ok) throw new Error("Room state update failed");

      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const dirtyRooms = rooms.filter((r) => r.roomState?.housekeepingStatus === "DIRTY");
  const cleanRooms = rooms.filter((r) => r.roomState?.housekeepingStatus === "CLEAN");
  const inspectedRooms = rooms.filter((r) => r.roomState?.housekeepingStatus === "INSPECTED");
  const outOfOrderRooms = rooms.filter((r) => r.roomState?.sellabilityStatus === "OUT_OF_ORDER");

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-lg bg-[#111114] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-zinc-400" />
              Housekeeping Board
            </h1>
            <span className="rounded px-1.5 py-0.2 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
              H01–H05
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Turnaround cleaning, supervisor inspections & room state transitions
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("board")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === "board"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            Kanban Board
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === "tasks"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            Tasks ({tasks.length})
          </button>
        </div>
      </div>

      {/* TAB 1: KANBAN BOARD */}
      {activeTab === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* DIRTY */}
          <div className="rounded-lg bg-[#111114] border border-zinc-800 p-3 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-xs font-mono font-semibold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Dirty ({dirtyRooms.length})
                </span>
                <span className="text-[10px] text-zinc-500">Pending</span>
              </div>

              <div className="space-y-2 mt-2 max-h-[580px] overflow-y-auto pr-1">
                {dirtyRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-md bg-zinc-900 border border-zinc-800 p-2.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-zinc-100 font-mono">Room {room.number}</div>
                        <div className="text-[10px] text-zinc-500">{room.roomType.name}</div>
                      </div>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[9px] font-mono text-zinc-400">
                        Floor {room.floor}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800 text-[11px]">
                      <span className="text-zinc-500 font-mono">
                        {room.roomState?.occupancyStatus === "OCCUPIED" ? "Stayover" : "Checkout"}
                      </span>
                      <button
                        onClick={() => handleRoomHKState(room.id, "CLEAN")}
                        disabled={actionLoading}
                        className="rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-200 font-medium transition"
                      >
                        Mark Clean →
                      </button>
                    </div>
                  </div>
                ))}
                {dirtyRooms.length === 0 && (
                  <div className="p-6 text-center text-xs text-zinc-600 italic font-mono">No dirty rooms</div>
                )}
              </div>
            </div>
          </div>

          {/* CLEAN */}
          <div className="rounded-lg bg-[#111114] border border-zinc-800 p-3 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-xs font-mono font-semibold text-blue-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Clean ({cleanRooms.length})
                </span>
                <span className="text-[10px] text-zinc-500">For Inspect</span>
              </div>

              <div className="space-y-2 mt-2 max-h-[580px] overflow-y-auto pr-1">
                {cleanRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-md bg-zinc-900 border border-zinc-800 p-2.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-zinc-100 font-mono">Room {room.number}</div>
                        <div className="text-[10px] text-zinc-500">{room.roomType.name}</div>
                      </div>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[9px] font-mono text-zinc-400">
                        Floor {room.floor}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800 text-[11px]">
                      <span className="text-zinc-500 font-mono">Cleaned</span>
                      <button
                        onClick={() => setInspectModal(room)}
                        className="rounded bg-zinc-100 hover:bg-white px-2 py-0.5 text-[10px] text-zinc-950 font-medium transition"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
                {cleanRooms.length === 0 && (
                  <div className="p-6 text-center text-xs text-zinc-600 italic font-mono">None awaiting inspection</div>
                )}
              </div>
            </div>
          </div>

          {/* INSPECTED */}
          <div className="rounded-lg bg-[#111114] border border-zinc-800 p-3 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-xs font-mono font-semibold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Inspected ({inspectedRooms.length})
                </span>
                <span className="text-[10px] text-zinc-500">Ready</span>
              </div>

              <div className="space-y-2 mt-2 max-h-[580px] overflow-y-auto pr-1">
                {inspectedRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-md bg-zinc-900 border border-zinc-800 p-2.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-zinc-100 font-mono">Room {room.number}</div>
                        <div className="text-[10px] text-zinc-500">{room.roomType.name}</div>
                      </div>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[9px] font-mono text-zinc-400">
                        Floor {room.floor}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800 text-[11px]">
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Ready
                      </span>
                      <button
                        onClick={() => handleRoomHKState(room.id, "DIRTY")}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* OUT OF ORDER */}
          <div className="rounded-lg bg-[#111114] border border-zinc-800 p-3 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-xs font-mono font-semibold text-rose-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Out of Order ({outOfOrderRooms.length})
                </span>
                <span className="text-[10px] text-zinc-500">Blocked</span>
              </div>

              <div className="space-y-2 mt-2 max-h-[580px] overflow-y-auto pr-1">
                {outOfOrderRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-md bg-zinc-900 border border-zinc-800 p-2.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-zinc-100 font-mono">Room {room.number}</div>
                        <div className="text-[10px] text-zinc-500">{room.roomType.name}</div>
                      </div>
                      <span className="rounded px-1.5 py-0.2 text-[9px] font-mono text-rose-400 bg-rose-500/10">
                        OOO
                      </span>
                    </div>

                    <div className="text-[10px] text-rose-400 pt-1.5 border-t border-zinc-800">
                      {room.blocks[0]?.reason || "Maintenance repair"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TASKS LIST */}
      {activeTab === "tasks" && (
        <div className="rounded-lg border border-zinc-800 bg-[#111114] overflow-hidden">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-200">Housekeeping Tasks</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="p-2.5">Room</th>
                  <th className="p-2.5">Task</th>
                  <th className="p-2.5">Priority</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Notes</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-900/30 transition">
                    <td className="p-2.5 font-mono font-semibold text-zinc-100">Room {task.room.number}</td>
                    <td className="p-2.5 text-zinc-300">{task.type.replace("_", " ")}</td>
                    <td className="p-2.5">
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-mono ${
                          task.priority === "URGENT" || task.priority === "HIGH"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className="rounded px-1.5 py-0.2 text-[9px] font-mono bg-zinc-800 text-zinc-300">
                        {task.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-zinc-500 max-w-xs truncate">{task.notes || "—"}</td>
                    <td className="p-2.5 text-right space-x-1.5">
                      {task.status === "OPEN" && (
                        <button
                          onClick={() => handleTaskStatus(task.id, "IN_PROGRESS")}
                          className="rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 text-xs text-zinc-200 font-medium"
                        >
                          Start
                        </button>
                      )}
                      {task.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleTaskStatus(task.id, "COMPLETED")}
                          className="rounded bg-zinc-100 hover:bg-white text-zinc-950 px-2 py-0.5 text-xs font-medium"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECTION MODAL */}
      {inspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-zinc-400" />
                Supervisor Inspection — Room {inspectModal.number}
              </h2>
              <button onClick={() => setInspectModal(null)} className="text-zinc-500 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-md bg-zinc-900 p-2.5 border border-zinc-800 space-y-1 text-zinc-400">
                <div className="font-medium text-zinc-200">Checklist items:</div>
                <div>• Linen & bedding inspected</div>
                <div>• Bathroom sanitised & amenities restocked</div>
                <div>• Minibar & electricals verified</div>
              </div>

              <div>
                <label className="text-zinc-400">Defect Note (if failing)</label>
                <input
                  type="text"
                  placeholder="Optional defect note"
                  value={inspectionDefectNote}
                  onChange={(e) => setInspectionDefectNote(e.target.value)}
                  className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                <button
                  onClick={async () => {
                    await handleRoomHKState(inspectModal.id, "DIRTY");
                    setInspectModal(null);
                  }}
                  className="rounded-md bg-zinc-800 hover:bg-rose-900/40 hover:text-rose-200 text-zinc-300 px-3 py-1.5 font-medium transition"
                >
                  Fail (Mark Dirty)
                </button>

                <button
                  onClick={async () => {
                    await handleRoomHKState(inspectModal.id, "INSPECTED");
                    setInspectModal(null);
                  }}
                  className="rounded-md bg-zinc-100 px-4 py-1.5 font-medium text-zinc-950 hover:bg-white transition"
                >
                  Pass Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
