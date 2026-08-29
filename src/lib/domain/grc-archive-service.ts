import * as fs from "fs";
import * as path from "path";
import { prisma } from "../db/prisma";

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

  // 2. Update linked Stays
  const linkedStays = await prisma.stay.findMany({
    where: {
      OR: [
        { primaryGuest: { phone: mobilePhone } },
        { primaryGuest: { name: fullName } },
        ...(preAssignedRoom ? [{ roomAssignments: { some: { room: { number: preAssignedRoom } } } }] : []),
      ],
    },
    include: { primaryGuest: true, folio: { include: { payments: true } } },
  });

  for (const stay of linkedStays) {
    // Update stay's expected departure if modified
    if (expectedDepartureDate) {
      await prisma.stay.update({
        where: { id: stay.id },
        data: {
          expectedDepartureAt: new Date(`${expectedDepartureDate}T11:00:00`),
        },
      });
    }

    // Update primary guest profile linked to stay
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

    // Update folio payment payer snapshots
    if (stay.folio) {
      for (const payment of stay.folio.payments) {
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
