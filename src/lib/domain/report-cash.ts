import { prisma } from "../db/prisma";
import { reportMoney } from "../reports/report-ledger";

/** Cash follows receipt/payout timestamps, while earned expenses follow their business date. */
export async function reportCashPosition(propertyId: string, from: Date, to: Date, baseOpening: number) {
  const [priorIn, priorOut, periodIn, periodOut] = await Promise.all([
    prisma.payment.aggregate({ where: { propertyId, status: "SUCCEEDED", method: { contains: "CASH" }, receivedAt: { lt: from } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { propertyId, status: "PAID", paymentMethod: "CASH", paidAt: { lt: from } }, _sum: { totalAmount: true } }),
    prisma.payment.aggregate({ where: { propertyId, status: "SUCCEEDED", method: { contains: "CASH" }, receivedAt: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { propertyId, status: "PAID", paymentMethod: "CASH", paidAt: { gte: from, lte: to } }, _sum: { totalAmount: true } }),
  ]);
  const opening = reportMoney(baseOpening + (priorIn._sum.amount ?? 0) - (priorOut._sum.totalAmount ?? 0));
  const received = reportMoney(periodIn._sum.amount ?? 0);
  const paid = reportMoney(periodOut._sum.totalAmount ?? 0);
  return { opening, received, paid, closing: reportMoney(opening + received - paid) };
}
