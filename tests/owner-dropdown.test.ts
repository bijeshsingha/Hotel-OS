import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { POST as verify } from "../src/app/api/v1/auth/verify/route";
import { GET as owners } from "../src/app/api/v1/reports/owner-payout-options/route";
import { GET as hotel } from "../src/app/api/v1/admin/hotel/route";
import { parsePropertyOwners } from "../src/lib/domain/property-owners";

if (!process.env.HOTEL_OS_TEST_DATABASE_URL?.endsWith("owners-test.db") || process.env.DATABASE_URL !== process.env.HOTEL_OS_TEST_DATABASE_URL) throw new Error("Use the disposable owner dropdown test runner.");
process.env.APP_ORIGIN = "http://owners.test";
const cookies: Record<string, string> = {};
const req = (path: string, role = "ORG_OWNER") => new Request(`http://owners.test/api/v1/${path}`, { headers: { Cookie: cookies[role] || "" } });
before(async () => {
  for (const id of ["owners-org", "other-org"]) await prisma.organization.create({ data: { id, legalName: "Synthetic", displayName: "Synthetic" } });
  for (const [id, org, names] of [["hotel-a", "owners-org", null], ["hotel-b", "owners-org", '["Synthetic Partner A","Synthetic Partner B"]'], ["other-hotel", "other-org", '["Private Other Owner"]']] as const) {
    await prisma.property.create({ data: { id, organizationId: org, code: id, displayName: id, legalName: "Synthetic Hotel", businessDate: "2026-10-23", ownersJson: names } });
  }
  for (const role of ["ORG_OWNER", "VIEWER"]) {
    await prisma.role.create({ data: { id: role, code: role, name: role } });
    const password = randomUUID();
    await prisma.user.create({ data: { id: `owners-${role}`, name: `Synthetic ${role}`, email: `owners-${role.toLowerCase()}@example.invalid`, passwordHash: hashPassword(password), memberships: { create: { organizationId: "owners-org", propertyGrants: { create: { propertyId: "hotel-b", roleId: role } } } } } });
    const login = await verify(new Request("http://owners.test/api/v1/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: `owners-${role.toLowerCase()}@example.invalid`, password }) }));
    assert.equal(login.status, 200);cookies[role] = login.headers.get("set-cookie")!.split(";")[0];
  }
});
after(async () => { await prisma.$disconnect(); });
test("owner parsing preserves names, trims blanks and deduplicates display values", () => {
  assert.deepEqual(parsePropertyOwners('[" Partner A ","Partner B","partner a",""]'), ["Partner A", "Partner B"]);
  assert.deepEqual(parsePropertyOwners(null), []);
  for (const invalid of ['{broken', '{"owners":["A"]}', '["A",42]']) assert.throws(() => parsePropertyOwners(invalid));
});
test("an empty hotel's list never falls back to another property's owners", async () => {
  const response = await owners(req("reports/owner-payout-options?propertyId=hotel-a"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { propertyId: "hotel-a", propertyName: "hotel-a", owners: [] });
});
test("saved owners load for the correct hotel without exposing hotel configuration", async () => {
  const response = await owners(req("reports/owner-payout-options?propertyId=hotel-b"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.owners, ["Synthetic Partner A", "Synthetic Partner B"]);
  assert.deepEqual(Object.keys(body).sort(), ["owners", "propertyId", "propertyName"]);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("financial-report readers can read payout names without hotel-config permission", async () => {
  assert.equal((await hotel(req("admin/hotel?propertyId=hotel-b", "VIEWER"))).status, 403);
  assert.equal((await owners(req("reports/owner-payout-options?propertyId=hotel-b", "VIEWER"))).status, 200);
});
test("owner lookup remains authenticated and property-scoped", async () => {
  assert.equal((await owners(new Request("http://owners.test/api/v1/reports/owner-payout-options?propertyId=hotel-b"))).status, 401);
  assert.equal((await owners(req("reports/owner-payout-options?propertyId=other-hotel"))).status, 403);
  assert.equal((await owners(req("reports/owner-payout-options?propertyId=hotel-a", "VIEWER"))).status, 403);
});
test("malformed saved owners produce an explicit error, not an empty list", async () => {
  await prisma.property.update({ where: { id: "hotel-a" }, data: { ownersJson: '{invalid' } });
  const response = await owners(req("reports/owner-payout-options?propertyId=hotel-a"));
  assert.equal(response.status, 422);assert.ok((await response.json()).error.includes("saved owner list is invalid"));
  assert.equal((await prisma.property.findUniqueOrThrow({ where: { id: "hotel-a" } })).ownersJson, '{invalid');
});
test("opening the payout list never changes names or creates a payout", async () => {
  const before = await prisma.property.findUniqueOrThrow({ where: { id: "hotel-b" } });
  const payouts = await prisma.expense.count();
  await owners(req("reports/owner-payout-options?propertyId=hotel-b"));
  assert.equal((await prisma.property.findUniqueOrThrow({ where: { id: "hotel-b" } })).ownersJson, before.ownersJson);
  assert.equal(await prisma.expense.count(), payouts);
});
