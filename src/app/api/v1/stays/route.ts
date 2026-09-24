import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getEffectiveStayDeparture } from "@/lib/domain/pms-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawProp =
      searchParams.get("propertyId") ||
      searchParams.get("property") ||
      searchParams.get("propertyCode") ||
      searchParams.get("code");
    const status = searchParams.get("status"); // IN_HOUSE, CHECKED_OUT, DUE_IN, DUE_OUT

    if (!rawProp) {
      return NextResponse.json([]);
    }

    let targetPropertyId = rawProp;

    // Resolve property if ID or Code is provided
    const prop = await prisma.property.findFirst({
      where: {
        OR: [
          { id: rawProp },
          { code: { equals: rawProp } },
          { displayName: { contains: rawProp } },
        ],
      },
    });
    if (prop) {
      targetPropertyId = prop.id;
    }

    if (!targetPropertyId) {
      return NextResponse.json([]);
    }

    const stays = await prisma.stay.findMany({
      where: {
        propertyId: targetPropertyId,
        ...(status ? { status } : {}),
      },
      include: {
        primaryGuest: true,
        roomAssignments: {
          include: {
            room: {
              include: { roomType: true },
            },
          },
          orderBy: { startsAt: "desc" },
        },
        folio: {
          include: {
            windows: {
              include: {
                entries: true,
                invoices: {
                  include: { lines: true },
                },
              },
            },
            payments: true,
          },
        },
      },
      orderBy: { arrivalAt: "desc" },
    });

    const enrichedStays = await Promise.all(
      stays.map(async (stay) => {
        let effectiveDepartureAt = stay.expectedDepartureAt;
        let isExtendedDeparture = false;
        let extensionNights = 0;
        let originalExpectedDepartureAt = stay.expectedDepartureAt;

        if (stay.status === "IN_HOUSE") {
          const dynamicDep = getEffectiveStayDeparture(stay);
          if (
            dynamicDep.isExtended &&
            dynamicDep.effectiveDepartureAt.getTime() > new Date(stay.expectedDepartureAt).getTime()
          ) {
            effectiveDepartureAt = dynamicDep.effectiveDepartureAt;
            isExtendedDeparture = true;
            extensionNights = dynamicDep.extensionNights;
            originalExpectedDepartureAt = dynamicDep.originalDepartureAt;

            // Auto-heal DB in background
            prisma.stay
              .update({
                where: { id: stay.id },
                data: { expectedDepartureAt: dynamicDep.effectiveDepartureAt },
              })
              .catch((err) => console.error("Auto-heal stay departure error:", err));

            prisma.guestRegistration
              .updateMany({
                where: { stayId: stay.id },
                data: {
                  expectedDepartureDate: dynamicDep.effectiveDepartureAt.toISOString().split("T")[0],
                },
              })
              .catch(() => {});
          }
        }

        // 1. Direct stayId match
        let grc: any = await prisma.guestRegistration.findFirst({
          where: { stayId: stay.id },
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

        // 2. Check snapshot on folio window or invoice
        if (!grc && stay.folio?.windows) {
          let snapshotGrcNo: string | null = null;
          for (const w of stay.folio.windows) {
            try {
              const snap = JSON.parse(w.guestOrCompanySnapshot || "{}");
              if (snap.grcNo) { snapshotGrcNo = snap.grcNo; break; }
            } catch {}
            for (const inv of (w as any).invoices || []) {
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

        // 3. Strict fallback: match by guest + room number within arrival window (+/- 3 days)
        if (!grc && stay.primaryGuestId) {
          const roomNumbers = stay.roomAssignments?.map((a: any) => a.room?.number).filter(Boolean) || [];
          const arrivalDate = stay.arrivalAt || new Date();
          const minDate = new Date(arrivalDate.getTime() - 3 * 86400000);
          const maxDate = new Date(arrivalDate.getTime() + 3 * 86400000);

          if (roomNumbers.length > 0) {
            grc = await prisma.guestRegistration.findFirst({
              where: {
                guestId: stay.primaryGuestId,
                createdAt: { gte: minDate, lte: maxDate },
                OR: roomNumbers.map((rm: string) => ({ assignedRoomNumber: { contains: rm } })),
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

        // Room-specific pax enrichment
        let roomAdults = stay.adults;
        let roomChildren = stay.children;
        if (grc?.internalNotes) {
          try {
            const parsedNotes = JSON.parse(grc.internalNotes);
            const primaryRoomNo = stay.roomAssignments?.[0]?.room?.number;
            if (primaryRoomNo && parsedNotes.roomPax?.[primaryRoomNo]) {
              roomAdults = parsedNotes.roomPax[primaryRoomNo].adults ?? roomAdults;
              roomChildren = parsedNotes.roomPax[primaryRoomNo].children ?? roomChildren;
            }
          } catch {}
        }

        return {
          ...stay,
          adults: roomAdults,
          children: roomChildren,
          expectedDepartureAt: effectiveDepartureAt,
          isExtendedDeparture,
          extensionNights,
          originalExpectedDepartureAt,
          guestRegistration: grc || null,
        };
      })
    );

    return NextResponse.json(enrichedStays);
  } catch (error: any) {
    console.error("Error in /api/v1/stays:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
