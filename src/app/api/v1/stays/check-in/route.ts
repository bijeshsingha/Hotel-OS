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
      paxM,
      paxF,
      paxC,
      depositAmount,
      actorId,
      overrideReason,
      coGuests,
      foreignDetails,
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
      paxM: paxM !== undefined ? Number(paxM) : undefined,
      paxF: paxF !== undefined ? Number(paxF) : undefined,
      paxC: paxC !== undefined ? Number(paxC) : undefined,
      depositAmount: Number(depositAmount) || 0,
      actorId,
      overrideReason,
      coGuests,
      foreignDetails,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
