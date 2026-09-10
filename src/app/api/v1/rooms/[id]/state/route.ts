import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAuditEvent } from "@/lib/domain/audit-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const body = await request.json();
    const { housekeepingStatus, sellabilityStatus, occupancyStatus, actorId, reason } = body;

    const currentRoom = await prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      include: { roomState: true },
    });

    const updatedState = await prisma.roomState.upsert({
      where: { roomId },
      create: {
        organizationId: currentRoom.organizationId,
        propertyId: currentRoom.propertyId,
        roomId,
        housekeepingStatus: housekeepingStatus || "CLEAN",
        sellabilityStatus: sellabilityStatus || "SELLABLE",
        occupancyStatus: occupancyStatus || "VACANT",
        lastChangedAt: new Date(),
      },
      update: {
        ...(housekeepingStatus ? { housekeepingStatus } : {}),
        ...(sellabilityStatus ? { sellabilityStatus } : {}),
        ...(occupancyStatus ? { occupancyStatus } : {}),
        lastChangedAt: new Date(),
      },
    });

    // Write state change history
    await prisma.roomStateHistory.create({
      data: {
        organizationId: currentRoom.organizationId,
        propertyId: currentRoom.propertyId,
        roomId,
        fromOccupancy: currentRoom.roomState?.occupancyStatus || "VACANT",
        toOccupancy: updatedState.occupancyStatus,
        fromHousekeeping: currentRoom.roomState?.housekeepingStatus || "CLEAN",
        toHousekeeping: updatedState.housekeepingStatus,
        fromSellability: currentRoom.roomState?.sellabilityStatus || "SELLABLE",
        toSellability: updatedState.sellabilityStatus,
        reason: reason || "Manual state update",
        actorId,
      },
    });

    // Audit log for room state update
    await logAuditEvent({
      organizationId: currentRoom.organizationId,
      propertyId: currentRoom.propertyId,
      actorId,
      actorName: "Housekeeping / Front Desk",
      action: "ROOM_STATE_CHANGE",
      targetType: "ROOM",
      targetId: roomId,
      reason: reason || `Room ${currentRoom.number} state updated`,
      beforeJson: {
        roomNumber: currentRoom.number,
        occupancy: currentRoom.roomState?.occupancyStatus || "VACANT",
        housekeeping: currentRoom.roomState?.housekeepingStatus || "CLEAN",
        sellability: currentRoom.roomState?.sellabilityStatus || "SELLABLE",
      },
      afterJson: {
        roomNumber: currentRoom.number,
        occupancy: updatedState.occupancyStatus,
        housekeeping: updatedState.housekeepingStatus,
        sellability: updatedState.sellabilityStatus,
      },
    });

    return NextResponse.json({ success: true, roomState: updatedState });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
