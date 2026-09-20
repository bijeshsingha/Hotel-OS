import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { restoreBackupFile } from "@/lib/domain/backup-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { filename, passwordOrPin, userId } = body;

    if (!filename) {
      return NextResponse.json(
        { error: "Backup filename is required for restore." },
        { status: 400 }
      );
    }

    if (!passwordOrPin || !passwordOrPin.trim()) {
      return NextResponse.json(
        { error: "Super Admin authorization password or security PIN is required to restore a database." },
        { status: 401 }
      );
    }

    const cleanInput = passwordOrPin.trim();

    // 1. Verify against Master Admin or Owner credentials
    let isAuthorized = false;

    // Direct check against master passwords
    if (verifyPassword(cleanInput)) {
      isAuthorized = true;
    } else {
      // Find Org Owner or target user in database
      const ownerUser = await prisma.user.findFirst({
        where: userId
          ? { id: userId }
          : {
              OR: [
                { id: "usr_bijesh" },
                { email: "bijesh.singha@hotelos.in" },
                {
                  memberships: {
                    some: {
                      propertyGrants: {
                        some: { role: { code: "ORG_OWNER" } },
                      },
                    },
                  },
                },
              ],
            },
      });

      if (ownerUser) {
        isAuthorized = verifyPassword(
          cleanInput,
          (ownerUser as any).passwordHash,
          (ownerUser as any).pin
        );
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Incorrect Super Admin password or security PIN. Database restore aborted." },
        { status: 403 }
      );
    }

    // 2. Perform safe restore with mandatory pre-restore safety snapshot
    const result = await restoreBackupFile(filename);

    return NextResponse.json({
      success: true,
      message: `Database restored successfully from "${result.restoredFile}". Safety backup "${result.safetySnapshot}" created automatically.`,
      result,
    });
  } catch (error: any) {
    console.error("Database restore failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to restore database backup" },
      { status: 500 }
    );
  }
}
