import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BACKUPS_DIR = path.join(process.cwd(), "prisma", "backups");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Filename parameter is required." }, { status: 400 });
    }

    // Security: Path traversal prevention
    const cleanFilename = path.basename(filename);
    if (cleanFilename !== filename || cleanFilename.includes("..")) {
      return NextResponse.json({ error: "Invalid backup filename." }, { status: 400 });
    }

    const filePath = path.join(BACKUPS_DIR, cleanFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `Backup file "${cleanFilename}" does not exist.` }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Requested resource is not a valid file." }, { status: 400 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const contentType = cleanFilename.endsWith(".json")
      ? "application/json; charset=utf-8"
      : "application/octet-stream";

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${cleanFilename}"`,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to download backup file" },
      { status: 500 }
    );
  }
}
