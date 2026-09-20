import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ensureBackupsDirExists, formatBytes, BackupItem } from "@/lib/domain/backup-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BACKUPS_DIR = path.join(process.cwd(), "prisma", "backups");

export async function POST(request: Request) {
  try {
    ensureBackupsDirExists();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
    }

    const originalName = file.name || "database.db";
    const cleanName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");

    if (!cleanName.toLowerCase().endsWith(".db")) {
      return NextResponse.json(
        { error: "Invalid file type. Only SQLite database files (.db) can be uploaded." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate size (max 500 MB)
    if (buffer.length === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }
    if (buffer.length > 500 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds maximum size of 500 MB." }, { status: 400 });
    }

    // Validate SQLite Magic Header: first 15 bytes must be "SQLite format 3"
    const header = buffer.toString("utf8", 0, 15);
    if (!header.startsWith("SQLite format 3")) {
      return NextResponse.json(
        { error: "Corrupted or invalid database file. The file header does not match SQLite 3." },
        { status: 400 }
      );
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const targetFilename = `uploaded_${timestamp}_${cleanName}`;
    const targetPath = path.join(BACKUPS_DIR, targetFilename);

    fs.writeFileSync(targetPath, buffer);

    const stat = fs.statSync(targetPath);
    const backupItem: BackupItem = {
      filename: targetFilename,
      sizeBytes: stat.size,
      sizeFormatted: formatBytes(stat.size),
      createdAt: now.toISOString(),
      type: "SQLITE_DB",
      isPreRestore: false,
      label: "Uploaded External Backup",
    };

    return NextResponse.json({
      success: true,
      message: `External database snapshot "${targetFilename}" uploaded and validated successfully.`,
      backup: backupItem,
    });
  } catch (error: any) {
    console.error("Backup upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload backup file" },
      { status: 500 }
    );
  }
}
