import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAuditEvent } from "@/lib/domain/audit-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const expenses = await prisma.expense.findMany({
      where: { propertyId },
      orderBy: { paidAt: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      category,
      payeeName,
      description,
      amount,
      taxAmount = 0,
      paymentMethod,
      reference,
      notes,
      businessDate,
      paidAt,
      createdByName = "Staff",
    } = body;

    if (!propertyId || !category || !payeeName || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields: propertyId, category, payeeName, amount, paymentMethod" },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const numAmount = Number(amount);
    const numTax = Number(taxAmount || 0);
    const totalAmount = numAmount + numTax;

    // Generate unique, collision-proof voucher number based on highest sequence
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = fyStart + 1;
    const fyShort = `${String(fyStart).slice(2)}${String(fyEnd).slice(2)}`;
    const prefix = `EXP-${property.code}-${fyShort}-`;

    const latest = await prisma.expense.findFirst({
      where: {
        propertyId: property.id,
        voucherNo: { startsWith: prefix },
      },
      orderBy: { voucherNo: "desc" },
    });

    let nextSeq = 1;
    if (latest?.voucherNo) {
      const parts = latest.voucherNo.split("-");
      const lastPart = parts[parts.length - 1];
      const parsed = parseInt(lastPart, 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }

    let voucherNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    let exists = await prisma.expense.findFirst({
      where: { propertyId: property.id, voucherNo },
    });
    while (exists) {
      nextSeq++;
      voucherNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;
      exists = await prisma.expense.findFirst({
        where: { propertyId: property.id, voucherNo },
      });
    }

    let targetPaidAt: Date;
    let targetBusinessDate: string;

    if (paidAt) {
      const parsed = new Date(paidAt);
      targetPaidAt = !isNaN(parsed.getTime()) ? parsed : new Date();
    } else if (businessDate) {
      targetPaidAt = new Date(`${businessDate}T12:00:00.000Z`);
    } else {
      targetPaidAt = new Date();
    }

    if (businessDate) {
      targetBusinessDate = businessDate;
    } else if (paidAt) {
      targetBusinessDate = typeof paidAt === "string" && paidAt.includes("T")
        ? paidAt.split("T")[0]
        : targetPaidAt.toISOString().split("T")[0];
    } else {
      targetBusinessDate = property.businessDate || new Date().toISOString().split("T")[0];
    }

    const expense = await prisma.expense.create({
      data: {
        organizationId: property.organizationId,
        propertyId: property.id,
        voucherNo,
        category,
        payeeName,
        description: description || category,
        amount: numAmount,
        taxAmount: numTax,
        totalAmount,
        paymentMethod,
        reference: reference || null,
        notes: notes || null,
        businessDate: targetBusinessDate,
        paidAt: targetPaidAt,
        createdByName,
        status: "PAID",
      },
    });

    // Audit log for expense voucher
    await logAuditEvent({
      organizationId: property.organizationId,
      propertyId: property.id,
      actorName: createdByName || "Staff",
      action: "EXPENSE_VOUCHER_CREATE",
      targetType: "EXPENSE",
      targetId: expense.id,
      reason: description || `Expense voucher for ${payeeName} (${category})`,
      afterJson: {
        voucherNo: expense.voucherNo,
        category: expense.category,
        payeeName: expense.payeeName,
        amount: expense.amount,
        taxAmount: expense.taxAmount,
        totalAmount: expense.totalAmount,
        paymentMethod: expense.paymentMethod,
        reference: expense.reference,
        businessDate: expense.businessDate,
      },
    });

    return NextResponse.json({ success: true, expense });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
