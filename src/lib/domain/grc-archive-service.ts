import * as fs from "fs";
import * as path from "path";
import { prisma } from "../db/prisma";
import { calculateGST } from "../gst/calculator";
import { getNextDocumentNumber } from "../sequence/generator";

const ARCHIVES_DIR = path.join(process.cwd(), "prisma", "backups", "grc_archives");
const MASTER_BACKUP_FILE = path.join(process.cwd(), "prisma", "backups", "grc_master_backup.json");

/**
 * Ensures the GRC archive backup directories exist.
 */
function ensureArchiveDirs() {
  if (!fs.existsSync(ARCHIVES_DIR)) {
    fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
  }
}

/**
 * Permanently archives a GRC record snapshot to the backups directory.
 */
export function archiveGrcSnapshot(
  grcRecord: any,
  action: "CREATED" | "EDITED" | "DELETED",
  actorId: string = "usr_admin"
) {
  try {
    ensureArchiveDirs();

    const timestamp = new Date().toISOString();
    const safeRegNo = (grcRecord.registrationNo || grcRecord.id || "GRC-UNKNOWN").replace(/[^a-zA-Z0-9_-]/g, "_");

    const snapshot = {
      archiveTimestamp: timestamp,
      archiveAction: action,
      archivedBy: actorId,
      grcData: grcRecord,
    };

    // 1. Save individual JSON archive
    const singleFilePath = path.join(ARCHIVES_DIR, `${safeRegNo}.json`);
    let history: any[] = [];
    if (fs.existsSync(singleFilePath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(singleFilePath, "utf8"));
        history = Array.isArray(existing) ? existing : [existing];
      } catch {}
    }
    history.push(snapshot);
    fs.writeFileSync(singleFilePath, JSON.stringify(history, null, 2), "utf8");

    // 2. Append to Master GRC Backup index
    let masterList: Record<string, any> = {};
    if (fs.existsSync(MASTER_BACKUP_FILE)) {
      try {
        masterList = JSON.parse(fs.readFileSync(MASTER_BACKUP_FILE, "utf8"));
      } catch {}
    }
    masterList[grcRecord.registrationNo] = {
      latestAction: action,
      lastArchivedAt: timestamp,
      fullName: grcRecord.fullName,
      mobilePhone: grcRecord.mobilePhone,
      preAssignedRoom: grcRecord.preAssignedRoom,
      arrivalDateTime: grcRecord.arrivalDateTime,
      idDocumentNumber: grcRecord.idDocumentNumber,
      depositAmount: grcRecord.depositAmount,
      agreedRoomTariff: grcRecord.agreedRoomTariff,
      advancePaymentMethod: grcRecord.advancePaymentMethod,
      fullRecord: grcRecord,
    };
    fs.writeFileSync(MASTER_BACKUP_FILE, JSON.stringify(masterList, null, 2), "utf8");

    console.log(`[GRC-ARCHIVE] Successfully archived ${grcRecord.registrationNo} (${action})`);
  } catch (error) {
    console.error("[GRC-ARCHIVE-ERROR] Failed to write GRC archive backup:", error);
  }
}

/**
 * Returns all archived / deleted GRC records from the master backup.
 */
export function getArchivedGrcBackups(): any[] {
  try {
    ensureArchiveDirs();
    if (!fs.existsSync(MASTER_BACKUP_FILE)) return [];
    const masterList = JSON.parse(fs.readFileSync(MASTER_BACKUP_FILE, "utf8"));
    return Object.values(masterList);
  } catch (error) {
    console.error("[GRC-ARCHIVE-ERROR] Failed to read GRC backup list:", error);
    return [];
  }
}

/**
 * Synchronizes GRC edits across all linked tables (Guest CRM, Stays, Folios, Payments).
 */
export async function syncGrcEditsEverywhere(updatedGrc: any) {
  const {
    id,
    registrationNo,
    fullName,
    mobilePhone,
    email,
    streetAddress,
    city,
    state,
    pinZipCode,
    country,
    idDocumentType,
    idDocumentNumber,
    expectedDepartureDate,
    preAssignedRoom,
    depositAmount,
    agreedRoomTariff,
    advancePaymentMethod,
  } = updatedGrc;

  const addressJson = JSON.stringify({
    street: streetAddress || "",
    city: city || "",
    state: state || "",
    postalCode: pinZipCode || "",
    country: country || "India",
  });

  // 1. Update Master Guest CRM record by mobilePhone or name
  if (mobilePhone) {
    await prisma.guest.updateMany({
      where: { phone: mobilePhone },
      data: {
        name: fullName || undefined,
        email: email !== undefined ? (email || null) : undefined,
        addressJson,
      },
    });
  }

  // 2. Update linked Stays & Folios
  const linkedStays = await prisma.stay.findMany({
    where: {
      OR: [
        { primaryGuest: { phone: mobilePhone } },
        { primaryGuest: { name: fullName } },
        ...(preAssignedRoom ? [{ roomAssignments: { some: { room: { number: preAssignedRoom } } } }] : []),
      ],
    },
    include: {
      property: true,
      primaryGuest: true,
      roomAssignments: { include: { room: true } },
      folio: {
        include: {
          windows: { include: { entries: true } },
          payments: { include: { allocations: true } },
        },
      },
    },
  });

  for (const stay of linkedStays) {
    // A. Update stay's expected departure if modified
    if (expectedDepartureDate) {
      await prisma.stay.update({
        where: { id: stay.id },
        data: {
          expectedDepartureAt: new Date(`${expectedDepartureDate}T11:00:00`),
        },
      });
    }

    // B. Update primary guest profile linked to stay
    if (stay.primaryGuestId) {
      await prisma.guest.update({
        where: { id: stay.primaryGuestId },
        data: {
          name: fullName || undefined,
          phone: mobilePhone || undefined,
          email: email !== undefined ? (email || null) : undefined,
          addressJson,
        },
      });
    }

    // C. Synchronize Agreed Room Tariff across RoomAssignment and Folio Charges
    if (agreedRoomTariff !== undefined && agreedRoomTariff !== null && agreedRoomTariff !== "") {
      const numTariff = Number(agreedRoomTariff);
      const isComp = numTariff === 0;

      // Update room assignments
      await prisma.roomAssignment.updateMany({
        where: { stayId: stay.id },
        data: {
          moveReason: isComp ? "AGREED_RATE:0" : `AGREED_RATE:${numTariff}`,
          rateHandling: isComp ? "COMPLIMENTARY" : undefined,
        },
      });

      // Update Folio Entry charges for room tariff
      if (stay.folio) {
        const roomGst = isComp
          ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: [] }
          : calculateGST({
              grossOrBaseAmount: numTariff,
              isInclusive: true,
              sacHsn: "996311",
              supplierStateCode: stay.property?.stateCode || "18",
              customTaxRate: 5,
            });

        for (const w of stay.folio.windows) {
          const tariffEntries = w.entries.filter(
            (e) => e.chargeCode === "ROOM_TARIFF" || e.sourceType === "PMS_NIGHTLY_CHARGE"
          );
          for (const entry of tariffEntries) {
            await prisma.folioEntry.update({
              where: { id: entry.id },
              data: {
                unitAmount: numTariff,
                taxableAmount: roomGst.taxableAmount,
                totalAmount: roomGst.totalAmount,
                taxComponentsJson: JSON.stringify(roomGst.components),
              },
            });
          }
        }
      }
    }

    // D. Synchronize Advance Deposit & Payment Method
    if (depositAmount !== undefined && stay.folio) {
      const numDeposit = Number(depositAmount) || 0;
      const guestWindow = stay.folio.windows[0];

      // Find any advance deposit payment
      const existingAdvancePayment = stay.folio.payments.find(
        (p) => p.reference === "ADVANCE_DEPOSIT" || p.reference?.startsWith("ADVANCE") || stay.folio?.payments.length === 1
      );

      if (numDeposit > 0) {
        if (existingAdvancePayment) {
          // Update existing advance payment amount and method
          await prisma.payment.update({
            where: { id: existingAdvancePayment.id },
            data: {
              amount: numDeposit,
              method: advancePaymentMethod || existingAdvancePayment.method || "CASH",
              payerSnapshot: JSON.stringify({
                name: fullName || stay.primaryGuest?.name || "Guest",
                phone: mobilePhone || stay.primaryGuest?.phone || "",
              }),
            },
          });

          await prisma.paymentAllocation.updateMany({
            where: { paymentId: existingAdvancePayment.id },
            data: { amount: numDeposit },
          });
        } else if (guestWindow) {
          // Create new advance deposit payment
          const recSeq = await getNextDocumentNumber(stay.propertyId, "RECEIPT");
          const newPayment = await prisma.payment.create({
            data: {
              organizationId: stay.organizationId,
              propertyId: stay.propertyId,
              receiptNo: recSeq.formattedNumber,
              folioId: stay.folio.id,
              amount: numDeposit,
              method: advancePaymentMethod || "CASH",
              reference: "ADVANCE_DEPOSIT",
              payerSnapshot: JSON.stringify({
                name: fullName || stay.primaryGuest?.name || "Guest",
                phone: mobilePhone || stay.primaryGuest?.phone || "",
              }),
              status: "SUCCEEDED",
              createdById: "usr_admin",
            },
          });

          await prisma.paymentAllocation.create({
            data: {
              paymentId: newPayment.id,
              folioWindowId: guestWindow.id,
              amount: numDeposit,
            },
          });
        }
      } else {
        // numDeposit is 0 -> If an advance deposit exists, remove it cleanly
        if (existingAdvancePayment && (existingAdvancePayment.reference === "ADVANCE_DEPOSIT" || existingAdvancePayment.reference?.startsWith("ADVANCE"))) {
          await prisma.paymentAllocation.deleteMany({
            where: { paymentId: existingAdvancePayment.id },
          });
          await prisma.payment.delete({
            where: { id: existingAdvancePayment.id },
          });
        }
      }
    }

    // E. Recalculate Folio Balance
    if (stay.folioId) {
      const allEntries = await prisma.folioEntry.findMany({
        where: { folioId: stay.folioId, status: "POSTED" },
      });
      const totalCharges = allEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

      const allPayments = await prisma.payment.findMany({
        where: { folioId: stay.folioId, status: "SUCCEEDED" },
      });
      const totalPayments = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const newBalance = Math.max(0, Math.round((totalCharges - totalPayments) * 100) / 100);

      await prisma.folio.update({
        where: { id: stay.folioId },
        data: { balance: newBalance },
      });
    }

    // F. Update folio payment payer snapshots
    if (stay.folio) {
      const refreshedPayments = await prisma.payment.findMany({
        where: { folioId: stay.folio.id },
      });
      for (const payment of refreshedPayments) {
        try {
          let snap = JSON.parse(payment.payerSnapshot || "{}");
          snap.name = fullName || snap.name;
          snap.phone = mobilePhone || snap.phone;
          await prisma.payment.update({
            where: { id: payment.id },
            data: { payerSnapshot: JSON.stringify(snap) },
          });
        } catch {}
      }
    }
  }

  // 3. Save to backup archive
  archiveGrcSnapshot(updatedGrc, "EDITED", "usr_admin");
}
