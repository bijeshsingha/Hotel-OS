import type { Prisma } from "@prisma/client";

type AdvanceTarget = { propertyId: string; reservationId?: string; folioId: string; folioWindowId: string; groupPool: boolean; applyToBalance: boolean; actorId?: string };
/** Move the existing receipt into the stay. This is allocation, never another cash collection. */
export async function carryReservationAdvance(tx: Prisma.TransactionClient, target: AdvanceTarget) {
  if (!target.reservationId) return { amount: 0, collectedAmount: 0, receiptNos: [] as string[] };
  const reservation = await tx.reservation.findUniqueOrThrow({ where: { id: target.reservationId }, include: { primaryGuest: true, deposits: true } });
  if (reservation.propertyId !== target.propertyId) throw new Error("The advance belongs to a different property.");
  const payments = await tx.payment.findMany({ where: { id: { in: reservation.deposits.map(d => d.paymentId) }, propertyId: target.propertyId, status: "SUCCEEDED" }, include: { allocations: true } });
  const paymentMap = new Map(payments.map(p => [p.id, p]));
  const collectedAmount = payments.reduce((sum, p) => sum + Math.max(0, p.amount), 0);
  let amount = 0;
  const receiptNos: string[] = [];
  const seen = new Set<string>();
  for (const deposit of reservation.deposits) {
    if (deposit.status !== "AVAILABLE" || deposit.availableAmount <= 0 || deposit.folioId) continue;
    const payment = paymentMap.get(deposit.paymentId);
    if (!payment) continue;
    if (seen.has(payment.id)) throw new Error("The reservation advance needs reconciliation before check-in: duplicate deposit references.");
    seen.add(payment.id);
    if (payment.reservationId !== reservation.id || payment.folioId || payment.allocations.length || Math.abs(payment.amount - deposit.availableAmount) > 0.005) {
      throw new Error("The reservation advance is already allocated or partially used. Reconcile it before check-in.");
    }
    let snapshot: Record<string, unknown> = {};
    try { snapshot = JSON.parse(payment.payerSnapshot || "{}"); } catch { /* retain receipt identifiers */ }
    await tx.payment.update({ where: { id: payment.id }, data: { folioId: target.folioId,
      payerSnapshot: JSON.stringify({ ...snapshot, name: reservation.primaryGuest.name, phone: reservation.primaryGuest.phone, companyName: reservation.primaryGuest.companyName, gstin: reservation.primaryGuest.gstin, reservationNo: reservation.confirmationNo, checkInDate: reservation.arrivalDate, checkOutDate: reservation.departureDate, advanceAppliedAtCheckin: true, isGroupAdvancePool: target.groupPool }) } });
    await tx.paymentAllocation.create({ data: { paymentId: payment.id, folioWindowId: target.folioWindowId, amount: deposit.availableAmount } });
    await tx.deposit.update({ where: { id: deposit.id }, data: { folioId: target.folioId, availableAmount: target.groupPool ? deposit.availableAmount : 0, status: target.groupPool ? "AVAILABLE" : "APPLIED" } });
    amount += deposit.availableAmount;
    receiptNos.push(payment.receiptNo);
    await tx.auditLog.create({ data: { organizationId: reservation.organizationId, propertyId: target.propertyId, actorId: target.actorId, actorName: "Front Desk", action: "RESERVATION_ADVANCE_APPLIED", targetType: "PAYMENT", targetId: payment.id, reason: `Original receipt ${payment.receiptNo} carried to check-in; no new collection`, beforeJson: JSON.stringify({ folioId: payment.folioId, depositId: deposit.id, availableAmount: deposit.availableAmount }), afterJson: JSON.stringify({ folioId: target.folioId, receiptNo: payment.receiptNo, amount: deposit.availableAmount, reservationNo: reservation.confirmationNo }) } });
  }
  amount = Math.round(amount * 100) / 100;
  if (amount && target.applyToBalance) await tx.folio.update({ where: { id: target.folioId }, data: { balance: { decrement: amount } } });
  return { amount, collectedAmount: Math.round(collectedAmount * 100) / 100, receiptNos };
}
