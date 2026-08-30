import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

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

    const count = await prisma.expense.count({ where: { propertyId } });
    const voucherNo = `EXP-${property.code}-2627-${String(count + 1).padStart(4, "0")}`;
    const targetBusinessDate = businessDate || property.businessDate || new Date().toISOString().split("T")[0];

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
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        createdByName,
        status: "PAID",
      },
    });

    return NextResponse.json({ success: true, expense });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
