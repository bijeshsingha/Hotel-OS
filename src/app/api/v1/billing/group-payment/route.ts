import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getNextDocumentNumber } from "@/lib/sequence/generator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      payerName,
      companyName,
      gstin,
      totalAmount,
      method = "UPI",
      reference,
      notes,
      allocations, // Array of { folioId: string, amount: number, roomNumber?: string, guestName?: string }
      actorId,
    } = body;

    if (!propertyId || !allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: "Property ID and at least one folio allocation are required." },
        { status: 400 }
      );
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    if (totalAllocated <= 0) {
      return NextResponse.json(
        { error: "Total allocated payment amount must be greater than zero." },
        { status: 400 }
      );
    }

    // Generate Master Group Receipt Number
    const seq = await getNextDocumentNumber(propertyId, "RECEIPT");
    const groupReceiptNo = `${seq.formattedNumber}-GRP`;
    const roomListStr = allocations.map((a) => a.roomNumber || a.folioId.slice(-4)).join(", ");

    const createdPayments: any[] = [];

    // Execute atomic transaction across all allocated folios
    await prisma.$transaction(async (tx) => {
      for (const alloc of allocations) {
        const allocAmt = Math.round((Number(alloc.amount) || 0) * 100) / 100;
        if (allocAmt <= 0) continue;

        const folio = await tx.folio.findUniqueOrThrow({
          where: { id: alloc.folioId },
          include: { windows: true, stay: { include: { primaryGuest: true } } },
        });

        const targetWindowId = folio.windows[0]?.id;

        const payerSnapshot = JSON.stringify({
          name: payerName || folio.stay?.primaryGuest?.name || "Group Guest",
          companyName: companyName || folio.stay?.primaryGuest?.companyName,
          gstin: gstin || folio.stay?.primaryGuest?.gstin,
          isGroupPayment: true,
          groupMasterReceiptNo: groupReceiptNo,
          groupRooms: roomListStr,
          allocatedAmount: allocAmt,
        });

        // 1. Create individual payment linked to folio
        const p = await tx.payment.create({
          data: {
            organizationId: folio.organizationId,
            propertyId: folio.propertyId,
            receiptNo: `${groupReceiptNo}-${alloc.roomNumber || folio.id.slice(-4)}`,
            folioId: folio.id,
            amount: allocAmt,
            method,
            reference: reference ? `GRP [${roomListStr}] ${reference}` : `GRP [${roomListStr}]`,
            payerSnapshot,
            status: "SUCCEEDED",
            createdById: actorId,
          },
        });

        // 2. Create allocation if window exists
        if (targetWindowId) {
          await tx.paymentAllocation.create({
            data: {
              paymentId: p.id,
              folioWindowId: targetWindowId,
              amount: allocAmt,
            },
          });
        }

        // 3. Decrement folio balance
        await tx.folio.update({
          where: { id: folio.id },
          data: {
            balance: { decrement: allocAmt },
          },
        });

        createdPayments.push(p);
      }

      // 4. Audit Log for Group Transaction
      await tx.auditLog.create({
        data: {
          organizationId: createdPayments[0]?.organizationId || "",
          propertyId,
          actorId,
          action: "GROUP_PAYMENT_SETTLEMENT",
          targetType: "FOLIO_GROUP",
          targetId: groupReceiptNo,
          afterJson: JSON.stringify({
            groupReceiptNo,
            payerName,
            companyName,
            totalAmount: totalAllocated,
            method,
            reference,
            notes,
            rooms: roomListStr,
            allocatedCount: createdPayments.length,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      groupReceiptNo,
      totalAmount: totalAllocated,
      method,
      rooms: roomListStr,
      paymentsCount: createdPayments.length,
    });
  } catch (error: any) {
    console.error("Group payment error:", error);
    return NextResponse.json({ error: error.message || "Failed to process group payment" }, { status: 500 });
  }
}
