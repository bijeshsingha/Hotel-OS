import { NextResponse } from "next/server";
import { updateStayGracePeriod } from "@/lib/domain/folio-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stayId } = await params;
    const body = await request.json();
    const { gracePeriodMinutes, actorId } = body;

    if (gracePeriodMinutes === undefined || isNaN(Number(gracePeriodMinutes))) {
      return NextResponse.json({ error: "gracePeriodMinutes is required" }, { status: 400 });
    }

    const result = await updateStayGracePeriod({
      stayId,
      gracePeriodMinutes: Number(gracePeriodMinutes),
      actorId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
