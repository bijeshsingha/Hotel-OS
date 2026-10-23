import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { POST as verify } from "../src/app/api/v1/auth/verify/route";
import { POST as reserve, GET as listReservations } from "../src/app/api/v1/reservations/route";
import { POST as checkin } from "../src/app/api/v1/stays/check-in/route";
import { GET as report } from "../src/app/api/v1/reports/route";
import { additionalCheckinCollection, reservationAdvancePreview } from "../src/lib/domain/reservation-advance";
import { carryReservationAdvance } from "../src/lib/domain/reservation-advance-service";

if (!process.env.HOTEL_OS_TEST_DATABASE_URL?.endsWith("advance-test.db") || process.env.DATABASE_URL !== process.env.HOTEL_OS_TEST_DATABASE_URL) throw new Error("Use only the isolated reservation advance test runner.");
process.env.APP_ORIGIN = "http://advance.test";
let cookie = "";
function req(path: string, method = "GET", body?: unknown) {
  return new Request(`http://advance.test/api/v1/${path}`, { method, headers: { Cookie: cookie, Origin: "http://advance.test", ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
before(async () => {
  await prisma.organization.create({ data: { id: "advance-org", legalName: "Synthetic Advances", displayName: "Synthetic Advances" } });
  await prisma.property.create({ data: { id: "advance-property", organizationId: "advance-org", code: "ADV", legalName: "Synthetic Advances", displayName: "Synthetic Advances", businessDate: "2026-11-01", timezone: "Asia/Kolkata" } });
  await prisma.role.create({ data: { id: "advance-role", code: "ORG_OWNER", name: "Owner" } });
  const password = randomUUID();
  await prisma.user.create({ data: { id: "advance-owner", name: "Synthetic Owner", email: "advance@example.invalid", passwordHash: hashPassword(password), memberships: { create: { organizationId: "advance-org", propertyGrants: { create: { propertyId: "advance-property", roleId: "advance-role" } } } } } });
  const response = await verify(req("auth/verify", "POST", { identifier: "advance@example.invalid", password }));
  assert.equal(response.status, 200);
  cookie = response.headers.get("set-cookie")!.split(";")[0];
});
after(async () => { await prisma.$disconnect(); });

async function setup(suffix: string, depositAmount = 2000, roomCount = 1) {
  const rtId = `advance-type-${suffix}`;
  await prisma.roomType.create({ data: { id: rtId, propertyId: "advance-property", organizationId: "advance-org", code: suffix, name: `Synthetic ${suffix}`, capacity: 2 } });
  const roomIds: string[] = [];
  for (let i = 0; i < roomCount; i++) {
    const id = `advance-room-${suffix}-${i}`;roomIds.push(id);
    await prisma.room.create({ data: { id, organizationId: "advance-org", propertyId: "advance-property", roomTypeId: rtId, number: `${suffix}-${i}` } });
    await prisma.roomState.create({ data: { organizationId: "advance-org", propertyId: "advance-property", roomId: id, occupancyStatus: "VACANT", housekeepingStatus: "CLEAN", sellabilityStatus: "SELLABLE" } });
  }
  const guestName = `SYNTHETIC ADVANCE ${suffix}`;
  const response = await reserve(req("reservations", "POST", { propertyId: "advance-property", guestName, guestPhone: `90000${suffix.padStart(5, "0")}`, roomTypeId: rtId, roomCount, ratePerNight: 2000, isRateInclusive: true, arrivalDate: "2026-11-01", departureDate: "2026-11-02", depositAmount, depositMethod: "UPI" }));
  const body = await response.json();assert.equal(response.status, 200, JSON.stringify(body));
  const originalPayments = await prisma.payment.findMany({ where: { reservationId: body.reservation.id } });
  return { reservation: body.reservation, originalPayments, payload: { propertyId: "advance-property", reservationId: body.reservation.id, guestName, guestPhone: `90000${suffix.padStart(5, "0")}`, roomIds, arrivalAt: "2026-11-01T06:00:00Z", expectedDepartureAt: "2026-11-02T06:00:00Z", agreedTariff: 2000, isRateInclusive: true, depositAmount: 2000, depositMethod: "UPI" } };
}

test("prefilled totals never recollect an already paid advance; explicit additional money remains separate", () => {
  assert.equal(additionalCheckinCollection(2000, 2000), 0);
  assert.equal(additionalCheckinCollection(2500, 2000), 500);
  assert.equal(additionalCheckinCollection(0, 2000, 500), 500);
  assert.equal(additionalCheckinCollection(2000, 0), 2000);
  for (const amount of [-1, NaN, Infinity]) assert.throws(() => additionalCheckinCollection(amount, 2000));
  assert.deepEqual(reservationAdvancePreview([{ status: "AVAILABLE", availableAmount: 2000, payment: { status: "SUCCEEDED", receiptNo: "TEST-REC" } }, { status: "APPLIED", availableAmount: 3000 }, { status: "AVAILABLE", availableAmount: 500, payment: { status: "VOIDED" } }]), { amount: 2000, receiptNos: ["TEST-REC"] });
});
test("reservation advance has guest/receipt metadata before check-in", async () => {
  const fixture = await setup("101");
  const payment = fixture.originalPayments[0];
  assert.equal(JSON.parse(payment.payerSnapshot!).name, fixture.payload.guestName);
  const response = await listReservations(req("reservations?propertyId=advance-property"));
  const listed: any = await response.json();
  const rows = Array.isArray(listed) ? listed : listed.reservations;
  const found = rows.find((r: any) => r.id === fixture.reservation.id);
  assert.equal(found.deposits[0].payment.receiptNo, payment.receiptNo);
  // Legacy receipts lacked snapshots and references; the linked reservation must still identify them.
  await prisma.payment.update({ where: { id: payment.id }, data: { payerSnapshot: null, reference: null } });
  const cashier = await (await report(req("reports?propertyId=advance-property&type=CASHIER_COLLECTIONS_EXPENSES"))).json();
  const receipt = cashier.allTransactions.find((r: any) => r.id === payment.id);
  assert.equal(receipt.party, fixture.payload.guestName);
  assert.equal(receipt.reservationNo, fixture.reservation.confirmationNo);
  assert.ok(receipt.particulars.includes(fixture.reservation.confirmationNo));
  assert.equal(receipt.sourceCategory, "ADVANCE_DEPOSIT");
});
test("legacy reservation check-in carries ₹2,000 once, keeps original receipt/time/method and clears the room tariff", async () => {
  const fixture = await setup("102");
  const original = fixture.originalPayments[0];
  const response = await checkin(req("stays/check-in", "POST", fixture.payload));
  const body = await response.json();assert.equal(response.status, 200, JSON.stringify(body));
  assert.deepEqual(body.advance, { carried: 2000, collectedNow: 0, total: 2000, originalReceiptNos: [original.receiptNo] });
  const payments = await prisma.payment.findMany({ where: { reservationId: fixture.reservation.id } });
  assert.equal(payments.length, 1);
  assert.equal(payments[0].id, original.id);
  assert.equal(payments[0].receivedAt.getTime(), original.receivedAt.getTime());
  assert.equal(payments[0].method, "UPI");
  assert.equal(payments[0].folioId, body.masterFolioId);
  assert.equal((await prisma.folio.findUniqueOrThrow({ where: { id: body.masterFolioId } })).balance, 0);
  const deposit = await prisma.deposit.findFirstOrThrow({ where: { reservationId: fixture.reservation.id } });
  assert.equal(deposit.status, "APPLIED");assert.equal(deposit.availableAmount, 0);
  assert.equal(body.registration.depositAmount, 2000);
  const retry = await checkin(req("stays/check-in", "POST", fixture.payload));assert.notEqual(retry.status, 200);
  assert.equal(await prisma.payment.count({ where: { reservationId: fixture.reservation.id } }), 1);
  const cashier = await (await report(req("reports?propertyId=advance-property&type=CASHIER_COLLECTIONS_EXPENSES"))).json();
  const receipt = cashier.allTransactions.find((r: any) => r.id === original.id);
  assert.ok(receipt.roomNumber.includes("102-0"));
  assert.equal(receipt.reservationNo, fixture.reservation.confirmationNo);
});
test("voided duplicate stays out of cashier totals and final-bill settlement", async () => {
  const fixture = await setup("107");
  const response = await checkin(req("stays/check-in", "POST", fixture.payload));
  const body = await response.json();assert.equal(response.status, 200);
  const original = fixture.originalPayments[0];
  const duplicate = await prisma.payment.create({ data: { organizationId: "advance-org", propertyId: "advance-property", folioId: body.masterFolioId, receiptNo: "TEST-VOIDED-DUPLICATE", amount: 2000, method: "UPI", status: "VOIDED", receivedAt: original.receivedAt } });
  const cashier = await (await report(req("reports?propertyId=advance-property&type=CASHIER_COLLECTIONS_EXPENSES"))).json();
  assert.equal(cashier.allTransactions.filter((r: any) => r.id === original.id).length, 1);
  assert.equal(cashier.allTransactions.filter((r: any) => r.id === duplicate.id).length, 0);
  const finalBills = await (await report(req("reports?propertyId=advance-property&type=FINAL_BILLS"))).json();
  const bill = finalBills.bills.find((b: any) => b.folioId === body.masterFolioId);
  assert.equal(bill.totalPaid, 2000);assert.equal(bill.balance, 0);
});
test("new check-in contract collects only an explicitly entered additional ₹500", async () => {
  const fixture = await setup("103");
  const response = await checkin(req("stays/check-in", "POST", { ...fixture.payload, depositAmount: 500, additionalDepositAmount: 500, depositMethod: "CASH" }));
  const body = await response.json();assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.advance.carried, 2000);assert.equal(body.advance.collectedNow, 500);
  const payments = await prisma.payment.findMany({ where: { folioId: body.masterFolioId }, orderBy: { createdAt: "asc" } });
  assert.equal(payments.length, 2);assert.deepEqual(payments.map(p => p.amount), [2000, 500]);
  assert.equal(payments[0].method, "UPI");assert.equal(payments[1].method, "CASH");
  assert.equal((await prisma.folio.findUniqueOrThrow({ where: { id: body.masterFolioId } })).balance, -500);
  assert.equal(body.registration.depositAmount, 2500);
});
test("walk-in advance remains a single new collection", async () => {
  const fixture = await setup("104", 0);
  await prisma.reservation.update({ where: { id: fixture.reservation.id }, data: { status: "CANCELLED" } });
  const { reservationId: ignored, ...walkin } = fixture.payload;
  const response = await checkin(req("stays/check-in", "POST", { ...walkin, additionalDepositAmount: 2000 }));
  const body = await response.json();assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.advance.carried, 0);assert.equal(body.advance.collectedNow, 2000);
  assert.equal(await prisma.payment.count({ where: { folioId: body.masterFolioId } }), 1);
});
test("allocation failure rolls the whole check-in back, including reservation, room and guest edits", async () => {
  const fixture = await setup("105");
  const payment = fixture.originalPayments[0];
  await prisma.payment.update({ where: { id: payment.id }, data: { amount: 1900 } });
  const staysBefore = await prisma.stay.count();
  const response = await checkin(req("stays/check-in", "POST", fixture.payload));
  assert.notEqual(response.status, 200);
  assert.equal((await prisma.reservation.findUniqueOrThrow({ where: { id: fixture.reservation.id } })).status, "CONFIRMED");
  assert.equal((await prisma.roomState.findUniqueOrThrow({ where: { roomId: fixture.payload.roomIds[0] } })).occupancyStatus, "VACANT");
  assert.equal(await prisma.stay.count(), staysBefore);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).folioId, null);
});
test("multi-room separate billing carries one original receipt into the existing group-pool model", async () => {
  const fixture = await setup("106", 2000, 2);
  const response = await checkin(req("stays/check-in", "POST", { ...fixture.payload, groupBilling: false, additionalDepositAmount: 0 }));
  const body = await response.json();assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.stayIds.length, 2);
  assert.equal(await prisma.payment.count({ where: { reservationId: fixture.reservation.id } }), 1);
  const deposit = await prisma.deposit.findFirstOrThrow({ where: { reservationId: fixture.reservation.id } });
  assert.equal(deposit.folioId, body.masterFolioId);assert.equal(deposit.availableAmount, 2000);assert.equal(deposit.status, "AVAILABLE");
  const paymentsBefore = await prisma.payment.count();
  const carriedAgain = await prisma.$transaction(tx => carryReservationAdvance(tx, { propertyId: "advance-property", reservationId: fixture.reservation.id, folioId: body.masterFolioId, folioWindowId: "not-used", groupPool: true, applyToBalance: false }));
  assert.equal(carriedAgain.amount, 0);assert.equal(await prisma.payment.count(), paymentsBefore);
});
