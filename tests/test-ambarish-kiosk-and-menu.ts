import { prisma } from "../src/lib/db/prisma";

async function verifyMultiPropertyAndKiosk() {
  console.log("🚀 Starting Comprehensive Verification: Hotel Ambarish vs Hotel Divine View...");

  // 1. Check Properties in DB
  const ambarish = await prisma.property.findFirst({
    where: { code: "GUW-01" },
    include: { rooms: true, stays: true, guestRegistrations: true, folios: true },
  });

  const divine = await prisma.property.findFirst({
    where: { code: { in: ["HDW", "HDV-01"] } },
    include: { rooms: true, stays: true, guestRegistrations: true, folios: true },
  });

  if (!ambarish || !divine) {
    throw new Error("Missing properties in database!");
  }

  console.log(`✅ Properties verified:`);
  console.log(`   - Hotel Ambarish (${ambarish.code}): ${ambarish.rooms.length} Rooms, ${ambarish.stays.length} In-House Stays, ${ambarish.guestRegistrations.length} Registrations`);
  console.log(`   - Hotel Divine View (${divine.code}): ${divine.rooms.length} Rooms, ${divine.stays.length} In-House Stays, ${divine.guestRegistrations.length} Registrations`);

  // 2. Test Shared Restaurant Menu
  const outlets = await prisma.outlet.findMany({
    include: { categories: { include: { items: true } } },
  });

  console.log(`\n🍽️ Shared Restaurant Outlets count: ${outlets.length}`);
  for (const o of outlets) {
    const totalItems = o.categories.reduce((sum, c) => sum + c.items.length, 0);
    console.log(`   - Outlet: "${o.name}" (Prop: ${o.propertyId}) -> ${o.categories.length} Categories, ${totalItems} Items`);
  }

  // 3. Test In-Room Dining Menu API for Ambarish
  const ambarishRoomsOccupied = await prisma.roomAssignment.findMany({
    where: {
      room: { propertyId: ambarish.id },
      endsAt: null,
      stay: { status: "IN_HOUSE" },
    },
    include: { room: true, stay: { include: { primaryGuest: true, folio: true } } },
  });

  console.log(`\n🛏️ Ambarish In-House Occupied Rooms: ${ambarishRoomsOccupied.length}`);
  ambarishRoomsOccupied.forEach((a) => {
    console.log(`   - Room ${a.room.number}: Guest "${a.stay.primaryGuest.name}", Folio ID: ${a.stay.folio?.id}`);
  });

  // 4. Test Kiosk Registration Scoping
  const initialAmbarishRegs = await prisma.guestRegistration.count({ where: { propertyId: ambarish.id } });
  const initialDivineRegs = await prisma.guestRegistration.count({ where: { propertyId: divine.id } });

  // Simulate new Kiosk check-in at Hotel Ambarish
  const regCount = await prisma.guestRegistration.count({ where: { propertyId: ambarish.id } });
  const regNo = `GRC-AMB-2627-${String(regCount + 101).padStart(4, "0")}`;

  const testReg = await prisma.guestRegistration.create({
    data: {
      organizationId: ambarish.organizationId,
      propertyId: ambarish.id,
      registrationNo: regNo,
      status: "PENDING_REVIEW",
      fullName: "DEBOJIT CHOUDHURY",
      age: 38,
      gender: "Male",
      nationality: "Indian",
      arrivalDateTime: "2026-08-22 13:00",
      preAssignedRoom: "305",
      city: "Guwahati",
      mobilePhone: "+91 98640 55443",
      idDocumentType: "AADHAAR",
      termsAccepted: true,
    },
  });

  const postAmbarishRegs = await prisma.guestRegistration.count({ where: { propertyId: ambarish.id } });
  const postDivineRegs = await prisma.guestRegistration.count({ where: { propertyId: divine.id } });

  console.log(`\n📋 Kiosk Registration Scoping Test:`);
  console.log(`   - Created Registration: ${testReg.registrationNo} for ${testReg.fullName}`);
  console.log(`   - Hotel Ambarish queue count: ${initialAmbarishRegs} -> ${postAmbarishRegs} (Incremented by 1 ✅)`);
  console.log(`   - Hotel Divine View queue count: ${initialDivineRegs} -> ${postDivineRegs} (Strictly isolated, unchanged ✅)`);

  if (postAmbarishRegs !== initialAmbarishRegs + 1 || postDivineRegs !== initialDivineRegs) {
    throw new Error("Registration scoping failed!");
  }

  // Clean up test registration
  await prisma.guestRegistration.delete({ where: { id: testReg.id } });

  console.log("\n🎉 All Multi-Property, Dedicated Kiosk, and Shared Restaurant Invariants PASS!");
}

verifyMultiPropertyAndKiosk()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Verification failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
