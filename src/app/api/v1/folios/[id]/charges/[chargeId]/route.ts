import { authorizeRequest, getApiAccess } from "@/lib/auth/api-access";
import { NextResponse } from "next/server";
import { deleteFolioCharge } from "@/lib/domain/folio-service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; chargeId: string }> }
) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

  try {
    const { id: folioId, chargeId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || undefined;
    const actorId = body.actorId || undefined;

    const result = await deleteFolioCharge({
      folioId,
      entryId: chargeId,
      reason,
      actorId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
