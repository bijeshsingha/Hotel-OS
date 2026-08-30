import { NextResponse } from "next/server";
import { moveRoom } from "@/lib/domain/pms-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stayId } = await params;
    const body = await request.json();
    const { fromRoomId, targetRoomId, reason, rateHandling, customRate, actorId } = body;

    const result = await moveRoom({
      stayId,
      fromRoomId,
      targetRoomId,
      reason,
      rateHandling,
      customRate,
      actorId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
