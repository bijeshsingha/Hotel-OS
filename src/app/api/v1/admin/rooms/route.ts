import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    const property = propertyId
      ? await prisma.property.findUnique({ where: { id: propertyId } })
      : await prisma.property.findFirst();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const rooms = await prisma.room.findMany({
      where: { propertyId: property.id },
      include: {
        roomType: true,
        roomState: true,
        assignments: {
          where: { endsAt: null },
          include: { stay: { include: { primaryGuest: true } } },
        },
      },
      orderBy: { number: "asc" },
    });

    const roomTypes = await prisma.roomType.findMany({
      where: { propertyId: property.id },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ rooms, roomTypes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      number,
      floor,
      wing,
      name,
      roomTypeId,
      occupancyStatus,
      housekeepingStatus,
      sellabilityStatus,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Room ID is required." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rm = await tx.room.update({
        where: { id },
        data: {
          number: number || undefined,
          floor: floor !== undefined ? Number(floor) : undefined,
          wing: wing !== undefined ? wing : undefined,
          name: name !== undefined ? name : undefined,
          roomTypeId: roomTypeId || undefined,
        },
        include: { roomType: true },
      });

      if (occupancyStatus || housekeepingStatus || sellabilityStatus) {
        await tx.roomState.upsert({
          where: { roomId: id },
          create: {
            organizationId: rm.organizationId,
            propertyId: rm.propertyId,
            roomId: id,
            occupancyStatus: occupancyStatus || "VACANT",
            housekeepingStatus: housekeepingStatus || "CLEAN",
            sellabilityStatus: sellabilityStatus || "SELLABLE",
          },
          update: {
            occupancyStatus: occupancyStatus || undefined,
            housekeepingStatus: housekeepingStatus || undefined,
            sellabilityStatus: sellabilityStatus || undefined,
            lastChangedAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: rm.organizationId,
          propertyId: rm.propertyId,
          actorId: "usr_admin",
          action: "ADMIN_UPDATE_ROOM",
          targetType: "ROOM",
          targetId: rm.number,
          afterJson: JSON.stringify(body),
        },
      });

      return rm;
    });

    return NextResponse.json({ success: true, room: updated });
  } catch (error: any) {
    console.error("Admin room update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId, number, floor, wing, roomTypeId, name } = body;

    if (!number || !roomTypeId) {
      return NextResponse.json({ error: "Room number and Room Type are required." }, { status: 400 });
    }

    const prop = propertyId
      ? await prisma.property.findUnique({ where: { id: propertyId } })
      : await prisma.property.findFirst();

    if (!prop) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const newRoom = await prisma.$transaction(async (tx) => {
      const rm = await tx.room.create({
        data: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          number: String(number).trim(),
          floor: Number(floor) || 1,
          wing: wing || "DELUXE",
          name: name || `Room ${number}`,
          roomTypeId,
        },
      });

      await tx.roomState.create({
        data: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          roomId: rm.id,
          occupancyStatus: "VACANT",
          housekeepingStatus: "CLEAN",
          sellabilityStatus: "SELLABLE",
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          actorId: "usr_admin",
          action: "ADMIN_CREATE_ROOM",
          targetType: "ROOM",
          targetId: rm.number,
          afterJson: JSON.stringify(body),
        },
      });

      return rm;
    });

    return NextResponse.json({ success: true, room: newRoom });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
