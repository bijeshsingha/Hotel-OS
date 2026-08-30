import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense record not found" }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      category,
      payeeName,
      description,
      amount,
      taxAmount = 0,
      paymentMethod,
      reference,
      notes,
      paidAt,
      businessDate,
      status,
      voucherNo,
    } = body;

    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense record not found" }, { status: 404 });
    }

    const numAmount = amount !== undefined ? Number(amount) : existingExpense.amount;
    const numTax = taxAmount !== undefined ? Number(taxAmount) : existingExpense.taxAmount;
    const totalAmount = numAmount + numTax;

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        category: category !== undefined ? category : existingExpense.category,
        payeeName: payeeName !== undefined ? payeeName : existingExpense.payeeName,
        description: description !== undefined ? description : existingExpense.description,
        amount: numAmount,
        taxAmount: numTax,
        totalAmount,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : existingExpense.paymentMethod,
        reference: reference !== undefined ? reference : existingExpense.reference,
        notes: notes !== undefined ? notes : existingExpense.notes,
        paidAt: paidAt ? new Date(paidAt) : existingExpense.paidAt,
        businessDate: businessDate || existingExpense.businessDate,
        status: status || existingExpense.status,
        voucherNo: voucherNo || existingExpense.voucherNo,
      },
    });

    return NextResponse.json({ success: true, expense: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hardDelete") === "true";

    const existing = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense record not found" }, { status: 404 });
    }

    if (hardDelete) {
      await prisma.expense.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Expense permanently deleted" });
    } else {
      // Soft-void
      const voided = await prisma.expense.update({
        where: { id },
        data: { status: "VOIDED" },
      });
      return NextResponse.json({ success: true, message: "Expense marked as voided", expense: voided });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
