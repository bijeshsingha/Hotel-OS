import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { calculateGST, round2 } from "@/lib/gst/calculator";
import { MANUAL_CHARGE_GST_RATE, manualKotDescription, normalizeManualKots } from "@/lib/billing/manual-kot";

export async function postManualKotBatch({ folioId, folioWindowId, requestId, kots: input, actorId, actorName }: {
  folioId: string;
  folioWindowId?: string;
  requestId: unknown;
  kots: unknown;
  actorId: string;
  actorName: string;
}) {
  if (typeof requestId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId)) throw new Error("A valid KOT posting reference is required. Reopen the form and try again.");
  const kots = normalizeManualKots(input);
  const sourceId = `MANUAL_KOT_BATCH:${requestId}`;
  const prepared = kots.map((kot, index) => ({ ...kot, description: manualKotDescription(kot), id: `kot_${createHash("sha256").update(`${folioId}:${requestId}:${index}`).digest("hex")}` }));

  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Acquire the SQLite write lock before checking for a previously posted batch.
        await tx.folio.update({ where: { id: folioId }, data: { updatedAt: new Date() } });
        const folio = await tx.folio.findUniqueOrThrow({ where: { id: folioId }, include: { property: true, windows: true } });
        const windowId = folioWindowId || folio.windows[0]?.id;
        if (!windowId || !folio.windows.some(window => window.id === windowId)) throw new Error("Select a valid window belonging to this folio.");

        const existing = await tx.folioEntry.findMany({ where: { folioId, sourceType: "MANUAL_CHARGE", sourceId } });
        if (existing.length) {
          const matches = existing.length === prepared.length && prepared.every(kot => existing.some(entry => entry.id === kot.id && entry.folioWindowId === windowId && entry.description === kot.description && entry.unitAmount === kot.amount && entry.chargeCode === "RESTAURANT_FOOD"));
          if (!matches) throw new Error("This posting reference has already been used for different KOTs. Check the folio before starting another batch.");
          return { entries: existing, totalAmount: round2(existing.reduce((sum, entry) => sum + entry.totalAmount, 0)), idempotentReplay: true };
        }
        if (folio.status !== "OPEN") throw new Error(`Folio is ${folio.status}. Cannot post new charges.`);

        const entries = [];
        for (const kot of prepared) {
          const gst = calculateGST({ grossOrBaseAmount: kot.amount, isInclusive: true, sacHsn: "996331", customTaxRate: MANUAL_CHARGE_GST_RATE, supplierStateCode: folio.property.stateCode || "18" });
          const entry = await tx.folioEntry.create({ data: {
            id: kot.id, organizationId: folio.organizationId, propertyId: folio.propertyId,
            folioId, folioWindowId: windowId, serviceDate: folio.property.businessDate || new Date().toISOString().split("T")[0],
            type: "CHARGE", chargeCode: "RESTAURANT_FOOD", description: kot.description,
            qty: 1, unitAmount: kot.amount, taxableAmount: gst.taxableAmount, taxComponentsJson: JSON.stringify(gst.components), totalAmount: gst.totalAmount,
            sourceType: "MANUAL_CHARGE", sourceId, status: "POSTED",
          } });
          await tx.auditLog.create({ data: {
            organizationId: folio.organizationId, propertyId: folio.propertyId, actorId, actorName,
            action: "FOLIO_CHARGE_ADD", targetType: "FOLIO_ENTRY", targetId: entry.id, reason: kot.description,
            afterJson: JSON.stringify({ folioId, batchId: requestId, kotNumber: kot.kotNumber, chargeCode: entry.chargeCode, qty: 1, unitAmount: kot.amount, taxableAmount: gst.taxableAmount, taxAmount: gst.taxAmount, totalAmount: gst.totalAmount }),
          } });
          entries.push(entry);
        }
        const allEntries = await tx.folioEntry.findMany({ where: { folioId, status: "POSTED" }, select: { totalAmount: true } });
        const payments = await tx.payment.findMany({ where: { folioId, status: "SUCCEEDED" }, select: { amount: true } });
        const balance = Math.max(0, round2(allEntries.reduce((sum, entry) => sum + entry.totalAmount, 0) - payments.reduce((sum, payment) => sum + payment.amount, 0)));
        await tx.folio.update({ where: { id: folioId }, data: { balance } });
        return { entries, totalAmount: round2(entries.reduce((sum, entry) => sum + entry.totalAmount, 0)), idempotentReplay: false };
      }, { timeout: 10000 });
    } catch (error) {
      const detail = error as { code?: string; message?: string };
      const busy = detail.code === "P2034" || /database is locked|SQLITE_BUSY|timed out/i.test(detail.message || "");
      if (!busy || attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}
