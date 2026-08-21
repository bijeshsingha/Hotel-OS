import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getNextDocumentNumber } from "@/lib/sequence/generator";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const issues = await prisma.maintenanceIssue.findMany({
      where: { propertyId },
      include: {
        room: { include: { roomType: true } },
        events: { orderBy: { happenedAt: "desc" } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(issues);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId, roomId, locationText, assetText, category, priority, description, blockRoom, actorId } = body;

    const property = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
    });

    const seq = await getNextDocumentNumber(propertyId, "MAINTENANCE");

    const issue = await prisma.maintenanceIssue.create({
      data: {
        organizationId: property.organizationId,
        propertyId,
        issueNo: seq.formattedNumber,
        roomId,
        locationText,
        assetText,
        category: category || "PLUMBING",
        priority: priority || "NORMAL",
        description,
        status: "REPORTED",
        reporterId: actorId,
      },
    });

    // If blockRoom is requested and roomId is present -> create RoomBlock and set room state to OUT_OF_ORDER
    if (blockRoom && roomId) {
      await prisma.roomBlock.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          roomId,
          type: "OUT_OF_ORDER",
          startsAt: new Date(),
          reason: description,
          maintenanceIssueId: issue.id,
          status: "ACTIVE",
        },
      });

      await prisma.roomState.upsert({
        where: { roomId },
        create: {
          organizationId: property.organizationId,
          propertyId,
          roomId,
          occupancyStatus: "VACANT",
          housekeepingStatus: "DIRTY",
          sellabilityStatus: "OUT_OF_ORDER",
        },
        update: {
          sellabilityStatus: "OUT_OF_ORDER",
          lastChangedAt: new Date(),
        },
      });
    }

    return NextResponse.json(issue);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
