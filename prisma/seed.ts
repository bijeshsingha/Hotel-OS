import { PrismaClient } from "@prisma/client";
import { calculateGST } from "../src/lib/gst/calculator";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting comprehensive seed including Hotel Divine View...");

  // Clear existing database
  await prisma.guestRegistration.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryLocation.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.metricSnapshot.deleteMany();
  await prisma.nightAuditRun.deleteMany();
  await prisma.operationalDay.deleteMany();
  await prisma.creditNoteLine.deleteMany();
  await prisma.creditNote.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.folioEntry.deleteMany();
  await prisma.folioWindow.deleteMany();
  await prisma.folio.deleteMany();
  await prisma.pOSBill.deleteMany();
  await prisma.kOTLine.deleteMany();
  await prisma.kOT.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.pOSShift.deleteMany();
  await prisma.maintenanceEvent.deleteMany();
  await prisma.maintenanceIssue.deleteMany();
  await prisma.hKTaskEvent.deleteMany();
  await prisma.housekeepingTask.deleteMany();
  await prisma.hKChecklistTemplate.deleteMany();
  await prisma.roomStateHistory.deleteMany();
  await prisma.roomState.deleteMany();
  await prisma.roomBlock.deleteMany();
  await prisma.roomAssignment.deleteMany();
  await prisma.stayGuest.deleteMany();
  await prisma.stay.deleteMany();
  await prisma.reservationNote.deleteMany();
  await prisma.reservationNight.deleteMany();
  await prisma.reservationRoom.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.guestDocument.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.printerRoute.deleteMany();
  await prisma.kitchenStation.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.menuItemVariant.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.diningTable.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.chargeCode.deleteMany();
  await prisma.documentSequence.deleteMany();
  await prisma.taxProfile.deleteMany();
  await prisma.ratePlanVersion.deleteMany();
  await prisma.ratePlan.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.propertyGrant.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.role.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.property.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      legalName: "Brahmaputra Hospitality Pvt Ltd",
      displayName: "Divine View & Brahmaputra Hotels",
      pan: "AABCB1234C",
      address: JSON.stringify({
        street: "Paltan Bazaar, Station Road",
        city: "Guwahati",
        state: "Assam",
        postalCode: "781008",
        country: "India",
      }),
      status: "ACTIVE",
    },
  });

  // 2. Create Properties
  // Property 1: Hotel Divine View (76 Rooms - Paltan Bazaar, Guwahati)
  const propDivine = await prisma.property.create({
    data: {
      organizationId: org.id,
      code: "HDV-01",
      legalName: "Divine View Hospitality Pvt Ltd (Hotel Divine View)",
      displayName: "Hotel Divine View",
      gstin: "18AABCD1234F1Z8",
      stateCode: "18", // Assam
      address: "Station Road, Paltan Bazaar, Guwahati, Assam 781008",
      phone: "+91 361 273 4500",
      email: "reservations@hoteldivineview.com",
      timezone: "Asia/Kolkata",
      currency: "INR",
      businessDate: "2026-08-20",
      status: "ACTIVE",
    },
  });

  // Property 2: Riverbend Hotel Guwahati (48 Rooms)
  const prop1 = await prisma.property.create({
    data: {
      organizationId: org.id,
      code: "GUW-01",
      legalName: "Brahmaputra Hospitality Pvt Ltd (Riverbend Guwahati)",
      displayName: "Riverbend Hotel Guwahati",
      gstin: "18AAAAA1234A1Z5",
      stateCode: "18",
      address: "MG Road, Riverfront, Guwahati, Assam 781001",
      phone: "+91 361 299 8800",
      email: "stay.guwahati@brahmaputrahotels.com",
      timezone: "Asia/Kolkata",
      currency: "INR",
      businessDate: "2026-08-20",
      status: "ACTIVE",
    },
  });

  // Property 3: Pineview Retreat Shillong (30 Rooms)
  const prop2 = await prisma.property.create({
    data: {
      organizationId: org.id,
      code: "SHL-01",
      legalName: "Brahmaputra Hospitality Pvt Ltd (Pineview Shillong)",
      displayName: "Pineview Retreat Shillong",
      gstin: "17BBBBB5678B1Z2",
      stateCode: "17",
      address: "Upper Shillong, Pine Valley Road, Shillong 793005",
      phone: "+91 364 288 7700",
      email: "stay.shillong@brahmaputrahotels.com",
      timezone: "Asia/Kolkata",
      currency: "INR",
      businessDate: "2026-08-20",
      status: "ACTIVE",
    },
  });

  // 3. Create Built-in Roles
  const rolesData = [
    { code: "ORG_OWNER", name: "Organization Owner", scopeType: "ORG" },
    { code: "ADMIN_GM", name: "Property Admin / GM", scopeType: "PROPERTY" },
    { code: "FD_MGR", name: "Front Desk Manager", scopeType: "PROPERTY" },
    { code: "FD_AGENT", name: "Front Desk Agent", scopeType: "PROPERTY" },
    { code: "HK_SUP", name: "Housekeeping Supervisor", scopeType: "PROPERTY" },
    { code: "HK_ATT", name: "Housekeeping Attendant", scopeType: "PROPERTY" },
    { code: "FNB_MGR", name: "F&B Manager", scopeType: "PROPERTY" },
    { code: "WAITER", name: "Waiter / Cashier", scopeType: "PROPERTY" },
    { code: "KITCHEN", name: "Kitchen Staff", scopeType: "PROPERTY" },
    { code: "MAINT_SUP", name: "Maintenance Supervisor", scopeType: "PROPERTY" },
    { code: "TECH", name: "Technician", scopeType: "PROPERTY" },
    { code: "ACCT", name: "Accountant / Auditor", scopeType: "PROPERTY" },
    { code: "VIEWER", name: "Owner Viewer", scopeType: "PROPERTY" },
    { code: "SUPPORT", name: "Platform Support", scopeType: "ORG" },
  ];

  const rolesMap = new Map<string, any>();
  for (const r of rolesData) {
    const role = await prisma.role.create({
      data: { code: r.code, name: r.name, scopeType: r.scopeType, builtIn: true },
    });
    rolesMap.set(r.code, role);
  }

  // 4. Create Users (all 14 roles) with access across properties
  const usersData = [
    { email: "owner@hoteldivineview.com", name: "Vikram Barua (Owner)", role: "ORG_OWNER" },
    { email: "gm.divine@hoteldivineview.com", name: "Ranjit Borah (GM - Divine View)", role: "ADMIN_GM" },
    { email: "fdmgr.divine@hoteldivineview.com", name: "Anil Das (Front Desk Manager)", role: "FD_MGR" },
    { email: "fdagent.divine@hoteldivineview.com", name: "Pooja Sharma (Front Desk)", role: "FD_AGENT" },
    { email: "hksup.divine@hoteldivineview.com", name: "Mukesh Kalita (HK Supervisor)", role: "HK_SUP" },
    { email: "hkatt.divine@hoteldivineview.com", name: "Raju Boro (HK Attendant)", role: "HK_ATT" },
    { email: "fnbmgr.divine@hoteldivineview.com", name: "Chef Tapas Deb (F&B Manager)", role: "FNB_MGR" },
    { email: "waiter.divine@hoteldivineview.com", name: "Nayan Deka (Waiter/Cashier)", role: "WAITER" },
    { email: "kitchen.divine@hoteldivineview.com", name: "Bhupen Ray (Kitchen Chef)", role: "KITCHEN" },
    { email: "maintsup.divine@hoteldivineview.com", name: "Prabin Nath (Maint Sup)", role: "MAINT_SUP" },
    { email: "tech.divine@hoteldivineview.com", name: "Dipak Saikia (Technician)", role: "TECH" },
    { email: "acct.divine@hoteldivineview.com", name: "Geeta Bhattacharya (Accountant)", role: "ACCT" },
    { email: "viewer@hoteldivineview.com", name: "Investor Viewer", role: "VIEWER" },
    { email: "support@hotelos.internal", name: "HotelOS Support", role: "SUPPORT" },
  ];

  for (const u of usersData) {
    const user = await prisma.user.create({
      data: { email: u.email, name: u.name, status: "ACTIVE" },
    });

    const membership = await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, status: "ACTIVE" },
    });

    const role = rolesMap.get(u.role);
    if (role) {
      // Grant to Hotel Divine View
      await prisma.propertyGrant.create({
        data: { membershipId: membership.id, propertyId: propDivine.id, roleId: role.id },
      });
      // Grant to Riverbend
      await prisma.propertyGrant.create({
        data: { membershipId: membership.id, propertyId: prop1.id, roleId: role.id },
      });
      // Grant to Shillong
      await prisma.propertyGrant.create({
        data: { membershipId: membership.id, propertyId: prop2.id, roleId: role.id },
      });
    }
  }

  // Helper to setup property tax profiles and document sequences
  const setupPropertyDefaults = async (propertyId: string, prefixCode: string) => {
    await prisma.taxProfile.createMany({
      data: [
        {
          organizationId: org.id,
          propertyId,
          name: "GST Accommodation 12%",
          supplyType: "ACCOMMODATION",
          sacHsn: "996311",
          componentRatesJson: JSON.stringify({ cgst: 6, sgst: 6, igst: 12 }),
          inclusive: false,
          effectiveFrom: "2026-04-01",
          version: 1,
        },
        {
          organizationId: org.id,
          propertyId,
          name: "GST Restaurant 5%",
          supplyType: "RESTAURANT",
          sacHsn: "996331",
          componentRatesJson: JSON.stringify({ cgst: 2.5, sgst: 2.5, igst: 5 }),
          inclusive: false,
          effectiveFrom: "2026-04-01",
          version: 1,
        },
      ],
    });

    const docTypes = ["INVOICE", "CREDIT_NOTE", "RECEIPT", "KOT", "ORDER", "RESERVATION", "MAINTENANCE"];
    for (const dt of docTypes) {
      let prefix = `${dt}-${prefixCode}-`;
      if (dt === "INVOICE") prefix = `INV-2627-${prefixCode}-`;
      if (dt === "RECEIPT") prefix = `REC-2627-${prefixCode}-`;
      if (dt === "RESERVATION") prefix = `RES-2627-${prefixCode}-`;

      await prisma.documentSequence.create({
        data: {
          organizationId: org.id,
          propertyId,
          documentType: dt,
          scopeKey: "PROPERTY",
          financialYear: "2026-2027",
          prefix,
          nextValue: 101,
          padding: 4,
        },
      });
    }
  };

  await setupPropertyDefaults(propDivine.id, "HDV");
  await setupPropertyDefaults(prop1.id, "GUW");
  await setupPropertyDefaults(prop2.id, "SHL");

  // =========================================================================
  // 🏨 ONBOARD HOTEL DIVINE VIEW (Paltan Bazaar, Guwahati) — EXACT 76 ROOMS
  // =========================================================================
  console.log("🏨 Onboarding Hotel Divine View (76 Rooms)...");

  // Room Types
  // 1. Double Deluxe (AC): 61 Rooms @ ₹2,000 / night
  const rtDeluxe = await prisma.roomType.create({
    data: {
      organizationId: org.id,
      propertyId: propDivine.id,
      code: "DLX",
      name: "Double Deluxe (AC)",
      capacity: 2,
      extraCapacity: 1,
      baseOccupancy: 2,
      bedType: "Queen / Twin AC",
      amenities: JSON.stringify(["Split AC", "LED TV", "High-Speed Wi-Fi", "Electric Kettle", "Attached Bath with Geyser", "Intercom"]),
    },
  });

  // 2. Double Executive (AC): 7 Rooms @ ₹2,500 / night
  const rtExecutive = await prisma.roomType.create({
    data: {
      organizationId: org.id,
      propertyId: propDivine.id,
      code: "EXE",
      name: "Double Executive (AC)",
      capacity: 2,
      extraCapacity: 1,
      baseOccupancy: 2,
      bedType: "King Bed AC",
      amenities: JSON.stringify(["Split AC", "Smart TV", "High-Speed Wi-Fi", "Work Desk", "Sofa Seating", "Minibar Fridge", "Electric Kettle"]),
    },
  });

  // 3. Family Executive (AC): 8 Rooms @ ₹3,000 / night
  const rtFamily = await prisma.roomType.create({
    data: {
      organizationId: org.id,
      propertyId: propDivine.id,
      code: "FAM",
      name: "Family Executive (AC)",
      capacity: 4,
      extraCapacity: 2,
      baseOccupancy: 4,
      bedType: "2 King Beds / Quad AC",
      amenities: JSON.stringify(["Large Family Suite", "Dual AC", "55\" Smart TV", "High-Speed Wi-Fi", "Spacious Lounge", "Attached Luxury Bathroom", "Tea/Coffee Bar"]),
    },
  });

  // Rate Plans for Hotel Divine View
  const ratePlans = [
    { rt: rtDeluxe, code: "BAR_DLX", name: "Double Deluxe (AC) - Best Available Rate", price: 2000 },
    { rt: rtExecutive, code: "BAR_EXE", name: "Double Executive (AC) - Best Available Rate", price: 2500 },
    { rt: rtFamily, code: "BAR_FAM", name: "Family Executive (AC) - Best Available Rate", price: 3000 },
  ];

  for (const rp of ratePlans) {
    const plan = await prisma.ratePlan.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        code: rp.code,
        name: rp.name,
        mealPlan: "EP",
      },
    });

    await prisma.ratePlanVersion.create({
      data: {
        ratePlanId: plan.id,
        roomTypeId: rp.rt.id,
        effectiveFrom: "2026-04-01",
        pricingJson: JSON.stringify({ basePrice: rp.price, extraAdult: 500, extraChild: 250 }),
      },
    });
  }

  // Physical Rooms Generation: EXACT 76 ROOMS
  // Floor 1: 101 to 120 (20 Deluxe)
  // Floor 2: 201 to 220 (20 Deluxe)
  // Floor 3: 301 to 321 (21 Deluxe) => 20 + 20 + 21 = 61 Deluxe Rooms
  // Floor 4: 401 to 407 (7 Executive) + 408 to 415 (8 Family Executive) => 15 Rooms
  // Total: 61 + 7 + 8 = 76 Rooms!
  const divineRooms: any[] = [];

  // Floor 1: 101-120
  for (let n = 101; n <= 120; n++) {
    const room = await prisma.room.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        roomTypeId: rtDeluxe.id,
        number: String(n),
        name: `Deluxe ${n}`,
        floor: 1,
        wing: "Paltan Wing",
      },
    });
    divineRooms.push(room);
  }

  // Floor 2: 201-220
  for (let n = 201; n <= 220; n++) {
    const room = await prisma.room.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        roomTypeId: rtDeluxe.id,
        number: String(n),
        name: `Deluxe ${n}`,
        floor: 2,
        wing: "Paltan Wing",
      },
    });
    divineRooms.push(room);
  }

  // Floor 3: 301-321 (21 Deluxe)
  for (let n = 301; n <= 321; n++) {
    const room = await prisma.room.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        roomTypeId: rtDeluxe.id,
        number: String(n),
        name: `Deluxe ${n}`,
        floor: 3,
        wing: "City View Wing",
      },
    });
    divineRooms.push(room);
  }

  // Floor 4: 401-407 (7 Executive)
  for (let n = 401; n <= 407; n++) {
    const room = await prisma.room.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        roomTypeId: rtExecutive.id,
        number: String(n),
        name: `Executive ${n}`,
        floor: 4,
        wing: "Executive Floor",
      },
    });
    divineRooms.push(room);
  }

  // Floor 4: 408-415 (8 Family Executive)
  for (let n = 408; n <= 415; n++) {
    const room = await prisma.room.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        roomTypeId: rtFamily.id,
        number: String(n),
        name: `Family Executive ${n}`,
        floor: 4,
        wing: "Executive Floor",
      },
    });
    divineRooms.push(room);
  }

  console.log(`✅ Created ${divineRooms.length} rooms for Hotel Divine View.`);

  // Initialize room states
  for (const r of divineRooms) {
    let hkStatus = "CLEAN";
    let sellStatus = "SELLABLE";
    if (r.number === "205" || r.number === "312") {
      hkStatus = "DIRTY";
    } else if (r.number === "101" || r.number === "401" || r.number === "408") {
      hkStatus = "INSPECTED";
    } else if (r.number === "315") {
      sellStatus = "OUT_OF_ORDER";
    }

    await prisma.roomState.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        roomId: r.id,
        occupancyStatus: "VACANT",
        housekeepingStatus: hkStatus,
        sellabilityStatus: sellStatus,
      },
    });
  }

  // Restaurant & In-Room Dining for Hotel Divine View
  const divineOutlet = await prisma.outlet.create({
    data: {
      organizationId: org.id,
      propertyId: propDivine.id,
      code: "DIVINE_DINE",
      name: "Divine Multi-Cuisine Restaurant",
      type: "RESTAURANT",
      supportedModes: "DINE_IN,TAKEAWAY,ROOM_SERVICE",
    },
  });

  const divineKitchen = await prisma.kitchenStation.create({
    data: {
      organizationId: org.id,
      propertyId: propDivine.id,
      outletId: divineOutlet.id,
      code: "MAIN_KITCHEN",
      name: "Main Hot Kitchen",
    },
  });

  const divinePantry = await prisma.kitchenStation.create({
    data: {
      organizationId: org.id,
      propertyId: propDivine.id,
      outletId: divineOutlet.id,
      code: "PANTRY",
      name: "Beverage & Tandoor Pantry",
    },
  });

  // 10 Dining Tables
  for (let t = 1; t <= 10; t++) {
    await prisma.diningTable.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        outletId: divineOutlet.id,
        name: `Table ${t}`,
        section: t <= 5 ? "Paltan Bazaar View" : "Main AC Dining",
        capacity: t % 2 === 0 ? 4 : 6,
      },
    });
  }

  // Menu Categories & Items
  const catDivineMains = await prisma.menuCategory.create({
    data: { organizationId: org.id, propertyId: propDivine.id, outletId: divineOutlet.id, name: "North Indian & Assamese Mains", sortOrder: 1 },
  });
  const catDivineTandoor = await prisma.menuCategory.create({
    data: { organizationId: org.id, propertyId: propDivine.id, outletId: divineOutlet.id, name: "Tandoori & Starters", sortOrder: 2 },
  });
  const catDivineBev = await prisma.menuCategory.create({
    data: { organizationId: org.id, propertyId: propDivine.id, outletId: divineOutlet.id, name: "Tea & Beverages", sortOrder: 3 },
  });

  const divineMenuItems = [
    { cat: catDivineMains.id, code: "DM-01", name: "Special Assamese Thali", price: 280, station: divineKitchen.id },
    { cat: catDivineMains.id, code: "DM-02", name: "Paneer Butter Masala", price: 240, station: divineKitchen.id },
    { cat: catDivineMains.id, code: "DM-03", name: "Chicken Curry Home Style", price: 320, station: divineKitchen.id },
    { cat: catDivineTandoor.id, code: "DT-01", name: "Tandoori Roti (Butter)", price: 30, station: divinePantry.id },
    { cat: catDivineTandoor.id, code: "DT-02", name: "Paneer Tikka Platter", price: 260, station: divinePantry.id },
    { cat: catDivineBev.id, code: "DB-01", name: "Assam Special Milk Tea", price: 40, station: divinePantry.id },
  ];

  for (const m of divineMenuItems) {
    const mi = await prisma.menuItem.create({
      data: { organizationId: org.id, propertyId: propDivine.id, categoryId: m.cat, code: m.code, name: m.name },
    });
    await prisma.menuItemVariant.create({
      data: { menuItemId: mi.id, name: "Standard", price: m.price, stationId: m.station },
    });
  }

  // =========================================================================
  // SETUP RIVERBEND HOTEL GUWAHATI (48 Rooms)
  // =========================================================================
  const roomTypesData = [
    { code: "STD", name: "Standard Room", capacity: 2, extraCapacity: 1, baseOccupancy: 2, bedType: "Queen", price: 3200, count: 12 },
    { code: "DLX", name: "Deluxe Riverview", capacity: 2, extraCapacity: 1, baseOccupancy: 2, bedType: "King", price: 4800, count: 18 },
    { code: "EXE", name: "Executive Club", capacity: 3, extraCapacity: 1, baseOccupancy: 2, bedType: "King", price: 7200, count: 12 },
    { code: "STE", name: "Presidential Suite", capacity: 4, extraCapacity: 2, baseOccupancy: 2, bedType: "King", price: 12500, count: 6 },
  ];

  const riverRooms: any[] = [];
  let roomCounter = 101;
  for (const rt of roomTypesData) {
    const createdRt = await prisma.roomType.create({
      data: {
        organizationId: org.id,
        propertyId: prop1.id,
        code: rt.code,
        name: rt.name,
        capacity: rt.capacity,
        extraCapacity: rt.extraCapacity,
        baseOccupancy: rt.baseOccupancy,
        bedType: rt.bedType,
        amenities: JSON.stringify(["Wi-Fi", "Smart TV", "Minibar"]),
      },
    });

    const ratePlan = await prisma.ratePlan.create({
      data: {
        organizationId: org.id,
        propertyId: prop1.id,
        code: `BAR_${rt.code}`,
        name: `${rt.name} - Best Available Rate (CP)`,
        mealPlan: "CP",
      },
    });

    await prisma.ratePlanVersion.create({
      data: {
        ratePlanId: ratePlan.id,
        roomTypeId: createdRt.id,
        effectiveFrom: "2026-04-01",
        pricingJson: JSON.stringify({ basePrice: rt.price, extraAdult: 1000, extraChild: 500 }),
      },
    });

    for (let i = 0; i < rt.count; i++) {
      const floor = Math.floor(roomCounter / 100);
      const roomNum = String(roomCounter);
      const room = await prisma.room.create({
        data: {
          organizationId: org.id,
          propertyId: prop1.id,
          roomTypeId: createdRt.id,
          number: roomNum,
          name: `${rt.name} ${roomNum}`,
          floor,
          wing: floor % 2 === 1 ? "East Wing" : "West Wing",
        },
      });
      riverRooms.push(room);

      await prisma.roomState.create({
        data: {
          organizationId: org.id,
          propertyId: prop1.id,
          roomId: room.id,
          occupancyStatus: "VACANT",
          housekeepingStatus: "CLEAN",
          sellabilityStatus: "SELLABLE",
        },
      });

      roomCounter++;
      if (roomCounter % 100 > 12) {
        roomCounter = (floor + 1) * 100 + 1;
      }
    }
  }

  // Setup Riverbend Restaurant
  const riverOutlet = await prisma.outlet.create({
    data: {
      organizationId: org.id,
      propertyId: prop1.id,
      code: "RIVER_CAFE",
      name: "River Café & Grill",
      type: "RESTAURANT",
      supportedModes: "DINE_IN,TAKEAWAY,ROOM_SERVICE",
    },
  });

  const riverKitchen = await prisma.kitchenStation.create({
    data: { organizationId: org.id, propertyId: prop1.id, outletId: riverOutlet.id, code: "MAIN_KITCHEN", name: "Main Hot Kitchen" },
  });

  for (let t = 1; t <= 6; t++) {
    await prisma.diningTable.create({
      data: { organizationId: org.id, propertyId: prop1.id, outletId: riverOutlet.id, name: `Table ${t}`, capacity: 4 },
    });
  }

  const catRiver = await prisma.menuCategory.create({
    data: { organizationId: org.id, propertyId: prop1.id, outletId: riverOutlet.id, name: "Starters & Grill", sortOrder: 1 },
  });

  const riverItem = await prisma.menuItem.create({
    data: { organizationId: org.id, propertyId: prop1.id, categoryId: catRiver.id, code: "ST-01", name: "Murgh Malai Tikka" },
  });
  await prisma.menuItemVariant.create({
    data: { menuItemId: riverItem.id, name: "Standard", price: 420, stationId: riverKitchen.id },
  });

  // Setup Shillong property
  const shlRt = await prisma.roomType.create({
    data: { organizationId: org.id, propertyId: prop2.id, code: "PIN_DLX", name: "Pine Forest Deluxe", capacity: 2 },
  });

  for (let i = 101; i <= 130; i++) {
    const r = await prisma.room.create({
      data: { organizationId: org.id, propertyId: prop2.id, roomTypeId: shlRt.id, number: String(i), floor: 1 },
    });
    await prisma.roomState.create({
      data: { organizationId: org.id, propertyId: prop2.id, roomId: r.id, occupancyStatus: "VACANT", housekeepingStatus: "CLEAN", sellabilityStatus: "SELLABLE" },
    });
  }

  // =========================================================================
  // GUESTS & INITIAL STAYS FOR HOTEL DIVINE VIEW
  // =========================================================================
  const guests = [
    { name: "Arjun Singhania", email: "arjun.singhania@corpindia.com", phone: "+91 98201 11223", nationality: "Indian", gstin: "27AAACS1234F1Z8", company: "Singhania Tech Ltd" },
    { name: "Meera Sen", email: "meera.sen@gmail.com", phone: "+91 98310 44556", nationality: "Indian" },
    { name: "Dr. Alok Bordoloi", email: "dr.bordoloi@aiims.gov.in", phone: "+91 99540 12345", nationality: "Indian" },
    { name: "Sunita Choudhury", email: "sunita.c@assamtea.com", phone: "+91 94351 99001", nationality: "Indian", gstin: "18AABCA4567M1ZV", company: "Assam Valley Teas" },
    { name: "Pranjal Phukan", email: "pranjal.p@oilindia.in", phone: "+91 94350 33445", nationality: "Indian" },
  ];

  const createdGuests = [];
  for (const g of guests) {
    const guest = await prisma.guest.create({
      data: { organizationId: org.id, name: g.name, email: g.email, phone: g.phone, nationality: g.nationality, gstin: g.gstin, companyName: g.company },
    });
    createdGuests.push(guest);
  }

  // In-House Stay 1: Deluxe Room 102
  const room102 = divineRooms.find((r) => r.number === "102");
  if (room102 && createdGuests[0]) {
    const stay1 = await prisma.stay.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        primaryGuestId: createdGuests[0].id,
        status: "IN_HOUSE",
        arrivalAt: new Date("2026-08-19T14:00:00Z"),
        expectedDepartureAt: new Date("2026-08-22T11:00:00Z"),
        adults: 2,
      },
    });

    await prisma.roomAssignment.create({
      data: { stayId: stay1.id, roomId: room102.id, startsAt: new Date("2026-08-19T14:00:00Z") },
    });

    await prisma.roomState.update({
      where: { roomId: room102.id },
      data: { occupancyStatus: "OCCUPIED" },
    });

    const folio1 = await prisma.folio.create({
      data: { organizationId: org.id, propertyId: propDivine.id, stayId: stay1.id, status: "OPEN", balance: 2240 },
    });

    const win1 = await prisma.folioWindow.create({
      data: { folioId: folio1.id, name: "Guest Window", windowNumber: 1, payerType: "GUEST", status: "OPEN" },
    });

    const gst1 = calculateGST({ grossOrBaseAmount: 2000, sacHsn: "996311" });
    await prisma.folioEntry.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        folioId: folio1.id,
        folioWindowId: win1.id,
        serviceDate: "2026-08-19",
        type: "CHARGE",
        chargeCode: "ROOM_TARIFF",
        description: "Room Tariff - Double Deluxe (AC) 102 (2026-08-19)",
        qty: 1,
        unitAmount: 2000,
        taxableAmount: gst1.taxableAmount,
        taxComponentsJson: JSON.stringify(gst1.components),
        totalAmount: gst1.totalAmount,
        sourceType: "PMS_NIGHTLY_CHARGE",
      },
    });

    await prisma.stay.update({ where: { id: stay1.id }, data: { folioId: folio1.id } });
  }

  // In-House Stay 2: Executive Room 402
  const room402 = divineRooms.find((r) => r.number === "402");
  if (room402 && createdGuests[1]) {
    const stay2 = await prisma.stay.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        primaryGuestId: createdGuests[1].id,
        status: "IN_HOUSE",
        arrivalAt: new Date("2026-08-20T12:00:00Z"),
        expectedDepartureAt: new Date("2026-08-23T11:00:00Z"),
        adults: 2,
      },
    });

    await prisma.roomAssignment.create({
      data: { stayId: stay2.id, roomId: room402.id, startsAt: new Date("2026-08-20T12:00:00Z") },
    });

    await prisma.roomState.update({
      where: { roomId: room402.id },
      data: { occupancyStatus: "OCCUPIED" },
    });

    const folio2 = await prisma.folio.create({
      data: { organizationId: org.id, propertyId: propDivine.id, stayId: stay2.id, status: "OPEN", balance: 0 },
    });

    await prisma.folioWindow.create({
      data: { folioId: folio2.id, name: "Guest Window", windowNumber: 1, payerType: "GUEST", status: "OPEN" },
    });

    await prisma.stay.update({ where: { id: stay2.id }, data: { folioId: folio2.id } });
  }

  // In-House Stay 3: Family Executive Room 409
  const room409 = divineRooms.find((r) => r.number === "409");
  if (room409 && createdGuests[2]) {
    const stay3 = await prisma.stay.create({
      data: {
        organizationId: org.id,
        propertyId: propDivine.id,
        primaryGuestId: createdGuests[2].id,
        status: "IN_HOUSE",
        arrivalAt: new Date("2026-08-20T13:30:00Z"),
        expectedDepartureAt: new Date("2026-08-24T11:00:00Z"),
        adults: 4,
      },
    });

    await prisma.roomAssignment.create({
      data: { stayId: stay3.id, roomId: room409.id, startsAt: new Date("2026-08-20T13:30:00Z") },
    });

    await prisma.roomState.update({
      where: { roomId: room409.id },
      data: { occupancyStatus: "OCCUPIED" },
    });

    const folio3 = await prisma.folio.create({
      data: { organizationId: org.id, propertyId: propDivine.id, stayId: stay3.id, status: "OPEN", balance: 0 },
    });

    await prisma.folioWindow.create({
      data: { folioId: folio3.id, name: "Guest Window", windowNumber: 1, payerType: "GUEST", status: "OPEN" },
    });

    await prisma.stay.update({ where: { id: stay3.id }, data: { folioId: folio3.id } });
  }

  // Seed Historical Metric Snapshots for Hotel Divine View
  for (let d = 13; d >= 0; d--) {
    const dateObj = new Date("2026-08-20");
    dateObj.setDate(dateObj.getDate() - d);
    const dateStr = dateObj.toISOString().split("T")[0];

    const baseOcc = 74 + Math.sin(d) * 10; // ~65% to 84%
    const roomsSold = Math.round((76 * baseOcc) / 100);
    const roomRev = roomsSold * 2200;
    const fbRev = Math.round(roomRev * 0.28);
    const grossRev = roomRev + fbRev;
    const totalTax = Math.round(roomRev * 0.12 + fbRev * 0.05);

    const metrics = [
      { code: "OCCUPANCY_PCT", val: Math.round(baseOcc * 10) / 10 },
      { code: "ADR", val: 2200 },
      { code: "REVPAR", val: Math.round(roomRev / 76) },
      { code: "ROOM_REVENUE", val: roomRev },
      { code: "FB_REVENUE", val: fbRev },
      { code: "GROSS_REVENUE", val: grossRev },
      { code: "TOTAL_TAX", val: totalTax },
      { code: "NET_RECEIPTS", val: grossRev + totalTax },
    ];

    for (const m of metrics) {
      await prisma.metricSnapshot.create({
        data: {
          organizationId: org.id,
          propertyId: propDivine.id,
          businessDate: dateStr,
          metricCode: m.code,
          value: m.val,
        },
      });
    }

    if (d > 0) {
      await prisma.operationalDay.create({
        data: {
          organizationId: org.id,
          propertyId: propDivine.id,
          businessDate: dateStr,
          status: "CLOSED",
          closedAt: new Date(`${dateStr}T21:30:00Z`),
        },
      });
    }
  }

  await prisma.operationalDay.create({
    data: {
      organizationId: org.id,
      propertyId: propDivine.id,
      businessDate: "2026-08-20",
      status: "OPEN",
    },
  });

  // =========================================================================
  // SEED SAMPLE DIGITAL GUEST CHECK-IN SUBMISSIONS (MIDDLE INTERFACE QUEUE)
  // =========================================================================
  await prisma.guestRegistration.create({
    data: {
      organizationId: org.id,
      propertyId: propDivine.id,
      registrationNo: "GRC-2627-0101",
      status: "PENDING_REVIEW",
      fullName: "ROBERT JOHN SMITH",
      age: 35,
      gender: "Male",
      nationality: "Australian",
      fatherSpouseName: "Edward Smith",
      arrivalDateTime: "20-08-2026 18:43",
      expectedDepartureDate: "2026-08-23",
      preAssignedRoom: "304",
      streetAddress: "42 George Street, The Rocks",
      city: "Sydney",
      state: "NSW",
      pinZipCode: "2000",
      country: "Australia",
      arrivedFrom: "Kolkata",
      goingTo: "Kaziranga National Park",
      purposeOfVisit: "Tourism / Holiday",
      referralChannel: "🔍 Google Search / Maps",
      mobilePhone: "+61 412 345 678",
      alternatePhone: "+91 98765 43210",
      email: "robert.smith@traveloz.com",
      driverName: "Bhaben Driver",
      vehicleNumber: "AS 01 EX 8899",
      coGuestsJson: JSON.stringify([
        { name: "EMILY SMITH", age: "32", gender: "Female", relation: "Spouse", idType: "PASSPORT" },
      ]),
      idDocumentType: "PASSPORT",
      idDocumentNumber: "PA8823901",
      termsAccepted: true,
      internalNotes: "Guest requested high floor river/city view and tea tray.",
    },
  });

  await prisma.guestRegistration.create({
    data: {
      organizationId: org.id,
      propertyId: propDivine.id,
      registrationNo: "GRC-2627-0102",
      status: "PENDING_REVIEW",
      fullName: "VIKAS KHANNA",
      age: 42,
      gender: "Male",
      nationality: "Indian",
      fatherSpouseName: "K.L. Khanna",
      arrivalDateTime: "20-08-2026 19:15",
      expectedDepartureDate: "2026-08-22",
      preAssignedRoom: "403",
      streetAddress: "Flat 4B, Salt Lake Sector 5",
      city: "Kolkata",
      state: "West Bengal",
      pinZipCode: "700091",
      country: "India",
      arrivedFrom: "Kolkata",
      goingTo: "Guwahati City Centre",
      purposeOfVisit: "Business / Corporate",
      referralChannel: "MakeMyTrip / Goibibo",
      mobilePhone: "+91 98300 98765",
      email: "vikas.khanna@bizindia.com",
      vehicleNumber: "WB 02 CC 4433",
      idDocumentType: "AADHAAR",
      idDocumentNumber: "6789",
      termsAccepted: true,
      internalNotes: "Corporate bill to company Singhania Tech.",
    },
  });

  console.log("✅ Seed completed successfully for Hotel Divine View (76 Rooms)!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
