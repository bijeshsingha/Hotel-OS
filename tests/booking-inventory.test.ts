import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { POST as verifyRoute } from "../src/app/api/v1/auth/verify/route";
import { POST as reservationsPost, GET as reservationsGet, PATCH as reservationsPatch } from "../src/app/api/v1/reservations/route";
import { POST as quotePost } from "../src/app/api/v1/availability/quote/route";
import { POST as checkInPost } from "../src/app/api/v1/stays/check-in/route";
import { calculateAvailability } from "../src/lib/domain/pms-service";
import { validateStayInterval, DateValidationError } from "../src/lib/domain/booking-dates";

// Safety check: ensure isolated fixture database is active
const fixtureUrl = process.env.HOTEL_OS_TEST_DATABASE_URL;
if (!fixtureUrl?.startsWith("file:") || !fixtureUrl.endsWith("inventory-test.db")) {
  throw new Error("Run npm run test:inventory to create an isolated fixture database.");
}
process.env.DATABASE_URL = fixtureUrl;
process.env.APP_ORIGIN = "http://inventory.test";

let ownerCookie: string;
const ownerPassword = randomUUID();

function createRequest(
  route: string,
  method = "GET",
  body?: unknown,
  cookie = ownerCookie
): Request {
  return new Request(`http://inventory.test/api/v1/${route}`, {
    method,
    headers: {
      Host: "inventory.test",
      Origin: "http://inventory.test",
      "Sec-Fetch-Site": "same-origin",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

before(async () => {
  // 1. Organizations & Properties
  await prisma.organization.create({
    data: { id: "org-alpha", legalName: "Alpha Org", displayName: "Alpha Org" },
  });
  await prisma.organization.create({
    data: { id: "org-beta", legalName: "Beta Org", displayName: "Beta Org" },
  });

  await prisma.property.create({
    data: {
      id: "prop-alpha",
      organizationId: "org-alpha",
      code: "ALPHA",
      legalName: "Alpha Resort",
      displayName: "Alpha Resort",
      businessDate: "2026-10-13",
      stateCode: "18",
    },
  });

  await prisma.property.create({
    data: {
      id: "prop-beta",
      organizationId: "org-beta",
      code: "BETA",
      legalName: "Beta Inn",
      displayName: "Beta Inn",
      businessDate: "2026-10-13",
      stateCode: "18",
    },
  });

  // 2. Roles and Users
  await prisma.role.create({ data: { id: "ORG_OWNER", code: "ORG_OWNER", name: "Owner" } });
  await prisma.role.create({ data: { id: "FD_AGENT", code: "FD_AGENT", name: "Front Desk Agent" } });

  await prisma.user.create({
    data: {
      id: "user-owner",
      name: "Owner Alpha",
      email: "owner@alpha.test",
      passwordHash: hashPassword(ownerPassword),
      memberships: {
        create: {
          organizationId: "org-alpha",
          propertyGrants: {
            create: { propertyId: "prop-alpha", roleId: "ORG_OWNER" },
          },
        },
      },
    },
  });

  // Login
  const loginRes = await verifyRoute(
    createRequest("auth/verify", "POST", { identifier: "owner@alpha.test", password: ownerPassword }, "")
  );
  assert.equal(loginRes.status, 200);
  ownerCookie = loginRes.headers.get("set-cookie")!.split(";")[0];

  // 3. Room Types
  // prop-alpha: rt-std (2 physical rooms), rt-dlx (1 physical room), rt-suite (1 physical room)
  await prisma.roomType.create({
    data: { id: "rt-std", organizationId: "org-alpha", propertyId: "prop-alpha", code: "STD", name: "Standard", capacity: 2 },
  });
  await prisma.roomType.create({
    data: { id: "rt-dlx", organizationId: "org-alpha", propertyId: "prop-alpha", code: "DLX", name: "Deluxe", capacity: 2 },
  });
  await prisma.roomType.create({
    data: { id: "rt-suite", organizationId: "org-alpha", propertyId: "prop-alpha", code: "STE", name: "Suite", capacity: 4 },
  });

  // prop-beta: rt-beta (1 physical room)
  await prisma.roomType.create({
    data: { id: "rt-beta", organizationId: "org-beta", propertyId: "prop-beta", code: "BETA-STD", name: "Beta Std", capacity: 2 },
  });

  // 4. Rooms
  await prisma.room.create({
    data: { id: "rm-101", organizationId: "org-alpha", propertyId: "prop-alpha", roomTypeId: "rt-std", number: "101", active: true },
  });
  await prisma.room.create({
    data: { id: "rm-102", organizationId: "org-alpha", propertyId: "prop-alpha", roomTypeId: "rt-std", number: "102", active: true },
  });
  await prisma.room.create({
    data: { id: "rm-201", organizationId: "org-alpha", propertyId: "prop-alpha", roomTypeId: "rt-dlx", number: "201", active: true },
  });
  await prisma.room.create({
    data: { id: "rm-301", organizationId: "org-alpha", propertyId: "prop-alpha", roomTypeId: "rt-suite", number: "301", active: true },
  });
  await prisma.room.create({
    data: { id: "rm-901", organizationId: "org-beta", propertyId: "prop-beta", roomTypeId: "rt-beta", number: "901", active: true },
  });

  // Room states
  for (const roomId of ["rm-101", "rm-102", "rm-201", "rm-301"]) {
    await prisma.roomState.create({
      data: {
        organizationId: "org-alpha",
        propertyId: "prop-alpha",
        roomId,
        occupancyStatus: "VACANT",
        housekeepingStatus: "CLEAN",
        sellabilityStatus: "SELLABLE",
      },
    });
  }
  await prisma.roomState.create({
    data: {
      organizationId: "org-beta",
      propertyId: "prop-beta",
      roomId: "rm-901",
      occupancyStatus: "VACANT",
      housekeepingStatus: "CLEAN",
      sellabilityStatus: "SELLABLE",
    },
  });
});

after(async () => {
  await prisma.$disconnect();
});

// Scenario 1: Strict calendar-date contract
test("Scenario 1: strict calendar date validation rejects invalid, same-day, and reversed dates with 400", async () => {
  // Same-day check-in and check-out
  const resSameDay = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "John Doe",
      roomTypeId: "rt-std",
      arrivalDate: "2026-11-01",
      departureDate: "2026-11-01",
    })
  );
  assert.equal(resSameDay.status, 400);
  const dataSameDay = await resSameDay.json();
  assert.equal(dataSameDay.code, "INVALID_DATE_INTERVAL");

  // Reversed dates
  const resReversed = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "John Doe",
      roomTypeId: "rt-std",
      arrivalDate: "2026-11-05",
      departureDate: "2026-11-01",
    })
  );
  assert.equal(resReversed.status, 400);

  // Non-calendar date (Feb 30)
  const resFeb30 = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "John Doe",
      roomTypeId: "rt-std",
      arrivalDate: "2026-02-30",
      departureDate: "2026-03-02",
    })
  );
  assert.equal(resFeb30.status, 400);

  // ISO timestamp with time component
  const resTimestamp = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "John Doe",
      roomTypeId: "rt-std",
      arrivalDate: "2026-11-01T00:00:00Z",
      departureDate: "2026-11-03",
    })
  );
  assert.equal(resTimestamp.status, 400);

  // Availability quote endpoint also rejects reversed/same-day dates
  const quoteReversed = await quotePost(
    createRequest("availability/quote", "POST", {
      propertyId: "prop-alpha",
      arrivalDate: "2026-11-05",
      departureDate: "2026-11-01",
      roomTypeId: "rt-std",
    })
  );
  assert.equal(quoteReversed.status, 400);
});

// Scenario 2: Future confirmed reservation reduces only overlapping nights
test("Scenario 2: confirmed reservation reduces inventory only on overlapping nights", async () => {
  // Check initial availability for rt-std (total 2)
  const beforeAvail = await calculateAvailability("prop-alpha", "2026-11-01", "2026-11-04", prisma);
  const stdBefore = beforeAvail.find((r) => r.roomTypeId === "rt-std");
  assert.equal(stdBefore?.availableCount, 2);

  // Create confirmed reservation for 1 room on Nov 1 -> Nov 4
  const bookRes = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Scenario Two Guest",
      guestPhone: "9000000020",
      roomTypeId: "rt-std",
      roomCount: 1,
      arrivalDate: "2026-11-01",
      departureDate: "2026-11-04",
      ratePerNight: 2000,
    })
  );
  assert.equal(bookRes.status, 200);

  // Overlapping interval Nov 2 -> Nov 3 has 1 room available
  const overlapAvail = await calculateAvailability("prop-alpha", "2026-11-02", "2026-11-03", prisma);
  const stdOverlap = overlapAvail.find((r) => r.roomTypeId === "rt-std");
  assert.equal(stdOverlap?.availableCount, 1);

  // Non-overlapping interval Nov 4 -> Nov 7 has full 2 rooms available
  const afterAvail = await calculateAvailability("prop-alpha", "2026-11-04", "2026-11-07", prisma);
  const stdAfter = afterAvail.find((r) => r.roomTypeId === "rt-std");
  assert.equal(stdAfter?.availableCount, 2);
});

// Scenario 3: Cancelled and no-show reservations do not block
test("Scenario 3: cancelled and no-show reservations release inventory immediately", async () => {
  // Book the second room of rt-std for Nov 1 -> Nov 4
  const bookRes2 = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Scenario Three Guest",
      guestPhone: "9000000030",
      roomTypeId: "rt-std",
      roomCount: 1,
      arrivalDate: "2026-11-01",
      departureDate: "2026-11-04",
      ratePerNight: 2000,
    })
  );
  assert.equal(bookRes2.status, 200);
  const { reservation: res2 } = await bookRes2.json();

  // Inventory is now fully exhausted (0 available)
  const fullAvail = await calculateAvailability("prop-alpha", "2026-11-01", "2026-11-04", prisma);
  const stdFull = fullAvail.find((r) => r.roomTypeId === "rt-std");
  assert.equal(stdFull?.availableCount, 0);

  // Attempting to book a 3rd room fails with 409
  const failBook = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Should Fail",
      guestPhone: "9000000031",
      roomTypeId: "rt-std",
      roomCount: 1,
      arrivalDate: "2026-11-01",
      departureDate: "2026-11-04",
    })
  );
  assert.equal(failBook.status, 409);

  // Cancel reservation 2 via PATCH
  const patchRes = await reservationsPatch(
    createRequest("reservations", "PATCH", {
      id: res2.id,
      status: "CANCELLED",
      reason: "Guest requested cancellation",
    })
  );
  assert.equal(patchRes.status, 200);

  // Inventory is immediately released (1 available again)
  const releasedAvail = await calculateAvailability("prop-alpha", "2026-11-01", "2026-11-04", prisma);
  const stdReleased = releasedAvail.find((r) => r.roomTypeId === "rt-std");
  assert.equal(stdReleased?.availableCount, 1);

  // New booking succeeds now
  const newBook = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Replacement Guest",
      guestPhone: "9000000032",
      roomTypeId: "rt-std",
      roomCount: 1,
      arrivalDate: "2026-11-01",
      departureDate: "2026-11-04",
    })
  );
  assert.equal(newBook.status, 200);
});

// Scenario 4: Room blocks reduce available inventory during block period only
test("Scenario 4: room blocks reduce available inventory during block period only", async () => {
  // rt-dlx has 1 room (rm-201).
  // Create an active block on rm-201 from Nov 10 to Nov 13
  await prisma.roomBlock.create({
    data: {
      id: "block-201",
      organizationId: "org-alpha",
      propertyId: "prop-alpha",
      roomId: "rm-201",
      type: "MAINTENANCE",
      reason: "AC unit repair",
      status: "ACTIVE",
      startsAt: new Date("2026-11-10T14:00:00Z"),
      endsAt: new Date("2026-11-13T11:00:00Z"),
    },
  });

  // Availability during block Nov 10 -> Nov 13 is 0
  const blockedAvail = await calculateAvailability("prop-alpha", "2026-11-10", "2026-11-13", prisma);
  const dlxBlocked = blockedAvail.find((r) => r.roomTypeId === "rt-dlx");
  assert.equal(dlxBlocked?.availableCount, 0);

  // Booking during block fails with 409
  const blockedBook = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Blocked Booker",
      roomTypeId: "rt-dlx",
      arrivalDate: "2026-11-10",
      departureDate: "2026-11-12",
    })
  );
  assert.equal(blockedBook.status, 409);

  // Availability after block Nov 14 -> Nov 16 is 1
  const afterAvail = await calculateAvailability("prop-alpha", "2026-11-14", "2026-11-16", prisma);
  const dlxAfter = afterAvail.find((r) => r.roomTypeId === "rt-dlx");
  assert.equal(dlxAfter?.availableCount, 1);

  // Booking after block succeeds
  const afterBook = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Post Block Guest",
      roomTypeId: "rt-dlx",
      arrivalDate: "2026-11-14",
      departureDate: "2026-11-16",
    })
  );
  assert.equal(afterBook.status, 200);
});

// Scenario 5: Checkout boundary exclusivity
test("Scenario 5: checkout boundary is strictly exclusive (back-to-back single room succeeds)", async () => {
  // rt-suite has only 1 physical room (rm-301)
  // Reservation 1: Nov 20 -> Nov 22 (checkout Nov 22)
  const book1 = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "First Suite Guest",
      roomTypeId: "rt-suite",
      arrivalDate: "2026-11-20",
      departureDate: "2026-11-22",
    })
  );
  assert.equal(book1.status, 200);

  // Reservation 2: Nov 22 -> Nov 24 (arrival Nov 22)
  // Must succeed because checkout on Nov 22 is exclusive!
  const book2 = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Second Suite Guest",
      roomTypeId: "rt-suite",
      arrivalDate: "2026-11-22",
      departureDate: "2026-11-24",
    })
  );
  assert.equal(book2.status, 200);
});

// Scenario 6: No double-counting after check-in conversion
test("Scenario 6: check-in conversion prevents double-counting occupancy", async () => {
  // Book rt-dlx from Nov 25 to Nov 27
  const bookRes = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Checkin Conversion Guest",
      guestPhone: "9000000060",
      roomTypeId: "rt-dlx",
      assignedRoomId: "rm-201",
      arrivalDate: "2026-11-25",
      departureDate: "2026-11-27",
    })
  );
  assert.equal(bookRes.status, 200);
  const { reservation } = await bookRes.json();

  // Check in the reservation to create an active Stay linked to ReservationRoom
  const checkInRes = await checkInPost(
    createRequest("stays/check-in", "POST", {
      propertyId: "prop-alpha",
      reservationId: reservation.id,
      guestName: "Checkin Conversion Guest",
      guestPhone: "9000000060",
      roomId: "rm-201",
      arrivalDate: "2026-11-25",
      departureDate: "2026-11-27",
    })
  );
  assert.equal(checkInRes.status, 200);

  // Verify reservation and room are marked CHECKED_IN
  const updatedRes = await prisma.reservation.findUnique({
    where: { id: reservation.id },
    include: { rooms: true },
  });
  assert.equal(updatedRes?.status, "CHECKED_IN");
  assert.equal(updatedRes?.rooms[0]?.status, "CHECKED_IN");

  // Verify Stay is linked to ReservationRoom
  const stay = await prisma.stay.findFirst({
    where: { reservationRoomId: updatedRes?.rooms[0]?.id },
  });
  assert.ok(stay, "Stay must be linked to reservationRoomId");

  // Verify availability calculation: occupied count is exactly 1 (not double-counted to 2)
  const avail = await calculateAvailability("prop-alpha", "2026-11-25", "2026-11-27", prisma);
  const dlx = avail.find((r) => r.roomTypeId === "rt-dlx");
  assert.equal(dlx?.totalRooms, 1);
  assert.equal(dlx?.occupiedOrBlocked, 1);
  assert.equal(dlx?.availableCount, 0);
});

// Scenario 7: Multi-room and multi-type bottleneck calculation
test("Scenario 7: bottleneck calculation prevents overbooking when any night in interval is sold out", async () => {
  // rt-std has 2 physical rooms
  // Book 1 room on Nov 28 -> Nov 29 only
  const b1 = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Partial Stayer",
      roomTypeId: "rt-std",
      roomCount: 1,
      arrivalDate: "2026-11-28",
      departureDate: "2026-11-29",
    })
  );
  assert.equal(b1.status, 200);

  // Night Nov 28 has 1 room available. Night Nov 29 has 2 rooms available.
  // Requesting 2 rooms spanning Nov 28 -> Nov 30 MUST FAIL with 409 (bottleneck on Nov 28)
  const bFail = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Wants Two Rooms",
      roomTypeId: "rt-std",
      roomCount: 2,
      arrivalDate: "2026-11-28",
      departureDate: "2026-11-30",
    })
  );
  assert.equal(bFail.status, 409);
  const failData = await bFail.json();
  assert.equal(failData.code, "CAPACITY_EXCEEDED");

  // Requesting 1 room spanning Nov 28 -> Nov 30 SUCCEEDS
  const bSuccess = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Wants One Room",
      roomTypeId: "rt-std",
      roomCount: 1,
      arrivalDate: "2026-11-28",
      departureDate: "2026-11-30",
    })
  );
  assert.equal(bSuccess.status, 200);
});

// Scenario 8: Atomic rollback on sold-out
test("Scenario 8: atomic rollback leaves zero orphaned records when sold out", async () => {
  // rt-suite (1 room) is booked for Dec 01 -> Dec 03
  const bInit = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Dec Suite Occupant",
      roomTypeId: "rt-suite",
      arrivalDate: "2026-12-01",
      departureDate: "2026-12-03",
    })
  );
  assert.equal(bInit.status, 200);

  // Count existing records
  const guestCountBefore = await prisma.guest.count();
  const resCountBefore = await prisma.reservation.count();
  const roomCountBefore = await prisma.reservationRoom.count();
  const depositCountBefore = await prisma.deposit.count();

  // Attempt booking with unique guest details and deposit on sold-out dates
  const soldOutRes = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Orphan Probe Guest",
      guestPhone: "9111119999",
      guestEmail: "orphan@probe.test",
      roomTypeId: "rt-suite",
      arrivalDate: "2026-12-01",
      departureDate: "2026-12-03",
      depositAmount: 5000,
      paymentMethod: "UPI",
    })
  );
  assert.equal(soldOutRes.status, 409);

  // Assert zero records were created
  const guestCountAfter = await prisma.guest.count();
  const resCountAfter = await prisma.reservation.count();
  const roomCountAfter = await prisma.reservationRoom.count();
  const depositCountAfter = await prisma.deposit.count();

  assert.equal(guestCountAfter, guestCountBefore, "No guest row should be created on rollback");
  assert.equal(resCountAfter, resCountBefore, "No reservation row should be created on rollback");
  assert.equal(roomCountAfter, roomCountBefore, "No reservationRoom row should be created on rollback");
  assert.equal(depositCountAfter, depositCountBefore, "No deposit row should be created on rollback");
});

// Scenario 9: Persistent Idempotency on channelRef
test("Scenario 9: channelRef idempotency replays matching payload (200) and rejects conflicting payload (409)", async () => {
  const channelRef = "OTA-REF-1009";

  // First call creates reservation
  const call1 = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Idempotent Guest",
      guestPhone: "9000000099",
      roomTypeId: "rt-std",
      roomCount: 1,
      channelRef,
      arrivalDate: "2026-12-10",
      departureDate: "2026-12-12",
    })
  );
  assert.equal(call1.status, 200);
  const data1 = await call1.json();
  const createdId = data1.reservation.id;
  const createdConfirmationNo = data1.confirmationNo;

  // Second call with EXACT SAME booking payload
  const call2 = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Idempotent Guest",
      guestPhone: "9000000099",
      roomTypeId: "rt-std",
      roomCount: 1,
      channelRef,
      arrivalDate: "2026-12-10",
      departureDate: "2026-12-12",
    })
  );
  assert.equal(call2.status, 200);
  const data2 = await call2.json();
  assert.equal(data2.reservation.id, createdId, "Replay must return the same reservation ID");
  assert.equal(data2.confirmationNo, createdConfirmationNo);
  assert.equal(data2.idempotentReplay, true);

  // Third call with SAME channelRef but CONFLICTING dates -> 409 Conflict
  const call3 = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Idempotent Guest",
      guestPhone: "9000000099",
      roomTypeId: "rt-std",
      roomCount: 1,
      channelRef,
      arrivalDate: "2026-12-15",
      departureDate: "2026-12-18",
    })
  );
  assert.equal(call3.status, 409);
  const data3 = await call3.json();
  assert.equal(data3.code, "IDEMPOTENCY_CONFLICT");
});

// Scenario 10: Cross-property and sellability protection
test("Scenario 10: cross-property room types and un-sellable room assignments are rejected", async () => {
  // Cross-property roomTypeId (rt-beta belongs to prop-beta, not prop-alpha) -> 400
  const crossRt = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Cross RT Guest",
      roomTypeId: "rt-beta",
      arrivalDate: "2026-12-20",
      departureDate: "2026-12-22",
    })
  );
  assert.ok(
    [400, 403].includes(crossRt.status),
    `Cross-property room type must be rejected with 400 or 403, got ${crossRt.status}`
  );

  // Cross-property assigned room (rm-901 belongs to prop-beta) -> 400 or 403
  const crossRoom = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "Cross Room Guest",
      roomTypeId: "rt-std",
      assignedRoomId: "rm-901",
      arrivalDate: "2026-12-20",
      departureDate: "2026-12-22",
    })
  );
  assert.ok(
    [400, 403].includes(crossRoom.status),
    `Cross-property room must be rejected with 400 or 403, got ${crossRoom.status}`
  );

  // Room out of service / order cannot be assigned -> 409
  await prisma.roomState.update({
    where: { roomId: "rm-102" },
    data: { sellabilityStatus: "OUT_OF_SERVICE" },
  });

  const oosAssign = await reservationsPost(
    createRequest("reservations", "POST", {
      propertyId: "prop-alpha",
      guestName: "OOS Assignee",
      roomTypeId: "rt-std",
      assignedRoomId: "rm-102",
      arrivalDate: "2026-12-20",
      departureDate: "2026-12-22",
    })
  );
  assert.equal(oosAssign.status, 409);
  const oosData = await oosAssign.json();
  assert.equal(oosData.code, "ROOM_NOT_SELLABLE");

  // Reset room state
  await prisma.roomState.update({
    where: { roomId: "rm-102" },
    data: { sellabilityStatus: "SELLABLE" },
  });
});

// Scenario 11: Concurrency serialization race test
test("Scenario 11: concurrent booking race for the last room results in exactly 1 success and 1 conflict (409)", async () => {
  // rt-suite has only 1 physical room. Interval Dec 28 -> Dec 30 is completely open.
  const req1 = createRequest("reservations", "POST", {
    propertyId: "prop-alpha",
    guestName: "Racer One",
    guestPhone: "9777770001",
    roomTypeId: "rt-suite",
    arrivalDate: "2026-12-28",
    departureDate: "2026-12-30",
  });

  const req2 = createRequest("reservations", "POST", {
    propertyId: "prop-alpha",
    guestName: "Racer Two",
    guestPhone: "9777770002",
    roomTypeId: "rt-suite",
    arrivalDate: "2026-12-28",
    departureDate: "2026-12-30",
  });

  // Launch both requests simultaneously
  const [res1, res2] = await Promise.all([
    reservationsPost(req1),
    reservationsPost(req2),
  ]);

  const statuses = [res1.status, res2.status].sort();
  assert.deepEqual(
    statuses,
    [200, 409],
    "Exactly one concurrent request must succeed (200) and the other must be rejected (409)"
  );

  // Exactly 1 reservation created in DB for rt-suite on those dates
  const suiteBookings = await prisma.reservationRoom.findMany({
    where: {
      roomTypeId: "rt-suite",
      reservation: {
        arrivalDate: "2026-12-28",
        departureDate: "2026-12-30",
        status: "CONFIRMED",
      },
    },
  });
  assert.equal(suiteBookings.length, 1);
});
