import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status"); // IN_HOUSE, CHECKED_OUT, DUE_IN, DUE_OUT

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const stays = await prisma.stay.findMany({
      where: {
        propertyId,
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
              include: { entries: true },
            },
            payments: true,
          },
        },
      },
      orderBy: { arrivalAt: "desc" },
    });

    return NextResponse.json(stays);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
