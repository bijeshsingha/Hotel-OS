import * as fs from "fs";
import * as path from "path";

const ARCHIVES_DIR = path.join(process.cwd(), "prisma", "backups", "payment_archives");
const MASTER_BACKUP_FILE = path.join(process.cwd(), "prisma", "backups", "payment_master_backup.json");

/**
 * Ensures the Payment archive backup directories exist.
 */
function ensureArchiveDirs() {
  if (!fs.existsSync(ARCHIVES_DIR)) {
    fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
  }
}

/**
 * Permanently archives a Payment record snapshot to the backups directory.
 * Independent of SQLite - guarantees financial payments survive hard reboots or DB resets.
 */
export function archivePaymentSnapshot(
  paymentRecord: any,
  action: "COLLECTED" | "ALLOCATED" | "REFUNDED" | "VOIDED",
  actorName: string = "Staff"
) {
  try {
    ensureArchiveDirs();

    const timestamp = new Date().toISOString();
    const safeReceiptNo = (paymentRecord.receiptNo || paymentRecord.id || "REC-UNKNOWN").replace(/[^a-zA-Z0-9_-]/g, "_");

    const snapshot = {
      archiveTimestamp: timestamp,
      archiveAction: action,
      archivedBy: actorName,
      paymentData: paymentRecord,
    };

    // 1. Save individual JSON archive history
    const singleFilePath = path.join(ARCHIVES_DIR, `${safeReceiptNo}.json`);
    let history: any[] = [];
    if (fs.existsSync(singleFilePath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(singleFilePath, "utf8"));
        history = Array.isArray(existing) ? existing : [existing];
      } catch {}
    }
    history.push(snapshot);
    fs.writeFileSync(singleFilePath, JSON.stringify(history, null, 2), "utf8");

    // 2. Append to Master Payment Backup index
    let masterList: Record<string, any> = {};
    if (fs.existsSync(MASTER_BACKUP_FILE)) {
      try {
        masterList = JSON.parse(fs.readFileSync(MASTER_BACKUP_FILE, "utf8"));
      } catch {}
    }

    masterList[paymentRecord.receiptNo || paymentRecord.id] = {
      latestAction: action,
      lastArchivedAt: timestamp,
      id: paymentRecord.id,
      receiptNo: paymentRecord.receiptNo,
      amount: paymentRecord.amount,
      method: paymentRecord.method,
      reference: paymentRecord.reference,
      payerSnapshot: paymentRecord.payerSnapshot,
      status: paymentRecord.status,
      receivedAt: paymentRecord.receivedAt,
      folioId: paymentRecord.folioId,
      orderId: paymentRecord.orderId,
      reservationId: paymentRecord.reservationId,
      propertyId: paymentRecord.propertyId,
      organizationId: paymentRecord.organizationId,
    };

    fs.writeFileSync(MASTER_BACKUP_FILE, JSON.stringify(masterList, null, 2), "utf8");
    console.log(`[PAYMENT-ARCHIVE] Successfully archived ${paymentRecord.receiptNo} (${action})`);
  } catch (error) {
    console.error("[PAYMENT-ARCHIVE-ERROR] Failed to write payment archive backup:", error);
  }
}

/**
 * Returns all archived payment records from the master backup.
 */
export function getArchivedPaymentBackups(): any[] {
  try {
    ensureArchiveDirs();
    if (!fs.existsSync(MASTER_BACKUP_FILE)) return [];
    const masterList = JSON.parse(fs.readFileSync(MASTER_BACKUP_FILE, "utf8"));
    return Object.values(masterList);
  } catch (error) {
    console.error("[PAYMENT-ARCHIVE-ERROR] Failed to read payment backup list:", error);
    return [];
  }
}
