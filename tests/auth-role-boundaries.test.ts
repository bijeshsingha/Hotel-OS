// Independent review probes, with their own disposable synthetic records.
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { authorizeRequest } from "../src/lib/auth/api-access";
import { POST as verify } from "../src/app/api/v1/auth/verify/route";

const cookies: Record<string, string> = {};
if (!process.env.HOTEL_OS_TEST_DATABASE_URL?.endsWith("security-test.db") || process.env.DATABASE_URL !== process.env.HOTEL_OS_TEST_DATABASE_URL) throw new Error("Use the disposable review runner.");
process.env.APP_ORIGIN = "http://security.test";
function request(path: string, role: string, method = "GET", body?: object) {
  return new Request(`http://security.test/api/v1/${path}`, { method, headers: { Cookie: cookies[role], ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
before(async () => {
  for (const suffix of ["a", "b"]) {
    await prisma.organization.create({ data: { id: `org-${suffix}`, legalName: `Synthetic ${suffix}`, displayName: `Synthetic ${suffix}` } });
    await prisma.property.create({ data: { id: `prop-${suffix}`, organizationId: `org-${suffix}`, code: `prop-${suffix}`, legalName: `Synthetic ${suffix}`, displayName: `Synthetic ${suffix}`, businessDate: "2026-10-13" } });
  }
  for (const role of ["HK_SUP", "TECH", "WAITER", "VIEWER"]) {
    const roleId = `review-role-${role}`;
    await prisma.role.create({ data: { id: roleId, code: role, name: role } });
    const password = randomUUID();
    const email = `review-${role.toLowerCase()}@example.invalid`;
    await prisma.user.create({ data: { id: `review-${role}`, name: `Synthetic ${role}`, email, passwordHash: hashPassword(password), memberships: { create: { organizationId: "org-a", propertyGrants: { create: { propertyId: "prop-a", roleId } } } } } });
    const response = await verify(new Request("http://security.test/api/v1/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: email, password }) }));
    assert.equal(response.status, 200);
    cookies[role] = response.headers.get("set-cookie")!.split(";")[0];
  }
  await prisma.roomType.create({ data: { id: "review-type", organizationId: "org-a", propertyId: "prop-a", code: "REVIEW", name: "Synthetic room" } });
  await prisma.room.create({ data: { id: "review-room", organizationId: "org-a", propertyId: "prop-a", roomTypeId: "review-type", number: "900" } });
  await prisma.roomState.create({ data: { organizationId: "org-a", propertyId: "prop-a", roomId: "review-room", occupancyStatus: "OCCUPIED", housekeepingStatus: "DIRTY", sellabilityStatus: "SELLABLE" } });
  await prisma.guest.create({ data: { id: "guest-a", organizationId: "org-a", name: "Synthetic Guest", phone: "9000000001" } });
  await prisma.stay.create({ data: { id: "stay-a", organizationId: "org-a", propertyId: "prop-a", primaryGuestId: "guest-a", status: "IN_HOUSE", expectedDepartureAt: new Date("2026-12-01T12:00:00Z") } });
  await prisma.folio.create({ data: { id: "folio-a", organizationId: "org-a", propertyId: "prop-a", stayId: "stay-a" } });
  await prisma.roomAssignment.create({ data: { roomId: "review-room", stayId: "stay-a" } });
  await prisma.maintenanceIssue.create({ data: { id: "review-issue", organizationId: "org-a", propertyId: "prop-a", roomId: "review-room", issueNo: "SYNTHETIC-REVIEW", description: "Synthetic assigned issue", status: "IN_PROGRESS", assigneeId: "review-TECH" } });
  await prisma.roomBlock.create({ data: { id: "review-block", organizationId: "org-a", propertyId: "prop-a", roomId: "review-room", type: "OUT_OF_ORDER", reason: "Synthetic repair awaiting inspection", startsAt: new Date(), status: "ACTIVE", maintenanceIssueId: "review-issue" } });
  await prisma.roomState.update({ where: { roomId: "review-room" }, data: { sellabilityStatus: "OUT_OF_ORDER" } });
  await prisma.outlet.create({ data: { id: "review-outlet-b", organizationId: "org-b", propertyId: "prop-b", code: "REVIEW", name: "Ambarish Restaurant" } });
});
after(async () => { await prisma.$disconnect(); });

test("review: housekeeping rooms contain no guest contact or folio records without their permissions", async () => {
  const { GET } = await import("../src/app/api/v1/rooms/route");
  const response = await GET(request("rooms?propertyId=prop-a", "HK_SUP"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(!JSON.stringify(body).includes("9000000001"), "Housekeeping received guest phone without guest.pii_view");
  assert.ok(!JSON.stringify(body).includes('"folio"'), "Housekeeping received folio records without folio.view");
});

test("review: waiter POS initialization does not reveal guest contacts without guest.pii_view", async () => {
  const { GET } = await import("../src/app/api/v1/pos/init/route");
  const response = await GET(request("pos/init?propertyId=prop-a", "WAITER"));
  assert.equal(response.status, 200);
  assert.ok(!JSON.stringify(await response.json()).includes("9000000001"), "Waiter received guest phone without guest.pii_view");
});

test("review: menu fallback cannot select an outlet in another organization", async () => {
  const { GET } = await import("../src/app/api/v1/guest/menu/route");
  const response = await GET(request("guest/menu?propertyId=prop-a", "WAITER"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.notEqual(body.outlet?.id, "review-outlet-b", "Menu fallback crossed the organization boundary");
});

test("review: viewing financial reports does not grant Excel export permission", async () => {
  const response = await authorizeRequest(request("reports/executive/export-excel?propertyId=prop-a", "VIEWER"));
  assert.ok(response instanceof Response, "Viewer was granted export access without report.export");
  assert.equal(response.status, 403);
});

test("review: assigned technician cannot verify an issue without supervisor permission", async () => {
  const response = await authorizeRequest(request("maintenance/issues", "TECH", "PATCH", { issueId: "review-issue", status: "VERIFIED" }));
  assert.ok(response instanceof Response, "Technician was allowed supervisor verification");
  assert.equal(response.status, 403);
});

test("review: assigned technician cannot unblock a room without room.block permission", async () => {
  const response = await authorizeRequest(request("maintenance/issues", "TECH", "PATCH", { issueId: "review-issue", blockRoom: false }));
  assert.ok(response instanceof Response, "Technician was allowed to unblock a room");
  assert.equal(response.status, 403);
});

test("review: assigned technician can record work without supervisor approval", async () => {
  const response = await authorizeRequest(request("maintenance/issues", "TECH", "PATCH", { issueId: "review-issue", status: "IN_PROGRESS", resolution: "Synthetic progress" }));
  assert.ok(!(response instanceof Response));
});

test("review: reporting a repair as resolved does not release the blocked room without approval", async () => {
  const { PATCH } = await import("../src/app/api/v1/maintenance/issues/route");
  const response = await PATCH(request("maintenance/issues", "TECH", "PATCH", { issueId: "review-issue", status: "RESOLVED", resolution: "Synthetic completed work awaiting inspection" }));
  assert.equal(response.status, 200);
  const block = await prisma.roomBlock.findUniqueOrThrow({ where: { id: "review-block" } });
  const roomState = await prisma.roomState.findUniqueOrThrow({ where: { roomId: "review-room" } });
  assert.equal(block.status, "ACTIVE");
  assert.equal(roomState.sellabilityStatus, "OUT_OF_ORDER");
});

test("review: report viewer retains permission to read financial reports", async () => {
  const response = await authorizeRequest(request("reports/executive?propertyId=prop-a", "VIEWER"));
  assert.ok(!(response instanceof Response));
});
