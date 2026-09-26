import { prisma } from "../db/prisma";
import { calculateGST } from "../gst/calculator";
import { getNextDocumentNumber } from "../sequence/generator";
import { logAuditEvent } from "./audit-service";
import { saveOutstandingRecord, markOutstandingSettled } from "./outstanding-ledger-service";

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

  if (
    (targetEntry.chargeCode?.includes("ROOM_TARIFF") ||
      targetEntry.sourceType === "PMS_NIGHTLY_CHARGE" ||
      targetEntry.sourceType === "PMS_24HR_AUTO_CHARGE") &&
    targetEntry.sourceType !== "MANUAL_CHARGE"
  ) {
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

  const isDebtSettlement =
    folio.status === "CLOSED_OUTSTANDING" ||
    folio.status === "OUTSTANDING" ||
    (folio.status === "CLOSED" && folio.balance > 0.05);

  if (folio.status !== "OPEN" && !isDebtSettlement) {
    throw new Error(`Folio is ${folio.status}. Cannot record payments.`);
  }

  let windowId = folioWindowId || folio.windows[0]?.id;
  if (!windowId) {
    const newWindow = await prisma.folioWindow.create({
      data: {
        folioId: folio.id,
        name: "Guest Window",
        windowNumber: 1,
        payerType: "GUEST",
        status: "OPEN",
      },
    });
    windowId = newWindow.id;
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

  // Check if this folio was checked out with outstanding and is now settled
  try {
    const updatedFolio = await prisma.folio.findUnique({ where: { id: folio.id } });
    if (
      updatedFolio &&
      (updatedFolio.status === "CLOSED_OUTSTANDING" ||
        updatedFolio.status === "OUTSTANDING" ||
        updatedFolio.status === "CLOSED") &&
      updatedFolio.balance <= 0.05
    ) {
      await prisma.folio.update({
        where: { id: folio.id },
        data: {
          status: "CLOSED",
          balance: Math.max(0, updatedFolio.balance),
        },
      });
    }
    markOutstandingSettled(folio.id, finalAmount, method, reference);
  } catch (settleErr) {
    console.warn("Could not sync outstanding ledger status:", settleErr);
  }

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


// Helper to match charges with specific rooms in separate billing mode
export function isEntryForRoom(entry: any, roomNumber: string, allOtherRoomNumbers: string[]): boolean {
  if (!roomNumber || roomNumber === "Unassigned") return true;
  const desc = entry.description || "";

  // Check if description explicitly mentions another room in the group
  const otherRooms = allOtherRoomNumbers.filter((r) => r !== roomNumber);
  for (const other of otherRooms) {
    const regex = new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${other}\\b`, "i");
    if (regex.test(desc)) {
      return false; // Belongs to the other room
    }
  }

  // If description mentions this room, it definitely belongs here
  const thisRoomRegex = new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${roomNumber}\\b`, "i");
  if (thisRoomRegex.test(desc)) {
    return true;
  }

  return false;
}

export async function checkoutAndIssueInvoice({
  stayId,
  roomId,
  roomNumber,
  folioWindowId,
  actorId,
  allowOutstanding = false,
  outstandingReason,
  outstandingRemarks,
  settlementDueDate,
  transferBalanceToGroup = false,
  transferRemarks,
  paymentNow,
  applyGroupAdvance = false,
  groupAdvanceAmount,
}: {
  stayId: string;
  roomId?: string;
  roomNumber?: string;
  folioWindowId?: string;
  actorId?: string;
  allowOutstanding?: boolean;
  outstandingReason?: string;
  outstandingRemarks?: string;
  settlementDueDate?: string;
  transferBalanceToGroup?: boolean;
  transferRemarks?: string;
  paymentNow?: {
    amount: number;
    method: string;
    reference?: string;
  };
  applyGroupAdvance?: boolean;
  groupAdvanceAmount?: number;
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

  const activeAssignments = stay.roomAssignments;
  const targetAssignment = roomId
    ? activeAssignments.find((a) => a.roomId === roomId)
    : roomNumber
    ? activeAssignments.find((a) => a.room?.number === roomNumber)
    : null;

  // Check if this is an individual room checkout from a multi-room group stay
  const isIndividualCheckout = Boolean(targetAssignment && activeAssignments.length > 1);

  if (isIndividualCheckout && targetAssignment) {
    const targetRoomNo = targetAssignment.room?.number || "Unassigned";
    const otherRoomNumbers = activeAssignments
      .filter((a) => a.id !== targetAssignment.id)
      .map((a) => a.room?.number || "")
      .filter(Boolean);

    const allEntries = folio.windows.flatMap((w) => w.entries);
    
    // Filter charges that belong to this room
    const targetEntries = allEntries.filter((e) => isEntryForRoom(e, targetRoomNo, otherRoomNumbers));
    const targetCharges = targetEntries.reduce((sum, e) => sum + e.totalAmount, 0);

    // Filter payments that belong to this room
    const targetPayments = folio.payments.filter((p) => {
      const text = `${p.reference || ""} ${p.payerSnapshot || ""} ${(p as any).notes || ""}`;
      const isThis = new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${targetRoomNo}\\b`, "i").test(text);
      const isOther = otherRoomNumbers.some((o) => new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${o}\\b`, "i").test(text));
      return isThis && !isOther;
    });
    let targetPaid = targetPayments.reduce((sum, p) => sum + p.amount, 0);

    // 1. Check if guest is paying right now at checkout
    let immediatePaymentAmount = 0;
    if (paymentNow && paymentNow.amount > 0) {
      immediatePaymentAmount = paymentNow.amount;
      targetPaid += immediatePaymentAmount;
    }

    // 2. Check if applying advance from Group Advance Deposit Pool (explicit choice by cashier)
    let advanceToApply = 0;
    const shouldCheckGroupAdvance = Boolean(applyGroupAdvance);
    if (shouldCheckGroupAdvance) {
      const currentDue = Math.max(0, Math.round((targetCharges - targetPaid) * 100) / 100);
      if (currentDue > 0.05) {
        // Calculate available unallocated advance in parent group
        const parentUnallocatedPayments = folio.payments.filter((p) => {
          if (p.status !== "SUCCEEDED") return false;
          if (p.method === "ADVANCE_ALLOCATION") return false;
          if (p.reference?.toLowerCase().includes("settlement")) return false;
          const text = `${p.reference || ""} ${p.payerSnapshot || ""} ${(p as any).notes || ""}`;
          const isOther = otherRoomNumbers.some((o) => new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${o}\\b`, "i").test(text));
          const isThis = new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${targetRoomNo}\\b`, "i").test(text);
          return !isOther && !isThis;
        });
        const totalUnallocatedAdvance = parentUnallocatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const parentEntries = folio.windows.flatMap((w) => w.entries);
        const consumedAdvance = parentEntries
          .filter((e) => e.chargeCode === "GROUP_ADVANCE_CONSUMPTION")
          .reduce((sum, e) => sum + e.totalAmount, 0);
        const availableAdvance = Math.max(0, totalUnallocatedAdvance - consumedAdvance);

        const requested = groupAdvanceAmount !== undefined ? groupAdvanceAmount : currentDue;
        advanceToApply = Math.max(0, Math.min(currentDue, requested, availableAdvance));
        targetPaid += advanceToApply;
      }
    }

    let targetBalance = Math.round((targetCharges - targetPaid) * 100) / 100;
    if (Math.abs(targetBalance) <= 0.05) {
      targetBalance = 0;
    }

    let isTransferredToGroup = false;
    let transferredAmount = 0;

    if (transferBalanceToGroup && Math.abs(targetBalance) > 0.05) {
      isTransferredToGroup = true;
      transferredAmount = targetBalance; // e.g. 153.73 (unpaid due) or negative (surplus credit)
    }

    if (targetBalance > 1.0 && !allowOutstanding && !isTransferredToGroup) {
      throw new Error(`Cannot checkout Room ${targetRoomNo} with outstanding balance of ₹${targetBalance.toFixed(2)}. Please settle folio, apply group advance, transfer balance to Group Master, or choose Check Out with Outstanding Balance.`);
    }

    // 1. Close target room assignment
    await prisma.roomAssignment.update({
      where: { id: targetAssignment.id },
      data: { endsAt: new Date() },
    });

    // 2. Mark target room VACANT and DIRTY
    await prisma.roomState.upsert({
      where: { roomId: targetAssignment.roomId },
      create: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        roomId: targetAssignment.roomId,
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

    // 3. Create checkout clean HK task
    await prisma.housekeepingTask.create({
      data: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        roomId: targetAssignment.roomId,
        stayId: stay.id,
        type: "CHECKOUT_CLEAN",
        priority: "HIGH",
        status: "OPEN",
        notes: `Individual room checkout clean for Room ${targetRoomNo} (Group Stay: ${stay.primaryGuest.name})`,
      },
    }).catch((e) => console.error("HK task error:", e));

    // Find linked registration to preserve GRC and room-specific pax
    const linkedGrc = await prisma.guestRegistration.findFirst({
      where: {
        OR: [
          { stayId: stay.id },
          {
            guestId: stay.primaryGuestId,
            assignedRoomNumber: { contains: targetRoomNo },
            createdAt: {
              gte: new Date(stay.arrivalAt.getTime() - 3 * 86400000),
              lte: new Date(stay.arrivalAt.getTime() + 3 * 86400000),
            },
          },
        ],
      },
      select: {
        id: true,
        registrationNo: true,
        internalNotes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let targetRoomAdults = 1;
    let targetRoomChildren = 0;
    if (linkedGrc?.internalNotes) {
      try {
        const parsedNotes = JSON.parse(linkedGrc.internalNotes);
        if (parsedNotes.roomPax?.[targetRoomNo]) {
          targetRoomAdults = Number(parsedNotes.roomPax[targetRoomNo].adults) || 1;
          targetRoomChildren = Number(parsedNotes.roomPax[targetRoomNo].children) || 0;
        }
      } catch {}
    } else {
      const standardCap = (targetAssignment.room as any)?.roomType?.capacity || 2;
      targetRoomAdults = Math.min(stay.adults, standardCap);
    }

    // 4. Create dedicated CHECKED_OUT Stay for this individual room
    const checkedOutStay = await prisma.stay.create({
      data: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        primaryGuestId: stay.primaryGuestId,
        status: "CHECKED_OUT",
        arrivalAt: stay.arrivalAt,
        expectedDepartureAt: stay.expectedDepartureAt,
        actualDepartureAt: new Date(),
        adults: targetRoomAdults,
        children: targetRoomChildren,
      },
    });

    // Deduct checked-out room pax from remaining parent stay
    const remainingAdults = Math.max(1, stay.adults - targetRoomAdults);
    const remainingChildren = Math.max(0, stay.children - targetRoomChildren);
    await prisma.stay.update({
      where: { id: stay.id },
      data: {
        adults: remainingAdults,
        children: remainingChildren,
      },
    }).catch(() => {});

    // Re-link the ended room assignment to checkedOutStay
    await prisma.roomAssignment.update({
      where: { id: targetAssignment.id },
      data: { stayId: checkedOutStay.id },
    });

    // 5. Create new Folio for the checked-out room
    const finalFolioBalance = isTransferredToGroup ? 0 : targetBalance;
    const newFolioStatus = !isTransferredToGroup && targetBalance > 1.0 && allowOutstanding ? "CLOSED_OUTSTANDING" : "CLOSED";
    const newFolio = await prisma.folio.create({
      data: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        stayId: checkedOutStay.id,
        status: newFolioStatus,
        currency: stay.property.currency,
        balance: finalFolioBalance,
        closedAt: new Date(),
      },
    });

    await prisma.stay.update({
      where: { id: checkedOutStay.id },
      data: { folioId: newFolio.id },
    });

    const newWindow = await prisma.folioWindow.create({
      data: {
        folioId: newFolio.id,
        name: `Room ${targetRoomNo} Window`,
        windowNumber: 1,
        payerType: "GUEST",
        guestOrCompanySnapshot: JSON.stringify({
          name: stay.primaryGuest.name,
          phone: stay.primaryGuest.phone,
          email: stay.primaryGuest.email,
          address: (stay.primaryGuest as any).addressJson || "",
          companyName: stay.primaryGuest.companyName || "",
          gstin: stay.primaryGuest.gstin || "",
          roomNumber: targetRoomNo,
          grcNo: linkedGrc?.registrationNo || null,
          adults: targetRoomAdults,
          children: targetRoomChildren,
          checkedOutWithOutstanding: !isTransferredToGroup && targetBalance > 1.0,
          outstandingAmount: !isTransferredToGroup && targetBalance > 1.0 ? targetBalance : 0,
          transferredToGroupMaster: isTransferredToGroup,
          transferredAmount: isTransferredToGroup ? transferredAmount : 0,
          outstandingReason: isTransferredToGroup ? "TRANSFERRED_TO_GROUP_MASTER" : (outstandingReason || "GUEST_DUE"),
          outstandingRemarks: outstandingRemarks || transferRemarks || "",
          settlementDueDate: settlementDueDate || "",
          checkoutDate: new Date().toISOString(),
        }),
        status: "CLOSED",
      },
    });

    // Move target entries & payments
    for (const entry of targetEntries) {
      await prisma.folioEntry.update({
        where: { id: entry.id },
        data: { folioId: newFolio.id, folioWindowId: newWindow.id },
      });
    }

    for (const p of targetPayments) {
      await prisma.payment.update({
        where: { id: p.id },
        data: { folioId: newFolio.id },
      });
    }

    // Record immediate payment collected at checkout if provided
    if (immediatePaymentAmount > 0) {
      await prisma.payment.create({
        data: {
          organizationId: stay.organizationId,
          propertyId: stay.propertyId,
          receiptNo: `REC-${Date.now().toString().slice(-6)}`,
          folioId: newFolio.id,
          amount: immediatePaymentAmount,
          method: paymentNow?.method || "UPI",
          reference: paymentNow?.reference || `Settlement at Checkout for Room ${targetRoomNo}`,
          payerSnapshot: JSON.stringify({
            name: stay.primaryGuest.name,
            phone: stay.primaryGuest.phone,
            roomNumber: targetRoomNo,
          }),
          status: "SUCCEEDED",
        },
      });
    }

    // Record Group Advance Allocation if applied from Group Advance Pool
    if (advanceToApply > 0) {
      // 1. Post settlement payment on Room's new folio
      await prisma.payment.create({
        data: {
          organizationId: stay.organizationId,
          propertyId: stay.propertyId,
          receiptNo: `REC-ADV-${Date.now().toString().slice(-6)}`,
          folioId: newFolio.id,
          amount: advanceToApply,
          method: "ADVANCE_ALLOCATION",
          reference: `Allocated from Group Advance Pool`,
          payerSnapshot: JSON.stringify({
            name: stay.primaryGuest.name,
            roomNumber: targetRoomNo,
            groupFolioId: folio.id,
          }),
          status: "SUCCEEDED",
        },
      });

      // 2. Post corresponding debit charge on parent group folio
      const parentWindowId = folio.windows[0]?.id || (await prisma.folioWindow.findFirst({ where: { folioId: folio.id } }))?.id || "";
      if (parentWindowId) {
        await prisma.folioEntry.create({
          data: {
            organizationId: stay.organizationId,
            propertyId: stay.propertyId,
            folioId: folio.id,
            folioWindowId: parentWindowId,
            serviceDate: new Date().toISOString().split("T")[0],
            type: "CHARGE",
            chargeCode: "GROUP_ADVANCE_CONSUMPTION",
            description: `Group Advance Applied to Room ${targetRoomNo} at Checkout`,
            qty: 1,
            unitAmount: advanceToApply,
            taxableAmount: advanceToApply,
            taxComponentsJson: JSON.stringify({ cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0, igstRate: 0, igstAmount: 0 }),
            totalAmount: advanceToApply,
            sourceType: "ADVANCE_ALLOCATION",
            status: "POSTED",
          },
        });
      }

      // Synchronize Deposit model if present
      const activeDeposit = await prisma.deposit.findFirst({
        where: { folioId: folio.id, status: "AVAILABLE" },
        orderBy: { createdAt: "asc" },
      });
      if (activeDeposit) {
        const nextAvail = Math.max(0, activeDeposit.availableAmount - advanceToApply);
        await prisma.deposit.update({
          where: { id: activeDeposit.id },
          data: {
            availableAmount: nextAvail,
            status: nextAvail <= 0.01 ? "APPLIED" : "AVAILABLE",
          },
        });
      }
    }

    // Process Balance Transfer to Parent Group Folio if requested
    if (isTransferredToGroup && Math.abs(transferredAmount) > 0.05) {
      const parentWindowId = folio.windows[0]?.id || (await prisma.folioWindow.findFirst({ where: { folioId: folio.id } }))?.id || "";

      if (transferredAmount > 0) {
        // Unpaid balance/due: Room owes ₹transferredAmount
        // 1. Post balancing settlement payment on Room's new folio
        await prisma.payment.create({
          data: {
            organizationId: stay.organizationId,
            propertyId: stay.propertyId,
            receiptNo: `REC-TRF-${Date.now().toString().slice(-6)}`,
            folioId: newFolio.id,
            amount: transferredAmount,
            method: "TRANSFER",
            reference: `Transferred Due to Group Master Folio`,
            payerSnapshot: JSON.stringify({
              name: stay.primaryGuest.name,
              roomNumber: targetRoomNo,
              transferredToFolioId: folio.id,
              remarks: transferRemarks || "Transferred remaining balance to group master at checkout",
            }),
            status: "SUCCEEDED",
          },
        });

        // 2. Post corresponding debit charge to parent group folio
        if (parentWindowId) {
          await prisma.folioEntry.create({
            data: {
              organizationId: stay.organizationId,
              propertyId: stay.propertyId,
              folioId: folio.id,
              folioWindowId: parentWindowId,
              serviceDate: new Date().toISOString().split("T")[0],
              type: "CHARGE",
              chargeCode: "ROOM_BALANCE_TRANSFER",
              description: `Transferred Due from Room ${targetRoomNo} at Checkout${transferRemarks ? ` (${transferRemarks})` : ""}`,
              qty: 1,
              unitAmount: transferredAmount,
              taxableAmount: transferredAmount,
              taxComponentsJson: JSON.stringify([]),
              totalAmount: transferredAmount,
              sourceType: "FOLIO_TRANSFER",
              sourceId: checkedOutStay.id,
              status: "POSTED",
            },
          });
        }
        targetPaid += transferredAmount;
      } else {
        // Surplus credit: Room overpaid by ₹transferredAmount
        const surplusAmount = Math.abs(transferredAmount);
        // 1. Post balancing charge on Room's new folio
        await prisma.folioEntry.create({
          data: {
            organizationId: stay.organizationId,
            propertyId: stay.propertyId,
            folioId: newFolio.id,
            folioWindowId: newWindow.id,
            serviceDate: new Date().toISOString().split("T")[0],
            type: "CHARGE",
            chargeCode: "ROOM_BALANCE_TRANSFER",
            description: `Transferred Surplus Credit to Group Master at Checkout`,
            qty: 1,
            unitAmount: surplusAmount,
            taxableAmount: surplusAmount,
            taxComponentsJson: JSON.stringify([]),
            totalAmount: surplusAmount,
            sourceType: "FOLIO_TRANSFER",
            sourceId: folio.id,
            status: "POSTED",
          },
        });

        // 2. Post credit payment to parent group folio
        await prisma.payment.create({
          data: {
            organizationId: stay.organizationId,
            propertyId: stay.propertyId,
            receiptNo: `REC-TRF-${Date.now().toString().slice(-6)}`,
            folioId: folio.id,
            amount: surplusAmount,
            method: "TRANSFER",
            reference: `Credit Transferred from Room ${targetRoomNo} (${checkedOutStay.id})`,
            payerSnapshot: JSON.stringify({
              name: stay.primaryGuest.name,
              roomNumber: targetRoomNo,
              remarks: transferRemarks || "Transferred advance credit to group master at checkout",
            }),
            status: "SUCCEEDED",
          },
        });
      }
    }

    // 6. Generate GST Tax Invoice for this room
    const invSeq = await getNextDocumentNumber(stay.propertyId, "INVOICE");
    const subtotal = targetEntries.reduce((sum, e) => sum + e.taxableAmount, 0);
    const taxTotal = targetEntries.reduce((sum, e) => sum + (e.totalAmount - e.taxableAmount), 0);

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
      roomNumber: targetRoomNo,
      grcNo: linkedGrc?.registrationNo || null,
      adults: targetRoomAdults,
      children: targetRoomChildren,
    });

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        invoiceNo: invSeq.formattedNumber,
        invoiceSeries: invSeq.prefix.replace(/-$/, ""),
        financialYear: invSeq.financialYear,
        folioWindowId: newWindow.id,
        businessDate: stay.property.businessDate || new Date().toISOString().split("T")[0],
        supplierSnapshot,
        recipientSnapshot,
        subtotal: Math.round(subtotal * 100) / 100,
        taxTotal: Math.round(taxTotal * 100) / 100,
        totalAmount: Math.round(targetCharges * 100) / 100,
        status: "ISSUED",
        documentHash: `SHA256-${Date.now()}-${invSeq.formattedNumber}`,
      },
    });

    for (const entry of targetEntries) {
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

    // 7. Recalculate remaining parent group folio balance
    const remainingEntries = await prisma.folioEntry.findMany({
      where: { folioId: folio.id, status: "POSTED" },
    });
    const remainingPayments = await prisma.payment.findMany({
      where: { folioId: folio.id, status: "SUCCEEDED" },
    });
    const remCharges = remainingEntries.reduce((s, e) => s + e.totalAmount, 0);
    const remPaid = remainingPayments.reduce((s, p) => s + p.amount, 0);
    const remBalance = Math.round((remCharges - remPaid) * 100) / 100;

    await prisma.folio.update({
      where: { id: folio.id },
      data: { balance: remBalance },
    });

    // 8. If target had outstanding balance, save to Outstanding Ledger
    if (!isTransferredToGroup && targetBalance > 1.0 && allowOutstanding) {
      saveOutstandingRecord({
        id: newFolio.id,
        propertyId: stay.propertyId,
        stayId: checkedOutStay.id,
        folioId: newFolio.id,
        invoiceNo: invoice.invoiceNo,
        roomNumber: targetRoomNo,
        guestName: stay.primaryGuest.name,
        phone: stay.primaryGuest.phone || "—",
        email: stay.primaryGuest.email || undefined,
        address: (stay.primaryGuest as any).addressJson || "",
        companyName: stay.primaryGuest.companyName || undefined,
        gstin: stay.primaryGuest.gstin || undefined,
        totalCharges: targetCharges,
        totalPayments: targetPaid,
        outstandingAmount: targetBalance,
        reason: outstandingReason || "GUEST_DUE",
        remarks: outstandingRemarks,
        settlementDueDate,
        checkedOutAt: new Date().toISOString(),
        status: "UNSETTLED",
      });
    }

    // 9. Check if any active rooms remain in parent stay
    const stillActive = await prisma.roomAssignment.findMany({
      where: { stayId: stay.id, endsAt: null },
    });
    if (stillActive.length === 0) {
      await prisma.folio.update({
        where: { id: folio.id },
        data: { status: "CLOSED", closedAt: new Date() },
      });
      await prisma.stay.update({
        where: { id: stay.id },
        data: { status: "CHECKED_OUT", actualDepartureAt: new Date() },
      });
    }

    // 10. Audit Log
    await logAuditEvent({
      organizationId: stay.organizationId,
      propertyId: stay.propertyId,
      actorId: actorId || null,
      actorName: "Front Desk Cashier",
      action: isTransferredToGroup ? "CHECKOUT_ROOM_TRANSFER_TO_GROUP" : "CHECKOUT_INDIVIDUAL_ROOM",
      targetType: "STAY",
      targetId: checkedOutStay.id,
      reason: isTransferredToGroup
        ? `Individual checkout of Room ${targetRoomNo} with balance transfer of ₹${transferredAmount} to Group Master`
        : `Individual checkout of Room ${targetRoomNo} from group stay`,
      afterJson: {
        roomNumber: targetRoomNo,
        parentStayId: stay.id,
        invoiceNo: invoice.invoiceNo,
        totalCharges: targetCharges,
        totalPaid: targetPaid,
        balance: isTransferredToGroup ? 0 : targetBalance,
        hasOutstanding: !isTransferredToGroup && targetBalance > 1.0,
        transferredToGroup: isTransferredToGroup,
        transferredAmount: isTransferredToGroup ? transferredAmount : 0,
      },
    });

    return {
      success: true,
      invoice,
      folio: newFolio,
      stay: checkedOutStay,
      checkedOutRoom: targetRoomNo,
      isIndividualCheckout: true,
      remainingRooms: otherRoomNumbers,
      outstandingAmount: !isTransferredToGroup && targetBalance > 1.0 ? targetBalance : 0,
      balance: isTransferredToGroup ? 0 : targetBalance,
      transferredToGroup: isTransferredToGroup,
      transferredAmount: isTransferredToGroup ? transferredAmount : 0,
      appliedAdvance: advanceToApply,
      paymentNowAmount: immediatePaymentAmount,
    };
  }

  // STANDARD CHECKOUT (Entire Stay / Single Room Stay)
  const allEntries = folio.windows.flatMap((w) => w.entries);
  const totalCharges = allEntries.reduce((sum, e) => sum + e.totalAmount, 0);
  let totalPayments = folio.payments.reduce((sum, p) => sum + p.amount, 0);

  if (paymentNow && paymentNow.amount > 0) {
    await prisma.payment.create({
      data: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        receiptNo: `REC-${Date.now().toString().slice(-6)}`,
        folioId: folio.id,
        amount: paymentNow.amount,
        method: paymentNow.method || "UPI",
        reference: paymentNow.reference || "Settlement at Checkout",
        payerSnapshot: JSON.stringify({
          name: stay.primaryGuest.name,
          phone: stay.primaryGuest.phone,
        }),
        status: "SUCCEEDED",
      },
    });
    totalPayments += paymentNow.amount;
  }

  let balance = Math.round((totalCharges - totalPayments) * 100) / 100;
  if (Math.abs(balance) <= 0.05) {
    balance = 0;
  }

  if (balance > 1.0 && !allowOutstanding) {
    throw new Error(`Cannot checkout with outstanding balance of ₹${balance.toFixed(2)}. Please settle folio or choose Check Out with Outstanding Balance.`);
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

  // Find linked GRC for full checkout
  const fullCheckoutGrc = await prisma.guestRegistration.findFirst({
    where: {
      OR: [
        { stayId: stay.id },
        {
          guestId: stay.primaryGuestId,
          createdAt: {
            gte: new Date(stay.arrivalAt.getTime() - 3 * 86400000),
            lte: new Date(stay.arrivalAt.getTime() + 3 * 86400000),
          },
        },
      ],
    },
    select: { registrationNo: true },
    orderBy: { createdAt: "desc" },
  });

  const recipientSnapshot = JSON.stringify({
    name: stay.primaryGuest.name,
    phone: stay.primaryGuest.phone,
    email: stay.primaryGuest.email,
    gstin: stay.primaryGuest.gstin,
    companyName: stay.primaryGuest.companyName,
    nationality: stay.primaryGuest.nationality,
    grcNo: fullCheckoutGrc?.registrationNo || null,
    adults: stay.adults,
    children: stay.children,
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

  // 2. Mark Folio & Stay as CHECKED_OUT (or CLOSED_OUTSTANDING)
  const folioFinalStatus = balance > 1.0 && allowOutstanding ? "CLOSED_OUTSTANDING" : "CLOSED";
  await prisma.folio.update({
    where: { id: folio.id },
    data: {
      status: folioFinalStatus,
      balance: balance,
      closedAt: new Date(),
    },
  });

  if (activeWindow) {
    let existingSnap: any = {};
    try {
      existingSnap = activeWindow.guestOrCompanySnapshot
        ? JSON.parse(activeWindow.guestOrCompanySnapshot)
        : {};
    } catch {}

    await prisma.folioWindow.update({
      where: { id: activeWindow.id },
      data: {
        guestOrCompanySnapshot: JSON.stringify({
          ...existingSnap,
          name: stay.primaryGuest.name,
          phone: stay.primaryGuest.phone,
          email: stay.primaryGuest.email,
          companyName: stay.primaryGuest.companyName || "",
          gstin: stay.primaryGuest.gstin || "",
          checkedOutWithOutstanding: balance > 1.0,
          outstandingAmount: balance > 1.0 ? balance : 0,
          outstandingReason: outstandingReason || "GUEST_DUE",
          outstandingRemarks: outstandingRemarks || "",
          settlementDueDate: settlementDueDate || "",
          checkoutDate: new Date().toISOString(),
        }),
      },
    });
  }

  await prisma.stay.update({
    where: { id: stay.id },
    data: {
      status: "CHECKED_OUT",
      actualDepartureAt: new Date(),
    },
  });

  // 2.5 Update linked GRC registration status to CHECKED_OUT (only for this stay)
  await prisma.guestRegistration.updateMany({
    where: {
      propertyId: stay.propertyId,
      OR: [
        { stayId: stay.id },
        {
          guestId: stay.primaryGuestId,
          createdAt: {
            gte: new Date(stay.arrivalAt.getTime() - 3 * 86400000),
            lte: new Date(stay.arrivalAt.getTime() + 3 * 86400000),
          },
        },
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
    }).catch((e) => console.error("HK task error:", e));
  }

  // 4. Save to Outstanding Ledger if balance > 1.0
  if (balance > 1.0 && allowOutstanding) {
    const primaryRoomNo = stay.roomAssignments.map((a) => a.room?.number).filter(Boolean).join(", ") || "—";
    saveOutstandingRecord({
      id: folio.id,
      propertyId: stay.propertyId,
      stayId: stay.id,
      folioId: folio.id,
      invoiceNo: invoice.invoiceNo,
      roomNumber: primaryRoomNo,
      guestName: stay.primaryGuest.name,
      phone: stay.primaryGuest.phone || "—",
      email: stay.primaryGuest.email || undefined,
      address: (stay.primaryGuest as any).addressJson || "",
      companyName: stay.primaryGuest.companyName || undefined,
      gstin: stay.primaryGuest.gstin || undefined,
      totalCharges,
      totalPayments,
      outstandingAmount: balance,
      reason: outstandingReason || "GUEST_DUE",
      remarks: outstandingRemarks,
      settlementDueDate,
      checkedOutAt: new Date().toISOString(),
      status: "UNSETTLED",
    });
  }

  // 5. Audit Log
  await logAuditEvent({
    organizationId: stay.organizationId,
    propertyId: stay.propertyId,
    actorId: actorId || null,
    actorName: "Front Desk Cashier",
    action: balance > 1.0 ? "CHECKOUT_WITH_OUTSTANDING" : "CHECKOUT_GUEST",
    targetType: "STAY",
    targetId: stay.id,
    reason: balance > 1.0
      ? `Guest checked out with outstanding balance ₹${balance} (${outstandingReason || "GUEST_DUE"})`
      : "Standard checkout and GST invoice issuance",
    afterJson: {
      stayId: stay.id,
      invoiceNo: invoice.invoiceNo,
      totalCharges,
      totalPayments,
      balance,
      hasOutstanding: balance > 1.0,
      outstandingReason,
      settlementDueDate,
    },
  });

  return { success: true, invoice, balance, outstandingAmount: balance > 1.0 ? balance : 0 };
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
            where: {
              chargeCode: "ROOM_TARIFF",
              status: "POSTED",
              NOT: { sourceType: "MANUAL_CHARGE" },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      stay: {
        include: {
          roomAssignments: {
            include: { room: true },
            orderBy: { startsAt: "desc" },
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

    // Trace any predecessor rooms that were moved into this room within the stay
    const predecessorRooms: string[] = [];
    if (assignment.moveReason?.includes("MOVED_FROM:")) {
      const match = assignment.moveReason.match(/MOVED_FROM:([^|]+)/);
      if (match && match[1]) {
        predecessorRooms.push(match[1].trim());
      }
    }
    stay.roomAssignments.forEach((ra: any) => {
      if (ra.endsAt && ra.moveReason && roomNo && ra.moveReason.includes(`Moved to Room ${roomNo}`) && ra.room?.number) {
        if (!predecessorRooms.includes(ra.room.number)) {
          predecessorRooms.push(ra.room.number);
        }
      }
    });

    // Determine agreed rate for this room
    let roomBasePrice = 3200;
    let isComp = false;
    let isRateInclusive = true;
    if (assignment.rateHandling === "COMPLIMENTARY" || assignment.moveReason?.includes("AGREED_RATE:0")) {
      roomBasePrice = 0;
      isComp = true;
    } else if (assignment.moveReason?.includes("AGREED_RATE:")) {
      const ratePart = assignment.moveReason.slice(assignment.moveReason.indexOf("AGREED_RATE:"));
      const parts = ratePart.replace("AGREED_RATE:", "").split(":");
      roomBasePrice = Number(parts[0]) || 3200;
      if (parts[1] === "EXC") {
        isRateInclusive = false;
      }
    } else {
      // Fallback: check room's category base price or existing entry
      const existingEntry = (primaryWindow.entries || []).find((e: any) =>
        e.chargeCode === "ROOM_TARIFF" &&
        e.status === "POSTED" &&
        (roomNo ? e.description?.includes(roomNo) : true)
      );
      if (existingEntry && existingEntry.unitAmount !== undefined) {
        roomBasePrice = Number(existingEntry.unitAmount);
        if (roomBasePrice === 0) isComp = true;
      } else if (room?.roomTypeId) {
        const rateVersion = await prisma.ratePlanVersion.findFirst({
          where: { roomTypeId: room.roomTypeId, active: true },
          orderBy: { createdAt: "desc" },
        });
        if (rateVersion?.pricingJson) {
          try {
            const pricing = JSON.parse(rateVersion.pricingJson);
            if (pricing.basePrice) roomBasePrice = Number(pricing.basePrice);
          } catch {}
        }
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

    // Filter existing entries belonging to this specific room or its transferred predecessor rooms
    const otherRoomNumbers = allRoomNumbers.filter((r: any) => r !== roomNo);
    const roomEntries = (primaryWindow.entries || []).filter((e: any) => {
      if (e.chargeCode !== "ROOM_TARIFF" || e.type !== "CHARGE") return false;
      if (!roomNo || roomNo === "Unassigned") return true;
      const desc = e.description || "";
      // If description explicitly mentions another active room in the group, it's not this room
      if (otherRoomNumbers.some((o: any) => new RegExp(`\\bRoom\\s*#?\\s*${o}\\b`, "i").test(desc))) {
        return false;
      }
      // If description mentions this room or any predecessor room that moved into this room, it belongs here
      const matchesCurrent = new RegExp(`\\bRoom\\s*#?\\s*${roomNo}\\b`, "i").test(desc);
      const matchesPredecessor = predecessorRooms.some((p) =>
        new RegExp(`\\bRoom\\s*#?\\s*${p}\\b`, "i").test(desc)
      );
      if (matchesCurrent || matchesPredecessor) {
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

    // 1. Synchronize any existing room tariff charges for this specific room if the rate was adjusted
    // Only synchronize entries for the current room, preserving historical charges from predecessor rooms!
    for (const entry of roomEntries) {
      const isForCurrentRoom = roomNo ? new RegExp(`\\bRoom\\s*#?\\s*${roomNo}\\b`, "i").test(entry.description || "") : true;
      if (!isForCurrentRoom) continue;

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
          : checkoutType === "FIXED_TIME"
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
      const sortedEntries = [...roomEntries]
        .filter((e: any) => e.chargeCode === "ROOM_TARIFF" && e.sourceType === "PMS_24HR_AUTO_CHARGE")
        .sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      const canDeleteCount = Math.min(excessCount, sortedEntries.length);
      const toDelete = sortedEntries.slice(0, canDeleteCount);

      for (const e of toDelete) {
        if (e.sourceType !== "MANUAL_CHARGE") {
          await prisma.folioEntry.delete({ where: { id: e.id } });
          folioMutated = true;
        }
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

export async function transferRoomBalanceMidStay({
  stayId,
  fromRoomNumber,
  toRoomNumber,
  amount,
  type = "DEBIT_TRANSFER",
  remarks,
  actorId,
}: {
  stayId: string;
  fromRoomNumber: string;
  toRoomNumber?: string;
  amount: number;
  type?: "DEBIT_TRANSFER" | "CREDIT_TRANSFER";
  remarks?: string;
  actorId?: string;
}) {
  if (!amount || amount <= 0) {
    throw new Error("Transfer amount must be greater than 0");
  }

  const stay = await prisma.stay.findUniqueOrThrow({
    where: { id: stayId },
    include: {
      folio: {
        include: { windows: true },
      },
      roomAssignments: { where: { endsAt: null }, include: { room: true } },
    },
  });

  const folio = stay.folio;
  if (!folio || !folio.windows[0]) {
    throw new Error("Active folio window not found for stay");
  }
  const windowId = folio.windows[0].id;
  const today = new Date().toISOString().split("T")[0];
  const targetLabel = toRoomNumber ? `Room ${toRoomNumber}` : "Group Master Folio";

  if (type === "DEBIT_TRANSFER") {
    // 1. Relieve fromRoom by posting negative entry tagged with fromRoom
    await prisma.folioEntry.create({
      data: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        folioId: folio.id,
        folioWindowId: windowId,
        serviceDate: today,
        type: "ADJUSTMENT",
        chargeCode: "ROOM_BALANCE_TRANSFER",
        description: `Balance Transferred Out to ${targetLabel} (Room ${fromRoomNumber})${remarks ? ` - ${remarks}` : ""}`,
        qty: 1,
        unitAmount: -amount,
        taxableAmount: -amount,
        taxComponentsJson: JSON.stringify([]),
        totalAmount: -amount,
        sourceType: "ROOM_TRANSFER",
        status: "POSTED",
      },
    });

    // 2. Charge toRoom or Master Folio
    await prisma.folioEntry.create({
      data: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        folioId: folio.id,
        folioWindowId: windowId,
        serviceDate: today,
        type: "CHARGE",
        chargeCode: "ROOM_BALANCE_TRANSFER",
        description: `Balance Transferred In from Room ${fromRoomNumber} (${targetLabel})${remarks ? ` - ${remarks}` : ""}`,
        qty: 1,
        unitAmount: amount,
        taxableAmount: amount,
        taxComponentsJson: JSON.stringify([]),
        totalAmount: amount,
        sourceType: "ROOM_TRANSFER",
        status: "POSTED",
      },
    });
  } else {
    // CREDIT_TRANSFER
    await prisma.folioEntry.create({
      data: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        folioId: folio.id,
        folioWindowId: windowId,
        serviceDate: today,
        type: "CHARGE",
        chargeCode: "ROOM_BALANCE_TRANSFER",
        description: `Credit Transferred Out to ${targetLabel} (Room ${fromRoomNumber})${remarks ? ` - ${remarks}` : ""}`,
        qty: 1,
        unitAmount: amount,
        taxableAmount: amount,
        taxComponentsJson: JSON.stringify([]),
        totalAmount: amount,
        sourceType: "ROOM_TRANSFER",
        status: "POSTED",
      },
    });

    await prisma.folioEntry.create({
      data: {
        organizationId: stay.organizationId,
        propertyId: stay.propertyId,
        folioId: folio.id,
        folioWindowId: windowId,
        serviceDate: today,
        type: "ADJUSTMENT",
        chargeCode: "ROOM_BALANCE_TRANSFER",
        description: `Credit Transferred In from Room ${fromRoomNumber} (${targetLabel})${remarks ? ` - ${remarks}` : ""}`,
        qty: 1,
        unitAmount: -amount,
        taxableAmount: -amount,
        taxComponentsJson: JSON.stringify([]),
        totalAmount: -amount,
        sourceType: "ROOM_TRANSFER",
        status: "POSTED",
      },
    });
  }

  // Recalculate folio balance
  const allEntries = await prisma.folioEntry.findMany({
    where: { folioId: folio.id, status: "POSTED" },
  });
  const allPayments = await prisma.payment.findMany({
    where: { folioId: folio.id, status: "SUCCEEDED" },
  });
  const totalC = allEntries.reduce((s, e) => s + e.totalAmount, 0);
  const totalP = allPayments.reduce((s, p) => s + p.amount, 0);
  const newBal = Math.round((totalC - totalP) * 100) / 100;

  await prisma.folio.update({
    where: { id: folio.id },
    data: { balance: newBal },
  });

  await logAuditEvent({
    organizationId: stay.organizationId,
    propertyId: stay.propertyId,
    actorId: actorId || null,
    actorName: "Front Desk Cashier",
    action: "ROOM_BALANCE_TRANSFER_MIDSTAY",
    targetType: "STAY",
    targetId: stay.id,
    reason: `Transferred ₹${amount} (${type}) from Room ${fromRoomNumber} to ${targetLabel}`,
    afterJson: {
      fromRoomNumber,
      toRoomNumber: toRoomNumber || "GROUP_MASTER",
      amount,
      type,
      remarks,
      newFolioBalance: newBal,
    },
  });

  return { success: true, fromRoomNumber, toRoomNumber: toRoomNumber || "GROUP_MASTER", amount, type };
}
