import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// PATCH /api/v1/pos/kots/[id] - Update KOT status / Reprint
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: kotId } = await params;
    const body = await request.json();
    const { status, printStatus, incrementReprint } = body;

    const kot = await prisma.kOT.findUnique({
      where: { id: kotId },
    });

    if (!kot) {
      return NextResponse.json({ error: "KOT not found" }, { status: 404 });
    }

    const updated = await prisma.kOT.update({
      where: { id: kotId },
      data: {
        status: status || undefined,
        printStatus: printStatus || undefined,
        reprintCount: incrementReprint ? { increment: 1 } : undefined,
        readyAt: status === "READY" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, kot: updated });
  } catch (error: any) {
    console.error("Error updating KOT:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
