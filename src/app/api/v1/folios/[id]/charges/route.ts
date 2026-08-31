import { NextResponse } from "next/server";
import { postManualFolioCharge, deleteFolioCharge } from "@/lib/domain/folio-service";

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folioId } = await params;
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const entryId = body.entryId || searchParams.get("entryId") || searchParams.get("chargeId");
    const reason = body.reason || searchParams.get("reason") || undefined;
    const actorId = body.actorId || searchParams.get("actorId") || undefined;

    if (!entryId) {
      return NextResponse.json({ error: "entryId or chargeId is required" }, { status: 400 });
    }

    const result = await deleteFolioCharge({
      folioId,
      entryId,
      reason,
      actorId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
