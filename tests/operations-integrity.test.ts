import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db/prisma";
import { closeOperationalDay } from "../src/lib/domain/night-audit-service";
import { receiptBusinessDay } from "../src/lib/domain/receipt-business-day";

if (!process.env.HOTEL_OS_TEST_DATABASE_URL?.endsWith("operations-test.db") || process.env.DATABASE_URL !== process.env.HOTEL_OS_TEST_DATABASE_URL) throw new Error("Use the disposable operations test runner.");
before(async () => {
  await prisma.organization.create({ data: { id: "ops-org", legalName: "Synthetic Operations", displayName: "Synthetic Operations" } });
  for (const [id, timezone, businessDate] of [["india", "Asia/Kolkata", "2026-10-13"], ["dst", "America/New_York", "2026-11-01"], ["other", "Asia/Kolkata", "2026-10-13"]]) {
    await prisma.property.create({ data: { id, organizationId: "ops-org", code: id, legalName: id, displayName: id, timezone, businessDate } });
  }
});
after(async () => prisma.$disconnect());

async function payment(propertyId: string, receivedAt: string, amount: number, status = "SUCCEEDED") {
  await prisma.payment.create({ data: { organizationId: "ops-org", propertyId, receiptNo: `SYNTHETIC-${propertyId}-${receivedAt}-${status}`, amount, status, method: "CASH", receivedAt: new Date(receivedAt) } });
}
async function metric(propertyId: string, businessDate: string) {
  return prisma.metricSnapshot.findUniqueOrThrow({ where: { propertyId_businessDate_metricCode: { propertyId, businessDate, metricCode: "NET_RECEIPTS" } } });
}

test("night audit excludes historical, next-day, failed and other-property receipts using India local midnight", async () => {
  await payment("india", "2026-09-01T10:00:00Z", 5000);
  await payment("india", "2026-10-12T18:29:59.999Z", 999);
  await payment("india", "2026-10-12T18:30:00.000Z", 100);
  await payment("india", "2026-10-13T18:29:59.999Z", 60);
  await payment("india", "2026-10-13T18:30:00.000Z", 800);
  await payment("india", "2026-10-13T10:00:00Z", 999, "FAILED");
  await payment("india", "2026-10-13T10:30:00Z", -20);
  await payment("other", "2026-10-13T10:00:00Z", 9000);
  await closeOperationalDay("india");
  assert.equal((await metric("india", "2026-10-13")).value, 140);
  const run = await prisma.nightAuditRun.findFirstOrThrow({ where: { propertyId: "india" }, orderBy: { completedAt: "desc" } });
  assert.equal(JSON.parse(run.totalsSnapshot!).netReceipts, 140);
  assert.equal((await prisma.property.findUniqueOrThrow({ where: { id: "india" } })).businessDate, "2026-10-14");
});

test("night audit counts both repeated hours on the property's 25-hour DST day and excludes next midnight", async () => {
  await payment("dst", "2026-11-01T03:59:59.999Z", 999);
  await payment("dst", "2026-11-01T04:00:00.000Z", 10);
  await payment("dst", "2026-11-01T05:30:00.000Z", 20);
  await payment("dst", "2026-11-01T06:30:00.000Z", 30);
  await payment("dst", "2026-11-02T04:59:59.999Z", 40);
  await payment("dst", "2026-11-02T05:00:00.000Z", 999);
  await closeOperationalDay("dst");
  assert.equal((await metric("dst", "2026-11-01")).value, 100);
});

test("receipt dates reject impossible days and include only the 23-hour spring DST day", () => {
  assert.throws(() => receiptBusinessDay("2026-02-30", "Asia/Kolkata"), /Invalid receipt business date/);
  assert.throws(() => receiptBusinessDay("2026-10-13", "Unknown/Zone"));
  const spring = receiptBusinessDay("2026-03-08", "America/New_York");
  assert.equal(spring.includes(new Date("2026-03-08T04:59:59.999Z")), false);
  assert.equal(spring.includes(new Date("2026-03-08T05:00:00.000Z")), true);
  assert.equal(spring.includes(new Date("2026-03-09T03:59:59.999Z")), true);
  assert.equal(spring.includes(new Date("2026-03-09T04:00:00.000Z")), false);
});
