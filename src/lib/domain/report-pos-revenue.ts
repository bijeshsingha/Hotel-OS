import { prisma } from "../db/prisma";
import { reportDateOf } from "../reports/report-dates";

/** Counter-paid POS bills never enter a room folio. Include them once in earned revenue. */
export async function getStandalonePosReportEntries(propertyId: string, timeZone: string, start?: string, end = start) {
  const bills = await prisma.pOSBill.findMany({
    where: { propertyId, status: "PAID", folioChargeId: null, order: { status: { notIn: ["VOIDED", "CANCELLED"] } } },
    include: { order: { include: { outlet: true } } },
  });
  if (!bills.length) return [];
  const invoices = await prisma.invoice.findMany({
    where: { propertyId, OR: [{ posBillId: { in: bills.map(b => b.id) } }, { id: { in: bills.flatMap(b => b.invoiceId ? [b.invoiceId] : []) } }] },
    include: { lines: true },
    orderBy: { issuedAt: "desc" },
  });
  return bills.flatMap(bill => {
    const invoice = invoices.find(i => i.id === bill.invoiceId || i.posBillId === bill.id);
    if (invoice && !["ISSUED", "CREDITED"].includes(invoice.status)) return [];
    const serviceDate = invoice?.businessDate || reportDateOf(bill.createdAt, timeZone);
    if ((start && serviceDate < start) || (end && serviceDate > end)) return [];
    const components = { cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
    for (const line of invoice?.lines || []) {
      try {
        const recorded = JSON.parse(line.componentTaxRatesJson);
        for (const key of Object.keys(components) as (keyof typeof components)[]) {
          const amount = Number(recorded?.[key]);
          if (Number.isFinite(amount)) components[key] += amount;
        }
      } catch { /* Do not invent a component split for legacy bills. */ }
    }
    return [{ id: `pos-bill:${bill.id}`, folioId: "", folio: null, serviceDate, postedAt: bill.createdAt,
      type: "CHARGE", status: "POSTED", chargeCode: "RESTAURANT_FOOD", description: `${bill.order.outlet.name} · ${bill.billNo} · ${bill.order.customerName || "Counter sale"}`,
      qty: 1, unitAmount: bill.totalAmount, taxableAmount: Math.round((bill.totalAmount - bill.taxTotal) * 100) / 100,
      totalAmount: bill.totalAmount, taxComponentsJson: JSON.stringify(components), sourceType: "POS_BILL", sourceId: bill.id }];
  });
}
