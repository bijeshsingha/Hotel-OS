import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("🏨 Starting Hotel Separation & User Access Configuration...");

  // 1. Find the properties
  const shl = await prisma.property.findFirst({ where: { code: "SHL-01" } });
  const divine = await prisma.property.findFirst({ where: { code: { in: ["HDW", "HDV-01", "HDV"] } } });
  const ambarish = await prisma.property.findFirst({ where: { code: "GUW-01" } });

  if (!divine || !ambarish) {
    console.error("❌ Divine View or Ambarish property not found!");
    return;
  }

  // 2. Remove SHL-01 (Third Hotel) cleanly
  if (shl) {
    console.log(`🗑️ Removing 3rd Hotel (${shl.displayName} - ${shl.code})...`);
    const pId = shl.id;

    // Use raw query with PRAGMA foreign_keys = OFF to guarantee clean cascade
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);
    await prisma.$executeRawUnsafe(`DELETE FROM PropertyGrant WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM RoomState WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM RoomBlock WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM RoomAssignment WHERE stayId IN (SELECT id FROM Stay WHERE propertyId = '${pId}');`);
    await prisma.$executeRawUnsafe(`DELETE FROM FolioEntry WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM FolioWindow WHERE folioId IN (SELECT id FROM Folio WHERE propertyId = '${pId}');`);
    await prisma.$executeRawUnsafe(`DELETE FROM Payment WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM Folio WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM Stay WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM ReservationNight WHERE reservationRoomId IN (SELECT id FROM ReservationRoom WHERE reservationId IN (SELECT id FROM Reservation WHERE propertyId = '${pId}'));`);
    await prisma.$executeRawUnsafe(`DELETE FROM ReservationRoom WHERE reservationId IN (SELECT id FROM Reservation WHERE propertyId = '${pId}');`);
    await prisma.$executeRawUnsafe(`DELETE FROM Reservation WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM Room WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM RoomType WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM RatePlan WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM DocumentSequence WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM TaxProfile WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM OrderItem WHERE orderId IN (SELECT id FROM "Order" WHERE propertyId = '${pId}');`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Order" WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM MenuItem WHERE categoryId IN (SELECT id FROM MenuCategory WHERE outletId IN (SELECT id FROM Outlet WHERE propertyId = '${pId}'));`);
    await prisma.$executeRawUnsafe(`DELETE FROM MenuCategory WHERE outletId IN (SELECT id FROM Outlet WHERE propertyId = '${pId}');`);
    await prisma.$executeRawUnsafe(`DELETE FROM DiningTable WHERE outletId IN (SELECT id FROM Outlet WHERE propertyId = '${pId}');`);
    await prisma.$executeRawUnsafe(`DELETE FROM KitchenStation WHERE outletId IN (SELECT id FROM Outlet WHERE propertyId = '${pId}');`);
    await prisma.$executeRawUnsafe(`DELETE FROM Outlet WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM HousekeepingTask WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM MaintenanceIssue WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM OperationalDay WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM Notification WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM AuditLog WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM MetricSnapshot WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM Expense WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM GuestRegistration WHERE propertyId = '${pId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM Property WHERE id = '${pId}';`);
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);

    console.log("✅ 3rd Hotel (SHL-01) removed completely.");
  }

  // 3. Ensure clear, distinct details for the 2 remaining properties
  await prisma.property.update({
    where: { id: divine.id },
    data: {
      code: "HDW",
      legalName: "Hotel Divine View Private Limited",
      displayName: "HOTEL DIVINE VIEW",
      gstin: "18AABCD1234F1Z8",
      stateCode: "18",
      address: "Paltan Bazaar, Station Road, Guwahati, Assam 781008",
      phone: "+91 361 254 8890",
      email: "reservations@hoteldivineview.com",
    },
  });

  await prisma.property.update({
    where: { id: ambarish.id },
    data: {
      code: "GUW-01",
      legalName: "Ambarish Hotels & Resorts Limited",
      displayName: "Hotel Ambarish Grand Residency",
      gstin: "18AAAAA1234A1Z5",
      stateCode: "18",
      address: "MD Shah Road, Paltan Bazaar, Guwahati, Assam 781008",
      phone: "+91 361 273 5566",
      email: "stay@hotelambarish.com",
    },
  });

  console.log("🏢 Verified 2 Properties:");
  console.log(`   1. ${divine.displayName} (${divine.code}) - GSTIN: 18AABCD1234F1Z8`);
  console.log(`   2. ${ambarish.displayName} (${ambarish.code}) - GSTIN: 18AAAAA1234A1Z5`);

  // 4. Setup Roles
  let frontDeskRole = await prisma.role.findFirst({ where: { code: "FRONT_DESK" } });
  if (!frontDeskRole) {
    frontDeskRole = await prisma.role.findFirst({ where: { code: "FD_AGENT" } });
  }
  if (!frontDeskRole) {
    frontDeskRole = await prisma.role.create({
      data: {
        code: "FRONT_DESK",
        name: "Front Desk Receptionist",
        description: "Front desk operations, check-in/out, folios and payments",
        scopeType: "PROPERTY",
      },
    });
  }

  let gmRole = await prisma.role.findFirst({ where: { code: "ORG_OWNER" } });
  if (!gmRole) {
    gmRole = await prisma.role.create({
      data: {
        code: "ORG_OWNER",
        name: "General Manager / Owner",
        description: "Full access to all properties and financial audits",
        scopeType: "ORG",
      },
    });
  }

  // 5. Create or Update the Ambarish-Only User
  const ambarishEmail = "reception.ambarish@hotelos.in";
  let ambarishUser = await prisma.user.findUnique({ where: { email: ambarishEmail } });
  if (!ambarishUser) {
    ambarishUser = await prisma.user.create({
      data: {
        email: ambarishEmail,
        name: "Rupjyoti Sarma (Ambarish Front Desk)",
        phone: "+91 98640 12345",
        status: "ACTIVE",
      },
    });
  } else {
    await prisma.user.update({
      where: { id: ambarishUser.id },
      data: { name: "Rupjyoti Sarma (Ambarish Front Desk)" },
    });
  }

  // Ensure Ambarish user membership and property grants are strictly ONLY GUW-01
  let ambarishMembership = await prisma.membership.findFirst({
    where: { userId: ambarishUser.id, organizationId: divine.organizationId },
  });
  if (!ambarishMembership) {
    ambarishMembership = await prisma.membership.create({
      data: {
        userId: ambarishUser.id,
        organizationId: divine.organizationId,
        status: "ACTIVE",
      },
    });
  }

  // Clear existing grants and grant ONLY Ambarish
  await prisma.propertyGrant.deleteMany({ where: { membershipId: ambarishMembership.id } });
  await prisma.propertyGrant.create({
    data: {
      membershipId: ambarishMembership.id,
      propertyId: ambarish.id, // ONLY AMBARISH
      roleId: frontDeskRole.id,
    },
  });

  // 6. Create or Update Divine View-Only User
  const divineEmail = "reception.divine@hotelos.in";
  let divineUser = await prisma.user.findUnique({ where: { email: divineEmail } });
  if (!divineUser) {
    divineUser = await prisma.user.create({
      data: {
        email: divineEmail,
        name: "Bhaskar Bora (Divine View Front Desk)",
        phone: "+91 98640 67890",
        status: "ACTIVE",
      },
    });
  } else {
    await prisma.user.update({
      where: { id: divineUser.id },
      data: { name: "Bhaskar Bora (Divine View Front Desk)" },
    });
  }

  let divineMembership = await prisma.membership.findFirst({
    where: { userId: divineUser.id, organizationId: divine.organizationId },
  });
  if (!divineMembership) {
    divineMembership = await prisma.membership.create({
      data: {
        userId: divineUser.id,
        organizationId: divine.organizationId,
        status: "ACTIVE",
      },
    });
  }

  await prisma.propertyGrant.deleteMany({ where: { membershipId: divineMembership.id } });
  await prisma.propertyGrant.create({
    data: {
      membershipId: divineMembership.id,
      propertyId: divine.id, // ONLY DIVINE VIEW
      roleId: frontDeskRole.id,
    },
  });

  // 7. Update General Manager / Multi-Property Admin
  const gmEmail = "gm@brahmaputra.com";
  let gmUser = await prisma.user.findUnique({ where: { email: gmEmail } });
  if (!gmUser) {
    gmUser = await prisma.user.create({
      data: {
        email: gmEmail,
        name: "General Manager (Both Properties)",
        phone: "+91 94350 99999",
        status: "ACTIVE",
      },
    });
  }

  let gmMembership = await prisma.membership.findFirst({
    where: { userId: gmUser.id, organizationId: divine.organizationId },
  });
  if (!gmMembership) {
    gmMembership = await prisma.membership.create({
      data: {
        userId: gmUser.id,
        organizationId: divine.organizationId,
        status: "ACTIVE",
      },
    });
  }

  await prisma.propertyGrant.deleteMany({ where: { membershipId: gmMembership.id } });
  await prisma.propertyGrant.create({
    data: {
      membershipId: gmMembership.id,
      propertyId: divine.id, // Divine View
      roleId: gmRole.id,
    },
  });
  await prisma.propertyGrant.create({
    data: {
      membershipId: gmMembership.id,
      propertyId: ambarish.id, // Ambarish
      roleId: gmRole.id,
    },
  });

  console.log("🔐 Configured User Logins:");
  console.log(`   1. Ambarish-Only User: ${ambarishUser.email} -> Access to [Hotel Ambarish Grand Residency] ONLY`);
  console.log(`   2. Divine-Only User:   ${divineUser.email} -> Access to [HOTEL DIVINE VIEW] ONLY`);
  console.log(`   3. Multi-Property GM:  ${gmUser.email} -> Access to BOTH properties`);

  const activeProps = await prisma.property.findMany();
  console.log(`\n🎉 Completed! Total active properties in system: ${activeProps.length}`);
}

run()
  .catch((e) => {
    console.error("Execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
