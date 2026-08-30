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
  isInclusive = true,
  sacHsn = "996331",
  customTaxRate = 5,
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
  customTaxRate?: number;
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
    customTaxRate: customTaxRate !== undefined ? customTaxRate : 5,
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
  payerSnapshot,
  isRefund = false,
  actorId,
}: {
  folioId: string;
  folioWindowId?: string;
  amount: number;
  method: string;
  reference?: string;
  payerName?: string;
  payerSnapshot?: string;
  isRefund?: boolean;
  actorId?: string;
}) {
  const folio = await prisma.folio.findUniqueOrThrow({
    where: { id: folioId },
    include: {
      property: true,
      windows: true,
      stay: { include: { primaryGuest: true } },
    },
  });

  if (folio.status !== "OPEN") {
    throw new Error(`Folio is ${folio.status}. Cannot record payments.`);
  }

  const windowId = folioWindowId || folio.windows[0]?.id;
  if (!windowId) {
    throw new Error("No folio window available.");
  }

  const isActuallyRefund = isRefund || amount < 0 || method.toUpperCase().includes("REFUND") || method.toUpperCase().includes("PAYOUT");
  const finalAmount = isActuallyRefund ? -Math.abs(amount) : Math.abs(amount);
  const docType = isActuallyRefund ? "REFUND" : "RECEIPT";

  const docSeq = await getNextDocumentNumber(folio.propertyId, docType);
  const isBTC = method === "DIRECT_BILL";

  const pSnapshot =
    payerSnapshot ||
    JSON.stringify({
      name: payerName || folio.stay?.primaryGuest?.name || "Guest",
      phone: folio.stay?.primaryGuest?.phone,
      companyName: folio.stay?.primaryGuest?.companyName || "",
      gstin: folio.stay?.primaryGuest?.gstin || "",
      billToCompany: isBTC,
      isRefund: isActuallyRefund,
    });

  const payment = await prisma.payment.create({
    data: {
      organizationId: folio.organizationId,
      propertyId: folio.propertyId,
      folioId: folio.id,
      receiptNo: docSeq.formattedNumber,
      amount: finalAmount,
      method,
      reference: reference || (isActuallyRefund ? "Advance Surplus Refund Payout" : (isBTC ? `BTC-${folio.stay?.primaryGuest?.companyName || "CORP"}` : undefined)),
      payerSnapshot: pSnapshot,
      status: "SUCCEEDED",
      createdById: actorId,
    },
  });

  await prisma.paymentAllocation.create({
    data: {
      paymentId: payment.id,
      folioWindowId: windowId,
      amount: finalAmount,
    },
  });

  await prisma.folio.update({
    where: { id: folio.id },
    data: {
      balance: { decrement: finalAmount },
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
    gstin: stay.property.gstin || "18AACCB2447F1ZX",
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

/**
 * Automatically evaluates 24-hour cycles and posts the next night's room charge
 * once the stay crosses the 24-hour mark (unless protected by grace period).
 */
export async function sync24HourFolioCharges({
  folioId,
  overrideGraceMinutes,
}: {
  folioId: string;
  overrideGraceMinutes?: number;
}) {
  const folio = await prisma.folio.findUnique({
    where: { id: folioId },
    include: {
      property: true,
      windows: {
        include: {
          entries: {
            where: { chargeCode: "ROOM_TARIFF" },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      stay: {
        include: {
          roomAssignments: {
            where: { endsAt: null },
            include: { room: true },
          },
        },
      },
    },
  });

  if (!folio || folio.status !== "OPEN" || !folio.stay) {
    return { billableNights: 1, completedCycles: 0, elapsedHours: "0.0" };
  }

  const stay = folio.stay;
  const primaryWindow = folio.windows[0];
  if (!primaryWindow) {
    return { billableNights: 1, completedCycles: 0, elapsedHours: "0.0" };
  }

  const activeAssignment = stay.roomAssignments[0];
  const room = activeAssignment?.room;

  // Determine agreed rate
  let roomBasePrice = 3200;
  let isComp = false;
  if (activeAssignment?.rateHandling === "COMPLIMENTARY" || activeAssignment?.moveReason === "AGREED_RATE:0") {
    roomBasePrice = 0;
    isComp = true;
  } else if (activeAssignment?.moveReason?.startsWith("AGREED_RATE:")) {
    roomBasePrice = Number(activeAssignment.moveReason.replace("AGREED_RATE:", "")) || 3200;
  }

  // Grace Period in minutes
  let graceMinutes = 60; // default 1 hour grace
  if (overrideGraceMinutes !== undefined) {
    graceMinutes = overrideGraceMinutes;
  } else if (activeAssignment?.rateHandling?.includes("24_HOURS:")) {
    graceMinutes = Number(activeAssignment.rateHandling.split(":")[1]) || 60;
  }

  // Arrival timestamp
  const arrivalTime = stay.arrivalAt ? new Date(stay.arrivalAt) : new Date(activeAssignment?.startsAt || Date.now());
  const now = new Date();

  // Elapsed duration
  const elapsedMs = Math.max(0, now.getTime() - arrivalTime.getTime());
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  const completedCycles = Math.floor(elapsedHours / 24);
  const remainingMinutes = Math.round((elapsedHours % 24) * 60);

  // Billable nights calculation:
  // - Cycle 1 (0 to 24 hrs): exactly 1 night
  // - Cycle 2+ (after 24 hrs): if remaining time <= graceMinutes, remain on completedCycles; otherwise completedCycles + 1
  let billableNights = 1;
  if (completedCycles >= 1) {
    if (remainingMinutes <= graceMinutes) {
      billableNights = completedCycles;
    } else {
      billableNights = completedCycles + 1;
    }
  }

  const existingEntries = primaryWindow.entries || [];
  const currentChargedNights = existingEntries.length;

  if (currentChargedNights < billableNights) {
    // Post missing cycle room charges
    for (let n = currentChargedNights + 1; n <= billableNights; n++) {
      const cycleDate = new Date(arrivalTime.getTime() + (n - 1) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const gst = isComp || roomBasePrice === 0
        ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: [] }
        : calculateGST({
            grossOrBaseAmount: roomBasePrice,
            isInclusive: true,
            sacHsn: "996311",
            supplierStateCode: folio.property.stateCode || "18",
            customTaxRate: 5,
          });

      await prisma.folioEntry.create({
        data: {
          organizationId: folio.organizationId,
          propertyId: folio.propertyId,
          folioId: folio.id,
          folioWindowId: primaryWindow.id,
          serviceDate: cycleDate,
          type: "CHARGE",
          chargeCode: "ROOM_TARIFF",
          description: isComp || roomBasePrice === 0
            ? `Room Tariff - Room ${room?.number || "Stay"} (Night ${n} - 24hr Cycle - COMPLIMENTARY)`
            : `Room Tariff - Room ${room?.number || "Stay"} (Night ${n} - 24hr Cycle Rollover)`,
          qty: 1,
          unitAmount: roomBasePrice,
          taxableAmount: gst.taxableAmount,
          taxComponentsJson: JSON.stringify(gst.components),
          totalAmount: gst.totalAmount,
          sourceType: "PMS_24HR_AUTO_CHARGE",
          status: "POSTED",
        },
      });

      await prisma.folio.update({
        where: { id: folio.id },
        data: { balance: { increment: gst.totalAmount } },
      });
    }
  }

  return {
    billableNights,
    completedCycles,
    remainingMinutes,
    graceMinutes,
    elapsedHours: elapsedHours.toFixed(1),
  };
}
