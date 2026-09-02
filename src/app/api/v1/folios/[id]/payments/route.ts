import { NextResponse } from "next/server";
import { recordPayment } from "@/lib/domain/folio-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folioId } = await params;
    const body = await request.json();
    const {
      folioWindowId,
      amount,
      method = "CASH",
      reference,
      payerName,
      companyName,
      gstin,
      creditPeriod,
      billingRemarks,
      isRefund,
      actorId,
    } = body;

    let snapshotStr: string | undefined = undefined;
    if (companyName || gstin || creditPeriod || method === "DIRECT_BILL") {
      snapshotStr = JSON.stringify({
        name: payerName || "Guest",
        companyName: companyName || "",
        gstin: gstin || "",
        creditPeriod: creditPeriod || "30_DAYS",
        remarks: billingRemarks || "",
        billToCompany: method === "DIRECT_BILL",
      });
    }

    const payment = await recordPayment({
      folioId,
      folioWindowId,
      amount: Number(amount),
      method,
      reference: reference || (method === "DIRECT_BILL" ? `BTC-${companyName || "CORP"}` : undefined),
      payerName: companyName ? `${payerName || "Guest"} (${companyName})` : payerName,
      payerSnapshot: snapshotStr,
      isRefund: Boolean(isRefund),
      actorId,
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// PUT /api/v1/folios/[id]/payments - Edit Collected Payment
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folioId } = await params;
    const body = await request.json();
    const {
      paymentId,
      amount,
      method,
      reference,
      payerName,
      companyName,
      gstin,
      creditPeriod,
      billingRemarks,
    } = body;

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db/prisma");

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      return NextResponse.json({ error: "Valid payment amount is required." }, { status: 400 });
    }

    let currentSnap: any = {};
    try {
      if (payment.payerSnapshot) {
        currentSnap = typeof payment.payerSnapshot === "string" ? JSON.parse(payment.payerSnapshot) : payment.payerSnapshot;
      }
    } catch {}

    const snapshotStr = JSON.stringify({
      ...currentSnap,
      name: payerName || currentSnap.name || "Guest",
      companyName: companyName !== undefined ? companyName : (currentSnap.companyName || ""),
      gstin: gstin !== undefined ? gstin : (currentSnap.gstin || ""),
      creditPeriod: creditPeriod || currentSnap.creditPeriod || "30_DAYS",
      remarks: billingRemarks !== undefined ? billingRemarks : (currentSnap.remarks || ""),
      billToCompany: method === "DIRECT_BILL" || currentSnap.billToCompany,
    });

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        amount: numAmount,
        method: method || payment.method,
        reference: reference !== undefined ? reference : payment.reference,
        payerSnapshot: snapshotStr,
      },
    });

    // Update allocations
    await prisma.paymentAllocation.updateMany({
      where: { paymentId },
      data: { amount: numAmount },
    });

    // Recalculate Folio Balance
    const allCharges = await prisma.folioEntry.findMany({
      where: { folioId, status: "POSTED" },
    });
    const totalCharges = allCharges.reduce((sum, e) => sum + (e.type === "CHARGE" ? e.totalAmount : -e.totalAmount), 0);

    const allPayments = await prisma.payment.findMany({
      where: { folioId, status: "POSTED" },
    });
    const totalPayments = allPayments.reduce((sum, p) => sum + p.amount, 0);

    const newBalance = Math.round((totalCharges - totalPayments) * 100) / 100;

    await prisma.folio.update({
      where: { id: folioId },
      data: { balance: newBalance },
    });

    return NextResponse.json({ success: true, payment: updatedPayment, newBalance });
  } catch (error: any) {
    console.error("Error editing payment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/v1/folios/[id]/payments - Void / Remove Payment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folioId } = await params;
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId query parameter is required" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db/prisma");

    await prisma.paymentAllocation.deleteMany({ where: { paymentId } });
    await prisma.payment.delete({ where: { id: paymentId } });

    // Recalculate Folio Balance
    const allCharges = await prisma.folioEntry.findMany({
      where: { folioId, status: "POSTED" },
    });
    const totalCharges = allCharges.reduce((sum, e) => sum + (e.type === "CHARGE" ? e.totalAmount : -e.totalAmount), 0);

    const allPayments = await prisma.payment.findMany({
      where: { folioId, status: "POSTED" },
    });
    const totalPayments = allPayments.reduce((sum, p) => sum + p.amount, 0);

    const newBalance = Math.round((totalCharges - totalPayments) * 100) / 100;

    await prisma.folio.update({
      where: { id: folioId },
      data: { balance: newBalance },
    });

    return NextResponse.json({ success: true, deletedId: paymentId, newBalance });
  } catch (error: any) {
    console.error("Error deleting payment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
