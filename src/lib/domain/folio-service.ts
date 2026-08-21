import { prisma } from "../db/prisma";
import { calculateGST } from "../gst/calculator";
import { getNextDocumentNumber } from "../sequence/generator";

export async function postManualFolioCharge({
  folioId,
  folioWindowId,
  chargeCode,
  description,
  amount,
  qty = 1,
  isInclusive = false,
  sacHsn = "996311",
  actorId,
}: {
  folioId: string;
  folioWindowId?: string;
  chargeCode: string;
  description: string;
  amount: number;
  qty?: number;
  isInclusive?: boolean;
  sacHsn?: string;
  actorId?: string;
}) {
  const folio = await prisma.folio.findUniqueOrThrow({
    where: { id: folioId },
    include: {
      property: true,
      windows: true,
    },
  });

  if (folio.status !== "OPEN") {
    throw new Error(`Folio is ${folio.status}. Cannot post new charges.`);
  }

  const windowId = folioWindowId || folio.windows[0]?.id;
  if (!windowId) {
    throw new Error("No folio window available.");
  }

  const totalBase = amount * qty;
  const gst = calculateGST({
    grossOrBaseAmount: totalBase,
    isInclusive,
    sacHsn,
    supplierStateCode: folio.property.stateCode || "18",
  });

  const entry = await prisma.folioEntry.create({
    data: {
      organizationId: folio.organizationId,
      propertyId: folio.propertyId,
      folioId: folio.id,
      folioWindowId: windowId,
      serviceDate: folio.property.businessDate || new Date().toISOString().split("T")[0],
      type: "CHARGE",
      chargeCode,
      description,
      qty,
      unitAmount: amount,
      taxableAmount: gst.taxableAmount,
      taxComponentsJson: JSON.stringify(gst.components),
      totalAmount: gst.totalAmount,
      sourceType: "MANUAL_CHARGE",
      status: "POSTED",
    },
  });

  await prisma.folio.update({
    where: { id: folio.id },
    data: {
      balance: { increment: gst.totalAmount },
    },
  });

  return entry;
}

export async function recordPayment({
  folioId,
  folioWindowId,
  amount,
  method,
  reference,
  payerName,
  actorId,
}: {
  folioId: string;
  folioWindowId?: string;
  amount: number;
  method: string;
  reference?: string;
  payerName?: string;
  actorId?: string;
}) {
  const folio = await prisma.folio.findUniqueOrThrow({
    where: { id: folioId },
    include: {
      property: true,
      windows: true,
    },
  });

  const seq = await getNextDocumentNumber(folio.propertyId, "RECEIPT");

  const payment = await prisma.payment.create({
    data: {
      organizationId: folio.organizationId,
      propertyId: folio.propertyId,
      receiptNo: seq.formattedNumber,
      folioId: folio.id,
      amount,
      method,
      reference,
      payerSnapshot: JSON.stringify({ name: payerName || "Guest" }),
      status: "SUCCEEDED",
      createdById: actorId,
    },
  });

  const targetWindowId = folioWindowId || folio.windows[0]?.id;
  if (targetWindowId) {
    await prisma.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        folioWindowId: targetWindowId,
        amount,
      },
    });
  }

  await prisma.folio.update({
    where: { id: folio.id },
    data: {
      balance: { decrement: amount },
    },
  });

  return payment;
}

export async function checkoutAndIssueInvoice({
  stayId,
  folioWindowId,
  actorId,
}: {
  stayId: string;
  folioWindowId?: string;
  actorId?: string;
}) {
  const stay = await prisma.stay.findUniqueOrThrow({
    where: { id: stayId },
    include: {
      folio: {
        include: {
          windows: {
            include: {
              entries: { where: { status: "POSTED" } },
            },
          },
          payments: { where: { status: "SUCCEEDED" } },
        },
      },
      property: true,
      primaryGuest: true,
      roomAssignments: { where: { endsAt: null }, include: { room: true } },
    },
  });

  const folio = stay.folio;
  if (!folio) {
    throw new Error("No folio linked with this stay.");
  }

  // Calculate balance: sum of charges - sum of payments
  const allEntries = folio.windows.flatMap((w) => w.entries);
  const totalCharges = allEntries.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalPayments = folio.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.round((totalCharges - totalPayments) * 100) / 100;

  if (Math.abs(balance) > 1.0) {
    throw new Error(`Cannot checkout with outstanding balance of ₹${balance.toFixed(2)}. Please settle folio.`);
  }

  const activeWindow = folioWindowId
    ? folio.windows.find((w) => w.id === folioWindowId) || folio.windows[0]
    : folio.windows[0];

  // 1. Generate sequential GST Invoice
  const invSeq = await getNextDocumentNumber(stay.propertyId, "INVOICE");
  const subtotal = allEntries.reduce((sum, e) => sum + e.taxableAmount, 0);
  const taxTotal = allEntries.reduce((sum, e) => sum + (e.totalAmount - e.taxableAmount), 0);

  const supplierSnapshot = JSON.stringify({
    legalName: stay.property.legalName,
    displayName: stay.property.displayName,
    gstin: stay.property.gstin || "18AAAAA0000A1Z5",
    stateCode: stay.property.stateCode || "18",
    address: stay.property.address || "Guwahati, Assam",
  });

  const recipientSnapshot = JSON.stringify({
    name: stay.primaryGuest.name,
    phone: stay.primaryGuest.phone,
    email: stay.primaryGuest.email,
    gstin: stay.primaryGuest.gstin,
    companyName: stay.primaryGuest.companyName,
    nationality: stay.primaryGuest.nationality,
  });

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: stay.organizationId,
      propertyId: stay.propertyId,
      invoiceNo: invSeq.formattedNumber,
      invoiceSeries: invSeq.prefix.replace(/-$/, ""),
      financialYear: invSeq.financialYear,
      folioWindowId: activeWindow?.id,
      businessDate: stay.property.businessDate || new Date().toISOString().split("T")[0],
      supplierSnapshot,
      recipientSnapshot,
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      totalAmount: Math.round(totalCharges * 100) / 100,
      status: "ISSUED",
      documentHash: `SHA256-${Date.now()}-${invSeq.formattedNumber}`,
    },
  });

  // Create invoice lines for each distinct charge
  for (const entry of allEntries) {
    await prisma.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        sourceEntryIds: JSON.stringify([entry.id]),
        description: entry.description,
        sacHsn: entry.chargeCode.includes("FB") || entry.chargeCode.includes("RESTAURANT") ? "996331" : "996311",
        qty: entry.qty,
        taxableAmount: entry.taxableAmount,
        componentTaxRatesJson: entry.taxComponentsJson,
        totalAmount: entry.totalAmount,
      },
    });
  }

  // 2. Mark Folio & Stay as CHECKED_OUT
  await prisma.folio.update({
    where: { id: folio.id },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  await prisma.stay.update({
    where: { id: stay.id },
    data: {
      status: "CHECKED_OUT",
      actualDepartureAt: new Date(),
    },
  });

  // 3. Close room assignments and mark room VACANT + DIRTY
  for (const assignment of stay.roomAssignments) {
    await prisma.roomAssignment.update({
      where: { id: assignment.id },
      data: { endsAt: new Date() },
    });

    await prisma.roomState.upsert({
      where: { roomId: assignment.roomId },
      create: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        roomId: assignment.roomId,
        occupancyStatus: "VACANT",
        housekeepingStatus: "DIRTY",
        sellabilityStatus: "SELLABLE",
      },
      update: {
        occupancyStatus: "VACANT",
        housekeepingStatus: "DIRTY",
        lastChangedAt: new Date(),
      },
    });

    // Create automatic checkout clean task
    await prisma.housekeepingTask.create({
      data: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        roomId: assignment.roomId,
        stayId: stay.id,
        type: "CHECKOUT_CLEAN",
        priority: "HIGH",
        status: "OPEN",
        notes: `Guest ${stay.primaryGuest.name} checked out. Room ready for turnaround clean.`,
      },
    });
  }

  // 4. Audit Log
  await prisma.auditLog.create({
    data: {
      organizationId: stay.organizationId,
      propertyId: stay.propertyId,
      actorId,
      action: "CHECK_OUT",
      targetType: "STAY",
      targetId: stay.id,
      afterJson: JSON.stringify({
        invoiceNo: invoice.invoiceNo,
        totalAmount: invoice.totalAmount,
        roomsReleased: stay.roomAssignments.map((a) => a.room.number),
      }),
    },
  });

  return { success: true, invoice, balance };
}
