import { NextResponse } from "next/server";
import { fireKOT } from "@/lib/domain/pos-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json().catch(() => ({}));
    const { actorId } = body;

    const kots = await fireKOT({
      orderId,
      actorId,
    });

    return NextResponse.json({ success: true, kots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
