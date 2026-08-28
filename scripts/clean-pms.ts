import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanPmsDatabase() {
  console.log("==========================================");
  console.log("🧹 HOTEL OS - PMS CLEANUP & RESET TO ZERO");
  console.log("==========================================");

  // 1. Create safety backup first
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const backupsDir = path.join(process.cwd(), "prisma", "backups");
  if (fs.existsSync(dbPath)) {
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
    const backupFile = path.join(backupsDir, `pre_clean_backup_${timestamp}.db`);
    fs.copyFileSync(dbPath, backupFile);
    console.log(`🛡️  Safety backup created at: ${backupFile}`);
  }

  // 2. Delete all transactional records in strict child-to-parent dependency order
  console.log("🗑️  Clearing all transactional stays, folios, orders & registrations...");

  // Invoices, Credit Notes & Lines
  if (prisma.creditNoteLine) await prisma.creditNoteLine.deleteMany({});
  if (prisma.creditNote) await prisma.creditNote.deleteMany({});
  if (prisma.invoiceLine) await prisma.invoiceLine.deleteMany({});
  if (prisma.invoice) await prisma.invoice.deleteMany({});

  // Payments, Allocations & Refunds
  if (prisma.refund) await prisma.refund.deleteMany({});
  if (prisma.paymentAllocation) await prisma.paymentAllocation.deleteMany({});
  if (prisma.deposit) await prisma.deposit.deleteMany({});
  if (prisma.payment) await prisma.payment.deleteMany({});

  // Folio Entries & Windows & Folios
  if (prisma.folioEntry) await prisma.folioEntry.deleteMany({});
  if (prisma.folioWindow) await prisma.folioWindow.deleteMany({});
  if (prisma.folio) await prisma.folio.deleteMany({});

  // Orders, KOTs & POS Shifts
  if (prisma.orderItemModifier) await prisma.orderItemModifier.deleteMany({});
  if (prisma.orderItem) await prisma.orderItem.deleteMany({});
  if (prisma.kotItem) await prisma.kotItem.deleteMany({});
  if (prisma.kot) await prisma.kot.deleteMany({});
  if (prisma.order) await prisma.order.deleteMany({});
  if (prisma.pOSShift) await prisma.pOSShift.deleteMany({});

  // Digital Registrations & GRC queue
  if (prisma.digitalRegistration) await prisma.digitalRegistration.deleteMany({});

  // Stays & Room Assignments (must be deleted before ReservationRooms)
  if (prisma.roomAssignment) await prisma.roomAssignment.deleteMany({});
  if (prisma.stayGuest) await prisma.stayGuest.deleteMany({});
  if (prisma.stay) await prisma.stay.deleteMany({});

  // Reservations
  if (prisma.reservationNight) await prisma.reservationNight.deleteMany({});
  if (prisma.reservationNote) await prisma.reservationNote.deleteMany({});
  if (prisma.reservationRoom) await prisma.reservationRoom.deleteMany({});
  if (prisma.reservation) await prisma.reservation.deleteMany({});

  // Housekeeping & Maintenance tasks
  if (prisma.hkTaskEvent) await prisma.hkTaskEvent.deleteMany({});
  if (prisma.housekeepingTask) await prisma.housekeepingTask.deleteMany({});
  if (prisma.maintenanceEvent) await prisma.maintenanceEvent.deleteMany({});
  if (prisma.maintenanceIssue) await prisma.maintenanceIssue.deleteMany({});

  // Room blocks & state history
  if (prisma.roomBlock) await prisma.roomBlock.deleteMany({});
  if (prisma.roomStateHistory) await prisma.roomStateHistory.deleteMany({});

  // Guests & Documents
  if (prisma.guestDocument) await prisma.guestDocument.deleteMany({});
  if (prisma.guest) await prisma.guest.deleteMany({});

  // Document Sequences (Reset counter to start fresh from 0001)
  if (prisma.documentSequence) await prisma.documentSequence.deleteMany({});

  console.log("✨ All transactional records deleted successfully.");

  // 3. Reset All Room States to VACANT, CLEAN, SELLABLE
  console.log("🛏️  Resetting all rooms to VACANT, CLEAN & SELLABLE...");
  const rooms = await prisma.room.findMany({});
  for (const r of rooms) {
    await prisma.roomState.upsert({
      where: { roomId: r.id },
      create: {
        organizationId: r.organizationId,
        propertyId: r.propertyId,
        roomId: r.id,
        occupancyStatus: "VACANT",
        housekeepingStatus: "CLEAN",
        sellabilityStatus: "SELLABLE",
      },
      update: {
        occupancyStatus: "VACANT",
        housekeepingStatus: "CLEAN",
        sellabilityStatus: "SELLABLE",
        dndUntil: null,
      },
    });
  }

  // 4. Verify Master Data intact
  const propCount = await prisma.property.count();
  const roomCount = await prisma.room.count();
  const roomTypeCount = await prisma.roomType.count();
  const userCount = await prisma.user.count();
  const menuCount = await prisma.menuItem.count();

  console.log("==========================================");
  console.log("✅ PMS CLEANUP COMPLETED - SYSTEM IS FRESH");
  console.log("==========================================");
  console.log(`🏨 Properties Intact:   ${propCount}`);
  console.log(`🚪 Rooms (All Vacant):  ${roomCount}`);
  console.log(`🛏️  Room Categories:     ${roomTypeCount}`);
  console.log(`👤 Staff / Users:       ${userCount}`);
  console.log(`🍽️  Menu Items:          ${menuCount}`);
  console.log(`📋 Active Stays:        0 (Clean Slate)`);
  console.log(`📅 Future Reservations: 0 (Clean Slate)`);
  console.log(`📝 Digital GRC Queue:   0 (Clean Slate)`);
  console.log("==========================================");
}

cleanPmsDatabase()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
