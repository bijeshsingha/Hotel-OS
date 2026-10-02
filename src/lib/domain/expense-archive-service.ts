import * as fs from "fs";
import * as path from "path";
import { prisma } from "../db/prisma";

const ARCHIVES_DIR = path.join(process.cwd(), "prisma", "backups", "expense_archives");
const MASTER_BACKUP_FILE = path.join(process.cwd(), "prisma", "backups", "expense_master_backup.json");

/**
 * Ensures the Expense archive backup directories exist.
 */
function ensureArchiveDirs() {
  if (!fs.existsSync(ARCHIVES_DIR)) {
    fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
  }
}

/**
 * Permanently archives an Expense record snapshot to the backups directory.
 * Independent of SQLite - guarantees vouchers survive hard reboots or DB resets.
 */
export function archiveExpenseSnapshot(
  expenseRecord: any,
  action: "CREATED" | "EDITED" | "VOIDED" | "DELETED",
  actorName: string = "Staff"
) {
  try {
    ensureArchiveDirs();

    const timestamp = new Date().toISOString();
    const safeVoucherNo = (expenseRecord.voucherNo || expenseRecord.id || "EXP-UNKNOWN").replace(/[^a-zA-Z0-9_-]/g, "_");

    const snapshot = {
      archiveTimestamp: timestamp,
      archiveAction: action,
      archivedBy: actorName,
      expenseData: expenseRecord,
    };

    // 1. Save individual JSON archive history
    const singleFilePath = path.join(ARCHIVES_DIR, `${safeVoucherNo}.json`);
    let history: any[] = [];
    if (fs.existsSync(singleFilePath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(singleFilePath, "utf8"));
        history = Array.isArray(existing) ? existing : [existing];
      } catch {}
    }
    history.push(snapshot);
    fs.writeFileSync(singleFilePath, JSON.stringify(history, null, 2), "utf8");

    // 2. Append to Master Expense Backup index
    let masterList: Record<string, any> = {};
    if (fs.existsSync(MASTER_BACKUP_FILE)) {
      try {
        masterList = JSON.parse(fs.readFileSync(MASTER_BACKUP_FILE, "utf8"));
      } catch {}
    }

    masterList[expenseRecord.voucherNo || expenseRecord.id] = {
      latestAction: action,
      lastArchivedAt: timestamp,
      id: expenseRecord.id,
      voucherNo: expenseRecord.voucherNo,
      category: expenseRecord.category,
      payeeName: expenseRecord.payeeName,
      description: expenseRecord.description,
      amount: expenseRecord.amount,
      taxAmount: expenseRecord.taxAmount,
      totalAmount: expenseRecord.totalAmount,
      paymentMethod: expenseRecord.paymentMethod,
      reference: expenseRecord.reference,
      notes: expenseRecord.notes,
      businessDate: expenseRecord.businessDate,
      paidAt: expenseRecord.paidAt,
      createdByName: expenseRecord.createdByName,
      status: expenseRecord.status || "PAID",
      propertyId: expenseRecord.propertyId,
      organizationId: expenseRecord.organizationId,
    };

    fs.writeFileSync(MASTER_BACKUP_FILE, JSON.stringify(masterList, null, 2), "utf8");
    console.log(`[EXPENSE-ARCHIVE] Successfully archived ${expenseRecord.voucherNo} (${action})`);
  } catch (error) {
    console.error("[EXPENSE-ARCHIVE-ERROR] Failed to write expense archive backup:", error);
  }
}

/**
 * Returns all archived expense records from the master backup.
 */
export function getArchivedExpenseBackups(): any[] {
  try {
    ensureArchiveDirs();
    if (!fs.existsSync(MASTER_BACKUP_FILE)) return [];
    const masterList = JSON.parse(fs.readFileSync(MASTER_BACKUP_FILE, "utf8"));
    return Object.values(masterList);
  } catch (error) {
    console.error("[EXPENSE-ARCHIVE-ERROR] Failed to read expense backup list:", error);
    return [];
  }
}

/**
 * Re-injects missing expenses from the master archive back into the active database.
 */
export async function restoreExpensesFromArchive(propertyId?: string): Promise<{
  restored: number;
  skipped: number;
  errors: string[];
}> {
  const archives = getArchivedExpenseBackups();
  let restored = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of archives) {
    if (propertyId && item.propertyId && item.propertyId !== propertyId) {
      continue;
    }

    try {
      const exists = await prisma.expense.findFirst({
        where: {
          OR: [
            { voucherNo: item.voucherNo },
            { id: item.id },
          ],
        },
      });

      if (exists) {
        skipped++;
        continue;
      }

      await prisma.expense.create({
        data: {
          id: item.id,
          organizationId: item.organizationId || "org_ambarish",
          propertyId: item.propertyId || "prop_ambarish",
          voucherNo: item.voucherNo,
          category: item.category || "MISCELLANEOUS",
          payeeName: item.payeeName || "Vendor",
          description: item.description || "Restored expense",
          amount: Number(item.amount || 0),
          taxAmount: Number(item.taxAmount || 0),
          totalAmount: Number(item.totalAmount || item.amount || 0),
          paymentMethod: item.paymentMethod || "CASH",
          reference: item.reference || null,
          notes: item.notes ? `${item.notes} [Restored from Archive]` : "[Restored from Archive]",
          businessDate: item.businessDate || new Date().toISOString().split("T")[0],
          paidAt: item.paidAt ? new Date(item.paidAt) : new Date(),
          createdByName: item.createdByName || "Staff",
          status: item.status || "PAID",
        },
      });
      restored++;
    } catch (e: any) {
      errors.push(`Voucher ${item.voucherNo}: ${e.message}`);
    }
  }

  return { restored, skipped, errors };
}
