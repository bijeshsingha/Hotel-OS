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
      },
      orderBy: [{ floor: "asc" }, { number: "asc" }],
    });

    return NextResponse.json(rooms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
