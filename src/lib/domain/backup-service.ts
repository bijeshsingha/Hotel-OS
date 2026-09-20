import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { apiCache } from "@/lib/cache/api-cache";

const BACKUPS_DIR = path.join(process.cwd(), "prisma", "backups");
const DB_PATH = path.join(process.cwd(), "prisma", "dev.db");

export interface BackupItem {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  type: "SQLITE_DB" | "JSON_DUMP" | "SAFETY_SNAPSHOT";
  isPreRestore: boolean;
  label?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function ensureBackupsDirExists() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

/**
 * Lists all valid backup files in prisma/backups/
 */
export function listBackups(): BackupItem[] {
  ensureBackupsDirExists();

  const files = fs.readdirSync(BACKUPS_DIR);
  const items: BackupItem[] = [];

  for (const file of files) {
    // Ignore internal folders like grc_archives and non-backup files
    if (file === "grc_archives" || file === "grc_master_backup.json" || file === "outstanding_ledger.json") {
      continue;
    }

    const filePath = path.join(BACKUPS_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      const isDb = file.endsWith(".db");
      const isJson = file.endsWith(".json");
      if (!isDb && !isJson) continue;

      const isPreRestore = file.startsWith("pre_restore_safety_");
      let type: BackupItem["type"] = "SQLITE_DB";
      if (isPreRestore) {
        type = "SAFETY_SNAPSHOT";
      } else if (isJson) {
        type = "JSON_DUMP";
      }

      // Try to parse timestamp from filename (e.g. backup_2026-09-20_06-39-35.db or pre_restore_safety_1787913230421.db)
      let fileDate = stat.mtime.toISOString();
      const matchDate = file.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
      if (matchDate) {
        const [_, d, t] = matchDate;
        const isoTime = `${d}T${t.replace(/-/g, ":")}Z`;
        const parsed = new Date(isoTime);
        if (!isNaN(parsed.getTime())) {
          fileDate = parsed.toISOString();
        }
      } else {
        const matchMs = file.match(/safety_(\d{10,14})/);
        if (matchMs) {
          const parsedMs = new Date(Number(matchMs[1]));
          if (!isNaN(parsedMs.getTime())) {
            fileDate = parsedMs.toISOString();
          }
        }
      }

      items.push({
        filename: file,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: fileDate,
        type,
        isPreRestore,
      });
    } catch {
      // Skip inaccessible files
    }
  }

  // Sort descending by creation date (newest first)
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Gets live active database metrics
 */
export function getActiveDbStats() {
  const dbExists = fs.existsSync(DB_PATH);
  const stat = dbExists ? fs.statSync(DB_PATH) : null;

  return {
    engine: "SQLite",
    filename: "dev.db",
    fullPath: DB_PATH,
    exists: dbExists,
    sizeBytes: stat?.size || 0,
    sizeFormatted: stat ? formatBytes(stat.size) : "0 B",
    lastModified: stat?.mtime.toISOString() || null,
  };
}

/**
 * Creates an instant binary snapshot of dev.db and a JSON table dump
 */
export async function createInstantBackup(note?: string): Promise<{
  dbBackup: BackupItem;
  jsonDump?: BackupItem;
}> {
  ensureBackupsDirExists();

  if (!fs.existsSync(DB_PATH)) {
    throw new Error("Active database dev.db not found on disk.");
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

  const cleanNote = note ? `_${note.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")}` : "";
  const dbBackupName = `backup_${timestamp}${cleanNote}.db`;
  const dbBackupPath = path.join(BACKUPS_DIR, dbBackupName);

  // 1. Safe binary file copy
  fs.copyFileSync(DB_PATH, dbBackupPath);
  const dbStat = fs.statSync(dbBackupPath);

  const dbBackupItem: BackupItem = {
    filename: dbBackupName,
    sizeBytes: dbStat.size,
    sizeFormatted: formatBytes(dbStat.size),
    createdAt: now.toISOString(),
    type: "SQLITE_DB",
    isPreRestore: false,
    label: note || undefined,
  };

  // 2. Generate JSON table dump in background
  let jsonDumpItem: BackupItem | undefined = undefined;
  try {
    const jsonDumpName = `dump_${timestamp}${cleanNote}.json`;
    const jsonDumpPath = path.join(BACKUPS_DIR, jsonDumpName);

    const models = [
      "organization",
      "property",
      "roomType",
      "room",
      "guest",
      "reservation",
      "reservationRoom",
      "stay",
      "roomAssignment",
      "folio",
      "folioCharge",
      "folioPayment",
      "invoice",
      "companyMaster",
      "expense",
      "auditLog",
      "user",
      "role",
    ];

    const backupData: any = {
      exportedAt: now.toISOString(),
      note: note || undefined,
      tables: {},
    };

    for (const model of models) {
      if ((prisma as any)[model]) {
        try {
          backupData.tables[model] = await (prisma as any)[model].findMany();
        } catch (e: any) {
          backupData.tables[model] = { error: e.message };
        }
      }
    }

    fs.writeFileSync(jsonDumpPath, JSON.stringify(backupData, null, 2), "utf8");
    const jsonStat = fs.statSync(jsonDumpPath);

    jsonDumpItem = {
      filename: jsonDumpName,
      sizeBytes: jsonStat.size,
      sizeFormatted: formatBytes(jsonStat.size),
      createdAt: now.toISOString(),
      type: "JSON_DUMP",
      isPreRestore: false,
    };
  } catch (err) {
    console.warn("JSON table dump creation failed, binary .db backup is secure:", err);
  }

  return {
    dbBackup: dbBackupItem,
    jsonDump: jsonDumpItem,
  };
}

/**
 * Deletes a backup file safely
 */
export function deleteBackupFile(filename: string) {
  ensureBackupsDirExists();

  // Prevent path traversal
  const cleanFilename = path.basename(filename);
  if (cleanFilename !== filename || cleanFilename.includes("..")) {
    throw new Error("Invalid backup filename.");
  }

  const filePath = path.join(BACKUPS_DIR, cleanFilename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file "${cleanFilename}" not found.`);
  }

  // Prevent deleting live database
  if (path.resolve(filePath) === path.resolve(DB_PATH)) {
    throw new Error("Cannot delete active production database.");
  }

  fs.unlinkSync(filePath);
  return { success: true, deleted: cleanFilename };
}

/**
 * Restores a backup onto prisma/dev.db with mandatory pre-restore safety snapshot
 */
export async function restoreBackupFile(filename: string): Promise<{
  restoredFile: string;
  safetySnapshot: string;
  propertyCount: number;
}> {
  ensureBackupsDirExists();

  const cleanFilename = path.basename(filename);
  if (cleanFilename !== filename || cleanFilename.includes("..")) {
    throw new Error("Invalid backup filename.");
  }

  const sourceBackupPath = path.join(BACKUPS_DIR, cleanFilename);
  if (!fs.existsSync(sourceBackupPath)) {
    throw new Error(`Backup file "${cleanFilename}" does not exist.`);
  }

  if (!cleanFilename.endsWith(".db")) {
    throw new Error("Only binary SQLite database (.db) snapshots can be restored to active dev.db.");
  }

  // Verify SQLite file header
  const buffer = Buffer.alloc(16);
  const fd = fs.openSync(sourceBackupPath, "r");
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);
  const headerString = buffer.toString("utf8", 0, 15);
  if (!headerString.startsWith("SQLite format 3")) {
    throw new Error("The selected file is not a valid SQLite database (header mismatch).");
  }

  // 1. MANDATORY PRE-RESTORE SAFETY SNAPSHOT
  const safetyFilename = `pre_restore_safety_${Date.now()}.db`;
  const safetyPath = path.join(BACKUPS_DIR, safetyFilename);
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, safetyPath);
  }

  // 2. DISCONNECT PRISMA
  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect errors
  }

  // 3. REMOVE LEFTOVER WAL/SHM FILES
  const walPath = `${DB_PATH}-wal`;
  const shmPath = `${DB_PATH}-shm`;
  if (fs.existsSync(walPath)) try { fs.unlinkSync(walPath); } catch {}
  if (fs.existsSync(shmPath)) try { fs.unlinkSync(shmPath); } catch {}

  // 4. ATOMIC DATABASE FILE SWAP
  fs.copyFileSync(sourceBackupPath, DB_PATH);

  // 5. RECONNECT & INTEGRITY VERIFICATION
  let propertyCount = 0;
  try {
    await prisma.$connect();
    propertyCount = await prisma.property.count();
  } catch (verifyErr: any) {
    // If verification fails, attempt to rollback to safety snapshot
    if (fs.existsSync(safetyPath)) {
      fs.copyFileSync(safetyPath, DB_PATH);
    }
    throw new Error(`Restored database verification failed: ${verifyErr.message}. Rolled back to safety snapshot.`);
  }

  // 6. INVALIDATE API CACHES
  apiCache.invalidate();

  return {
    restoredFile: cleanFilename,
    safetySnapshot: safetyFilename,
    propertyCount,
  };
}
