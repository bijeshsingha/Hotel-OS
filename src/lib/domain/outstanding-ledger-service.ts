import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db/prisma";

const BACKUPS_DIR = path.join(process.cwd(), "prisma", "backups");
const OUTSTANDING_FILE = path.join(BACKUPS_DIR, "outstanding_ledger.json");

export interface OutstandingRecord {
  id: string;
  propertyId: string;
  stayId: string;
  folioId: string;
  invoiceNo?: string;
  roomNumber: string;
  guestName: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  companyName?: string;
  gstin?: string;
  totalCharges: number;
  totalPayments: number;
  outstandingAmount: number;
  reason: string; // GUEST_DUE, COMPANY_BILL_BTC, DISPUTED_CHARGE, UNPAID_DEPARTURE, OTHER
  remarks?: string;
  settlementDueDate?: string;
  checkedOutAt: string;
  status: "UNSETTLED" | "PARTIALLY_SETTLED" | "SETTLED";
  settledAt?: string;
  settlementPayments?: Array<{
    amount: number;
    method: string;
    reference?: string;
    paidAt: string;
  }>;
}

function ensureStorage() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTSTANDING_FILE)) {
    fs.writeFileSync(OUTSTANDING_FILE, JSON.stringify({}, null, 2), "utf-8");
  }
}

export function getAllOutstandingRecords(): Record<string, OutstandingRecord> {
  ensureStorage();
  try {
    const raw = fs.readFileSync(OUTSTANDING_FILE, "utf-8");
    return JSON.parse(raw) || {};
  } catch (err) {
    console.error("Error reading outstanding ledger file:", err);
    return {};
  }
}

export function saveOutstandingRecord(record: OutstandingRecord) {
  ensureStorage();
  try {
    const records = getAllOutstandingRecords();
    records[record.id] = record;
    fs.writeFileSync(OUTSTANDING_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to outstanding ledger file:", err);
  }
}

export function markOutstandingSettled(folioId: string, paymentAmount: number, paymentMethod: string, reference?: string) {
  ensureStorage();
  try {
    const records = getAllOutstandingRecords();
    let updated = false;

    for (const key of Object.keys(records)) {
      const rec = records[key];
      if (rec.folioId === folioId || rec.id === folioId) {
        rec.settlementPayments = rec.settlementPayments || [];
        rec.settlementPayments.push({
          amount: paymentAmount,
          method: paymentMethod,
          reference,
          paidAt: new Date().toISOString(),
        });
        const totalSettled = rec.settlementPayments.reduce((s, p) => s + p.amount, 0);
        if (totalSettled >= rec.outstandingAmount) {
          rec.status = "SETTLED";
          rec.settledAt = new Date().toISOString();
        } else {
          rec.status = "PARTIALLY_SETTLED";
        }
        records[key] = rec;
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(OUTSTANDING_FILE, JSON.stringify(records, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Error updating outstanding settlement:", err);
  }
}

export async function getOutstandingList(propertyId?: string): Promise<OutstandingRecord[]> {
  const fileRecords = Object.values(getAllOutstandingRecords());
  
  // Also query active database folios with status "CLOSED_OUTSTANDING" or balance > 0
  try {
    const dbFolios = await prisma.folio.findMany({
      where: {
        status: { in: ["CLOSED_OUTSTANDING", "OUTSTANDING"] },
        ...(propertyId ? { propertyId } : {}),
      },
      include: {
        stay: {
          include: {
            primaryGuest: true,
            roomAssignments: { include: { room: true } },
          },
        },
        windows: true,
        payments: true,
      },
    });

    for (const f of dbFolios) {
      if (!fileRecords.some((r) => r.folioId === f.id)) {
        let snap: any = {};
        try {
          snap = JSON.parse(f.windows[0]?.guestOrCompanySnapshot || "{}");
        } catch {}

        const roomNo = snap.roomNumber || f.stay?.roomAssignments[0]?.room?.number || "—";
        const rec: OutstandingRecord = {
          id: f.id,
          propertyId: f.propertyId,
          stayId: f.stayId,
          folioId: f.id,
          roomNumber: roomNo,
          guestName: snap.name || f.stay?.primaryGuest?.name || "Guest",
          phone: snap.phone || f.stay?.primaryGuest?.phone || "—",
          email: snap.email || f.stay?.primaryGuest?.email,
          address: snap.address || "",
          companyName: snap.companyName || f.stay?.primaryGuest?.companyName,
          gstin: snap.gstin || f.stay?.primaryGuest?.gstin,
          totalCharges: f.balance,
          totalPayments: f.payments.reduce((s, p) => s + p.amount, 0),
          outstandingAmount: f.balance,
          reason: snap.outstandingReason || "GUEST_DUE",
          remarks: snap.outstandingRemarks || "",
          settlementDueDate: snap.settlementDueDate || "",
          checkedOutAt: f.closedAt?.toISOString() || f.updatedAt.toISOString(),
          status: f.balance <= 0 ? "SETTLED" : "UNSETTLED",
        };
        fileRecords.push(rec);
      }
    }
  } catch (err) {
    console.warn("Could not query DB folios for outstanding ledger:", err);
  }

  const filtered = propertyId ? fileRecords.filter((r) => r.propertyId === propertyId) : fileRecords;
  return filtered.sort((a, b) => new Date(b.checkedOutAt).getTime() - new Date(a.checkedOutAt).getTime());
}
