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
  Wrench,
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

  const outOfOrderRooms = rooms.filter(
    (r) =>
      r.roomState?.sellabilityStatus === "OUT_OF_ORDER" ||
      (r.blocks && r.blocks.length > 0) ||
      (r.maintenanceIssues && r.maintenanceIssues.length > 0)
  );
  const dirtyRooms = rooms.filter(
    (r) =>
      r.roomState?.housekeepingStatus === "DIRTY" &&
      r.roomState?.sellabilityStatus !== "OUT_OF_ORDER" &&
      (!r.blocks || r.blocks.length === 0) &&
      (!r.maintenanceIssues || r.maintenanceIssues.length === 0)
  );
  const cleanRooms = rooms.filter(
    (r) =>
      r.roomState?.housekeepingStatus === "CLEAN" &&
      r.roomState?.sellabilityStatus !== "OUT_OF_ORDER" &&
      (!r.blocks || r.blocks.length === 0) &&
      (!r.maintenanceIssues || r.maintenanceIssues.length === 0)
  );
  const inspectedRooms = rooms.filter(
    (r) =>
      r.roomState?.housekeepingStatus === "INSPECTED" &&
      r.roomState?.sellabilityStatus !== "OUT_OF_ORDER" &&
      (!r.blocks || r.blocks.length === 0) &&
      (!r.maintenanceIssues || r.maintenanceIssues.length === 0)
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              Housekeeping Board
            </h1>
            <span className="rounded px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-semibold">
              H01–H05
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Turnaround cleaning, supervisor inspections & room state transitions
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("board")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === "board"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Kanban Board
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === "tasks"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
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
          <div className="rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2.5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Dirty ({dirtyRooms.length})
                </span>
                <span className="text-[10px] text-zinc-500 font-semibold">Pending</span>
              </div>

              <div className="space-y-2.5 mt-2.5 max-h-[580px] overflow-y-auto pr-1">
                {dirtyRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 space-y-2 text-xs shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">Room {room.number}</div>
                        <div className="text-[11px] text-zinc-500">{room.roomType.name}</div>
                      </div>
                      <span className="rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[9px] font-mono text-zinc-600 dark:text-zinc-400">
                        Floor {room.floor}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px]">
                      <span className="text-zinc-500 font-mono font-medium">
                        {room.roomState?.occupancyStatus === "OCCUPIED" ? "Stayover" : "Checkout"}
                      </span>
                      <button
                        onClick={() => handleRoomHKState(room.id, "CLEAN")}
                        disabled={actionLoading}
                        className="rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-2.5 py-1 text-[11px] text-white dark:text-zinc-200 font-bold transition cursor-pointer shadow-xs"
                      >
                        Mark Clean →
                      </button>
                    </div>
                  </div>
                ))}
                {dirtyRooms.length === 0 && (
                  <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-600 italic font-mono">No dirty rooms</div>
                )}
              </div>
            </div>
          </div>

          {/* CLEAN */}
          <div className="rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2.5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Clean ({cleanRooms.length})
                </span>
                <span className="text-[10px] text-zinc-500 font-semibold">For Inspect</span>
              </div>

              <div className="space-y-2.5 mt-2.5 max-h-[580px] overflow-y-auto pr-1">
                {cleanRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 space-y-2 text-xs shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">Room {room.number}</div>
                        <div className="text-[11px] text-zinc-500">{room.roomType.name}</div>
                      </div>
                      <span className="rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[9px] font-mono text-zinc-600 dark:text-zinc-400">
                        Floor {room.floor}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px]">
                      <span className="text-zinc-500 font-mono font-medium">Cleaned</span>
                      <button
                        onClick={() => setInspectModal(room)}
                        className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 text-[11px] font-bold transition cursor-pointer shadow-xs"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
                {cleanRooms.length === 0 && (
                  <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-600 italic font-mono">None awaiting inspection</div>
                )}
              </div>
            </div>
          </div>

          {/* INSPECTED */}
          <div className="rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2.5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Inspected ({inspectedRooms.length})
                </span>
                <span className="text-[10px] text-zinc-500 font-semibold">Ready</span>
              </div>

              <div className="space-y-2.5 mt-2.5 max-h-[580px] overflow-y-auto pr-1">
                {inspectedRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 space-y-2 text-xs shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">Room {room.number}</div>
                        <div className="text-[11px] text-zinc-500">{room.roomType.name}</div>
                      </div>
                      <span className="rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[9px] font-mono text-zinc-600 dark:text-zinc-400">
                        Floor {room.floor}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                      </span>
                      <button
                        onClick={() => handleRoomHKState(room.id, "DIRTY")}
                        className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
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
          <div className="rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2.5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Out of Order ({outOfOrderRooms.length})
                </span>
                <span className="text-[10px] text-zinc-500 font-semibold">Blocked</span>
              </div>

              <div className="space-y-2.5 mt-2.5 max-h-[580px] overflow-y-auto pr-1">
                {outOfOrderRooms.map((room) => {
                  const activeIssue = room.maintenanceIssues?.[0];
                  return (
                    <div
                      key={room.id}
                      className="rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 p-3 space-y-2 text-xs shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">Room {room.number}</div>
                          <div className="text-[11px] text-zinc-500">{room.roomType?.name}</div>
                        </div>
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          <span>{activeIssue?.issueNo || "OOO"}</span>
                        </span>
                      </div>

                      <div className="text-[11px] font-medium text-rose-700 dark:text-rose-300 pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                        {activeIssue ? (
                          <div className="space-y-1">
                            <div className="font-bold flex items-center justify-between">
                              <span className="truncate">{activeIssue.assetText ? `${activeIssue.assetText} • ` : ""}{activeIssue.category}</span>
                              <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-rose-200 dark:bg-rose-900 font-bold shrink-0">{activeIssue.priority}</span>
                            </div>
                            <p className="text-[11px] text-rose-700 dark:text-rose-300 line-clamp-2 leading-tight">{activeIssue.description}</p>
                          </div>
                        ) : (
                          <span>{room.blocks?.[0]?.reason || "Maintenance repair in progress"}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TASKS LIST */}
      {activeTab === "tasks" && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Housekeeping Tasks</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3">Room</th>
                  <th className="p-3">Task</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition">
                    <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">Room {task.room.number}</td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300 font-medium">{task.type.replace("_", " ")}</td>
                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                          task.priority === "URGENT" || task.priority === "HIGH"
                            ? "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="rounded px-2 py-0.5 text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {task.status}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-500 max-w-xs truncate">{task.notes || "—"}</td>
                    <td className="p-3 text-right space-x-1.5">
                      {task.status === "OPEN" && (
                        <button
                          onClick={() => handleTaskStatus(task.id, "IN_PROGRESS")}
                          className="rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-1 text-xs text-zinc-800 dark:text-zinc-200 font-bold border border-zinc-300 dark:border-zinc-700 shadow-xs"
                        >
                          Start
                        </button>
                      )}
                      {task.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleTaskStatus(task.id, "COMPLETED")}
                          className="rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-3 py-1 text-xs font-bold shadow-xs"
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
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                Supervisor Inspection — Room {inspectModal.number}
              </h2>
              <button onClick={() => setInspectModal(null)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-zinc-600 dark:text-zinc-400 shadow-xs">
                <div className="font-bold text-zinc-900 dark:text-zinc-200">Checklist items:</div>
                <div>• Linen & bedding inspected</div>
                <div>• Bathroom sanitised & amenities restocked</div>
                <div>• Minibar & electricals verified</div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase">Defect Note (if failing)</label>
                <input
                  type="text"
                  placeholder="Optional defect note"
                  value={inspectionDefectNote}
                  onChange={(e) => setInspectionDefectNote(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 text-xs font-medium"
                />
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                <button
                  onClick={async () => {
                    await handleRoomHKState(inspectModal.id, "DIRTY");
                    setInspectModal(null);
                  }}
                  className="rounded-xl bg-zinc-100 hover:bg-rose-50 hover:text-rose-700 dark:bg-zinc-800 dark:hover:bg-rose-900/40 dark:hover:text-rose-200 text-zinc-700 dark:text-zinc-300 px-3.5 py-2 font-bold text-xs border border-zinc-300 dark:border-zinc-700 transition cursor-pointer"
                >
                  Fail (Mark Dirty)
                </button>

                <button
                  onClick={async () => {
                    await handleRoomHKState(inspectModal.id, "INSPECTED");
                    setInspectModal(null);
                  }}
                  className="rounded-xl bg-zinc-900 px-4 py-2 font-bold text-xs text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white transition cursor-pointer shadow-xs"
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
