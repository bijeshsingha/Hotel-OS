import { authorizeRequest, getApiAccess } from "@/lib/auth/api-access";
import { NextResponse } from "next/server";
import { postManualKotBatch } from "@/lib/domain/manual-kot-service";
import { postManualFolioCharge, deleteFolioCharge } from "@/lib/domain/folio-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

  try {
    const { id: folioId } = await params;
    const body = await request.json();
    if (body.kots !== undefined) {
      const context = getApiAccess(request);
      const batch = await postManualKotBatch({
        folioId,
        folioWindowId: body.folioWindowId,
        requestId: body.requestId,
        kots: body.kots,
        actorId: context.user.id,
        actorName: context.user.name,
      });
      return NextResponse.json(batch);
    }
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
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

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
