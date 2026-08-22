import { prisma } from "../db/prisma";
import { calculateGST } from "../gst/calculator";

export async function populateAmbarishOperationalData() {
  console.log("🏨 Populating Hotel Ambarish Grand Residency Operational Data...");

  const ambarish = await prisma.property.findFirst({
    where: { code: "GUW-01" },
    include: {
      rooms: { include: { roomType: true } },
      roomTypes: true,
      documentSequences: true,
    },
  });

  if (!ambarish) {
    console.error("Hotel Ambarish property not found!");
    return;
  }

  // 1. Ensure Document Sequences exist
  const sequenceTypes = ["GRC", "FOL", "INV", "ORD", "KOT", "REC", "RES", "CRN"];
  for (const docType of sequenceTypes) {
    const existing = ambarish.documentSequences.find((s) => s.documentType === docType);
    if (!existing) {
      await prisma.documentSequence.create({
        data: {
          organizationId: ambarish.organizationId,
          propertyId: ambarish.id,
          documentType: docType,
          prefix: docType === "GRC" ? "GRC-AMB-2627-" : `${docType}-AMB-2627-`,
          nextValue: 101,
          padding: 4,
          scopeKey: "PROPERTY",
          financialYear: "2026-2027",
        },
      });
    }
  }

  // 2. Ensure Room States for all 48 rooms
  for (const room of ambarish.rooms) {
    const existingState = await prisma.roomState.findUnique({
      where: { roomId: room.id },
    });
    if (!existingState) {
      await prisma.roomState.create({
        data: {
          organizationId: ambarish.organizationId,
          propertyId: ambarish.id,
          roomId: room.id,
          occupancyStatus: "VACANT",
          housekeepingStatus: "CLEAN",
          sellabilityStatus: "SELLABLE",
        },
      });
    }
  }

  // 3. Clear existing stays and registrations for clean idempotency if needed
  const existingStays = await prisma.stay.findMany({ where: { propertyId: ambarish.id } });
  if (existingStays.length === 0) {
    console.log("Creating active in-house stays for Hotel Ambarish...");

    // Find rooms: 101, 205, 302
    const room101 = ambarish.rooms.find((r) => r.number === "101") || ambarish.rooms[0];
    const room205 = ambarish.rooms.find((r) => r.number === "205") || ambarish.rooms[1];
    const room302 = ambarish.rooms.find((r) => r.number === "302") || ambarish.rooms[2];

    // Guest 1
    const guest1 = await prisma.guest.create({
      data: {
        organizationId: ambarish.organizationId,
        name: "ANUPAM ROY",
        phone: "+91 98301 54321",
        email: "anupam.roy@tcs.com",
        nationality: "Indian",
        addressJson: JSON.stringify({
          street: "Salt Lake Sector V",
          city: "Kolkata",
          state: "West Bengal",
          postalCode: "700091",
          country: "India",
        }),
      },
    });

    // Stay 1 for Room 101
    const stay1 = await prisma.stay.create({
      data: {
        organizationId: ambarish.organizationId,
        propertyId: ambarish.id,
        primaryGuestId: guest1.id,
        status: "IN_HOUSE",
        arrivalAt: new Date(Date.now() - 24 * 3600 * 1000), // Checked in yesterday
        expectedDepartureAt: new Date(Date.now() + 48 * 3600 * 1000),
        adults: 1,
        children: 0,
      },
    });

    await prisma.roomAssignment.create({
      data: {
        stayId: stay1.id,
        roomId: room101.id,
      },
    });

    await prisma.roomState.update({
      where: { roomId: room101.id },
      data: { occupancyStatus: "OCCUPIED", housekeepingStatus: "CLEAN" },
    });

    // Folio for Stay 1
    const folio1 = await prisma.folio.create({
      data: {
        organizationId: ambarish.organizationId,
        propertyId: ambarish.id,
        stayId: stay1.id,
        status: "OPEN",
      },
    });

    await prisma.stay.update({
      where: { id: stay1.id },
      data: { folioId: folio1.id },
    });

    const window1 = await prisma.folioWindow.create({
      data: {
        folioId: folio1.id,
        name: "Guest Window",
        windowNumber: 1,
        payerType: "GUEST",
      },
    });

    // Room Tariff Charge
    const roomGst = calculateGST({
      grossOrBaseAmount: 3200,
      sacHsn: "996311",
      supplierStateCode: ambarish.stateCode || "18",
    });

    await prisma.folioEntry.create({
      data: {
        organizationId: ambarish.organizationId,
        propertyId: ambarish.id,
        folioId: folio1.id,
        folioWindowId: window1.id,
        serviceDate: ambarish.businessDate,
        type: "CHARGE",
        chargeCode: "ROOM_TARIFF",
        description: `Room Tariff - Executive Club (Room ${room101.number})`,
        qty: 1,
        unitAmount: 3200,
        taxableAmount: roomGst.taxableAmount,
        taxComponentsJson: JSON.stringify(roomGst),
        totalAmount: roomGst.totalAmount,
        sourceType: "PMS_NIGHTLY_CHARGE",
      },
    });

    // Food Charge from shared Ambarish Restaurant
    const foodGst = calculateGST({
      grossOrBaseAmount: 650,
      sacHsn: "996331",
      supplierStateCode: ambarish.stateCode || "18",
    });

    await prisma.folioEntry.create({
      data: {
        organizationId: ambarish.organizationId,
        propertyId: ambarish.id,
        folioId: folio1.id,
        folioWindowId: window1.id,
        serviceDate: ambarish.businessDate,
        type: "CHARGE",
        chargeCode: "RESTAURANT_FOOD",
        description: `Ambarish Restaurant - In-Room Dining (KOT-0120)`,
        qty: 1,
        unitAmount: 650,
        taxableAmount: foodGst.taxableAmount,
        taxComponentsJson: JSON.stringify(foodGst),
        totalAmount: foodGst.totalAmount,
        sourceType: "POS_ORDER",
      },
    });

    // Guest 2
    const guest2 = await prisma.guest.create({
      data: {
        organizationId: ambarish.organizationId,
        name: "DR. SUNITA & RAJESH BARMAN",
        phone: "+91 94350 11223",
        email: "dr.sunita.barman@gmail.com",
        nationality: "Indian",
        addressJson: JSON.stringify({
          street: "Tarun Nagar",
          city: "Guwahati",
          state: "Assam",
          postalCode: "781005",
          country: "India",
        }),
      },
    });

    const stay2 = await prisma.stay.create({
      data: {
        organizationId: ambarish.organizationId,
        propertyId: ambarish.id,
        primaryGuestId: guest2.id,
        status: "IN_HOUSE",
        arrivalAt: new Date(Date.now() - 12 * 3600 * 1000),
        expectedDepartureAt: new Date(Date.now() + 72 * 3600 * 1000),
        adults: 2,
        children: 0,
      },
    });

    await prisma.roomAssignment.create({
      data: {
        stayId: stay2.id,
        roomId: room205.id,
      },
    });

    await prisma.roomState.update({
      where: { roomId: room205.id },
      data: { occupancyStatus: "OCCUPIED", housekeepingStatus: "CLEAN" },
    });

    const folio2 = await prisma.folio.create({
      data: {
        organizationId: ambarish.organizationId,
        propertyId: ambarish.id,
        stayId: stay2.id,
        status: "OPEN",
      },
    });

    await prisma.stay.update({
      where: { id: stay2.id },
      data: { folioId: folio2.id },
    });

    const window2 = await prisma.folioWindow.create({
      data: {
        folioId: folio2.id,
        name: "Guest Window",
        windowNumber: 1,
        payerType: "GUEST",
      },
    });

    const room2Gst = calculateGST({
      grossOrBaseAmount: 2800,
      sacHsn: "996311",
      supplierStateCode: ambarish.stateCode || "18",
    });

    await prisma.folioEntry.create({
      data: {
        organizationId: ambarish.organizationId,
        propertyId: ambarish.id,
        folioId: folio2.id,
        folioWindowId: window2.id,
        serviceDate: ambarish.businessDate,
        type: "CHARGE",
        chargeCode: "ROOM_TARIFF",
        description: `Room Tariff - Deluxe Riverview (Room ${room205.number})`,
        qty: 1,
        unitAmount: 2800,
        taxableAmount: room2Gst.taxableAmount,
        taxComponentsJson: JSON.stringify(room2Gst),
        totalAmount: room2Gst.totalAmount,
        sourceType: "PMS_NIGHTLY_CHARGE",
      },
    });

    // Advance Payment via UPI
    await prisma.payment.create({
      data: {
        organizationId: ambarish.organizationId,
        propertyId: ambarish.id,
        receiptNo: "REC-AMB-2627-0101",
        folioId: folio2.id,
        amount: 3000,
        method: "UPI",
        reference: "UPI/321890987123/HDFC",
      },
    });
  }

  // 4. Populate Pending Kiosk Check-In Queue for Hotel Ambarish
  const existingRegs = await prisma.guestRegistration.findMany({ where: { propertyId: ambarish.id } });
  if (existingRegs.length === 0) {
    console.log("Populating pending Kiosk registrations for Hotel Ambarish...");

    await prisma.guestRegistration.create({
      data: {
        organizationId: ambarish.organizationId,
        propertyId: ambarish.id,
        registrationNo: "GRC-AMB-2627-0101",
        status: "PENDING_REVIEW",
        fullName: "TANMAY HAZARIKA",
        age: 34,
        gender: "Male",
        nationality: "Indian",
        fatherSpouseName: "Bipul Hazarika",
        arrivalDateTime: "2026-08-22 11:30",
        expectedDepartureDate: "2026-08-24",
        preAssignedRoom: "104",
        streetAddress: "Kalyanpur, Ward 6",
        city: "Jorhat",
        state: "Assam",
        pinZipCode: "785001",
        country: "India",
        arrivedFrom: "Jorhat Airport",
        goingTo: "Shillong",
        purposeOfVisit: "Business / Work",
        referralChannel: "🏢 Corporate Booking",
        mobilePhone: "+91 97060 23456",
        email: "tanmay.hazarika@assamtea.co.in",
        vehicleNumber: "AS-03-J-4412",
        idDocumentType: "AADHAAR",
        idDocumentNumber: "XXXX-XXXX-8921",
        termsAccepted: true,
      },
    });

    await prisma.guestRegistration.create({
      data: {
        organizationId: ambarish.organizationId,
        propertyId: ambarish.id,
        registrationNo: "GRC-AMB-2627-0102",
        status: "PENDING_REVIEW",
        fullName: "PRIYANKA SENGUPTA",
        age: 29,
        gender: "Female",
        nationality: "Indian",
        fatherSpouseName: "A. Sengupta",
        arrivalDateTime: "2026-08-22 12:15",
        expectedDepartureDate: "2026-08-25",
        preAssignedRoom: "208",
        streetAddress: "Club Road",
        city: "Silchar",
        state: "Assam",
        pinZipCode: "788001",
        country: "India",
        arrivedFrom: "Silchar",
        goingTo: "Kaziranga",
        purposeOfVisit: "Tourism / Holiday",
        referralChannel: "🔍 Google Search / Maps",
        mobilePhone: "+91 94350 88990",
        email: "priyanka.s@outlook.com",
        idDocumentType: "DRIVING_LICENSE",
        idDocumentNumber: "AS-11-2018-009823",
        termsAccepted: true,
      },
    });
  }

  console.log("✅ Hotel Ambarish Grand Residency operational dataset populated successfully!");
}

if (require.main === module) {
  populateAmbarishOperationalData()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
    });
}
