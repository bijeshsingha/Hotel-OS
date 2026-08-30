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
import { PageHeader, SegmentedControl } from "@/components/ui";
import { apiCache } from "@/lib/cache/api-cache";


export default function HousekeepingPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [tasks, setTasks] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"board" | "tasks">("board");


  // Inspection modal
  const [inspectModal, setInspectModal] = useState<any | null>(null);
  const [inspectionDefectNote, setInspectionDefectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectModal(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadData = async (forceFresh = false) => {
    if (!activeProperty) return;
    const tasksUrl = `/api/v1/housekeeping/tasks?propertyId=${activeProperty.id}`;
    const roomsUrl = `/api/v1/rooms?propertyId=${activeProperty.id}`;

    // Read cached immediately for 0ms render
    if (!forceFresh) {
      const cachedTasks = apiCache.get(tasksUrl);
      const cachedRooms = apiCache.get(roomsUrl);
      if (cachedTasks && cachedRooms) {
        setTasks(cachedTasks);
        setRooms(cachedRooms);
      } else {
        setLoading(true);
      }
    }

    try {
      const [tasksData, roomsData] = await Promise.all([
        apiCache.swrFetch(tasksUrl, undefined, (cached) => setTasks(cached)),
        apiCache.swrFetch(roomsUrl, undefined, (cached) => setRooms(cached)),
      ]);

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
    // 1. Optimistic Update (0ms instant response)
    const prevTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status, notes: notes || t.notes } : t))
    );

    try {
      const res = await fetch("/api/v1/housekeeping/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status, notes }),
      });
      if (!res.ok) throw new Error("Status update failed");

      apiCache.invalidate("housekeeping");
      refreshData();
    } catch (err: any) {
      // Rollback on failure
      setTasks(prevTasks);
      alert(`Error updating task: ${err.message}`);
    }
  };

  const handleRoomHKState = async (roomId: string, housekeepingStatus: string) => {
    // 1. Optimistic Update (0ms instant response)
    const prevRooms = [...rooms];
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              roomState: { ...r.roomState, housekeepingStatus },
            }
          : r
      )
    );

    try {
      const res = await fetch(`/api/v1/rooms/${roomId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ housekeepingStatus }),
      });
      if (!res.ok) throw new Error("Room state update failed");

      apiCache.invalidate("rooms");
      apiCache.invalidate("pms");
      refreshData();
    } catch (err: any) {
      // Rollback on failure
      setRooms(prevRooms);
      alert(`Error: ${err.message}`);
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
    <div className="space-y-4 max-w-[1600px] mx-auto w-full text-zinc-900 dark:text-zinc-100">
      {/* Top Banner */}
      <PageHeader
        title="Housekeeping Board"
        description="Turnaround cleaning, supervisor inspections & room state transitions"
        icon={Sparkles}
        badge="H01–H05"
        badgeVariant="neutral"
        businessDate={activeProperty?.businessDate}
        actions={
          <SegmentedControl
            value={activeTab}
            onChange={(val) => setActiveTab(val as "board" | "tasks")}
            options={[
              { value: "board", label: "Kanban Board" },
              { value: "tasks", label: "Tasks", badge: tasks.length },
            ]}
          />
        }
      />

      {/* TAB 1: KANBAN BOARD (Responsive horizontally swipeable with scroll snapping on mobile) */}
      {activeTab === "board" && (
        <div className="flex md:grid md:grid-cols-4 gap-3.5 overflow-x-auto snap-x snap-mandatory pb-4 md:pb-0 scrollbar-thin">
          {/* DIRTY */}
          <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 p-4 space-y-3 flex flex-col justify-between shadow-xs min-w-[280px] sm:min-w-[320px] md:min-w-0 snap-center shrink-0 md:shrink">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Dirty ({dirtyRooms.length})
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">Pending</span>
              </div>

              <div className="space-y-2.5 mt-3 max-h-[580px] overflow-y-auto pr-1">
                {dirtyRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 p-3 space-y-2 text-xs shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-white font-mono text-sm">Room {room.number}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{room.roomType.name}</div>
                      </div>
                      <span className="rounded-md bg-zinc-200/70 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                        Floor {room.floor}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-xs">
                      <span className="text-zinc-500 font-medium">
                        {room.roomState?.occupancyStatus === "OCCUPIED" ? "Stayover" : "Checkout"}
                      </span>
                      <button
                        onClick={() => handleRoomHKState(room.id, "CLEAN")}
                        disabled={actionLoading}
                        className="rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-2.5 py-1 text-xs text-white dark:text-zinc-200 font-semibold transition cursor-pointer shadow-xs"
                      >
                        Mark Clean →
                      </button>
                    </div>
                  </div>
                ))}
                {dirtyRooms.length === 0 && (
                  <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-600 italic">No dirty rooms</div>
                )}
              </div>
            </div>
          </div>

          {/* CLEAN */}
          <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 p-4 space-y-3 flex flex-col justify-between shadow-xs min-w-[280px] sm:min-w-[320px] md:min-w-0 snap-center shrink-0 md:shrink">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-blue-700 dark:text-blue-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Clean ({cleanRooms.length})
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">For Inspect</span>
              </div>

              <div className="space-y-2.5 mt-3 max-h-[580px] overflow-y-auto pr-1">
                {cleanRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 p-3 space-y-2 text-xs shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-white font-mono text-sm">Room {room.number}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{room.roomType.name}</div>
                      </div>
                      <span className="rounded-md bg-zinc-200/70 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                        Floor {room.floor}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-xs">
                      <span className="text-zinc-500 font-medium">Cleaned</span>
                      <button
                        onClick={() => setInspectModal(room)}
                        className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 text-xs font-semibold transition cursor-pointer shadow-xs"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
                {cleanRooms.length === 0 && (
                  <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-600 italic">None awaiting inspection</div>
                )}
              </div>
            </div>
          </div>

          {/* INSPECTED */}
          <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 p-4 space-y-3 flex flex-col justify-between shadow-xs min-w-[280px] sm:min-w-[320px] md:min-w-0 snap-center shrink-0 md:shrink">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Inspected ({inspectedRooms.length})
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">Ready</span>
              </div>

              <div className="space-y-2.5 mt-3 max-h-[580px] overflow-y-auto pr-1">
                {inspectedRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 p-3 space-y-2 text-xs shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-white font-mono text-sm">Room {room.number}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{room.roomType.name}</div>
                      </div>
                      <span className="rounded-md bg-zinc-200/70 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                        Floor {room.floor}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                      </span>
                      <button
                        onClick={() => handleRoomHKState(room.id, "DIRTY")}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
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
          <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 p-4 space-y-3 flex flex-col justify-between shadow-xs min-w-[280px] sm:min-w-[320px] md:min-w-0 snap-center shrink-0 md:shrink">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-rose-700 dark:text-rose-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Out of Order ({outOfOrderRooms.length})
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">Blocked</span>
              </div>

              <div className="space-y-2.5 mt-3 max-h-[580px] overflow-y-auto pr-1">
                {outOfOrderRooms.map((room) => {
                  const activeIssue = room.maintenanceIssues?.[0];
                  return (
                    <div
                      key={room.id}
                      className="rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 p-3 space-y-2 text-xs shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-white font-mono text-sm">Room {room.number}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">{room.roomType?.name}</div>
                        </div>
                        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          <span>{activeIssue?.issueNo || "OOO"}</span>
                        </span>
                      </div>

                      <div className="text-xs font-medium text-rose-700 dark:text-rose-300 pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                        {activeIssue ? (
                          <div className="space-y-1">
                            <div className="font-semibold flex items-center justify-between">
                              <span className="truncate">{activeIssue.assetText ? `${activeIssue.assetText} • ` : ""}{activeIssue.category}</span>
                              <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-rose-200 dark:bg-rose-900 font-semibold shrink-0">{activeIssue.priority}</span>
                            </div>
                            <p className="text-xs text-rose-700 dark:text-rose-300 line-clamp-2">{activeIssue.description}</p>
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
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#111114] overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Housekeeping Tasks</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 text-xs uppercase font-semibold border-b border-zinc-200/80 dark:border-zinc-800">
                <tr>
                  <th className="p-3.5">Room</th>
                  <th className="p-3.5">Task</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Notes</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition">
                    <td className="p-3.5 font-mono font-bold text-zinc-900 dark:text-white">Room {task.room.number}</td>
                    <td className="p-3.5 text-zinc-700 dark:text-zinc-300 font-medium">{task.type.replace("_", " ")}</td>
                    <td className="p-3.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          task.priority === "URGENT" || task.priority === "HIGH"
                            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="rounded-md px-2 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                        {task.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-zinc-500 max-w-xs truncate">{task.notes || "—"}</td>
                    <td className="p-3.5 text-right space-x-2">
                      {task.status === "OPEN" && (
                        <button
                          onClick={() => handleTaskStatus(task.id, "IN_PROGRESS")}
                          className="rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-semibold border border-zinc-200 dark:border-zinc-700 shadow-xs"
                        >
                          Start
                        </button>
                      )}
                      {task.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleTaskStatus(task.id, "COMPLETED")}
                          className="rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-3 py-1.5 text-xs font-semibold shadow-xs"
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
          <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                Supervisor Inspection — Room {inspectModal.number}
              </h2>
              <button onClick={() => setInspectModal(null)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5 text-zinc-600 dark:text-zinc-400 shadow-xs">
                <div className="font-semibold text-zinc-900 dark:text-white">Checklist items:</div>
                <div>• Linen & bedding inspected</div>
                <div>• Bathroom sanitised & amenities restocked</div>
                <div>• Minibar & electricals verified</div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase">Defect Note (if failing)</label>
                <input
                  type="text"
                  placeholder="Optional defect note"
                  value={inspectionDefectNote}
                  onChange={(e) => setInspectionDefectNote(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                <button
                  onClick={async () => {
                    await handleRoomHKState(inspectModal.id, "DIRTY");
                    setInspectModal(null);
                  }}
                  className="rounded-xl bg-zinc-100 hover:bg-rose-50 hover:text-rose-700 dark:bg-zinc-800 dark:hover:bg-rose-900/40 dark:hover:text-rose-200 text-zinc-700 dark:text-zinc-300 px-3.5 py-2 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                >
                  Fail (Mark Dirty)
                </button>

                <button
                  onClick={async () => {
                    await handleRoomHKState(inspectModal.id, "INSPECTED");
                    setInspectModal(null);
                  }}
                  className="rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-xs text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white transition cursor-pointer shadow-xs"
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
