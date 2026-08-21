import { NextResponse } from "next/server";
import { closeOperationalDay } from "@/lib/domain/night-audit-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId, actorId, overrides } = body;

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const result = await closeOperationalDay(
      propertyId,
      actorId,
      overrides ? JSON.stringify(overrides) : undefined
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
