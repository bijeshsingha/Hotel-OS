import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateGST } from "@/lib/gst/calculator";
import { getNextDocumentNumber } from "@/lib/sequence/generator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { paymentMethod = "CASH", customerGstin, customerName, actorId } = body;

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: { where: { status: { not: "CANCELLED" } } },
        property: true,
        outlet: true,
      },
    });

    const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const gst = calculateGST({
      grossOrBaseAmount: subtotal,
      isInclusive: false,
      sacHsn: "996331",
      supplierStateCode: order.property.stateCode || "18",
    });

    // 1. Create POSBill
    const billSeq = await getNextDocumentNumber(order.propertyId, "ORDER");
    const posBill = await prisma.pOSBill.create({
      data: {
        organizationId: order.organizationId,
        propertyId: order.propertyId,
        billNo: `BILL-${order.orderNo.replace("ORD-", "")}`,
        orderId: order.id,
        subtotal: gst.taxableAmount,
        taxTotal: gst.taxAmount,
        totalAmount: gst.totalAmount,
        status: "PAID",
      },
    });

    // 2. Create Payment
    const recSeq = await getNextDocumentNumber(order.propertyId, "RECEIPT");
    await prisma.payment.create({
      data: {
        organizationId: order.organizationId,
        propertyId: order.propertyId,
        receiptNo: recSeq.formattedNumber,
        orderId: order.id,
        amount: gst.totalAmount,
        method: paymentMethod,
        payerSnapshot: JSON.stringify({ name: customerName || order.customerName || "Customer", gstin: customerGstin }),
        status: "SUCCEEDED",
        createdById: actorId,
      },
    });

    // 3. Issue Direct POS Invoice (Rule 46)
    const invSeq = await getNextDocumentNumber(order.propertyId, "INVOICE");
    const supplierSnapshot = JSON.stringify({
      legalName: order.property.legalName,
      displayName: order.property.displayName,
      gstin: order.property.gstin,
      stateCode: order.property.stateCode,
      address: order.property.address,
    });

    const recipientSnapshot = JSON.stringify({
      name: customerName || order.customerName || "Walk-in Guest",
      gstin: customerGstin,
    });

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: order.organizationId,
        propertyId: order.propertyId,
        invoiceNo: invSeq.formattedNumber,
        invoiceSeries: invSeq.prefix.replace(/-$/, ""),
        financialYear: invSeq.financialYear,
        posBillId: posBill.id,
        businessDate: order.property.businessDate || new Date().toISOString().split("T")[0],
        supplierSnapshot,
        recipientSnapshot,
        subtotal: gst.taxableAmount,
        taxTotal: gst.taxAmount,
        totalAmount: gst.totalAmount,
        status: "ISSUED",
      },
    });

    // Add invoice lines
    for (const item of order.items) {
      const itemGst = calculateGST({
        grossOrBaseAmount: item.unitPrice * item.qty,
        sacHsn: "996331",
        supplierStateCode: order.property.stateCode || "18",
      });

      await prisma.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          description: item.nameSnapshot,
          sacHsn: "996331",
          qty: item.qty,
          unit: "PORTION",
          taxableAmount: itemGst.taxableAmount,
          componentTaxRatesJson: JSON.stringify(itemGst.components),
          totalAmount: itemGst.totalAmount,
        },
      });
    }

    // 4. Update order status to PAID
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });

    return NextResponse.json({
      success: true,
      posBill,
      invoice,
      totalAmount: gst.totalAmount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
