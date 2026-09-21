import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { organization: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Fetch active GRC sequence
    const grcSeq = await prisma.documentSequence.findFirst({
      where: { propertyId, documentType: "GRC" },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = fyStart + 1;
    const fyShort = `${String(fyStart).slice(2)}${String(fyEnd).slice(2)}`;
    const defaultPrefix = `GRC-${fyShort}-`;

    const nextVal = grcSeq ? grcSeq.nextValue : 1;
    const prefix = grcSeq?.prefix || defaultPrefix;
    const padding = grcSeq?.padding || 4;
    const formattedPreview = `${prefix}${String(nextVal).padStart(padding, "0")}`;

    let parsedOwners: string[] = [];
    if ((property as any).ownersJson) {
      try {
        parsedOwners = JSON.parse((property as any).ownersJson);
      } catch (e) {
        parsedOwners = [];
      }
    }

    return NextResponse.json({
      ...property,
      grcSequence: {
        nextValue: nextVal,
        prefix,
        padding,
        formattedPreview,
      },
      owners: parsedOwners,
    });
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
      startingGrcNumber,
      grcPrefix,
      owners,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Property ID is required." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ownersJsonValue = owners !== undefined
        ? (Array.isArray(owners) ? JSON.stringify(owners.filter(Boolean)) : String(owners))
        : undefined;

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
          ...(ownersJsonValue !== undefined ? { ownersJson: ownersJsonValue } : {}),
        },
        include: { organization: true },
      });

      // Update or Upsert GRC sequence if startingGrcNumber is provided
      if (startingGrcNumber !== undefined && startingGrcNumber !== null && String(startingGrcNumber).trim() !== "") {
        const nextVal = parseInt(String(startingGrcNumber), 10);
        if (!isNaN(nextVal) && nextVal > 0) {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth() + 1;
          const fyStart = month >= 4 ? year : year - 1;
          const fyEnd = fyStart + 1;
          const fyShort = `${String(fyStart).slice(2)}${String(fyEnd).slice(2)}`;
          const financialYear = `${fyStart}-${fyEnd}`;
          const prefixToUse = grcPrefix || `GRC-${fyShort}-`;

          await tx.documentSequence.upsert({
            where: {
              propertyId_documentType_scopeKey_financialYear: {
                propertyId: id,
                documentType: "GRC",
                scopeKey: "PROPERTY",
                financialYear,
              },
            },
            create: {
              organizationId: prop.organizationId,
              propertyId: id,
              documentType: "GRC",
              scopeKey: "PROPERTY",
              financialYear,
              prefix: prefixToUse,
              nextValue: nextVal,
              padding: 4,
            },
            update: {
              nextValue: nextVal,
              prefix: grcPrefix || undefined,
            },
          });
        }
      }

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
