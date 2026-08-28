import { NextResponse } from "next/server";
import { postManualFolioCharge } from "@/lib/domain/folio-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folioId } = await params;
    const body = await request.json();
    const { folioWindowId, chargeCode, description, amount, qty, isInclusive, sacHsn, customTaxRate, actorId } = body;

    const entry = await postManualFolioCharge({
      folioId,
      folioWindowId,
      chargeCode: chargeCode || "RESTAURANT_FOOD",
      description,
      amount: Number(amount),
      qty: Number(qty) || 1,
      isInclusive: isInclusive !== undefined ? Boolean(isInclusive) : true,
      sacHsn: sacHsn || "996331",
      customTaxRate: customTaxRate !== undefined ? Number(customTaxRate) : 5,
      actorId,
    });

    return NextResponse.json(entry);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
