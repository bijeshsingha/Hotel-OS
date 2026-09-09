import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getNextDocumentNumber } from "@/lib/sequence/generator";
import { getMidnightDayBoundaries } from "@/lib/domain/daily-report-service";

export const CATEGORY_LABELS: Record<string, string> = {
  BAR_FOOD_BILL: "Bar Food Orders (Kitchen Food Bill)",
  BAR_BEVERAGE_DIRECT: "Bar Food Orders (Kitchen Food Bill)", // Legacy alias
  BANQUET_EVENT_ADVANCE: "Banquet & Event Advance Deposit",
  OUTSIDER_WALKIN_DINING: "Direct Non-Resident Walk-In Dining",
  MISC_OUTLET_REVENUE: "Ancillary & Other Outlet Collections",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const date = searchParams.get("date");

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const where: any = {
      propertyId,
      status: "SUCCEEDED",
      folioId: null, // Direct non-room collections
    };

    if (date) {
      const bounds = getMidnightDayBoundaries(date);
      where.receivedAt = {
        gte: bounds.localStart < bounds.startUtc ? bounds.localStart : bounds.startUtc,
        lte: bounds.localEnd > bounds.endUtc ? bounds.localEnd : bounds.endUtc,
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { receivedAt: "desc" },
    });

    const formatted = payments.map((p) => {
      let snapshot: any = {};
      try {
        if (p.payerSnapshot) snapshot = JSON.parse(p.payerSnapshot);
      } catch (e) {}

      const category = snapshot.category || "MISC_OUTLET_REVENUE";
      const categoryLabel = snapshot.categoryLabel || CATEGORY_LABELS[category] || "Direct Collection";

      return {
        id: p.id,
        receiptNo: p.receiptNo,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        category,
        categoryLabel,
        payerName: snapshot.name || (category.startsWith("BAR") ? "Bar Counter (Food)" : "Walk-In Guest"),
        phone: snapshot.phone || null,
        kotNo: snapshot.kotNo || null,
        clientType: snapshot.clientType || "INDIVIDUAL",
        companyName: snapshot.companyName || null,
        gstin: snapshot.gstin || null,
        billingAddress: snapshot.billingAddress || null,
        eventDetails: snapshot.eventDetails || null,
        notes: snapshot.notes || null,
        receivedAt: p.receivedAt.toISOString(),
        receivedBy: p.createdById || "Cashier",
      };
    });

    return NextResponse.json({ success: true, count: formatted.length, data: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      category = "BAR_FOOD_BILL",
      payerName,
      payerPhone,
      amount,
      paymentMethod = "CASH",
      kotNo,
      clientType = "INDIVIDUAL",
      companyName,
      gstin,
      billingAddress,
      eventDetails,
      reference,
      notes,
      receivedAt,
      createdByName = "Front Desk Cashier",
    } = body;

    if (!propertyId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields: propertyId, amount, paymentMethod" },
        { status: 400 }
      );
    }

    const isBanquet = category === "BANQUET_EVENT_ADVANCE";
    const isCompany = clientType === "COMPANY" || Boolean(companyName?.trim());

    // Banquet advance business validation
    if (isBanquet) {
      if (!payerName?.trim()) {
        return NextResponse.json(
          { error: "Guest / Client Contact Person name is mandatory for Banquet Advances." },
          { status: 400 }
        );
      }
      if (!payerPhone?.trim()) {
        return NextResponse.json(
          { error: "Contact Mobile Number is mandatory for Banquet Advances." },
          { status: 400 }
        );
      }
      if (isCompany && !companyName?.trim()) {
        return NextResponse.json(
          { error: "Company Name is mandatory when booking type is Corporate / Company." },
          { status: 400 }
        );
      }
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount. Must be greater than 0." }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const categoryLabel = CATEGORY_LABELS[category] || "Direct Non-Room Collection";
    const recSeq = await getNextDocumentNumber(property.id, "RECEIPT");

    const resolvedPayerName =
      payerName?.trim() ||
      (category.startsWith("BAR") ? "Bar Counter (Food)" : "Walk-In Guest");

    const payerSnapshot = JSON.stringify({
      name: resolvedPayerName,
      phone: payerPhone?.trim() || null,
      category,
      categoryLabel,
      kotNo: kotNo?.trim() || null,
      clientType: isCompany ? "COMPANY" : "INDIVIDUAL",
      companyName: companyName?.trim() || null,
      gstin: gstin?.trim()?.toUpperCase() || null,
      billingAddress: billingAddress?.trim() || null,
      eventDetails: eventDetails?.trim() || null,
      notes: notes?.trim() || null,
    });

    const formattedKot = kotNo?.trim()
      ? kotNo.trim().toUpperCase().startsWith("KOT")
        ? kotNo.trim()
        : `KOT #${kotNo.trim()}`
      : null;

    // Construct informative audit reference if none provided
    let computedReference = reference?.trim();
    if (!computedReference) {
      const parts = [categoryLabel];
      if (formattedKot) parts.push(formattedKot);
      if (companyName?.trim()) parts.push(`(${companyName.trim()})`);
      computedReference = parts.join(" - ");
    } else if (formattedKot && !computedReference.toUpperCase().includes("KOT")) {
      computedReference = `${computedReference} [${formattedKot}]`;
    }

    const payment = await prisma.payment.create({
      data: {
        organizationId: property.organizationId,
        propertyId: property.id,
        receiptNo: recSeq.formattedNumber,
        amount: numAmount,
        method: paymentMethod,
        reference: computedReference,
        payerSnapshot,
        status: "SUCCEEDED",
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
        createdById: createdByName,
      },
    });

    return NextResponse.json({
      success: true,
      receiptNo: recSeq.formattedNumber,
      payment: {
        id: payment.id,
        receiptNo: payment.receiptNo,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        category,
        categoryLabel,
        kotNo: kotNo?.trim() || null,
        payerName: resolvedPayerName,
        companyName: companyName?.trim() || null,
        gstin: gstin?.trim() || null,
        receivedAt: payment.receivedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
