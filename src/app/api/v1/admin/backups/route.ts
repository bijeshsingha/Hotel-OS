import { NextResponse } from "next/server";
import {
  listBackups,
  getActiveDbStats,
  createInstantBackup,
  deleteBackupFile,
} from "@/lib/domain/backup-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const stats = getActiveDbStats();
    const backups = listBackups();

    return NextResponse.json({
      stats,
      backups,
      count: backups.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list database backups" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const note = body?.note;

    const result = await createInstantBackup(note);

    return NextResponse.json({
      success: true,
      message: `Snapshot "${result.dbBackup.filename}" created successfully.`,
      backup: result.dbBackup,
      jsonDump: result.jsonDump,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create database backup snapshot" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let filename = searchParams.get("filename");

    if (!filename) {
      const body = await request.json().catch(() => ({}));
      filename = body?.filename;
    }

    if (!filename) {
      return NextResponse.json(
        { error: "Backup filename is required." },
        { status: 400 }
      );
    }

    const result = deleteBackupFile(filename);

    return NextResponse.json({
      success: true,
      message: `Backup "${filename}" deleted successfully.`,
      deleted: result.deleted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete backup file" },
      { status: 500 }
    );
  }
}
