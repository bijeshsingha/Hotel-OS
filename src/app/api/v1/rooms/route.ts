import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const rooms = await prisma.room.findMany({
      where: { propertyId, active: true },
      include: {
        roomType: true,
        roomState: true,
        blocks: {
          where: { status: "ACTIVE" },
        },
        assignments: {
          where: { endsAt: null },
          include: {
            stay: {
              include: {
                primaryGuest: true,
                folio: true,
              },
            },
          },
        },
        hkTasks: {
          where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
        },
        maintenanceIssues: {
          where: { status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED", "CANCELLED"] } },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        },
      },
      orderBy: [{ floor: "asc" }, { number: "asc" }],
    });

    // Dynamically synchronize roomState with active IN_HOUSE stays
    const sanitizedRooms = rooms.map((room) => {
      const activeInHouseAssignment = room.assignments.find(
        (a: any) => !a.endsAt && a.stay?.status === "IN_HOUSE"
      );
      const isReallyOccupied = Boolean(activeInHouseAssignment);
      const trueOcc = isReallyOccupied ? "OCCUPIED" : "VACANT";

      // If database record is out of sync, trigger background self-healing update
      if (room.roomState && room.roomState.occupancyStatus !== trueOcc) {
        prisma.roomState.update({
          where: { roomId: room.id },
          data: {
            occupancyStatus: trueOcc,
            lastChangedAt: new Date(),
          },
        }).catch((err) => console.error("Auto-heal roomState error:", err));
      }

      const activeAssignments = room.assignments.filter((a: any) => a.stay?.status === "IN_HOUSE");

      return {
        ...room,
        assignments: activeAssignments,
        roomState: room.roomState
          ? { ...room.roomState, occupancyStatus: trueOcc }
          : {
              id: `rs_${room.id}`,
              organizationId: room.organizationId,
              propertyId: room.propertyId,
              roomId: room.id,
              occupancyStatus: trueOcc,
              housekeepingStatus: "CLEAN",
              sellabilityStatus: "SELLABLE",
            },
      };
    });

    return NextResponse.json(sanitizedRooms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
