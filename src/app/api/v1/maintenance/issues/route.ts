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
        room: { include: { roomType: true, roomState: true } },
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
    const {
      propertyId,
      roomId: inputRoomId,
      locationText,
      assetText,
      category,
      priority,
      description,
      blockRoom,
      actorId,
    } = body;

    const property = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
    });

    // Auto-resolve roomId if not provided but locationText mentions room number (e.g. "Room 506", "506")
    let targetRoomId = inputRoomId;
    if (!targetRoomId && locationText) {
      const match = locationText.match(/(?:room\s*|#)?(\d{3,4})/i);
      if (match && match[1]) {
        const found = await prisma.room.findFirst({
          where: { propertyId, number: match[1] },
        });
        if (found) targetRoomId = found.id;
      }
    }

    const seq = await getNextDocumentNumber(propertyId, "MAINTENANCE");

    const issue = await prisma.maintenanceIssue.create({
      data: {
        organizationId: property.organizationId,
        propertyId,
        issueNo: seq.formattedNumber,
        roomId: targetRoomId || null,
        locationText: locationText || (targetRoomId ? undefined : "Public Area"),
        assetText,
        category: category || "PLUMBING",
        priority: priority || "NORMAL",
        description,
        status: "REPORTED",
        reporterId: actorId,
      },
      include: {
        room: { include: { roomType: true, roomState: true } },
      },
    });

    // If blockRoom is explicitly requested OR priority is URGENT, create a room block and set OUT_OF_ORDER
    const shouldBlock = Boolean(blockRoom || priority === "URGENT");
    if (shouldBlock && targetRoomId) {
      await prisma.roomBlock.create({
        data: {
          organizationId: property.organizationId,
          propertyId,
          roomId: targetRoomId,
          type: "OUT_OF_ORDER",
          startsAt: new Date(),
          reason: `[${seq.formattedNumber}] ${description}`,
          maintenanceIssueId: issue.id,
          status: "ACTIVE",
        },
      });

      await prisma.roomState.upsert({
        where: { roomId: targetRoomId },
        create: {
          organizationId: property.organizationId,
          propertyId,
          roomId: targetRoomId,
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { issueId, status, resolution, blockRoom, actorId } = body;

    if (!issueId) {
      return NextResponse.json({ error: "issueId is required" }, { status: 400 });
    }

    const issue = await prisma.maintenanceIssue.findUniqueOrThrow({
      where: { id: issueId },
      include: { room: true },
    });

    const updatedIssue = await prisma.maintenanceIssue.update({
      where: { id: issueId },
      data: {
        status: status || issue.status,
        resolution: resolution !== undefined ? resolution : issue.resolution,
      },
      include: {
        room: { include: { roomType: true, roomState: true } },
      },
    });

    // Record Event
    if (status) {
      await prisma.maintenanceEvent.create({
        data: {
          issueId,
          type: status,
          note: resolution || `Status changed to ${status}`,
          actorId,
        },
      });
    }

    // If marked RESOLVED or CLOSED, resolve room blocks & unblock room
    if (["RESOLVED", "VERIFIED", "CLOSED"].includes(status)) {
      await prisma.roomBlock.updateMany({
        where: { maintenanceIssueId: issueId },
        data: {
          status: "RESOLVED",
          endsAt: new Date(),
        },
      });

      if (issue.roomId) {
        // Check if there are other active blocks for this room
        const remainingActiveBlocks = await prisma.roomBlock.count({
          where: { roomId: issue.roomId, status: "ACTIVE" },
        });

        const remainingActiveIssues = await prisma.maintenanceIssue.count({
          where: {
            roomId: issue.roomId,
            id: { not: issueId },
            status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED", "CANCELLED"] },
          },
        });

        if (remainingActiveBlocks === 0 && remainingActiveIssues === 0) {
          await prisma.roomState.update({
            where: { roomId: issue.roomId },
            data: {
              sellabilityStatus: "SELLABLE",
              lastChangedAt: new Date(),
            },
          });
        }
      }
    } else if (blockRoom !== undefined && issue.roomId) {
      if (blockRoom) {
        await prisma.roomBlock.create({
          data: {
            organizationId: issue.organizationId,
            propertyId: issue.propertyId,
            roomId: issue.roomId,
            type: "OUT_OF_ORDER",
            startsAt: new Date(),
            reason: `[${issue.issueNo}] ${issue.description}`,
            maintenanceIssueId: issue.id,
            status: "ACTIVE",
          },
        });
        await prisma.roomState.update({
          where: { roomId: issue.roomId },
          data: {
            sellabilityStatus: "OUT_OF_ORDER",
            lastChangedAt: new Date(),
          },
        });
      } else {
        await prisma.roomBlock.updateMany({
          where: { maintenanceIssueId: issueId },
          data: { status: "RESOLVED", endsAt: new Date() },
        });
        await prisma.roomState.update({
          where: { roomId: issue.roomId },
          data: {
            sellabilityStatus: "SELLABLE",
            lastChangedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json(updatedIssue);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
