import { prisma } from "../src/lib/db/prisma";
import { calculateGST } from "../src/lib/gst/calculator";
import { sync24HourFolioCharges } from "../src/lib/domain/folio-service";

async function main() {
  console.log("=== Repairing Local Group Charges ===");
  const inHouseStays = await prisma.stay.findMany({
    where: { status: "IN_HOUSE" },
    include: {
      property: true,
      roomAssignments: { where: { endsAt: null }, include: { room: true } },
      folio: {
        include: {
          windows: {
            include: {
              entries: { where: { chargeCode: "ROOM_TARIFF", status: "POSTED" } },
            },
          },
        },
      },
    },
  });

  for (const stay of inHouseStays) {
    if (!stay.folio || stay.roomAssignments.length <= 1) continue;
    const window = stay.folio.windows[0];
    if (!window) continue;

    const existingEntries = window.entries;
    console.log(`\nStay ${stay.id} has ${stay.roomAssignments.length} rooms. Existing charges: ${existingEntries.length}`);

    for (const assignment of stay.roomAssignments) {
      const roomNo = assignment.room?.number;
      if (!roomNo) continue;

      const hasCharge = existingEntries.some((e) =>
        new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${roomNo}\\b`, "i").test(e.description)
      );

      if (!hasCharge) {
        let roomBasePrice = 1800;
        let isComp = false;
        let isRateInclusive = true;

        if (assignment.rateHandling === "COMPLIMENTARY" || assignment.moveReason === "AGREED_RATE:0") {
          roomBasePrice = 0;
          isComp = true;
        } else if (assignment.moveReason?.startsWith("AGREED_RATE:")) {
          const parts = assignment.moveReason.replace("AGREED_RATE:", "").split(":");
          roomBasePrice = Number(parts[0]) || 1800;
          if (parts[1] === "EXC") isRateInclusive = false;
        }

        const gst = isComp
          ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: [] }
          : calculateGST({
              grossOrBaseAmount: roomBasePrice,
              isInclusive: isRateInclusive,
              sacHsn: "996311",
              supplierStateCode: stay.property.stateCode || "18",
              customTaxRate: 5,
            });

        const entry = await prisma.folioEntry.create({
          data: {
            organizationId: stay.organizationId,
            propertyId: stay.propertyId,
            folioId: stay.folio.id,
            folioWindowId: window.id,
            serviceDate: stay.arrivalAt.toISOString().split("T")[0],
            type: "CHARGE",
            chargeCode: "ROOM_TARIFF",
            description: isComp
              ? `Room Tariff - Room ${roomNo} (Night 1 - COMPLIMENTARY)`
              : `Room Tariff - Room ${roomNo} (Night 1)`,
            qty: 1,
            unitAmount: roomBasePrice,
            taxableAmount: gst.taxableAmount,
            taxComponentsJson: JSON.stringify(gst.components),
            totalAmount: gst.totalAmount,
            sourceType: "PMS_NIGHTLY_CHARGE",
            status: "POSTED",
          },
        });
        console.log(`  -> Restored missing Night 1 charge for Room ${roomNo}: ₹${entry.totalAmount}`);
      }
    }

    // Now re-sync with our fixed multi-room aware sync24HourFolioCharges
    console.log(`  -> Running multi-room sync24HourFolioCharges for folio ${stay.folio.id}...`);
    const metrics = await sync24HourFolioCharges({ folioId: stay.folio.id });
    console.log(`  -> Sync completed:`, metrics);

    // Verify folio charges after sync
    const finalEntries = await prisma.folioEntry.findMany({
      where: { folioId: stay.folio.id, chargeCode: "ROOM_TARIFF", status: "POSTED" },
    });
    console.log(`  -> Final charges count in DB: ${finalEntries.length}`);
    for (const fe of finalEntries) {
      console.log(`     * ${fe.description} (₹${fe.totalAmount})`);
    }
  }

  console.log("\n=== Group Charges Repair Complete ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
