import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sync24HourFolioCharges } from "@/lib/domain/folio-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folioId } = await params;
    const { searchParams } = new URL(request.url);
    const graceParam = searchParams.get("graceMinutes");
    const overrideGraceMinutes = graceParam !== null ? Number(graceParam) : undefined;

    // Synchronize 24-hour cycle charges before returning folio
    const cycleData = await sync24HourFolioCharges({ folioId, overrideGraceMinutes });

    const folio = await prisma.folio.findUnique({
      where: { id: folioId },
      include: {
        stay: {
          include: {
            primaryGuest: true,
            roomAssignments: { where: { endsAt: null }, include: { room: true } },
          },
        },
        windows: {
          include: {
            entries: {
              orderBy: { postedAt: "desc" },
            },
            invoices: {
              include: { lines: true, creditNotes: true },
            },
          },
        },
        payments: {
          include: {
            allocations: true,
            refunds: true,
          },
          orderBy: { receivedAt: "desc" },
        },
        deposits: true,
      },
    });

    if (!folio) {
      return NextResponse.json({ error: "Folio not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...folio,
      cycleMetrics: cycleData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
