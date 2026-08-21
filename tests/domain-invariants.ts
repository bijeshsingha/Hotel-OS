import { calculateGST } from "../src/lib/gst/calculator";
import { prisma } from "../src/lib/db/prisma";
import { getNextDocumentNumber } from "../src/lib/sequence/generator";
import { postNightlyRoomCharges, runNightAuditChecks } from "../src/lib/domain/night-audit-service";
import { calculateAvailability } from "../src/lib/domain/pms-service";

async function runTests() {
  console.log("=========================================");
  console.log("🧪 RUNNING HOTEL OS V1 DOMAIN TESTS");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Test GST Engine: Accommodation under ₹7,500 (12%)
  const gstRoom12 = calculateGST({
    grossOrBaseAmount: 4800,
    sacHsn: "996311",
    supplierStateCode: "18",
    recipientStateCode: "18",
  });
  assert(gstRoom12.components.effectiveTaxRate === 12, "Room tariff under ₹7,500 applies 12% GST");
  assert(gstRoom12.components.cgstRate === 6 && gstRoom12.components.sgstRate === 6, "Intra-state room 12% splits into 6% CGST + 6% SGST");
  assert(gstRoom12.taxAmount === 576, "₹4,800 @ 12% GST tax equals ₹576.00");
  assert(gstRoom12.totalAmount === 5376, "₹4,800 + ₹576 equals ₹5,376.00 total");

  // 2. Test GST Engine: Accommodation above ₹7,500 (18%)
  const gstRoom18 = calculateGST({
    grossOrBaseAmount: 12500,
    sacHsn: "996311",
    supplierStateCode: "18",
    recipientStateCode: "18",
  });
  assert(gstRoom18.components.effectiveTaxRate === 18, "Room tariff above ₹7,500 applies 18% GST");
  assert(gstRoom18.components.cgstRate === 9 && gstRoom18.components.sgstRate === 9, "Intra-state room 18% splits into 9% CGST + 9% SGST");
  assert(gstRoom18.taxAmount === 2250, "₹12,500 @ 18% GST tax equals ₹2,250.00");

  // 3. Test GST Engine: Restaurant Food 5% (SAC 996331)
  const gstFood = calculateGST({
    grossOrBaseAmount: 1000,
    sacHsn: "996331",
    supplierStateCode: "18",
    recipientStateCode: "18",
  });
  assert(gstFood.components.effectiveTaxRate === 5, "Restaurant food applies 5% GST without ITC");
  assert(gstFood.components.cgstRate === 2.5 && gstFood.components.sgstRate === 2.5, "Restaurant food 5% splits into 2.5% CGST + 2.5% SGST");
  assert(gstFood.totalAmount === 1050, "₹1,000 + 5% GST equals ₹1,050.00");

  // 4. Test GST Engine: Inter-State IGST
  const gstIgst = calculateGST({
    grossOrBaseAmount: 5000,
    sacHsn: "996311",
    supplierStateCode: "18", // Assam
    recipientStateCode: "17", // Meghalaya
  });
  assert(gstIgst.isInterState === true, "Different state code triggers inter-state supply");
  assert(gstIgst.components.igstRate === 12 && gstIgst.components.cgstRate === 0, "Inter-state supply applies 12% IGST with 0% CGST/SGST");

  // 5. Test Document Sequence Generator
  const prop = await prisma.property.findFirst({ where: { code: "GUW-01" } });
  if (prop) {
    const seq1 = await getNextDocumentNumber(prop.id, "INVOICE");
    const seq2 = await getNextDocumentNumber(prop.id, "INVOICE");
    assert(seq1.formattedNumber !== seq2.formattedNumber, "Consecutive document numbers are distinct");
    assert(seq2.nextVal === seq1.nextVal + 1, "Document sequence increments by exactly 1");
    assert(seq1.formattedNumber.startsWith("INV-2627-"), "Invoice follows Indian FY format INV-2627-XXXX");

    // 6. Test Availability Calculation
    const avail = await calculateAvailability(prop.id, "2026-08-20", "2026-08-22");
    assert(Array.isArray(avail) && avail.length > 0, "Availability engine returns room types breakdown");
    assert(avail.every((a) => a.totalRooms >= a.availableCount), "Total rooms always >= available count");

    // 7. Test Night Audit Checklist
    const checklist = await runNightAuditChecks(prop.id);
    assert(typeof checklist.openArrivalsCount === "number", "Checklist computes pending arrivals");
    assert(typeof checklist.unpostedStaysCount === "number", "Checklist identifies stays requiring room charges");

    // 8. Test Nightly Charge Idempotency
    const postRun1 = await postNightlyRoomCharges(prop.id);
    const postRun2 = await postNightlyRoomCharges(prop.id);
    assert(postRun2.every((r) => r.status === "ALREADY_POSTED"), "Second night audit run skips already-posted stays (idempotency holds)");
  }

  console.log("\n=========================================");
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=========================================\n");

  if (failed > 0) process.exit(1);
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
