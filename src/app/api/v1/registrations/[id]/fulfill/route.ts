import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateGST } from "@/lib/gst/calculator";
import { normalizeGuestName } from "@/lib/domain/name-utils";

// POST /api/v1/registrations/[id]/fulfill
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      roomId,
      roomIds,
      roomRates = {},
      groupBilling = true,
      agreedTariff,
      extraBeds = 0,
      extraBedRate = 500,
      assignedRoomNumber,
      departureDate,
      depositAmount = 0,
      depositMethod = "CASH",
      depositRef = "",
      companyName = "",
      gstin = "",
      notes = "",
      userId,
      idPhotoUrl,
      idDocumentType,
      idDocumentNumber,
      coGuests,
    } = body;

    const registration = await prisma.guestRegistration.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    if (registration.status === "CHECKED_IN") {
      return NextResponse.json({ error: "Registration is already checked in" }, { status: 400 });
    }

    // Resolve roomIds
    let finalRoomIds: string[] = [];
    if (Array.isArray(roomIds) && roomIds.length > 0) {
      finalRoomIds = roomIds;
    } else if (roomId) {
      finalRoomIds = [roomId];
    } else if (assignedRoomNumber || registration.preAssignedRoom) {
      const roomNum = assignedRoomNumber || registration.preAssignedRoom;
      const found = await prisma.room.findFirst({
        where: { propertyId: registration.propertyId, number: roomNum },
      });
      if (found) finalRoomIds = [found.id];
    }

    if (finalRoomIds.length === 0) {
      return NextResponse.json({ error: "Please select or assign at least one room to complete check-in." }, { status: 400 });
    }

    // Fetch all requested rooms
    const targetRooms = await prisma.room.findMany({
      where: { id: { in: finalRoomIds } },
      include: { roomType: true, roomState: true },
    });

    if (targetRooms.length !== finalRoomIds.length) {
      return NextResponse.json({ error: "One or more selected rooms were not found." }, { status: 404 });
    }

    // Check if any room is already occupied
    for (const rm of targetRooms) {
      const activeAssignment = await prisma.roomAssignment.findFirst({
        where: {
          roomId: rm.id,
          endsAt: null,
          stay: { status: "IN_HOUSE" },
        },
      });

      if (activeAssignment || rm.roomState?.occupancyStatus === "OCCUPIED") {
        return NextResponse.json(
          { error: `Room ${rm.number} is already occupied by an in-house guest.` },
          { status: 400 }
        );
      }
    }

    const finalIdPhotoUrl = idPhotoUrl || registration.idPhotoUrl;
    const finalIdDocType = idDocumentType || registration.idDocumentType;
    const finalIdDocNum = idDocumentNumber || registration.idDocumentNumber;
    const finalCoGuestsJson = coGuests ? JSON.stringify(coGuests) : registration.coGuestsJson;

    // 1. Find or create Guest
    let guest = await prisma.guest.findFirst({
      where: {
        organizationId: registration.organizationId,
        OR: [
          { phone: registration.mobilePhone },
          ...(registration.email ? [{ email: registration.email }] : []),
        ],
      },
    });

    const addressJson = JSON.stringify({
      street: registration.streetAddress,
      city: registration.city,
      state: registration.state,
      postalCode: registration.pinZipCode,
      country: registration.country,
    });

    const { pureName: canonicalGuestName } = normalizeGuestName(registration.fullName);

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          organizationId: registration.organizationId,
          name: canonicalGuestName,
          phone: registration.mobilePhone,
          email: registration.email,
          nationality: registration.nationality,
          addressJson,
          companyName: companyName || undefined,
          gstin: gstin || undefined,
          preferences: registration.purposeOfVisit ? `Purpose: ${registration.purposeOfVisit}` : null,
        },
      });
    } else {
      guest = await prisma.guest.update({
        where: { id: guest.id },
        data: {
          name: canonicalGuestName || guest.name,
          addressJson,
          companyName: companyName !== undefined ? (companyName || null) : guest.companyName,
          gstin: gstin !== undefined ? (gstin || null) : guest.gstin,
        },
      });
    }

    // 2. Save primary ID document if provided
    if (finalIdDocNum || finalIdPhotoUrl) {
      await prisma.guestDocument.create({
        data: {
          guestId: guest.id,
          propertyId: registration.propertyId,
          documentType: finalIdDocType || "AADHAAR",
          last4: finalIdDocNum ? finalIdDocNum.slice(-4) : "ID",
          issuerCountry: registration.country || "India",
          objectKey: finalIdPhotoUrl || null,
        },
      });
    }

    // 3. Set Stay Dates
    const arrivalDate = new Date();
    const expDepDate = departureDate
      ? new Date(departureDate)
      : registration.expectedDepartureDate
      ? new Date(registration.expectedDepartureDate)
      : new Date(Date.now() + 86400000 * 2);

    const diffMs = Math.max(0, expDepDate.getTime() - arrivalDate.getTime());
    const nights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const serviceDateStr = registration.property?.businessDate || new Date().toISOString().split("T")[0];

    let coGuestsCount = 0;
    if (registration.coGuestsJson) {
      try {
        const parsed = JSON.parse(registration.coGuestsJson);
        if (Array.isArray(parsed)) coGuestsCount = parsed.length;
      } catch {}
    }

    let primaryStayId = "";
    let masterFolioId = "";
    let masterWindowId = "";
    let totalStayCharges = 0;

    if (groupBilling) {
      // 4A. MASTER FOLIO: Single Stay + Master Folio for all rooms
      const stay = await prisma.stay.create({
        data: {
          organizationId: registration.organizationId,
          propertyId: registration.propertyId,
          primaryGuestId: guest.id,
          status: "IN_HOUSE",
          arrivalAt: arrivalDate,
          expectedDepartureAt: expDepDate,
          adults: Math.max(targetRooms.length, 1 + coGuestsCount),
        },
      });
      primaryStayId = stay.id;

      const folio = await prisma.folio.create({
        data: {
          organizationId: registration.organizationId,
          propertyId: registration.propertyId,
          stayId: stay.id,
          status: "OPEN",
          balance: 0,
        },
      });
      masterFolioId = folio.id;

      const window = await prisma.folioWindow.create({
        data: {
          folioId: folio.id,
          name: "Guest Window",
          windowNumber: 1,
          payerType: "GUEST",
          status: "OPEN",
        },
      });
      masterWindowId = window.id;

      await prisma.stay.update({
        where: { id: stay.id },
        data: { folioId: folio.id },
      });

      // Assign each room and post its charges
      for (const rm of targetRooms) {
        await prisma.roomAssignment.create({
          data: {
            stayId: stay.id,
            roomId: rm.id,
            startsAt: arrivalDate,
            rateHandling: "RETAIN_RATE",
          },
        });

        await prisma.roomState.upsert({
          where: { roomId: rm.id },
          create: {
            organizationId: registration.organizationId,
            propertyId: registration.propertyId,
            roomId: rm.id,
            occupancyStatus: "OCCUPIED",
            housekeepingStatus: "CLEAN",
            sellabilityStatus: "SELLABLE",
          },
          update: { occupancyStatus: "OCCUPIED", lastChangedAt: new Date() },
        });

        // Determine Room Base Price
        let roomBasePrice = 3200;
        if (roomRates[rm.id] !== undefined && Number(roomRates[rm.id]) > 0) {
          roomBasePrice = Number(roomRates[rm.id]);
        } else if (agreedTariff !== undefined && Number(agreedTariff) > 0) {
          roomBasePrice = Number(agreedTariff);
        } else if (rm.roomTypeId) {
          const rateVersion = await prisma.ratePlanVersion.findFirst({
            where: { roomTypeId: rm.roomTypeId, active: true },
            orderBy: { createdAt: "desc" },
          });
          if (rateVersion?.pricingJson) {
            try {
              const pricing = JSON.parse(rateVersion.pricingJson);
              if (pricing.basePrice) roomBasePrice = Number(pricing.basePrice);
            } catch {}
          }
        }

        const totalStayPrice = roomBasePrice * nights;
        const roomGst = calculateGST({
          grossOrBaseAmount: totalStayPrice,
          isInclusive: true,
          sacHsn: "996311",
          supplierStateCode: registration.property?.stateCode || "18",
          customTaxRate: 5,
        });

        await prisma.folioEntry.create({
          data: {
            organizationId: registration.organizationId,
            propertyId: registration.propertyId,
            folioId: folio.id,
            folioWindowId: window.id,
            serviceDate: serviceDateStr,
            type: "CHARGE",
            chargeCode: "ROOM_TARIFF",
            description: `Room Tariff - Room ${rm.number} (${nights} Night${nights > 1 ? "s" : ""})`,
            qty: nights,
            unitAmount: roomBasePrice,
            taxableAmount: roomGst.taxableAmount,
            taxComponentsJson: JSON.stringify(roomGst.components),
            totalAmount: roomGst.totalAmount,
            sourceType: "PMS_NIGHTLY_CHARGE",
            status: "POSTED",
          },
        });

        totalStayCharges += roomGst.totalAmount;
      }

      // Post Extra Bed Charges if requested
      if (Number(extraBeds) > 0) {
        const totalExtraBedGross = Number(extraBeds) * Number(extraBedRate) * nights;
        const extraBedGst = calculateGST({
          grossOrBaseAmount: totalExtraBedGross,
          isInclusive: true,
          sacHsn: "996311",
          supplierStateCode: registration.property?.stateCode || "18",
          customTaxRate: 5,
        });

        await prisma.folioEntry.create({
          data: {
            organizationId: registration.organizationId,
            propertyId: registration.propertyId,
            folioId: folio.id,
            folioWindowId: window.id,
            serviceDate: serviceDateStr,
            type: "CHARGE",
            chargeCode: "EXTRA_BED",
            description: `Extra Bed / Mattress (${extraBeds} Bed${Number(extraBeds) > 1 ? "s" : ""} x ${nights} Night${nights > 1 ? "s" : ""})`,
            qty: Number(extraBeds) * nights,
            unitAmount: Number(extraBedRate),
            taxableAmount: extraBedGst.taxableAmount,
            taxComponentsJson: JSON.stringify(extraBedGst.components),
            totalAmount: extraBedGst.totalAmount,
            sourceType: "PMS_NIGHTLY_CHARGE",
            status: "POSTED",
          },
        });

        totalStayCharges += extraBedGst.totalAmount;
      }
    } else {
      // 4B. SEPARATE FOLIOS: Individual Stay and Folio per Room
      for (let i = 0; i < targetRooms.length; i++) {
        const rm = targetRooms[i];
        const stay = await prisma.stay.create({
          data: {
            organizationId: registration.organizationId,
            propertyId: registration.propertyId,
            primaryGuestId: guest.id,
            status: "IN_HOUSE",
            arrivalAt: arrivalDate,
            expectedDepartureAt: expDepDate,
            adults: 1,
          },
        });
        if (i === 0) primaryStayId = stay.id;

        await prisma.roomAssignment.create({
          data: {
            stayId: stay.id,
            roomId: rm.id,
            startsAt: arrivalDate,
            rateHandling: "RETAIN_RATE",
          },
        });

        await prisma.roomState.upsert({
          where: { roomId: rm.id },
          create: {
            organizationId: registration.organizationId,
            propertyId: registration.propertyId,
            roomId: rm.id,
            occupancyStatus: "OCCUPIED",
            housekeepingStatus: "CLEAN",
            sellabilityStatus: "SELLABLE",
          },
          update: { occupancyStatus: "OCCUPIED", lastChangedAt: new Date() },
        });

        const folio = await prisma.folio.create({
          data: {
            organizationId: registration.organizationId,
            propertyId: registration.propertyId,
            stayId: stay.id,
            status: "OPEN",
            balance: 0,
          },
        });
        if (i === 0) {
          masterFolioId = folio.id;
        }

        const window = await prisma.folioWindow.create({
          data: {
            folioId: folio.id,
            name: "Guest Window",
            windowNumber: 1,
            payerType: "GUEST",
            status: "OPEN",
          },
        });
        if (i === 0) masterWindowId = window.id;

        await prisma.stay.update({
          where: { id: stay.id },
          data: { folioId: folio.id },
        });

        let roomBasePrice = 3200;
        if (roomRates[rm.id] !== undefined && Number(roomRates[rm.id]) > 0) {
          roomBasePrice = Number(roomRates[rm.id]);
        } else if (agreedTariff !== undefined && Number(agreedTariff) > 0) {
          roomBasePrice = Number(agreedTariff);
        } else if (rm.roomTypeId) {
          const rateVersion = await prisma.ratePlanVersion.findFirst({
            where: { roomTypeId: rm.roomTypeId, active: true },
            orderBy: { createdAt: "desc" },
          });
          if (rateVersion?.pricingJson) {
            try {
              const pricing = JSON.parse(rateVersion.pricingJson);
              if (pricing.basePrice) roomBasePrice = Number(pricing.basePrice);
            } catch {}
          }
        }

        const totalStayPrice = roomBasePrice * nights;
        const roomGst = calculateGST({
          grossOrBaseAmount: totalStayPrice,
          isInclusive: true,
          sacHsn: "996311",
          supplierStateCode: registration.property?.stateCode || "18",
          customTaxRate: 5,
        });

        await prisma.folioEntry.create({
          data: {
            organizationId: registration.organizationId,
            propertyId: registration.propertyId,
            folioId: folio.id,
            folioWindowId: window.id,
            serviceDate: serviceDateStr,
            type: "CHARGE",
            chargeCode: "ROOM_TARIFF",
            description: `Room Tariff - Room ${rm.number} (${nights} Night${nights > 1 ? "s" : ""})`,
            qty: nights,
            unitAmount: roomBasePrice,
            taxableAmount: roomGst.taxableAmount,
            taxComponentsJson: JSON.stringify(roomGst.components),
            totalAmount: roomGst.totalAmount,
            sourceType: "PMS_NIGHTLY_CHARGE",
            status: "POSTED",
          },
        });

        await prisma.folio.update({
          where: { id: folio.id },
          data: { balance: roomGst.totalAmount },
        });

        totalStayCharges += roomGst.totalAmount;
      }
    }

    // 5. Handle Advance Deposit on Master Folio
    let currentBalance = totalStayCharges;
    if (Number(depositAmount) > 0 && masterFolioId && masterWindowId) {
      const depAmt = Number(depositAmount);
      const seq = await prisma.documentSequence.findFirst({
        where: { propertyId: registration.propertyId, documentType: "RECEIPT" },
      });
      const receiptNum = seq
        ? `${seq.prefix}${String(seq.nextValue).padStart(seq.padding, "0")}`
        : `REC-${Date.now().toString().slice(-6)}`;
      if (seq) {
        await prisma.documentSequence.update({
          where: { id: seq.id },
          data: { nextValue: { increment: 1 } },
        });
      }

      const payment = await prisma.payment.create({
        data: {
          organizationId: registration.organizationId,
          propertyId: registration.propertyId,
          folioId: masterFolioId,
          receiptNo: receiptNum,
          amount: depAmt,
          method: depositMethod || "CASH",
          status: "SUCCEEDED",
          reference: depositRef && depositRef.trim().length > 0
            ? depositRef.trim()
            : (depositMethod === "DIRECT_BILL" ? `BTC-${companyName || guest?.companyName || "CORP"}` : null),
          payerSnapshot: JSON.stringify({
            name: registration.fullName,
            phone: registration.mobilePhone,
            companyName: companyName || guest?.companyName || "",
            gstin: gstin || guest?.gstin || "",
            billToCompany: depositMethod === "DIRECT_BILL",
          }),
        },
      });

      await prisma.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          folioWindowId: masterWindowId,
          amount: depAmt,
        },
      });

      currentBalance -= depAmt;
    }

    if (groupBilling && masterFolioId) {
      await prisma.folio.update({
        where: { id: masterFolioId },
        data: { balance: currentBalance },
      });
    }

    // 6. Update Registration status
    const allRoomNumbers = targetRooms.map((r) => r.number).join(", ");
    const updatedReg = await prisma.guestRegistration.update({
      where: { id },
      data: {
        status: "CHECKED_IN",
        assignedRoomId: targetRooms[0].id,
        assignedRoomNumber: allRoomNumbers,
        stayId: primaryStayId,
        guestId: guest.id,
        depositAmount: Number(depositAmount) || 0,
        processedByUserId: userId || null,
        processedAt: new Date(),
        internalNotes: notes || registration.internalNotes,
      },
    });

    // 7. Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: registration.organizationId,
        propertyId: registration.propertyId,
        action: "FULFILL_CHECKIN",
        targetType: "STAY",
        targetId: primaryStayId,
        beforeJson: JSON.stringify({ status: "PENDING_REVIEW" }),
        afterJson: JSON.stringify({
          stayId: primaryStayId,
          rooms: allRoomNumbers,
          guest: guest.name,
          deposit: depositAmount,
          groupBilling,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Guest successfully checked in to Room(s) ${allRoomNumbers}!`,
      stayId: primaryStayId,
      rooms: targetRooms,
      registration: updatedReg,
    });
  } catch (error: any) {
    console.error("Registration fulfillment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
