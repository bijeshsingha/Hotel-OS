import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stayId, roomNumber, amount, notes } = body;

    const numAmount = Math.round((Number(amount) || 0) * 100) / 100;
    if (!stayId || numAmount <= 0) {
      return NextResponse.json(
        { error: "Stay ID and a valid positive amount are required." },
        { status: 400 }
      );
    }

    // 1. Fetch target stay with folio and registration
    const targetStay = await prisma.stay.findUnique({
      where: { id: stayId },
      include: {
        folio: {
          include: {
            windows: true,
            payments: true,
          },
        },
        roomAssignments: { include: { room: true } },
        primaryGuest: true,
        property: true,
      },
    });

    if (!targetStay || !targetStay.folio) {
      return NextResponse.json(
        { error: "Target stay or folio not found." },
        { status: 404 }
      );
    }

    const targetRoomNo =
      roomNumber ||
      targetStay.roomAssignments?.find((ra) => !ra.endsAt)?.room?.number ||
      targetStay.roomAssignments?.[0]?.room?.number ||
      "Unassigned";

    // 2. Discover related stays in the same group or registration
    const relatedStays = await prisma.stay.findMany({
      where: {
        propertyId: targetStay.propertyId,
        OR: [
          { id: targetStay.id },
          { primaryGuestId: targetStay.primaryGuestId },
        ],
      },
      include: {
        folio: {
          include: {
            windows: { include: { entries: true } },
            payments: true,
          },
        },
        roomAssignments: { include: { room: true } },
      },
    });

    // Collect all group room numbers
    const allGroupRooms = Array.from(
      new Set(
        relatedStays
          .flatMap((s) => s.roomAssignments || [])
          .map((ra) => ra.room?.number)
          .filter(Boolean)
      )
    ) as string[];

    // Collect all payments & entries across related stays
    const allPayments = Array.from(
      new Map(
        relatedStays
          .flatMap((s) => s.folio?.payments || [])
          .map((p) => [p.id, p])
      ).values()
    );

    const allEntries = Array.from(
      new Map(
        relatedStays
          .flatMap((s) => s.folio?.windows?.flatMap((w) => w.entries) || [])
          .map((e) => [e.id, e])
      ).values()
    );

    // Calculate unallocated advance pool across the group
    const unallocatedPayments = allPayments.filter((p) => {
      if (p.status !== "SUCCEEDED") return false;
      if (p.method === "ADVANCE_ALLOCATION") return false;
      if (p.reference?.includes("Settlement for Room")) return false;

      const text = `${p.reference || ""} ${p.payerSnapshot || ""} ${(p as any).notes || ""}`;
      const isGroupPool = text.includes("isGroupAdvancePool") || text.includes("GROUP_ADVANCE_POOL");
      const isSpecific = allGroupRooms.some((r) =>
        new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${r}\\b`, "i").test(text)
      );
      return isGroupPool || !isSpecific;
    });

    const totalReceived = unallocatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const consumed = allEntries
      .filter((e) => e.chargeCode === "GROUP_ADVANCE_CONSUMPTION")
      .reduce((sum, e) => sum + e.totalAmount, 0);

    const available = Math.max(0, Math.round((totalReceived - consumed) * 100) / 100);

    if (numAmount > available) {
      return NextResponse.json(
        {
          error: `Cannot allocate ₹${numAmount.toFixed(2)}. Only ₹${available.toFixed(2)} is available in the group advance deposit pool.`,
        },
        { status: 400 }
      );
    }

    // 3. Find source folio that holds unallocated advance
    let sourceFolioId = targetStay.folio.id;
    for (const p of unallocatedPayments) {
      if (p.folioId) {
        sourceFolioId = p.folioId;
        break;
      }
    }

    const sourceFolio = await prisma.folio.findUnique({
      where: { id: sourceFolioId },
      include: { windows: true },
    });

    const sourceWindowId = sourceFolio?.windows?.[0]?.id || targetStay.folio.windows?.[0]?.id;

    if (!sourceWindowId) {
      return NextResponse.json(
        { error: "No active folio window found to record group advance consumption." },
        { status: 400 }
      );
    }

    // 4. Execute atomic allocation transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment on target room's folio
      const payment = await tx.payment.create({
        data: {
          organizationId: targetStay.organizationId,
          propertyId: targetStay.propertyId,
          receiptNo: `REC-ADV-${Date.now().toString().slice(-6)}`,
          folioId: targetStay.folio!.id,
          amount: numAmount,
          method: "ADVANCE_ALLOCATION",
          reference: `Allocated from Group Advance Pool (Room ${targetRoomNo})`,
          payerSnapshot: JSON.stringify({
            name: targetStay.primaryGuest?.name || "Group Guest",
            roomNumber: targetRoomNo,
            targetStayId: targetStay.id,
            sourceFolioId,
            notes: notes || `Group advance applied to Room ${targetRoomNo}`,
          }),
          status: "SUCCEEDED",
        },
      });

      // Create debit consumption entry on source group folio
      const entry = await tx.folioEntry.create({
        data: {
          organizationId: targetStay.organizationId,
          propertyId: targetStay.propertyId,
          folioId: sourceFolioId,
          folioWindowId: sourceWindowId,
          serviceDate: new Date().toISOString().split("T")[0],
          type: "CHARGE",
          chargeCode: "GROUP_ADVANCE_CONSUMPTION",
          description: `Group Advance Applied to Room ${targetRoomNo}`,
          qty: 1,
          unitAmount: numAmount,
          taxableAmount: numAmount,
          taxComponentsJson: JSON.stringify({ cgst: 0, sgst: 0, igst: 0 }),
          totalAmount: numAmount,
          sourceType: "PMS_ADVANCE_ALLOCATION",
          status: "POSTED",
        },
      });

      return { payment, entry };
    });

    return NextResponse.json({
      success: true,
      allocatedAmount: numAmount,
      targetRoomNumber: targetRoomNo,
      remainingPool: Math.max(0, Math.round((available - numAmount) * 100) / 100),
      payment: result.payment,
    });
  } catch (error: any) {
    console.error("Error allocating group advance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to allocate group advance" },
      { status: 500 }
    );
  }
}
