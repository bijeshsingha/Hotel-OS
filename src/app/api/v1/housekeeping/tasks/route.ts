import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const tasks = await prisma.housekeepingTask.findMany({
      where: {
        propertyId,
        ...(status ? { status } : {}),
      },
      include: {
        room: { include: { roomType: true, roomState: true } },
        events: { orderBy: { happenedAt: "desc" } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(tasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId, roomId, type, priority, assigneeId, notes } = body;

    const room = await prisma.room.findUniqueOrThrow({
      where: { id: roomId },
    });

    const task = await prisma.housekeepingTask.create({
      data: {
        organizationId: room.organizationId,
        propertyId,
        roomId,
        type: type || "CHECKOUT_CLEAN",
        priority: priority || "NORMAL",
        assigneeId,
        notes,
        status: "OPEN",
      },
    });

    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { taskId, status, actorId, notes, checklistResult } = body;

    const task = await prisma.housekeepingTask.findUniqueOrThrow({
      where: { id: taskId },
      include: { room: true },
    });

    const updatedTask = await prisma.housekeepingTask.update({
      where: { id: taskId },
      data: {
        status,
        notes: notes ? `${task.notes || ""}\n${notes}` : task.notes,
        checklistResultJson: checklistResult ? JSON.stringify(checklistResult) : task.checklistResultJson,
      },
    });

    // Record HK Task event
    await prisma.hKTaskEvent.create({
      data: {
        taskId,
        eventType: status,
        notes,
        actorId,
      },
    });

    // If task marked COMPLETED -> set room housekeeping to CLEAN
    if (status === "COMPLETED") {
      await prisma.roomState.upsert({
        where: { roomId: task.roomId },
        create: {
          organizationId: task.organizationId,
          propertyId: task.propertyId,
          roomId: task.roomId,
          occupancyStatus: "VACANT",
          housekeepingStatus: "CLEAN",
          sellabilityStatus: "SELLABLE",
        },
        update: {
          housekeepingStatus: "CLEAN",
          lastChangedAt: new Date(),
        },
      });
    } else if (status === "INSPECTED_PASSED") {
      // Supervisor passed inspection -> set room to INSPECTED
      await prisma.roomState.upsert({
        where: { roomId: task.roomId },
        create: {
          organizationId: task.organizationId,
          propertyId: task.propertyId,
          roomId: task.roomId,
          occupancyStatus: "VACANT",
          housekeepingStatus: "INSPECTED",
          sellabilityStatus: "SELLABLE",
        },
        update: {
          housekeepingStatus: "INSPECTED",
          lastChangedAt: new Date(),
        },
      });
    } else if (status === "FAILED_INSPECTION") {
      await prisma.roomState.upsert({
        where: { roomId: task.roomId },
        create: {
          organizationId: task.organizationId,
          propertyId: task.propertyId,
          roomId: task.roomId,
          occupancyStatus: "VACANT",
          housekeepingStatus: "DIRTY",
          sellabilityStatus: "SELLABLE",
        },
        update: {
          housekeepingStatus: "DIRTY",
          lastChangedAt: new Date(),
        },
      });
    }

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
