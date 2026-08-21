import { NextResponse } from "next/server";
import { postOrderToRoomFolio } from "@/lib/domain/pos-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { stayId, actorId } = body;

    if (!stayId) {
      return NextResponse.json({ error: "stayId is required for room posting" }, { status: 400 });
    }

    const result = await postOrderToRoomFolio({
      orderId,
      stayId,
      actorId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
