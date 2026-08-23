import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawProp =
      searchParams.get("propertyId") ||
      searchParams.get("property") ||
      searchParams.get("propertyCode") ||
      searchParams.get("code");
    const stationId = searchParams.get("stationId");

    let targetPropertyId = rawProp;

    if (rawProp) {
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
    } else {
      const defaultProp = await prisma.property.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      });
      targetPropertyId = defaultProp?.id || null;
    }

    if (!targetPropertyId) {
      return NextResponse.json([]);
    }

    const kots = await prisma.kOT.findMany({
      where: {
        propertyId: targetPropertyId,
        ...(stationId ? { stationId } : {}),
        status: { in: ["QUEUED", "PREPARING", "READY"] },
      },
      include: {
        order: {
          include: {
            table: true,
            stay: {
              include: {
                primaryGuest: true,
                roomAssignments: {
                  where: { endsAt: null },
                  include: { room: true },
                },
              },
            },
          },
        },
        station: true,
        lines: {
          include: {
            orderItem: true,
          },
        },
      },
      orderBy: { firedAt: "asc" },
    });

    return NextResponse.json(kots);
  } catch (error: any) {
    console.error("Error in /api/v1/kots:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { kotId, status } = body; // QUEUED, PREPARING, READY, COMPLETED

    const updateData: any = { status };
    if (status === "PREPARING") updateData.acceptedAt = new Date();
    if (status === "READY") updateData.readyAt = new Date();

    const kot = await prisma.kOT.update({
      where: { id: kotId },
      data: updateData,
    });

    return NextResponse.json(kot);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
