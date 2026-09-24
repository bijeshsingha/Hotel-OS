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

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const where: any = { propertyId };

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

    // Enrich records with live Stay agreed tariffs, extra pax counts, and Folio deposit payment methods
    const enrichedRecords = await Promise.all(
      records.map(async (rec) => {
        let agreedRoomTariff = 3200;
        let depositAmount = rec.depositAmount || 0;
        let advancePaymentMethod = "";
        let extraPaxCount = 0;
        let roomExtraPax: Record<string, number> = {};
        let extraBedRate = 500;

        // Check internal notes JSON first
        try {
          if (rec.internalNotes) {
            const parsed = JSON.parse(rec.internalNotes);
            if (parsed.agreedTariff !== undefined) agreedRoomTariff = Number(parsed.agreedTariff);
            if (parsed.advancePaymentMethod) advancePaymentMethod = parsed.advancePaymentMethod;
            if (parsed.depositAmount !== undefined) depositAmount = Number(parsed.depositAmount);
            if (parsed.extraPaxCount !== undefined) extraPaxCount = Number(parsed.extraPaxCount);
            if (parsed.roomExtraPax && typeof parsed.roomExtraPax === "object") roomExtraPax = parsed.roomExtraPax;
            if (parsed.extraBedRate !== undefined) extraBedRate = Number(parsed.extraBedRate);
          }
        } catch {}

        // Query linked Stay for real-time operational rate, extra pax charges, and payments
        let assignedRooms: { id: string; number: string; rate: number }[] = [];
        let roomRates: Record<string, number> = {};

        const recRoomNumbers = (rec.preAssignedRoom || "")
          .replace(/^Room\s+/i, "")
          .split(/[,;\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);

        let effectiveStatus = rec.status;

        try {
          let stay: any = null;
          if (rec.stayId) {
            stay = await prisma.stay.findUnique({
              where: { id: rec.stayId },
              include: {
                roomAssignments: { include: { room: true } },
                folio: {
                  include: {
                    payments: true,
                    windows: { include: { entries: true } },
                  },
                },
              },
            });
          }

          if (stay) {
            effectiveStatus = stay.status === "CHECKED_OUT" ? "CHECKED_OUT" : (stay.status === "IN_HOUSE" ? "CHECKED_IN" : rec.status);

            if (stay.roomAssignments && stay.roomAssignments.length > 0) {
              const activeAssignments = stay.status === "IN_HOUSE"
                ? stay.roomAssignments.filter((ra: any) => !ra.endsAt)
                : stay.roomAssignments.filter((ra: any) => {
                    if (ra.endsAt && ra.moveReason && (ra.moveReason.includes("Moved to Room") || ra.moveReason.includes("MOVED_FROM:"))) {
                      return false;
                    }
                    return true;
                  });

              const targetAssignments = activeAssignments.length > 0 ? activeAssignments : [stay.roomAssignments[stay.roomAssignments.length - 1]];

              assignedRooms = targetAssignments.map((ra: any) => {
                let rate = agreedRoomTariff;
                const match = ra.moveReason?.match(/AGREED_RATE:(\d+)/);
                if (match && match[1]) {
                  const parsedRate = Number(match[1]);
                  if (!isNaN(parsedRate)) rate = parsedRate;
                } else if (ra.rateHandling === "COMPLIMENTARY" || ra.moveReason?.includes("AGREED_RATE:0")) {
                  rate = 0;
                } else if (roomRates[ra.room.id] !== undefined) {
                  rate = Number(roomRates[ra.room.id]);
                } else if (roomRates[ra.room.number] !== undefined) {
                  rate = Number(roomRates[ra.room.number]);
                }
                roomRates[ra.room.id] = rate;
                roomRates[ra.room.number] = rate;
                return {
                  id: ra.room.id,
                  number: ra.room.number,
                  rate,
                };
              });

              // Check for related group stays (same primaryGuestId within same check-in window)
              if (stay.primaryGuestId) {
                const groupStays = await prisma.stay.findMany({
                  where: {
                    propertyId: rec.propertyId,
                    primaryGuestId: stay.primaryGuestId,
                    id: { not: stay.id },
                    createdAt: {
                      gte: new Date(new Date(stay.createdAt).getTime() - 1000 * 60 * 60 * 4),
                      lte: new Date(new Date(stay.createdAt).getTime() + 1000 * 60 * 60 * 4),
                    },
                  },
                  include: {
                    roomAssignments: { include: { room: true } },
                  },
                });

                for (const gs of groupStays) {
                  const gsActive = gs.roomAssignments.filter((ra: any) => {
                    if (ra.endsAt && ra.moveReason && (ra.moveReason.includes("Moved to Room") || ra.moveReason.includes("MOVED_FROM:"))) {
                      return false;
                    }
                    return true;
                  });
                  for (const ra of (gsActive.length > 0 ? gsActive : [gs.roomAssignments[gs.roomAssignments.length - 1]])) {
                    let rate = agreedRoomTariff;
                    const match = ra.moveReason?.match(/AGREED_RATE:(\d+)/);
                    if (match && match[1]) {
                      const parsedRate = Number(match[1]);
                      if (!isNaN(parsedRate)) rate = parsedRate;
                    } else if (ra.rateHandling === "COMPLIMENTARY" || ra.moveReason?.includes("AGREED_RATE:0")) {
                      rate = 0;
                    } else if (roomRates[ra.room.id] !== undefined) {
                      rate = Number(roomRates[ra.room.id]);
                    } else if (roomRates[ra.room.number] !== undefined) {
                      rate = Number(roomRates[ra.room.number]);
                    }
                    roomRates[ra.room.id] = rate;
                    roomRates[ra.room.number] = rate;
                    if (!assignedRooms.some((ar) => ar.number === ra.room.number)) {
                      assignedRooms.push({
                        id: ra.room.id,
                        number: ra.room.number,
                        rate,
                      });
                    }
                  }
                }
              }

              const firstAssignment = targetAssignments[0];
              const firstMatch = firstAssignment?.moveReason?.match(/AGREED_RATE:(\d+)/);
              if (firstMatch && firstMatch[1]) {
                const parsedRate = Number(firstMatch[1]);
                if (!isNaN(parsedRate)) agreedRoomTariff = parsedRate;
              } else if (firstAssignment?.rateHandling === "COMPLIMENTARY" || firstAssignment?.moveReason?.includes("AGREED_RATE:0")) {
                agreedRoomTariff = 0;
              }
            }

            // Inspect stay folio windows for active EXTRA_PAX charges
            if (stay.folio?.windows) {
              for (const win of stay.folio.windows) {
                const paxEntry = (win.entries || []).find(
                  (e: any) => (e.chargeCode === "EXTRA_PAX" || e.chargeCode === "EXTRA_BED") && e.status === "POSTED"
                );
                if (paxEntry && paxEntry.qty) {
                  if (extraPaxCount === 0) extraPaxCount = Number(paxEntry.qty);
                  if (paxEntry.unitAmount) extraBedRate = Number(paxEntry.unitAmount);
                  break;
                }
              }
            }

            if (stay.folio?.payments && stay.folio.payments.length > 0) {
              const groupAdvancePayment = stay.folio.payments.find((p: any) =>
                p.reference?.includes("GROUP_ADVANCE_POOL") || p.payerSnapshot?.includes("isGroupAdvancePool")
              );
              const firstPayment = groupAdvancePayment || stay.folio.payments[0];
              depositAmount = firstPayment.amount;
              advancePaymentMethod = firstPayment.method;
            }
          } else if (rec.status === "CHECKED_IN") {
            effectiveStatus = "CHECKED_OUT";
          }
        } catch {}

        return {
          ...rec,
          status: effectiveStatus,
          agreedRoomTariff,
          depositAmount,
          advancePaymentMethod,
          extraPaxCount,
          roomExtraPax,
          extraBedRate,
          assignedRooms,
          roomRates,
        };
      })
    );

    return NextResponse.json(enrichedRecords);
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
      agreedRoomTariff,
      depositAmount,
      advancePaymentMethod,
      extraPaxCount,
      roomExtraPax,
      extraBedRate,
      roomRates,
      coGuestsJson,
      foreignPassportDetailsJson,
      signatureDataUrl,
      internalNotes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "GRC ID is required." }, { status: 400 });
    }

    const currentReg = await prisma.guestRegistration.findUnique({ where: { id } });
    let notesObj: any = {};
    try {
      if (internalNotes) {
        notesObj = typeof internalNotes === "string" ? JSON.parse(internalNotes) : internalNotes;
      } else if (currentReg?.internalNotes) {
        notesObj = JSON.parse(currentReg.internalNotes);
      }
    } catch {
      notesObj = { note: currentReg?.internalNotes || "" };
    }

    if (agreedRoomTariff !== undefined) notesObj.agreedTariff = Number(agreedRoomTariff);
    if (depositAmount !== undefined) notesObj.depositAmount = Number(depositAmount);
    if (advancePaymentMethod !== undefined) notesObj.advancePaymentMethod = advancePaymentMethod;
    if (extraPaxCount !== undefined) notesObj.extraPaxCount = Number(extraPaxCount);
    if (roomExtraPax !== undefined) notesObj.roomExtraPax = roomExtraPax;
    if (extraBedRate !== undefined) notesObj.extraBedRate = Number(extraBedRate);
    if (roomRates !== undefined) notesObj.roomRates = roomRates;

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
        depositAmount: depositAmount !== undefined ? Number(depositAmount) || 0 : undefined,
        coGuestsJson: coGuestsJson !== undefined ? (typeof coGuestsJson === "string" ? coGuestsJson : JSON.stringify(coGuestsJson)) : undefined,
        foreignPassportDetailsJson: foreignPassportDetailsJson !== undefined ? (typeof foreignPassportDetailsJson === "string" ? foreignPassportDetailsJson : JSON.stringify(foreignPassportDetailsJson)) : undefined,
        signatureDataUrl: signatureDataUrl !== undefined ? signatureDataUrl : undefined,
        internalNotes: JSON.stringify(notesObj),
        status: status || undefined,
      },
    });

    // Synchronize edits across Guest CRM, Stays, and Folios, and backup snapshot
    await syncGrcEditsEverywhere({
      ...updated,
      agreedRoomTariff: agreedRoomTariff !== undefined ? Number(agreedRoomTariff) : undefined,
      depositAmount: depositAmount !== undefined ? Number(depositAmount) : undefined,
      advancePaymentMethod: advancePaymentMethod !== undefined ? advancePaymentMethod : undefined,
      extraPaxCount: notesObj.extraPaxCount !== undefined ? Number(notesObj.extraPaxCount) : undefined,
      roomExtraPax: notesObj.roomExtraPax,
      extraBedRate: notesObj.extraBedRate !== undefined ? Number(notesObj.extraBedRate) : undefined,
    });

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
