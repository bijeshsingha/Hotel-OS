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
            roomAssignments: {
              include: { room: { include: { roomType: true } } },
              orderBy: { startsAt: "desc" },
            },
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

    let grc: any = null;
    if (folio.stay?.id) {
      // 1. Direct stayId match
      grc = await prisma.guestRegistration.findFirst({
        where: { stayId: folio.stay.id },
        select: {
          id: true,
          registrationNo: true,
          signedAt: true,
          preAssignedRoom: true,
          arrivalDateTime: true,
          expectedDepartureDate: true,
          depositAmount: true,
          status: true,
          internalNotes: true,
        },
        orderBy: { signedAt: "desc" },
      });

      // 2. Check snapshot for explicit grcNo (from checkout or invoice)
      if (!grc) {
        let snapshotGrcNo: string | null = null;
        for (const w of folio.windows) {
          try {
            const snap = JSON.parse(w.guestOrCompanySnapshot || "{}");
            if (snap.grcNo) { snapshotGrcNo = snap.grcNo; break; }
          } catch {}
          for (const inv of w.invoices || []) {
            try {
              const rec = JSON.parse(inv.recipientSnapshot || "{}");
              if (rec.grcNo) { snapshotGrcNo = rec.grcNo; break; }
            } catch {}
          }
          if (snapshotGrcNo) break;
        }

        if (snapshotGrcNo) {
          grc = await prisma.guestRegistration.findFirst({
            where: { registrationNo: snapshotGrcNo },
            select: {
              id: true,
              registrationNo: true,
              signedAt: true,
              preAssignedRoom: true,
              arrivalDateTime: true,
              expectedDepartureDate: true,
              depositAmount: true,
              status: true,
              internalNotes: true,
            },
          });
        }
      }

      // 3. Strict fallback: match by guest + room number within arrival window (prevent stale past stays)
      if (!grc && folio.stay.primaryGuestId) {
        const roomNumbers = folio.stay.roomAssignments?.map((a) => a.room?.number).filter(Boolean) || [];
        for (const w of folio.windows) {
          try {
            const snap = JSON.parse(w.guestOrCompanySnapshot || "{}");
            if (snap.roomNumber && !roomNumbers.includes(snap.roomNumber)) {
              roomNumbers.push(snap.roomNumber);
            }
          } catch {}
        }

        const arrivalDate = folio.stay.arrivalAt || new Date();
        const minDate = new Date(arrivalDate.getTime() - 3 * 86400000);
        const maxDate = new Date(arrivalDate.getTime() + 3 * 86400000);

        if (roomNumbers.length > 0) {
          grc = await prisma.guestRegistration.findFirst({
            where: {
              guestId: folio.stay.primaryGuestId,
              createdAt: { gte: minDate, lte: maxDate },
              OR: roomNumbers.map((rm) => ({ assignedRoomNumber: { contains: rm } })),
            },
            select: {
              id: true,
              registrationNo: true,
              signedAt: true,
              preAssignedRoom: true,
              arrivalDateTime: true,
              expectedDepartureDate: true,
              depositAmount: true,
              status: true,
              internalNotes: true,
            },
            orderBy: { createdAt: "desc" },
          });
        }
      }
    }

    let enrichedStay: any = folio.stay ? { ...folio.stay, guestRegistration: grc } : null;
    if (enrichedStay && grc?.internalNotes) {
      try {
        const parsedNotes = JSON.parse(grc.internalNotes);
        const roomNo = enrichedStay.roomAssignments?.[0]?.room?.number;
        if (roomNo && parsedNotes.roomPax?.[roomNo]) {
          enrichedStay.adults = parsedNotes.roomPax[roomNo].adults ?? enrichedStay.adults;
          enrichedStay.children = parsedNotes.roomPax[roomNo].children ?? enrichedStay.children;
        }
      } catch {}
    }

    return NextResponse.json({
      ...folio,
      stay: enrichedStay,
      cycleMetrics: cycleData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
