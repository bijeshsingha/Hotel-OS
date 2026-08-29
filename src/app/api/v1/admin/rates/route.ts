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

    const roomTypes = await prisma.roomType.findMany({
      where: { propertyId: property.id },
      include: {
        rooms: { select: { id: true, number: true, wing: true } },
        rateVersions: {
          where: { active: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { code: "asc" },
    });

    const formatted = roomTypes.map((rt) => {
      let basePrice = 3200;
      let extraAdult = 500;
      let extraChild = 0;

      if (rt.rateVersions && rt.rateVersions.length > 0) {
        try {
          const pricing = JSON.parse(rt.rateVersions[0].pricingJson);
          if (pricing.basePrice !== undefined) basePrice = Number(pricing.basePrice);
          if (pricing.extraAdult !== undefined) extraAdult = Number(pricing.extraAdult);
          if (pricing.extraChild !== undefined) extraChild = Number(pricing.extraChild);
        } catch {}
      }

      return {
        id: rt.id,
        code: rt.code,
        name: rt.name,
        capacity: rt.capacity,
        bedType: rt.bedType,
        basePrice,
        extraAdult,
        extraChild,
        roomCount: rt.rooms.length,
        roomNumbers: rt.rooms.map((r) => r.number).join(", "),
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { roomTypeId, name, basePrice, extraAdult, extraChild, capacity, bedType } = body;

    if (!roomTypeId) {
      return NextResponse.json({ error: "Room Type ID is required." }, { status: 400 });
    }

    const rt = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: { property: true },
    });

    if (!rt) {
      return NextResponse.json({ error: "Room type not found." }, { status: 404 });
    }

    // 1. Update RoomType base model
    const updated = await prisma.roomType.update({
      where: { id: roomTypeId },
      data: {
        name: name || undefined,
        capacity: capacity !== undefined ? Number(capacity) : undefined,
        bedType: bedType || undefined,
      },
    });

    // 2. Update or Create active RatePlanVersion
    let ratePlan = await prisma.ratePlan.findFirst({
      where: { propertyId: rt.propertyId, code: "STANDARD_EP" },
    });

    if (!ratePlan) {
      ratePlan = await prisma.ratePlan.create({
        data: {
          organizationId: rt.organizationId,
          propertyId: rt.propertyId,
          code: "STANDARD_EP",
          name: "Standard Best Available Rate",
          mealPlan: "EP",
        },
      });
    }

    const pricingJson = JSON.stringify({
      basePrice: Number(basePrice) || 3200,
      extraAdult: Number(extraAdult) || 500,
      extraChild: Number(extraChild) || 0,
    });

    const existingVersion = await prisma.ratePlanVersion.findFirst({
      where: { ratePlanId: ratePlan.id, roomTypeId: rt.id, active: true },
    });

    if (existingVersion) {
      await prisma.ratePlanVersion.update({
        where: { id: existingVersion.id },
        data: { pricingJson },
      });
    } else {
      await prisma.ratePlanVersion.create({
        data: {
          ratePlanId: ratePlan.id,
          roomTypeId: rt.id,
          effectiveFrom: new Date().toISOString().split("T")[0],
          pricingJson,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: rt.organizationId,
        propertyId: rt.propertyId,
        actorId: "usr_admin",
        action: "ADMIN_UPDATE_ROOM_RATES",
        targetType: "ROOM_TYPE",
        targetId: rt.code,
        afterJson: JSON.stringify(body),
      },
    });

    return NextResponse.json({ success: true, roomType: updated, pricing: JSON.parse(pricingJson) });
  } catch (error: any) {
    console.error("Admin rate update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
