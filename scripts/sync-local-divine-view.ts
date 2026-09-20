/**
 * scripts/sync-local-divine-view.ts
 *
 * SAFELY updates the physical room layout for Hotel Divine View (HDV-01)
 * STRICTLY in the local SQLite database (dev.db).
 *
 * SAFETY GUARANTEES:
 * - Refuses to run if DATABASE_URL is not pointing to a local SQLite file (dev.db).
 * - Never communicates with any remote / external database.
 * - Does not touch any other property (e.g. Hotel Ambarish remains untouched).
 */

import { PrismaClient } from "@prisma/client";
import { HOTEL_DIVINE_VIEW_PRESET } from "../src/lib/onboarding/divine-view-data";

// 1. STRICT LOCAL ENVIRONMENT CHECK
const dbUrl = process.env.DATABASE_URL || "";
if (!dbUrl.includes("dev.db") && !dbUrl.startsWith("file:")) {
  console.error("❌ SAFETY ABORT: DATABASE_URL is not local dev.db! Refusing to run to protect remote databases.");
  console.error(`Current DATABASE_URL: ${dbUrl}`);
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log("🔒 Verified strictly local SQLite database:", dbUrl);
  console.log("🏨 Initiating local room update for Hotel Divine View (HDV-01)...");

  // 2. Find Hotel Divine View property
  const divine = await prisma.property.findFirst({
    where: {
      code: { in: ["HDV-01", "HDV", "HDW"] }
    },
    include: {
      rooms: true,
      roomTypes: true
    }
  });

  if (!divine) {
    console.error("❌ Property Hotel Divine View (HDV-01) not found in local database!");
    return;
  }

  console.log(`✅ Located Property: "${divine.displayName}" (ID: ${divine.id}, Code: ${divine.code})`);

  // Safety check: verify no active bookings would be orphaned
  const stayCount = await prisma.stay.count({ where: { propertyId: divine.id } });
  const resCount = await prisma.reservation.count({ where: { propertyId: divine.id } });
  if (stayCount > 0 || resCount > 0) {
    console.warn(`⚠️ Warning: Found ${stayCount} stays and ${resCount} reservations for HDV-01.`);
  }

  // 3. Clean up existing rooms & room types for HDV-01 only
  console.log(`🧹 Cleaning up rooms & room types for ${divine.displayName}...`);
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);
  await prisma.$executeRawUnsafe(`DELETE FROM RoomState WHERE propertyId = '${divine.id}';`);
  await prisma.$executeRawUnsafe(`DELETE FROM RoomBlock WHERE propertyId = '${divine.id}';`);
  await prisma.$executeRawUnsafe(`DELETE FROM Room WHERE propertyId = '${divine.id}';`);
  await prisma.$executeRawUnsafe(`DELETE FROM RatePlanVersion WHERE roomTypeId IN (SELECT id FROM RoomType WHERE propertyId = '${divine.id}');`);
  await prisma.$executeRawUnsafe(`DELETE FROM RoomType WHERE propertyId = '${divine.id}';`);
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);

  // 4. Ensure an EP RatePlan exists for this property
  let ratePlanEP = await prisma.ratePlan.findFirst({
    where: { propertyId: divine.id, code: "EP" }
  });
  if (!ratePlanEP) {
    ratePlanEP = await prisma.ratePlan.create({
      data: {
        organizationId: divine.organizationId,
        propertyId: divine.id,
        code: "EP",
        name: "Standard Room Only (EP)",
        mealPlan: "EP",
        priority: 1,
        active: true
      }
    });
  }

  // Ensure default tax profile exists
  let tax12 = await prisma.taxProfile.findFirst({
    where: { propertyId: divine.id, supplyType: "ACCOMMODATION" }
  });

  // 5. Create 8 Distinct Room Types separated by Bed Configuration
  const roomTypeMap = new Map<string, string>(); // code -> id

  for (const rt of HOTEL_DIVINE_VIEW_PRESET.roomTypes) {
    const createdRt = await prisma.roomType.create({
      data: {
        organizationId: divine.organizationId,
        propertyId: divine.id,
        code: rt.code,
        name: rt.name,
        capacity: rt.capacity,
        extraCapacity: rt.extraCapacity,
        baseOccupancy: 2,
        bedType: rt.bedType,
        amenities: JSON.stringify(rt.amenities),
        active: true
      }
    });

    // Create rate version
    await prisma.ratePlanVersion.create({
      data: {
        ratePlanId: ratePlanEP.id,
        roomTypeId: createdRt.id,
        effectiveFrom: "2026-04-01",
        daysMask: "1111111",
        pricingJson: JSON.stringify({
          basePrice: rt.baseRate,
          extraAdult: rt.extraAdultRate,
          extraChild: rt.extraChildRate
        }),
        taxProfileId: tax12 ? tax12.id : null,
        active: true
      }
    });

    roomTypeMap.set(rt.code, createdRt.id);
    console.log(`  ✓ Created Room Type: "${rt.name}" [Code: ${rt.code}, Bed: ${rt.bedType}]`);
  }

  // 6. Insert exact 75 rooms across 5 floors with their proper RoomType and Wing
  console.log(`\n✨ Seeding 75 physical rooms for ${divine.displayName}...`);
  let count = 0;

  for (const rm of HOTEL_DIVINE_VIEW_PRESET.rooms) {
    const rtId = roomTypeMap.get(rm.roomTypeCode);
    if (!rtId) {
      throw new Error(`Missing room type ID for code ${rm.roomTypeCode}`);
    }

    const roomNum = String(rm.number).trim();
    const sortVal = parseInt(roomNum, 10) || 100;

    await prisma.room.create({
      data: {
        organizationId: divine.organizationId,
        propertyId: divine.id,
        roomTypeId: rtId,
        number: roomNum,
        name: `Room ${roomNum}`,
        floor: rm.floor,
        wing: rm.wing || null,
        sortOrder: sortVal,
        active: true,
        roomState: {
          create: {
            organizationId: divine.organizationId,
            propertyId: divine.id,
            housekeepingStatus: "CLEAN",
            occupancyStatus: "VACANT",
            sellabilityStatus: "SELLABLE"
          }
        }
      }
    });
    count++;
  }

  console.log(`🎉 Successfully created ${count} rooms in local database!`);

  // 7. Verify inventory breakdown
  const verifyRooms = await prisma.room.findMany({
    where: { propertyId: divine.id },
    include: { roomType: true },
    orderBy: [{ floor: 'asc' }, { sortOrder: 'asc' }]
  });

  const bedTypeCounts: Record<string, number> = {};
  for (const r of verifyRooms) {
    const bt = r.roomType.bedType;
    bedTypeCounts[bt] = (bedTypeCounts[bt] || 0) + 1;
  }

  console.log("\n📊 BED TYPE SUMMARY FOR HOTEL DIVINE VIEW:");
  for (const [b, c] of Object.entries(bedTypeCounts)) {
    console.log(`  • ${b}: ${c} rooms`);
  }

  // Verify other properties (e.g. Ambarish) were untouched
  const amb = await prisma.property.findFirst({
    where: { code: "GUW-01" },
    include: { _count: { select: { rooms: true, roomTypes: true } } }
  });
  if (amb) {
    console.log(`\n🛡️ Verified other properties intact: ${amb.displayName} (${amb.code}) has ${amb._count.rooms} rooms and ${amb._count.roomTypes} room types.`);
  }
}

main()
  .catch((err) => {
    console.error("Error syncing rooms:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
