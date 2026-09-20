"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  Upload,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  HardDrive,
  Clock,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  Search,
  FileText,
  Lock,
  ArrowDownToLine,
  HelpCircle,
} from "lucide-react";
import { useHotel } from "@/lib/context/hotel-context";

interface BackupItem {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  type: "SQLITE_DB" | "JSON_DUMP" | "SAFETY_SNAPSHOT";
  isPreRestore: boolean;
  label?: string;
}

interface DbStats {
  engine: string;
  filename: string;
  fullPath: string;
  exists: boolean;
  sizeBytes: number;
  sizeFormatted: string;
  lastModified: string | null;
}

interface BackupRestoreTabProps {
  onNotify?: (message: string, type?: "success" | "error") => void;
}

export function BackupRestoreTab({ onNotify }: BackupRestoreTabProps) {
  const { user, refreshData } = useHotel();
  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
  };

  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "SQLITE_DB" | "SAFETY_SNAPSHOT" | "JSON_DUMP">("ALL");

  // Create Backup Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [backupNote, setBackupNote] = useState("");
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Restore Modal State
  const [restoringItem, setRestoringItem] = useState<BackupItem | null>(null);
  const [restorePassword, setRestorePassword] = useState("");
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  // Upload State
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Deleting State
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/backups");
      if (!res.ok) throw new Error("Failed to load backups.");
      const data = await res.json();
      setBackups(data.backups || []);
      setDbStats(data.stats || null);
    } catch (err: any) {
      notify(err.message || "Failed to load backups", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  // Filtered backups list
  const filteredBackups = useMemo(() => {
    return backups.filter((b) => {
      // Type filter
      if (filterType !== "ALL" && b.type !== filterType) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = b.filename.toLowerCase().includes(q);
        const matchesLabel = b.label?.toLowerCase().includes(q);
        return matchesName || matchesLabel;
      }
      return true;
    });
  }, [backups, filterType, searchQuery]);

  // Counts by category
  const counts = useMemo(() => {
    let dbCount = 0;
    let safetyCount = 0;
    let jsonCount = 0;
    for (const b of backups) {
      if (b.type === "SAFETY_SNAPSHOT") safetyCount++;
      else if (b.type === "SQLITE_DB") dbCount++;
      else if (b.type === "JSON_DUMP") jsonCount++;
    }
    return { all: backups.length, db: dbCount, safety: safetyCount, json: jsonCount };
  }, [backups]);

  // Handle Instant Backup Creation
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingBackup(true);
    try {
      const res = await fetch("/api/v1/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: backupNote.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create backup");

      notify(`Instant backup "${data.backup.filename}" created successfully!`);
      setShowCreateModal(false);
      setBackupNote("");
      fetchBackups();
    } catch (err: any) {
      notify(err.message || "Failed to create backup", "error");
    } finally {
      setCreatingBackup(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.toLowerCase().endsWith(".db")) {
      notify("Only SQLite database files (.db) can be uploaded.", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/admin/backups/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      notify(`External backup "${data.backup.filename}" uploaded & verified!`);
      fetchBackups();
    } catch (err: any) {
      notify(err.message || "Failed to upload file", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Download
  const handleDownload = (filename: string) => {
    window.open(`/api/v1/admin/backups/download?filename=${encodeURIComponent(filename)}`, "_blank");
  };

  // Handle Delete
  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to permanently delete backup "${filename}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingFilename(filename);
    try {
      const res = await fetch(`/api/v1/admin/backups?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete backup");

      notify(`Backup "${filename}" deleted successfully.`);
      fetchBackups();
    } catch (err: any) {
      notify(err.message || "Failed to delete backup", "error");
    } finally {
      setDeletingFilename(null);
    }
  };

  // Handle Restore Execution
  const handleExecuteRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoringItem) return;

    if (!restorePassword.trim()) {
      setRestoreError("Please enter your Super Admin password or security PIN to authorize this restore.");
      return;
    }

    setRestoring(true);
    setRestoreError("");

    try {
      const res = await fetch("/api/v1/admin/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: restoringItem.filename,
          passwordOrPin: restorePassword.trim(),
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore operation failed");

      notify(
        `Database restored successfully! Safety rollback snapshot "${data.result?.safetySnapshot}" was saved.`,
        "success"
      );
      setRestoringItem(null);
      setRestorePassword("");
      fetchBackups();
      refreshData();
    } catch (err: any) {
      setRestoreError(err.message || "Failed to restore database");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS CARDS & ENGINE STATUS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Database Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
            <HardDrive className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Active Database
            </div>
            <div className="text-base font-black text-zinc-900 dark:text-white truncate">
              {dbStats?.filename || "dev.db"}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono font-medium mt-0.5 flex items-center gap-1.5">
              <span>{dbStats?.sizeFormatted || "0 B"}</span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Total Snapshots Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
            <Database className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Total Snapshots
            </div>
            <div className="text-base font-black text-zinc-900 dark:text-white">
              {counts.all} Files
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              {counts.db} Binary (.db) / {counts.json} JSON
            </div>
          </div>
        </div>

        {/* Safety Rollbacks Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Pre-Restore Safety
            </div>
            <div className="text-base font-black text-zinc-900 dark:text-white">
              {counts.safety} Guard Snapshots
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              Zero Data Loss Guard Active
            </div>
          </div>
        </div>

        {/* Engine Specification Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/50">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Storage Engine
            </div>
            <div className="text-base font-black text-zinc-900 dark:text-white">
              SQLite 3.x
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 truncate" title="prisma/backups">
              Path: prisma/backups
            </div>
          </div>
        </div>
      </div>

      {/* 2. ACTIONS BAR & CONTROLS */}
      <div className="bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
              <span>Database Backups & Disaster Recovery</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Create instant full-system snapshots, export portable backups, or restore previous states with zero risk of data loss.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Hidden File Input for .db upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".db"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-9 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer border border-zinc-200/80 dark:border-zinc-700 disabled:opacity-50"
              title="Upload an existing SQLite database snapshot from another machine"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{uploading ? "Uploading..." : "Upload .db"}</span>
            </button>

            <button
              type="button"
              onClick={fetchBackups}
              disabled={loading}
              className="h-9 w-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer border border-zinc-200/80 dark:border-zinc-700 disabled:opacity-50"
              title="Refresh backup catalog"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create Instant Backup</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-semibold overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                filterType === "ALL"
                  ? "bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white shadow-xs font-bold border border-zinc-200/90 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              All Snapshots ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("SQLITE_DB")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                filterType === "SQLITE_DB"
                  ? "bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white shadow-xs font-bold border border-zinc-200/90 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Database .db ({counts.db})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("SAFETY_SNAPSHOT")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                filterType === "SAFETY_SNAPSHOT"
                  ? "bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white shadow-xs font-bold border border-zinc-200/90 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Safety Guard ({counts.safety})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("JSON_DUMP")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                filterType === "JSON_DUMP"
                  ? "bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white shadow-xs font-bold border border-zinc-200/90 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              JSON Exports ({counts.json})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative sm:w-64">
            <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename or note..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-zinc-50 dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-medium"
            />
          </div>
        </div>
      </div>

      {/* 3. BACKUPS CATALOG TABLE */}
      <div className="bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-[#18181b] border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 min-w-[220px]">Backup Snapshot</th>
                <th className="py-3 px-4 min-w-[120px]">Category</th>
                <th className="py-3 px-4 min-w-[90px]">File Size</th>
                <th className="py-3 px-4 min-w-[140px]">Created Date</th>
                <th className="py-3 px-4 text-right min-w-[190px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-medium">
              {loading && backups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading backups catalog...</span>
                  </td>
                </tr>
              ) : filteredBackups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    <Database className="h-8 w-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
                    <p className="font-semibold text-zinc-600 dark:text-zinc-400">No backups found.</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Click "Create Instant Backup" above to generate your first snapshot.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBackups.map((item) => {
                  const isDb = item.filename.endsWith(".db");
                  const isJson = item.filename.endsWith(".json");
                  const isPreRestore = item.isPreRestore;

                  return (
                    <tr
                      key={item.filename}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition group"
                    >
                      {/* Filename & Tag */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isPreRestore
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200/70 dark:border-emerald-800/50"
                                : isDb
                                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200/70 dark:border-blue-800/50"
                                : "bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200/70 dark:border-purple-800/50"
                            }`}
                          >
                            {isPreRestore ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : isDb ? (
                              <Database className="h-4 w-4" />
                            ) : (
                              <FileCode className="h-4 w-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-mono font-bold text-zinc-900 dark:text-white truncate text-[12px] flex items-center gap-2">
                              <span>{item.filename}</span>
                              {item.label && (
                                <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                  {item.label}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-sans mt-0.5">
                              {isPreRestore
                                ? "Automated rollback point before database restore"
                                : isDb
                                ? "Binary SQLite database snapshot"
                                : "JSON table dump for external analytics"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isPreRestore ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                            <ShieldCheck className="h-3 w-3" />
                            Safety Guard
                          </span>
                        ) : isDb ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                            <Database className="h-3 w-3" />
                            SQLite .db
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
                            <FileCode className="h-3 w-3" />
                            JSON Export
                          </span>
                        )}
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 font-mono font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {item.sizeFormatted}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          <span>{new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDownload(item.filename)}
                            className="h-8 px-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer border border-zinc-200/80 dark:border-zinc-700"
                            title="Download backup file to local machine"
                          >
                            <Download className="h-3.5 w-3.5 text-zinc-500" />
                            <span>Download</span>
                          </button>

                          {/* Restore Button (Only for .db files) */}
                          {isDb && (
                            <button
                              type="button"
                              onClick={() => {
                                setRestoringItem(item);
                                setRestorePassword("");
                                setRestoreError("");
                              }}
                              className="h-8 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer border border-amber-200 dark:border-amber-800/60"
                              title="Restore this backup snapshot to active dev.db"
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                              <span>Restore</span>
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.filename)}
                            disabled={deletingFilename === item.filename}
                            className="h-8 w-8 rounded-lg bg-zinc-100 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/50 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition cursor-pointer border border-zinc-200/80 dark:border-zinc-700 disabled:opacity-50"
                            title="Delete snapshot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. RESTORE CONFIRMATION MODAL */}
      {restoringItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/80 dark:border-amber-800/60">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white">
                    Confirm Database Restore
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Replace active database with selected snapshot
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestoringItem(null)}
                disabled={restoring}
                className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleExecuteRestore} className="p-5 space-y-4">
              {/* Snapshot Details */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 space-y-1.5 text-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-500">Target Snapshot:</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[260px]">
                    {restoringItem.filename}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-500">File Size:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {restoringItem.sizeFormatted}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-zinc-500">Created:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {new Date(restoringItem.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Zero Data Loss Guarantee Alert */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Mandatory Pre-Restore Safety Snapshot Guaranteed</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90 leading-relaxed pl-5">
                  Before applying this snapshot, Hotel OS will automatically create an immutable backup of your current active database (`dev.db`). You can rollback at any time if needed.
                </p>
              </div>

              {/* Error Box */}
              {restoreError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-medium">
                  {restoreError}
                </div>
              )}

              {/* Authorization Password / PIN Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Super Admin Password or Security PIN</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Required for authorization</span>
                </label>
                <div className="relative">
                  <input
                    type={showRestorePassword ? "text" : "password"}
                    value={restorePassword}
                    onChange={(e) => {
                      setRestorePassword(e.target.value);
                      if (restoreError) setRestoreError("");
                    }}
                    placeholder="Enter admin password or PIN..."
                    autoFocus
                    required
                    disabled={restoring}
                    className="w-full h-10 px-3.5 pr-10 rounded-xl bg-zinc-50 dark:bg-[#18181b] border border-zinc-200/90 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRestorePassword(!showRestorePassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showRestorePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRestoringItem(null)}
                  disabled={restoring}
                  className="h-9 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restoring || !restorePassword.trim()}
                  className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {restoring ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Restoring Database...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Confirm & Restore</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CREATE INSTANT BACKUP MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/80 dark:border-blue-800/60">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white">
                    Create Instant Database Snapshot
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Generate an atomic binary snapshot of dev.db
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={creatingBackup}
                className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateBackup} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Optional Note / Tag
                </label>
                <input
                  type="text"
                  value={backupNote}
                  onChange={(e) => setBackupNote(e.target.value)}
                  placeholder="e.g. before_monthly_reconciliation or audit_point"
                  maxLength={50}
                  autoFocus
                  disabled={creatingBackup}
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-[#18181b] border border-zinc-200/90 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono disabled:opacity-50"
                />
                <p className="text-[11px] text-zinc-400">
                  Appends a descriptive label to the snapshot file for rapid recognition.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Dual Snapshot Architecture</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Creates both a complete SQLite binary database file (`.db`) and a synchronized structured JSON dump of all core domain tables.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingBackup}
                  className="h-9 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBackup}
                  className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {creatingBackup ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating Snapshot...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Create Backup</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
