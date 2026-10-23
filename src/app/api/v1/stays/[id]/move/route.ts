import { authorizeRequest, getApiAccess } from "@/lib/auth/api-access";
import { NextResponse } from "next/server";
import { moveRoom } from "@/lib/domain/pms-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

  try {
    const { id: stayId } = await params;
    const body = await request.json();
    const {
      fromRoomId,
      sourceRoomId,
      targetRoomId,
      reason,
      rateHandling,
      customRate,
      actorId,
      transferCreditAmount,
      transferRemarks,
    } = body;

    const result = await moveRoom({
      stayId,
      fromRoomId: fromRoomId || sourceRoomId,
      sourceRoomId,
      targetRoomId,
      reason,
      rateHandling,
      customRate: customRate !== undefined && customRate !== null && customRate !== "" ? Number(customRate) : undefined,
      actorId,
      transferCreditAmount: transferCreditAmount !== undefined ? Number(transferCreditAmount) : undefined,
      transferRemarks,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
