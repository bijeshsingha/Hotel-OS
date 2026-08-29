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

  const p = prisma as any;
  // Invoices, Credit Notes & Lines
  if (p.creditNoteLine) await p.creditNoteLine.deleteMany({});
  if (p.creditNote) await p.creditNote.deleteMany({});
  if (p.invoiceLine) await p.invoiceLine.deleteMany({});
  if (p.invoice) await p.invoice.deleteMany({});

  // Payments, Allocations & Refunds
  if (p.refund) await p.refund.deleteMany({});
  if (p.paymentAllocation) await p.paymentAllocation.deleteMany({});
  if (p.deposit) await p.deposit.deleteMany({});
  if (p.payment) await p.payment.deleteMany({});

  // Folio Entries & Windows & Folios
  if (p.folioEntry) await p.folioEntry.deleteMany({});
  if (p.folioWindow) await p.folioWindow.deleteMany({});
  if (p.folio) await p.folio.deleteMany({});

  // Orders, KOTs & POS Shifts
  if (p.orderItemModifier) await p.orderItemModifier.deleteMany({});
  if (p.orderItem) await p.orderItem.deleteMany({});
  if (p.kotItem) await p.kotItem.deleteMany({});
  if (p.kOTItem) await p.kOTItem.deleteMany({});
  if (p.kot) await p.kot.deleteMany({});
  if (p.kOT) await p.kOT.deleteMany({});
  if (p.order) await p.order.deleteMany({});
  if (p.pOSShift) await p.pOSShift.deleteMany({});

  // Digital Registrations & GRC queue
  if (p.digitalRegistration) await p.digitalRegistration.deleteMany({});

  // Stays & Room Assignments (must be deleted before ReservationRooms)
  if (p.roomAssignment) await p.roomAssignment.deleteMany({});
  if (p.stayGuest) await p.stayGuest.deleteMany({});
  if (p.stay) await p.stay.deleteMany({});

  // Reservations
  if (p.reservationNight) await p.reservationNight.deleteMany({});
  if (p.reservationNote) await p.reservationNote.deleteMany({});
  if (p.reservationRoom) await p.reservationRoom.deleteMany({});
  if (p.reservation) await p.reservation.deleteMany({});

  // Housekeeping & Maintenance tasks
  if (p.hkTaskEvent) await p.hkTaskEvent.deleteMany({});
  if (p.hKTaskEvent) await p.hKTaskEvent.deleteMany({});
  if (p.housekeepingTask) await p.housekeepingTask.deleteMany({});
  if (p.maintenanceEvent) await p.maintenanceEvent.deleteMany({});
  if (p.maintenanceIssue) await p.maintenanceIssue.deleteMany({});

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
