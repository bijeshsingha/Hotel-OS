import { prisma } from "../db/prisma";
import { calculateGST } from "../gst/calculator";
import { getNextDocumentNumber } from "../sequence/generator";
import { logAuditEvent } from "./audit-service";

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

  // Recalculate exact live balance: Math.max(0, totalCharges - totalPayments)
  const allEntries = await prisma.folioEntry.findMany({
    where: { folioId: folio.id, status: "POSTED" },
  });
  const allPayments = await prisma.payment.findMany({
    where: { folioId: folio.id, status: "SUCCEEDED" },
  });
  const totalCharges = allEntries.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalPayments = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const newBalance = Math.max(0, Math.round((totalCharges - totalPayments) * 100) / 100);

  await prisma.folio.update({
    where: { id: folio.id },
    data: { balance: newBalance },
  });

  // Audit log for manual charge or discount
  const isDiscount = chargeCode === "DISCOUNT" || amount < 0;
  await logAuditEvent({
    organizationId: folio.organizationId,
    propertyId: folio.propertyId,
    actorId: actorId || null,
    actorName: "Staff / Cashier",
    action: isDiscount ? "FOLIO_DISCOUNT_APPLIED" : "FOLIO_CHARGE_ADD",
    targetType: "FOLIO_ENTRY",
    targetId: entry.id,
    reason: description || (isDiscount ? "Discount posted" : "Manual folio charge posted"),
    afterJson: {
      folioId: folio.id,
      chargeCode,
      description,
      qty,
      unitAmount: amount,
      taxableAmount: gst.taxableAmount,
      taxAmount: gst.taxAmount,
      totalAmount: gst.totalAmount,
      newBalance,
    },
  });

  return entry;
}

export async function deleteFolioCharge({
  folioId,
  entryId,
  reason,
  actorId,
}: {
  folioId: string;
  entryId: string;
  reason?: string;
  actorId?: string;
}) {
  const folio = await prisma.folio.findUniqueOrThrow({
    where: { id: folioId },
    include: {
      windows: {
        include: { entries: true },
      },
      payments: true,
    },
  });

  if (folio.status !== "OPEN") {
    throw new Error(`Folio is ${folio.status}. Cannot delete charges from a closed or invoiced folio.`);
  }

  const targetEntry = await prisma.folioEntry.findUnique({
    where: { id: entryId },
  });

  if (!targetEntry || targetEntry.folioId !== folioId) {
    throw new Error("Folio entry not found on this folio.");
  }

  if (targetEntry.chargeCode?.includes("ROOM_TARIFF") || targetEntry.sourceType === "PMS_NIGHTLY_CHARGE") {
    throw new Error("System-generated room tariff charges cannot be deleted. To adjust room tariff, edit the GRC rate or post a Discount/Rebate.");
  }

  // Delete the entry
  await prisma.folioEntry.delete({
    where: { id: entryId },
  });

  // Recalculate true balance: sum of remaining POSTED charges - sum of SUCCEEDED payments
  const remainingEntries = await prisma.folioEntry.findMany({
    where: { folioId: folio.id, status: "POSTED" },
  });
  const payments = await prisma.payment.findMany({
    where: { folioId: folio.id, status: "SUCCEEDED" },
  });

  const totalCharges = remainingEntries.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const newBalance = Math.max(0, Math.round((totalCharges - totalPayments) * 100) / 100);

  await prisma.folio.update({
    where: { id: folio.id },
    data: { balance: newBalance },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId: folio.organizationId,
      propertyId: folio.propertyId,
      actorId: actorId || "usr_cashier",
      action: "DELETE_FOLIO_CHARGE",
      targetType: "FOLIO_ENTRY",
      targetId: entryId,
      reason: reason || "Voided mistaken folio charge",
      afterJson: JSON.stringify({
        deletedEntry: {
          chargeCode: targetEntry.chargeCode,
          description: targetEntry.description,
          totalAmount: targetEntry.totalAmount,
          serviceDate: targetEntry.serviceDate,
        },
        recalculatedBalance: newBalance,
      }),
    },
  });

  return {
    success: true,
    deletedEntryId: entryId,
    recalculatedBalance: newBalance,
  };
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

  // Audit log for payment receipt or surplus refund payout
  const auditAction = isActuallyRefund ? "REFUND_PAYOUT" : "PAYMENT_RECEIVE";
  const roomNumbers = (folio.stay as any)?.roomAssignments?.map((a: any) => a.room?.number).filter(Boolean).join(", ") || "";
  await logAuditEvent({
    organizationId: folio.organizationId,
    propertyId: folio.propertyId,
    actorId: actorId || null,
    actorName: "Cashier / Front Desk",
    action: auditAction,
    targetType: "FOLIO_PAYMENT",
    targetId: payment.id,
    reason: isActuallyRefund
      ? "Surplus advance refund payout to guest"
      : (reference || `Payment received via ${method}`),
    afterJson: {
      receiptNo: payment.receiptNo,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      folioId: folio.id,
      guestName: payerName || folio.stay?.primaryGuest?.name || "Guest",
      roomNumbers,
      isRefund: isActuallyRefund,
      isBTC,
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

  // 2.5 Update linked GRC registration status to CHECKED_OUT
  await prisma.guestRegistration.updateMany({
    where: {
      propertyId: stay.propertyId,
      OR: [
        { stayId: stay.id },
        { guestId: stay.primaryGuestId },
      ],
    },
    data: {
      status: "CHECKED_OUT",
    },
  }).catch((err) => console.error("Error updating GRC status on checkout:", err));

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

import { calculate24HrBillableDays, calculateDynamicDepartureDate } from "./pms-service";

/**
 * Automatically evaluates 24-hour cycles and posts the next night's room charge
 * once the stay crosses the 24-hour mark (or 12 PM standard checkout for Early Bird),
 * respecting the configured grace period or waiving next night.
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
            where: { chargeCode: "ROOM_TARIFF", status: "POSTED" },
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
    return {
      billableNights: 1,
      completedCycles: 0,
      elapsedHours: "0.0",
      isEarlyBird: false,
      gracePeriodApplied: false,
      checkoutDeadlineText: "Standard Billing",
    };
  }

  const stay = folio.stay;
  const primaryWindow = folio.windows[0];
  if (!primaryWindow) {
    return {
      billableNights: 1,
      completedCycles: 0,
      elapsedHours: "0.0",
      isEarlyBird: false,
      gracePeriodApplied: false,
      checkoutDeadlineText: "Standard Billing",
    };
  }

  const activeAssignments = stay.roomAssignments.filter((a: any) => !a.endsAt);
  const assignmentsToProcess = activeAssignments.length > 0 ? activeAssignments : stay.roomAssignments;
  if (assignmentsToProcess.length === 0) {
    return {
      billableNights: 1,
      completedCycles: 0,
      elapsedHours: "0.0",
      isEarlyBird: false,
      gracePeriodApplied: false,
      checkoutDeadlineText: "Standard Billing",
    };
  }

  const allRoomNumbers = assignmentsToProcess.map((a: any) => a.room?.number).filter(Boolean);
  const now = new Date();
  let folioMutated = false;
  let primaryMetrics: any = null;

  // Process each room assignment independently so multi-room group folios are accurately calculated
  for (const assignment of assignmentsToProcess) {
    const room = assignment.room;
    const roomNo = room?.number;

    // Determine agreed rate for this room
    let roomBasePrice = 3200;
    let isComp = false;
    let isRateInclusive = true;
    if (assignment.rateHandling === "COMPLIMENTARY" || assignment.moveReason === "AGREED_RATE:0") {
      roomBasePrice = 0;
      isComp = true;
    } else if (assignment.moveReason?.startsWith("AGREED_RATE:")) {
      const parts = assignment.moveReason.replace("AGREED_RATE:", "").split(":");
      roomBasePrice = Number(parts[0]) || 3200;
      if (parts[1] === "EXC") {
        isRateInclusive = false;
      }
    }

    // Checkout Type & Grace Period
    let checkoutType: "24_HOURS" | "FIXED_TIME" = "FIXED_TIME";
    let graceMinutes = 0;

    if (overrideGraceMinutes !== undefined) {
      graceMinutes = overrideGraceMinutes;
    } else if (assignment.rateHandling?.includes("24_HOURS:")) {
      checkoutType = "24_HOURS";
      graceMinutes = Number(assignment.rateHandling.split(":")[1]) || 0;
    } else if (assignment.rateHandling?.includes("FIXED_TIME:")) {
      checkoutType = "FIXED_TIME";
      graceMinutes = Number(assignment.rateHandling.split(":")[1]) || 0;
    } else if (assignment.rateHandling === "FIXED_TIME") {
      checkoutType = "FIXED_TIME";
      graceMinutes = 0;
    }

    // Arrival timestamp for this room
    const arrivalTime = stay.arrivalAt ? new Date(stay.arrivalAt) : new Date(assignment.startsAt || Date.now());

    // Elapsed duration
    const elapsedMs = Math.max(0, now.getTime() - arrivalTime.getTime());
    const elapsedHours = (elapsedMs / (1000 * 60 * 60)).toFixed(1);
    const completedCycles = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
    const remainingMinutes = Math.round(((elapsedMs / (1000 * 60 * 60)) % 24) * 60);

    // Compute billable nights using domain engine
    const billableCalc = calculate24HrBillableDays(arrivalTime, now, checkoutType, graceMinutes);
    const billableNights = billableCalc.billableDays;

    // Filter existing entries belonging to this specific room
    const otherRoomNumbers = allRoomNumbers.filter((r: any) => r !== roomNo);
    const roomEntries = (primaryWindow.entries || []).filter((e: any) => {
      if (!roomNo || roomNo === "Unassigned") return true;
      const desc = e.description || "";
      // If description explicitly mentions another room in the group, it's not this room
      if (otherRoomNumbers.some((o: any) => new RegExp(`\\bRoom\\s*#?\\s*${o}\\b`, "i").test(desc))) {
        return false;
      }
      // If description mentions this room, it belongs here
      if (new RegExp(`\\bRoom\\s*#?\\s*${roomNo}\\b`, "i").test(desc)) {
        return true;
      }
      // If only 1 room in stay, it belongs here
      if (assignmentsToProcess.length === 1) return true;
      return false;
    });

    const currentChargedNights = roomEntries.length;

    // Capture primary room metrics for return value
    if (!primaryMetrics) {
      primaryMetrics = {
        billableNights,
        completedCycles,
        remainingMinutes,
        graceMinutes,
        elapsedHours,
        isEarlyBird: billableCalc.isEarlyBird,
        gracePeriodApplied: billableCalc.gracePeriodApplied,
        checkoutDeadlineText: billableCalc.checkoutDeadlineText,
      };
    }

    // 1. Synchronize any existing room tariff charges if the rate was adjusted
    for (const entry of roomEntries) {
      const isEntryComp = roomBasePrice === 0 || isComp;
      const isPriceMismatched = isEntryComp
        ? entry.totalAmount !== 0 || entry.unitAmount !== 0
        : Math.abs(entry.unitAmount - roomBasePrice) > 0.01;

      if (isPriceMismatched) {
        const gst = isEntryComp
          ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: [] }
          : calculateGST({
              grossOrBaseAmount: roomBasePrice,
              isInclusive: isRateInclusive,
              sacHsn: "996311",
              supplierStateCode: folio.property.stateCode || "18",
              customTaxRate: 5,
            });

        await prisma.folioEntry.update({
          where: { id: entry.id },
          data: {
            unitAmount: roomBasePrice,
            taxableAmount: gst.taxableAmount,
            taxComponentsJson: JSON.stringify(gst.components),
            totalAmount: gst.totalAmount,
          },
        });
        folioMutated = true;
      }
    }

    // 2. Post missing cycle room charges if billableNights > currentChargedNights for this room
    if (currentChargedNights < billableNights) {
      for (let n = currentChargedNights + 1; n <= billableNights; n++) {
        const cycleDate = new Date(arrivalTime.getTime() + (n - 1) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

        const desc = isComp || roomBasePrice === 0
          ? `Room Tariff - Room ${room?.number || "Stay"} (Night ${n} - COMPLIMENTARY)`
          : billableCalc.isEarlyBird
          ? `Room Tariff - Room ${room?.number || "Stay"} (Night ${n} - 12 PM Rollover)`
          : `Room Tariff - Room ${room?.number || "Stay"} (Night ${n} - 24hr Cycle Rollover)`;

        const gst = isComp || roomBasePrice === 0
          ? { taxableAmount: 0, taxAmount: 0, totalAmount: 0, components: [] }
          : calculateGST({
              grossOrBaseAmount: roomBasePrice,
              isInclusive: isRateInclusive,
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
            description: desc,
            qty: 1,
            unitAmount: roomBasePrice,
            taxableAmount: gst.taxableAmount,
            taxComponentsJson: JSON.stringify(gst.components),
            totalAmount: gst.totalAmount,
            sourceType: "PMS_24HR_AUTO_CHARGE",
            status: "POSTED",
          },
        });

        folioMutated = true;
      }
    }

    // 3. Roll back excess charges if manager extended grace period or waived next night (billableNights < currentChargedNights)
    // CRITICAL: NEVER delete down to 0 nights! The 1st night of a stay is always preserved.
    if (currentChargedNights > billableNights) {
      const excessCount = currentChargedNights - billableNights;
      // Sort newest to oldest so we remove only the latest night(s)
      const sortedEntries = [...roomEntries].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      // Guarantee the initial night of the stay is never deleted
      const canDeleteCount = Math.min(excessCount, Math.max(0, roomEntries.length - 1));
      const toDelete = sortedEntries.slice(0, canDeleteCount);

      for (const e of toDelete) {
        await prisma.folioEntry.delete({ where: { id: e.id } });
        folioMutated = true;
      }
    }
  }

  // 4. Dynamically update stay expectedDepartureAt if the guest has stayed beyond expected time
  let dynamicDepInfo: any = null;
  if (stay.status === "IN_HOUSE" && assignmentsToProcess.length > 0) {
    const firstAssignment = assignmentsToProcess[0];
    let stayCheckoutType: "24_HOURS" | "FIXED_TIME" = "FIXED_TIME";
    let stayGraceMinutes = 0;

    if (overrideGraceMinutes !== undefined) {
      stayGraceMinutes = overrideGraceMinutes;
    } else if (firstAssignment?.rateHandling?.includes("24_HOURS:")) {
      stayCheckoutType = "24_HOURS";
      stayGraceMinutes = Number(firstAssignment.rateHandling.split(":")[1]) || 0;
    } else if (firstAssignment?.rateHandling?.includes("FIXED_TIME:")) {
      stayCheckoutType = "FIXED_TIME";
      stayGraceMinutes = Number(firstAssignment.rateHandling.split(":")[1]) || 0;
    } else if (firstAssignment?.rateHandling === "24_HOURS") {
      stayCheckoutType = "24_HOURS";
    }

    const dynamicCalc = calculateDynamicDepartureDate({
      arrivalAt: stay.arrivalAt,
      expectedDepartureAt: stay.expectedDepartureAt,
      checkoutType: stayCheckoutType,
      gracePeriodMinutes: stayGraceMinutes,
      now,
    });

    dynamicDepInfo = dynamicCalc;

    if (
      dynamicCalc.isExtended &&
      dynamicCalc.effectiveDepartureAt.getTime() > new Date(stay.expectedDepartureAt).getTime()
    ) {
      await prisma.stay.update({
        where: { id: stay.id },
        data: {
          expectedDepartureAt: dynamicCalc.effectiveDepartureAt,
        },
      });

      // Synchronize linked guest registration departure date if any
      await prisma.guestRegistration.updateMany({
        where: { stayId: stay.id },
        data: {
          expectedDepartureDate: dynamicCalc.effectiveDepartureAt.toISOString().split("T")[0],
        },
      });
    }
  }

  // 5. Recalculate true balance if folio was mutated
  if (folioMutated) {
    const allEntries = await prisma.folioEntry.findMany({
      where: { folioId: folio.id, status: "POSTED" },
    });
    const totalCharges = allEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

    const allPayments = await prisma.payment.findMany({
      where: { folioId: folio.id, status: "SUCCEEDED" },
    });
    const totalPayments = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const newBalance = Math.max(0, Math.round((totalCharges - totalPayments) * 100) / 100);

    await prisma.folio.update({
      where: { id: folio.id },
      data: { balance: newBalance },
    });
  }

  const resultMetrics = primaryMetrics || {
    billableNights: 1,
    completedCycles: 0,
    remainingMinutes: 0,
    graceMinutes: 0,
    elapsedHours: "0.0",
    isEarlyBird: false,
    gracePeriodApplied: false,
    checkoutDeadlineText: "Standard Billing",
  };

  if (dynamicDepInfo) {
    resultMetrics.effectiveDepartureAt = dynamicDepInfo.effectiveDepartureAt;
    resultMetrics.isExtendedDeparture = dynamicDepInfo.isExtended;
    resultMetrics.extensionNights = dynamicDepInfo.extensionNights;
    resultMetrics.originalDepartureAt = dynamicDepInfo.originalDepartureAt;
  }

  return resultMetrics;
}

export async function updateStayGracePeriod({
  stayId,
  gracePeriodMinutes,
  actorId,
}: {
  stayId: string;
  gracePeriodMinutes: number;
  actorId?: string;
}) {
  const stay = await prisma.stay.findUniqueOrThrow({
    where: { id: stayId },
    include: {
      roomAssignments: { where: { endsAt: null } },
      folio: true,
    },
  });

  const is24Hr = stay.roomAssignments.some((ra) => ra.rateHandling?.includes("24_HOURS"));
  const rateHandling = gracePeriodMinutes >= 1440
    ? (is24Hr ? "24_HOURS:1440" : "FIXED_TIME:1440")
    : (is24Hr ? `24_HOURS:${gracePeriodMinutes}` : `FIXED_TIME:${gracePeriodMinutes}`);

  // Update active room assignments with new grace period
  for (const ra of stay.roomAssignments) {
    if (ra.rateHandling !== "COMPLIMENTARY") {
      await prisma.roomAssignment.update({
        where: { id: ra.id },
        data: { rateHandling },
      });
    }
  }

  // Synchronize folio charges immediately with new grace period
  let cycleMetrics: any = null;
  if (stay.folio?.id) {
    cycleMetrics = await sync24HourFolioCharges({
      folioId: stay.folio.id,
      overrideGraceMinutes: gracePeriodMinutes,
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId: stay.organizationId,
      propertyId: stay.propertyId,
      actorId: actorId || "usr_cashier",
      action: "UPDATE_GRACE_PERIOD",
      targetType: "STAY",
      targetId: stay.id,
      reason: `Updated grace period to ${gracePeriodMinutes} minutes`,
      afterJson: JSON.stringify({
        gracePeriodMinutes,
        rateHandling,
        cycleMetrics,
      }),
    },
  });

  return { success: true, gracePeriodMinutes, cycleMetrics };
}

