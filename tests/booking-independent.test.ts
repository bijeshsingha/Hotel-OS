// Codex review probes: synthetic records only; independent of the agent's own tests.
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import path from "node:path";
import { prisma } from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { POST as login } from "../src/app/api/v1/auth/verify/route";
import { POST as reserve, PATCH as changeReservation } from "../src/app/api/v1/reservations/route";
import { calculateAvailability } from "../src/lib/domain/pms-service";
import { POST as checkIn } from "../src/app/api/v1/stays/check-in/route";
import { validateStayInterval } from "../src/lib/domain/booking-dates";

if (!process.env.HOTEL_OS_TEST_DATABASE_URL?.endsWith("operations-test.db") || process.env.DATABASE_URL !== process.env.HOTEL_OS_TEST_DATABASE_URL) throw new Error("Use the disposable review runner.");
process.env.APP_ORIGIN = "http://booking-review.test";
let cookie: string;
let counter = 0;
before(async () => {
  await prisma.organization.create({ data: { id: "review-org", legalName: "Synthetic Review", displayName: "Synthetic Review" } });
  await prisma.role.create({ data: { id: "review-owner-role", code: "ORG_OWNER", name: "Synthetic Owner" } });
  await prisma.property.create({ data: { id: "owner-property", organizationId: "review-org", code: "OWNER", legalName: "Synthetic", displayName: "Synthetic", timezone: "UTC", businessDate: "2026-10-13" } });
  const password = randomUUID();
  await prisma.user.create({ data: { id: "review-owner", email: "booking-review@example.invalid", name: "Synthetic Owner", passwordHash: hashPassword(password), memberships: { create: { organizationId: "review-org", propertyGrants: { create: { propertyId: "owner-property", roleId: "review-owner-role" } } } } } });
  const result = await login(new Request("http://booking-review.test/api/v1/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: "booking-review@example.invalid", password }) }));
  assert.equal(result.status, 200);
  cookie = result.headers.get("set-cookie")!.split(";")[0];
});
after(async () => prisma.$disconnect());

async function fixture(count = 1) {
  const id = `review-${++counter}`;
  await prisma.property.create({ data: { id, organizationId: "review-org", code: id, legalName: id, displayName: id, timezone: "UTC", businessDate: "2026-10-13" } });
  const type = await prisma.roomType.create({ data: { id: `${id}-type`, organizationId: "review-org", propertyId: id, code: "SYNTHETIC", name: "Synthetic", capacity: 4 } });
  const rooms = [];
  for (let index = 0; index < count; index++) {
    rooms.push(await prisma.room.create({ data: { id: `${id}-room-${index}`, organizationId: "review-org", propertyId: id, roomTypeId: type.id, number: String(900 + index), roomState: { create: { organizationId: "review-org", propertyId: id, occupancyStatus: "VACANT", housekeepingStatus: "CLEAN", sellabilityStatus: "SELLABLE" } } } }));
  }
  const guest = await prisma.guest.create({ data: { id: `${id}-guest`, organizationId: "review-org", name: "Synthetic Guest" } });
  return { id, type, rooms, guest };
}
async function held(f: Awaited<ReturnType<typeof fixture>>, arrival = "2026-12-20", departure = "2026-12-22", status = "CONFIRMED") {
  return prisma.reservation.create({ data: { organizationId: "review-org", propertyId: f.id, confirmationNo: randomUUID(), primaryGuestId: f.guest.id, arrivalDate: arrival, departureDate: departure, status, rooms: { create: { roomTypeId: f.type.id, status } } }, include: { rooms: true } });
}
async function available(f: Awaited<ReturnType<typeof fixture>>, arrival: string, departure: string) {
  const result = await calculateAvailability(f.id, arrival, departure);
  return result.find(row => row.roomTypeId === f.type.id)?.availableCount;
}
function booking(f: Awaited<ReturnType<typeof fixture>>, extra: Record<string, unknown> = {}) {
  return new Request("http://booking-review.test/api/v1/reservations", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: f.id, roomTypeId: f.type.id, guestName: `Synthetic booking ${randomUUID()}`, arrivalDate: "2026-12-20", departureDate: "2026-12-22", ratePerNight: 1000, ...extra }) });
}

test("confirmed future bookings consume only overlapping nights and checkout is exclusive", async () => {
  const f = await fixture();
  await held(f);
  assert.equal(await available(f, "2026-12-20", "2026-12-21"), 0);
  assert.equal(await available(f, "2026-12-19", "2026-12-20"), 1);
  assert.equal(await available(f, "2026-12-22", "2026-12-23"), 1);
});
test("cancelled and no-show reservations do not consume future inventory", async () => {
  const f = await fixture();
  await held(f, "2026-12-20", "2026-12-22", "CANCELLED");
  await held(f, "2026-12-20", "2026-12-22", "NO_SHOW");
  assert.equal(await available(f, "2026-12-20", "2026-12-22"), 1);
});
test("availability uses the tightest night of an interval", async () => {
  const f = await fixture(2);
  await held(f, "2026-12-20", "2026-12-21");
  await held(f, "2026-12-21", "2026-12-22");
  await held(f, "2026-12-21", "2026-12-22");
  assert.equal(await available(f, "2026-12-20", "2026-12-22"), 0);
});
test("future room blocks do not suppress nonoverlapping stays", async () => {
  const f = await fixture();
  await prisma.roomBlock.create({ data: { organizationId: "review-org", propertyId: f.id, roomId: f.rooms[0].id, reason: "Synthetic repair", startsAt: new Date("2026-12-20T00:00:00Z"), endsAt: new Date("2026-12-21T00:00:00Z") } });
  assert.equal(await available(f, "2026-12-20", "2026-12-21"), 0);
  assert.equal(await available(f, "2026-12-21", "2026-12-22"), 1);
});
test("room blocks follow property-local midnight instead of the UTC date", async () => {
  const f = await fixture();
  await prisma.property.update({ where: { id: f.id }, data: { timezone: "Asia/Kolkata" } });
  await prisma.roomBlock.create({ data: { organizationId: "review-org", propertyId: f.id, roomId: f.rooms[0].id, reason: "Synthetic local-midnight repair", startsAt: new Date("2026-12-19T18:30:00Z"), endsAt: new Date("2026-12-20T18:30:00Z") } });
  assert.equal(await available(f, "2026-12-20", "2026-12-21"), 0);
  assert.equal(await available(f, "2026-12-21", "2026-12-22"), 1);
});
test("an open assignment stops consuming its physical room after the stay's expected departure", async () => {
  const f = await fixture();
  const stay = await prisma.stay.create({ data: { organizationId: "review-org", propertyId: f.id, primaryGuestId: f.guest.id, arrivalAt: new Date("2026-12-20T12:00:00Z"), expectedDepartureAt: new Date("2026-12-21T10:00:00Z"), status: "IN_HOUSE" } });
  await prisma.roomAssignment.create({ data: { stayId: stay.id, roomId: f.rooms[0].id, startsAt: new Date("2026-12-20T12:00:00Z") } });
  assert.equal(await available(f, "2026-12-22", "2026-12-23"), 1);
  const response = await reserve(booking(f, { arrivalDate: "2026-12-22", departureDate: "2026-12-23", assignedRoomId: f.rooms[0].id }));
  assert.ok(response.status === 200 || response.status === 201, `Future assigned room rejected with ${response.status}`);
});
test("reversed and impossible dates fail without creating partial guest or booking records", async () => {
  const f = await fixture();
  const guests = await prisma.guest.count();
  for (const dates of [{ arrivalDate: "2026-12-22", departureDate: "2026-12-20" }, { arrivalDate: "2026-02-30", departureDate: "2026-03-02" }, { arrivalDate: "2026-12-20", departureDate: "2026-12-20" }]) {
    assert.equal((await reserve(booking(f, dates))).status, 400);
  }
  assert.equal(await prisma.guest.count(), guests);
  assert.equal(await prisma.reservation.count({ where: { propertyId: f.id } }), 0);
});
test("a multi-room request exceeding capacity fails atomically", async () => {
  const f = await fixture();
  const guests = await prisma.guest.count();
  const response = await reserve(booking(f, { roomCount: 2, depositAmount: 100 }));
  assert.equal(response.status, 409);
  assert.equal(await prisma.reservation.count({ where: { propertyId: f.id } }), 0);
  assert.equal(await prisma.payment.count({ where: { propertyId: f.id } }), 0);
  assert.equal(await prisma.guest.count(), guests);
});
test("a cancelled booking cannot be reactivated after its inventory is sold", async () => {
  const f = await fixture();
  const cancelled = await held(f, "2026-12-20", "2026-12-22", "CANCELLED");
  await held(f);
  const response = await changeReservation(new Request("http://booking-review.test/api/v1/reservations", { method: "PATCH", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ id: cancelled.id, propertyId: f.id, status: "CONFIRMED" }) }));
  assert.equal(response.status, 409);
  assert.equal((await prisma.reservation.findUniqueOrThrow({ where: { id: cancelled.id } })).status, "CANCELLED");
});
test("a valid reactivation consumes inventory and keeps tentative room holds", async () => {
  const f = await fixture();
  const cancelled = await held(f, "2026-12-20", "2026-12-22", "CANCELLED");
  const response = await changeReservation(new Request("http://booking-review.test/api/v1/reservations", { method: "PATCH", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ id: cancelled.id, propertyId: f.id, status: "TENTATIVE" }) }));
  assert.equal(response.status, 200);
  assert.equal(await available(f, "2026-12-20", "2026-12-22"), 0);
});
test("invalid quantities are rejected before creating records", async () => {
  const f = await fixture(3);
  const guests = await prisma.guest.count();
  for (const values of [{ roomCount: 0 }, { roomCount: -1 }, { roomCount: 1.5 }, { bookedRooms: [{ roomTypeId: f.type.id, quantity: 0 }] }, { bookedRooms: [{ roomTypeId: f.type.id, quantity: 1.5 }] }]) {
    assert.equal((await reserve(booking(f, values))).status, 400);
  }
  assert.equal(await prisma.guest.count(), guests);
  assert.equal(await prisma.reservation.count({ where: { propertyId: f.id } }), 0);
});
test("check-in rejects a dirty room without writing a guest or stay", async () => {
  const f = await fixture();
  await prisma.roomState.update({ where: { roomId: f.rooms[0].id }, data: { housekeepingStatus: "DIRTY" } });
  const guests = await prisma.guest.count();
  const response = await checkIn(new Request("http://booking-review.test/api/v1/stays/check-in", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: f.id, roomIds: [f.rooms[0].id], guestData: { name: "Synthetic dirty-room guest" }, arrivalAt: "2026-12-20T12:00:00Z", expectedDepartureAt: "2026-12-22T12:00:00Z", overrideReason: "This text must not bypass readiness" }) }));
  assert.equal(response.status, 409);
  assert.equal(await prisma.guest.count(), guests);
  assert.equal(await prisma.stay.count({ where: { propertyId: f.id } }), 0);
});
test("booking date validation bounds work before expanding nightly arrays", () => {
  assert.throws(() => validateStayInterval("2026-01-01", "2029-01-01"), /730 nights/);
});
test("one assigned room cannot be applied to every row of a multi-room booking", async () => {
  const f = await fixture(2);
  const reservation = await held(f);
  await prisma.reservationRoom.create({ data: { reservationId: reservation.id, roomTypeId: f.type.id } });
  const response = await changeReservation(new Request("http://booking-review.test/api/v1/reservations", { method: "PATCH", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ id: reservation.id, propertyId: f.id, assignedRoomId: f.rooms[0].id }) }));
  assert.equal(response.status, 400);
  assert.equal(await prisma.reservationRoom.count({ where: { reservationId: reservation.id, assignedRoomId: f.rooms[0].id } }), 0);
});
test("simultaneous confirmations for the final room produce one booking and one sold-out response", async () => {
  const f = await fixture();
  const responses = await Promise.all([reserve(booking(f)), reserve(booking(f))]);
  const statuses = responses.map(response => response.status).sort();
  assert.ok(statuses[0] === 200 || statuses[0] === 201, JSON.stringify(statuses));
  assert.equal(statuses[1], 409);
  assert.equal(await prisma.reservation.count({ where: { propertyId: f.id } }), 1);
});
test("separate Node processes cannot both confirm the final room", async () => {
  const f = await fixture();
  const children = [];
  const ready: Promise<void>[] = [];
  const results: Promise<number>[] = [];
  for (let index = 0; index < 2; index++) {
    const body = JSON.stringify({ propertyId: f.id, roomTypeId: f.type.id, guestName: `Synthetic worker ${index}`, arrivalDate: "2026-12-20", departureDate: "2026-12-22", ratePerNight: 1000 });
    const child = fork(path.resolve("scripts/booking-review-child.ts"), [], { execArgv: ["--import", "tsx"], stdio: ["ignore", "pipe", "pipe", "ipc"], env: { ...process.env, REVIEW_SYNTHETIC_COOKIE: cookie, REVIEW_SYNTHETIC_BODY: body } });
    children.push(child);
    child.stdout?.resume();
    let errors = "";
    child.stderr?.on("data", chunk => { errors = (errors + String(chunk)).slice(-1500); });
    ready.push(new Promise((resolve, reject) => { child.on("message", (message: any) => { if (message.ready) resolve(); }); child.on("error", reject); child.on("exit", code => { if (code) reject(new Error(`Fixture worker exited ${code}`)); }); }));
    const result = new Promise<number>((resolve, reject) => { let received = false; const timer = setTimeout(() => reject(new Error("Fixture worker timed out")), 30000); child.on("message", (message: any) => { if (typeof message.status === "number") { received = true; clearTimeout(timer); resolve(message.status); } }); child.on("error", error => { clearTimeout(timer); reject(error); }); child.on("exit", code => { if (!received) { clearTimeout(timer); reject(new Error(`Fixture worker exited ${code}: ${errors}`)); } }); });
    result.catch(() => undefined);
    results.push(result);
  }
  try {
    await Promise.all(ready);
    children.forEach(child => child.send({ go: true }));
    const statuses = (await Promise.all(results)).sort();
    assert.ok(statuses[0] === 200 || statuses[0] === 201, JSON.stringify(statuses));
    assert.equal(statuses[1], 409);
    assert.equal(await prisma.reservation.count({ where: { propertyId: f.id } }), 1);
  } finally {
    for (const child of children) if (child.exitCode === null) child.kill();
    await Promise.allSettled(results);
  }
});
test("repeated source/reference replays do not create a second booking and conflicting dates are rejected", async () => {
  const f = await fixture(3);
  const payload = { source: "WEBSITE", channelRef: "SYNTHETIC-REPLAY", guestName: "Synthetic Replay" };
  const initial = await reserve(booking(f, payload));
  assert.ok(initial.status === 200 || initial.status === 201);
  const replay = await reserve(booking(f, payload));
  assert.ok(replay.status === 200 || replay.status === 201 || replay.status === 409);
  assert.equal(await prisma.reservation.count({ where: { propertyId: f.id } }), 1);
  assert.equal((await reserve(booking(f, { ...payload, departureDate: "2026-12-23" }))).status, 409);
});
