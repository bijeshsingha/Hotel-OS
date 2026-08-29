import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    const property = propertyId
      ? await prisma.property.findUnique({
          where: { id: propertyId },
          include: { organization: true },
        })
      : await prisma.property.findFirst({
          include: { organization: true },
        });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      displayName,
      legalName,
      code,
      gstin,
      stateCode,
      address,
      phone,
      email,
      checkinTime,
      checkoutTime,
      auditCutoff,
      businessDate,
      currency,
      orgLegalName,
      orgPan,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Property ID is required." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prop = await tx.property.update({
        where: { id },
        data: {
          displayName: displayName || undefined,
          legalName: legalName || undefined,
          code: code || undefined,
          gstin: gstin !== undefined ? (gstin || null) : undefined,
          stateCode: stateCode || undefined,
          address: address !== undefined ? (address || null) : undefined,
          phone: phone !== undefined ? (phone || null) : undefined,
          email: email !== undefined ? (email || null) : undefined,
          checkinTime: checkinTime || undefined,
          checkoutTime: checkoutTime || undefined,
          auditCutoff: auditCutoff || undefined,
          businessDate: businessDate || undefined,
          currency: currency || undefined,
        },
        include: { organization: true },
      });

      if (orgLegalName || orgPan) {
        await tx.organization.update({
          where: { id: prop.organizationId },
          data: {
            legalName: orgLegalName || undefined,
            displayName: orgLegalName || undefined,
            pan: orgPan !== undefined ? (orgPan || null) : undefined,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          actorId: "usr_admin",
          action: "ADMIN_UPDATE_HOTEL_DETAILS",
          targetType: "PROPERTY",
          targetId: prop.id,
          afterJson: JSON.stringify(body),
        },
      });

      return prop;
    });

    return NextResponse.json({ success: true, property: updated });
  } catch (error: any) {
    console.error("Admin hotel update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
