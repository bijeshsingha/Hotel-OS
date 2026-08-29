import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  archiveGrcSnapshot,
  syncGrcEditsEverywhere,
  getArchivedGrcBackups,
} from "@/lib/domain/grc-archive-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const query = searchParams.get("query")?.trim().toLowerCase() || "";
    const archivedOnly = searchParams.get("archived") === "true";
    const limit = Number(searchParams.get("limit")) || 100;

    // If requested archived backups
    if (archivedOnly) {
      const archives = getArchivedGrcBackups();
      const filtered = query
        ? archives.filter(
            (a) =>
              a.fullName?.toLowerCase().includes(query) ||
              a.mobilePhone?.includes(query) ||
              a.preAssignedRoom?.includes(query)
          )
        : archives;
      return NextResponse.json(filtered);
    }

    const where: any = {};
    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (query) {
      where.OR = [
        { registrationNo: { contains: query } },
        { fullName: { contains: query } },
        { mobilePhone: { contains: query } },
        { preAssignedRoom: { contains: query } },
        { city: { contains: query } },
        { idDocumentNumber: { contains: query } },
      ];
    }

    const records = await prisma.guestRegistration.findMany({
      where,
      orderBy: { signedAt: "desc" },
      take: limit,
    });

    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      fullName,
      age,
      gender,
      nationality,
      fatherSpouseName,
      mobilePhone,
      alternatePhone,
      email,
      streetAddress,
      city,
      state,
      pinZipCode,
      country,
      arrivedFrom,
      goingTo,
      purposeOfVisit,
      referralChannel,
      driverName,
      vehicleNumber,
      idDocumentType,
      idDocumentNumber,
      arrivalDateTime,
      expectedDepartureDate,
      preAssignedRoom,
      status,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "GRC ID is required." }, { status: 400 });
    }

    const updated = await prisma.guestRegistration.update({
      where: { id },
      data: {
        fullName: fullName || undefined,
        age: age !== undefined ? Number(age) : undefined,
        gender: gender || undefined,
        nationality: nationality || undefined,
        fatherSpouseName: fatherSpouseName !== undefined ? fatherSpouseName : undefined,
        mobilePhone: mobilePhone || undefined,
        alternatePhone: alternatePhone !== undefined ? alternatePhone : undefined,
        email: email !== undefined ? email : undefined,
        streetAddress: streetAddress !== undefined ? streetAddress : undefined,
        city: city !== undefined ? city : undefined,
        state: state !== undefined ? state : undefined,
        pinZipCode: pinZipCode !== undefined ? pinZipCode : undefined,
        country: country !== undefined ? country : undefined,
        arrivedFrom: arrivedFrom !== undefined ? arrivedFrom : undefined,
        goingTo: goingTo !== undefined ? goingTo : undefined,
        purposeOfVisit: purposeOfVisit || undefined,
        referralChannel: referralChannel || undefined,
        driverName: driverName !== undefined ? driverName : undefined,
        vehicleNumber: vehicleNumber !== undefined ? vehicleNumber : undefined,
        idDocumentType: idDocumentType || undefined,
        idDocumentNumber: idDocumentNumber !== undefined ? idDocumentNumber : undefined,
        arrivalDateTime: arrivalDateTime || undefined,
        expectedDepartureDate: expectedDepartureDate !== undefined ? expectedDepartureDate : undefined,
        preAssignedRoom: preAssignedRoom !== undefined ? preAssignedRoom : undefined,
        status: status || undefined,
      },
    });

    // Synchronize edits across Guest CRM, Stays, and Folios, and backup snapshot
    await syncGrcEditsEverywhere(updated);

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: updated.organizationId,
        propertyId: updated.propertyId,
        actorId: "usr_admin",
        action: "ADMIN_UPDATE_GRC_SYNCHRONIZED",
        targetType: "GRC_RECORD",
        targetId: updated.registrationNo,
        afterJson: JSON.stringify(body),
      },
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (error: any) {
    console.error("Admin GRC update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "GRC ID is required." }, { status: 400 });
    }

    const reg = await prisma.guestRegistration.findUnique({ where: { id } });
    if (!reg) {
      return NextResponse.json({ error: "GRC not found" }, { status: 404 });
    }

    // 1. ALWAYS PERMANENTLY ARCHIVE BACKUP COPY BEFORE REMOVING
    archiveGrcSnapshot(reg, "DELETED", "usr_admin");

    // 2. Find any active stays associated with this guest registration and cleanly release rooms
    const linkedStays = await prisma.stay.findMany({
      where: {
        propertyId: reg.propertyId,
        OR: [
          { primaryGuest: { phone: reg.mobilePhone } },
          { primaryGuest: { name: reg.fullName } },
          ...(reg.preAssignedRoom ? [{ roomAssignments: { some: { room: { number: reg.preAssignedRoom } } } }] : []),
        ],
      },
      include: {
        roomAssignments: { include: { room: true } },
        folio: {
          include: {
            windows: { include: { entries: true, invoices: { include: { lines: true } } } },
            payments: { include: { allocations: true } },
          },
        },
      },
    });

    for (const stay of linkedStays) {
      // Free room assignments and restore room to VACANT + CLEAN
      for (const assignment of stay.roomAssignments) {
        await prisma.roomAssignment.deleteMany({ where: { stayId: stay.id } });
        await prisma.roomState.upsert({
          where: { roomId: assignment.roomId },
          create: {
            organizationId: stay.organizationId,
            propertyId: stay.propertyId,
            roomId: assignment.roomId,
            occupancyStatus: "VACANT",
            housekeepingStatus: "CLEAN",
            sellabilityStatus: "SELLABLE",
          },
          update: {
            occupancyStatus: "VACANT",
            housekeepingStatus: "CLEAN",
            lastChangedAt: new Date(),
          },
        });
      }

      // Delete Folio, Entries, Payments, and Invoices
      if (stay.folio) {
        const folioId = stay.folio.id;
        for (const p of stay.folio.payments) {
          await prisma.paymentAllocation.deleteMany({ where: { paymentId: p.id } });
          await prisma.payment.delete({ where: { id: p.id } });
        }
        for (const w of stay.folio.windows) {
          for (const inv of w.invoices) {
            await prisma.invoiceLine.deleteMany({ where: { invoiceId: inv.id } });
            await prisma.invoice.delete({ where: { id: inv.id } });
          }
          await prisma.folioEntry.deleteMany({ where: { folioWindowId: w.id } });
          await prisma.folioWindow.delete({ where: { id: w.id } });
        }
        await prisma.stay.update({ where: { id: stay.id }, data: { folioId: null } });
        await prisma.folio.delete({ where: { id: folioId } });
      }

      // Delete stay
      await prisma.stay.delete({ where: { id: stay.id } });
    }

    // 3. Delete active registration record from operational table
    await prisma.guestRegistration.delete({ where: { id } });

    // 4. Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId: reg.organizationId,
        propertyId: reg.propertyId,
        actorId: "usr_admin",
        action: "ADMIN_DELETE_GRC_PRESERVED_IN_BACKUP",
        targetType: "GRC_RECORD",
        targetId: reg.registrationNo,
        afterJson: JSON.stringify({
          deletedGrc: reg.registrationNo,
          name: reg.fullName,
          clearedStaysCount: linkedStays.length,
          backupSaved: true,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      deletedId: id,
      clearedStays: linkedStays.length,
      backupPreserved: true,
    });
  } catch (error: any) {
    console.error("Error deleting GRC:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
