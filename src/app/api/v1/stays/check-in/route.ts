import { NextResponse } from "next/server";
import { checkInGuest } from "@/lib/domain/pms-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      reservationId,
      guestData,
      roomId,
      arrivalAt,
      expectedDepartureAt,
      adults,
      children,
      depositAmount,
      actorId,
      overrideReason,
    } = body;

    const result = await checkInGuest({
      propertyId,
      reservationId,
      guestData,
      roomId,
      arrivalAt: arrivalAt ? new Date(arrivalAt) : undefined,
      expectedDepartureAt: new Date(expectedDepartureAt),
      adults: Number(adults) || 2,
      children: Number(children) || 0,
      depositAmount: Number(depositAmount) || 0,
      actorId,
      overrideReason,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
