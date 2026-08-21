import { NextResponse } from "next/server";
import { postNightlyRoomCharges } from "@/lib/domain/night-audit-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const results = await postNightlyRoomCharges(propertyId);
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
