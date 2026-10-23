import { authorizeRequest, getApiAccess } from "@/lib/auth/api-access";
import { NextResponse } from "next/server";
import { addItemsToOrder } from "@/lib/domain/pos-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

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
