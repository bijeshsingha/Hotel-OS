import { NextResponse } from "next/server";
import { addItemsToOrder } from "@/lib/domain/pos-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { items } = body;

    const addedItems = await addItemsToOrder({
      orderId,
      items,
    });

    return NextResponse.json({ success: true, items: addedItems });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
