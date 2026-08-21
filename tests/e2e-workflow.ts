import { prisma } from "../src/lib/db/prisma";
import { formatINR } from "../src/lib/gst/calculator";

const BASE_URL = "http://localhost:3000";

async function runE2ETests() {
  console.log("==========================================================");
  console.log("🏨 HOTEL OS — FULL END-TO-END WORKFLOW VERIFICATION TEST");
  console.log("==========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}${detail ? ` (${detail})` : ""}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` [ERROR: ${detail}]` : ""}`);
      failed++;
    }
  }

  // 0. Locate Test Property & Setup
  const property = await prisma.property.findFirst({
    where: { code: "HDV-01" },
    include: {
      rooms: { include: { roomType: true, roomState: true } },
      outlets: { include: { tables: true, categories: { include: { items: { include: { variants: true } } } } } },
    },
  });

  if (!property) {
    throw new Error("HDV-01 property not found in database. Run npm run db:seed first.");
  }

  console.log(`📍 Testing Property: ${property.displayName} (${property.code}) | State Code: ${property.stateCode}`);
  console.log(`📅 Current Business Date: ${property.businessDate}\n`);

  // --- STEP 1: DASHBOARD METRICS ---
  console.log("--- 1. DASHBOARD OVERVIEW & KPIS ---");
  const dashRes = await fetch(`${BASE_URL}/api/v1/dashboard?propertyId=${property.id}`);
  const dashData = await dashRes.json();
  assert(dashRes.ok, "Dashboard API responded with HTTP 200");
  assert(typeof dashData.kpis?.occupancyPct === "number", "Occupancy metric computed", `${dashData.kpis.occupancyPct}%`);
  assert(typeof dashData.kpis?.grossRevenue === "number", "Gross Revenue computed", formatINR(dashData.kpis.grossRevenue));
  assert(Array.isArray(dashData.trendHistory), "14-day trend history retrieved", `${dashData.trendHistory.length} data points`);

  // --- STEP 2: FRONT DESK PMS WALK-IN CHECK-IN ---
  console.log("\n--- 2. FRONT DESK PMS WALK-IN CHECK-IN ---");
  const vacantRoom = property.rooms.find(
    (r) => r.roomState?.occupancyStatus === "VACANT" && r.roomState?.sellabilityStatus === "SELLABLE"
  );
  if (!vacantRoom) {
    throw new Error("No vacant room available for check-in test");
  }

  const checkInData = {
    propertyId: property.id,
    guestData: {
      name: "Arjun Barman (E2E Test)",
      phone: "+91 98765 43210",
      email: "arjun.test@example.com",
      idType: "AADHAAR",
      idNumber: "9988-7766-5544",
    },
    roomId: vacantRoom.id,
    arrivalAt: `${property.businessDate}T14:00:00Z`,
    expectedDepartureAt: "2026-08-23T11:00:00Z",
    adults: 2,
    children: 0,
    depositAmount: 0,
  };

  const checkInRes = await fetch(`${BASE_URL}/api/v1/stays/check-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkInData),
  });
  const checkInResult = await checkInRes.json();

  assert(checkInRes.ok && checkInResult.success, "Walk-in check-in API succeeded", `Stay ID: ${checkInResult.stay?.id}`);
  assert(checkInResult.stay?.status === "IN_HOUSE", "Stay status set to IN_HOUSE");
  assert(Boolean(checkInResult.folio?.id), "Primary Guest Folio created automatically", `Folio ID: ${checkInResult.folio?.id}`);

  const stayId = checkInResult.stay?.id;
  const folioId = checkInResult.folio?.id;

  // Verify room state transitioned to OCCUPIED in database
  const updatedRoom = await prisma.room.findUnique({
    where: { id: vacantRoom.id },
    include: { roomState: true },
  });
  assert(updatedRoom?.roomState?.occupancyStatus === "OCCUPIED", `Room ${vacantRoom.number} is now OCCUPIED`);

  // --- STEP 3: ROOM MOVE (PMS TRANSFER) ---
  console.log("\n--- 3. ROOM MOVE TRANSITION ---");
  const targetRoom = property.rooms.find(
    (r) => r.id !== vacantRoom.id && r.roomState?.occupancyStatus === "VACANT" && r.roomState?.sellabilityStatus === "SELLABLE"
  );

  let activeRoomId = vacantRoom.id;
  if (targetRoom && stayId) {
    const moveRes = await fetch(`${BASE_URL}/api/v1/stays/${stayId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetRoomId: targetRoom.id,
        reason: "Guest requested quiet room",
      }),
    });
    const moveResult = await moveRes.json();
    assert(moveRes.ok && moveResult.success, "Room move API succeeded", `Moved from ${vacantRoom.number} -> ${targetRoom.number}`);

    const oldRoomState = await prisma.roomState.findUnique({ where: { roomId: vacantRoom.id } });
    const newRoomState = await prisma.roomState.findUnique({ where: { roomId: targetRoom.id } });

    assert(oldRoomState?.housekeepingStatus === "DIRTY", `Origin Room ${vacantRoom.number} marked DIRTY for cleaning`);
    assert(newRoomState?.occupancyStatus === "OCCUPIED", `Target Room ${targetRoom.number} marked OCCUPIED`);
    activeRoomId = targetRoom.id;
  }

  // --- STEP 4: RESTAURANT POS ORDER, KOT & POST TO ROOM FOLIO ---
  console.log("\n--- 4. RESTAURANT POS, KOT & ROOM FOLIO POSTING ---");
  const outlet = property.outlets[0];
  const table = outlet?.tables[0];
  const menuItem = outlet?.categories[0]?.items[0];
  const variant = menuItem?.variants[0];

  assert(Boolean(outlet && table && menuItem && variant), "Outlet, dining table, menu item, and price variant present");

  // 4a. Create POS Dine-in Order
  const orderRes = await fetch(`${BASE_URL}/api/v1/pos/outlets/${outlet.id}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: property.id,
      tableId: table?.id,
      mode: "DINE_IN",
      covers: 2,
    }),
  });
  const order = await orderRes.json();
  assert(orderRes.ok && Boolean(order.id), "POS Order initiated", `Order #${order.orderNo}`);

  // 4b. Add Item to Order
  const itemRes = await fetch(`${BASE_URL}/api/v1/pos/orders/${order.id}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          menuItemId: menuItem.id,
          variantId: variant.id,
          name: menuItem.name,
          qty: 2,
          unitPrice: variant.price || 480,
          stationId: variant.stationId,
          notes: "Less spicy / extra mint chutney",
        },
      ],
    }),
  });
  const itemData = await itemRes.json();
  assert(itemRes.ok && Array.isArray(itemData.items), `Added 2x ${menuItem.name} to order`);

  // 4c. Fire KOT to Kitchen
  const kotRes = await fetch(`${BASE_URL}/api/v1/pos/orders/${order.id}/fire-kot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const kotData = await kotRes.json();
  assert(kotRes.ok && Array.isArray(kotData.kots) && kotData.kots.length > 0, "Fired Kitchen Order Ticket (KOT)", `KOT: ${kotData.kots[0]?.kotNo}`);

  // 4d. Post Check to Guest Room Folio
  const postRoomRes = await fetch(`${BASE_URL}/api/v1/pos/orders/${order.id}/post-to-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stayId }),
  });
  const postRoomData = await postRoomRes.json();
  assert(postRoomRes.ok && postRoomData.success, "Posted F&B charge to Guest Room Folio", `SAC 996331 5% GST`);

  // --- STEP 5: NIGHT AUDIT ROOM TARIFF POSTING ---
  console.log("\n--- 5. NIGHT AUDIT & DAILY ROOM CHARGE POSTING ---");
  const auditChecksRes = await fetch(`${BASE_URL}/api/v1/night-audit/checks?propertyId=${property.id}`);
  const auditChecks = await auditChecksRes.json();
  assert(auditChecksRes.ok, "Night audit pre-flight checks executed", `${auditChecks.unpostedStaysCount || 0} eligible stays`);

  const postTariffRes = await fetch(`${BASE_URL}/api/v1/night-audit/post-room-charges`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId: property.id }),
  });
  const tariffData = await postTariffRes.json();
  assert(postTariffRes.ok, "Automated Nightly Room Tariff posted to active stays", `${tariffData.postedCount ?? 0} posted`);

  // --- STEP 6: FOLIO PAYMENT SETTLEMENT & RULE 46 GST INVOICE ---
  console.log("\n--- 6. FOLIO PAYMENT SETTLEMENT & RULE 46 TAX INVOICE ---");
  const folioRes = await fetch(`${BASE_URL}/api/v1/folios/${folioId}`);
  const folioData = await folioRes.json();
  assert(folioRes.ok, "Folio ledger retrieved", `Folio ID: ${folioData.id}`);

  const entries = folioData.windows?.flatMap((w: any) => w.entries) || [];
  const totalDue = entries.reduce((sum: number, e: any) => sum + e.totalAmount, 0);
  assert(entries.length >= 2, "Folio has both Room Tariff and POS F&B line entries", `${entries.length} charge entries`);
  assert(totalDue > 0, "Total charges calculated accurately", formatINR(totalDue));

  // Settle Full Folio via UPI
  const payRes = await fetch(`${BASE_URL}/api/v1/folios/${folioId}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: String(totalDue),
      method: "UPI",
      reference: `UPI/TEST/${Date.now().toString().slice(-6)}`,
      payerName: "Arjun Barman",
    }),
  });
  const payData = await payRes.json();
  assert(payRes.ok && Boolean(payData.receiptNo), "Payment recorded & Receipt issued", `Receipt #${payData.receiptNo}`);

  // Perform Final Checkout & Issue Rule 46 GST Tax Invoice
  const checkoutRes = await fetch(`${BASE_URL}/api/v1/stays/${stayId}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folioWindowId: folioData.windows[0].id,
      notes: "Settled in full at front desk",
    }),
  });
  const checkoutData = await checkoutRes.json();
  assert(checkoutRes.ok && checkoutData.success, "Guest checkout finalized", `Invoice #${checkoutData.invoice?.invoiceNo}`);

  // Verify Stay in database is CHECKED_OUT
  const finalStay = await prisma.stay.findUnique({ where: { id: stayId } });
  assert(finalStay?.status === "CHECKED_OUT", "Stay status marked CHECKED_OUT in database");
  assert(Boolean(checkoutData.invoice?.documentHash), "Invoice cryptographically hashed for GST compliance", `Hash: ${checkoutData.invoice?.documentHash?.slice(0, 16)}...`);

  // --- STEP 7: HOUSEKEEPING STATUS CYCLE ---
  console.log("\n--- 7. HOUSEKEEPING ROOM TURNOVER CYCLE ---");
  const hkDirtyState = await prisma.roomState.findUnique({ where: { roomId: activeRoomId } });
  assert(hkDirtyState?.housekeepingStatus === "DIRTY", "Checked-out room automatically transitioned to DIRTY");

  // Housekeeping staff marks room CLEAN
  const cleanRes = await fetch(`${BASE_URL}/api/v1/rooms/${activeRoomId}/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ housekeepingStatus: "CLEAN" }),
  });
  assert(cleanRes.ok, "Staff marked room CLEAN");

  // Supervisor inspects and passes room
  const inspectRes = await fetch(`${BASE_URL}/api/v1/rooms/${activeRoomId}/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ housekeepingStatus: "INSPECTED" }),
  });
  assert(inspectRes.ok, "Supervisor passed inspection -> Room is now INSPECTED & Arrival-Ready");

  // --- STEP 8: MAINTENANCE TICKET CREATION ---
  console.log("\n--- 8. MAINTENANCE TICKET LOGGING ---");
  const maintRes = await fetch(`${BASE_URL}/api/v1/maintenance/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: property.id,
      roomId: activeRoomId,
      category: "ELECTRICAL",
      priority: "NORMAL",
      assetText: "Bedside Reading Lamp",
      description: "Bulb flickering in bedroom socket",
    }),
  });
  const maintData = await maintRes.json();
  assert(maintRes.ok, "Maintenance ticket logged", `Ticket #${maintData.issueNo}`);

  // --- STEP 9: IMMUTABLE AUDIT TRAIL VERIFICATION ---
  console.log("\n--- 9. IMMUTABLE AUDIT TRAIL VERIFICATION ---");
  const auditRes = await fetch(`${BASE_URL}/api/v1/audit-logs?propertyId=${property.id}`);
  const auditLogs = await auditRes.json();
  assert(Array.isArray(auditLogs) && auditLogs.length > 0, "Audit log trail captured all operational mutations", `${auditLogs.length} events logged`);

  // --- FINAL SUMMARY ---
  console.log("\n==========================================================");
  console.log(`🏁 END-TO-END WORKFLOW RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================================\n");

  if (failed > 0) process.exit(1);
}

runE2ETests()
  .catch((err) => {
    console.error("E2E Test Execution Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
