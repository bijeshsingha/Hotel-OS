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
      roomIds, // NEW
      groupBilling, // NEW
      roomRates, // NEW
      arrivalAt,
      expectedDepartureAt,
      adults,
      children,
      paxM,
      paxF,
      paxC,
      depositAmount,
      agreedTariff,
      extraBeds,
      extraBedRate,
      actorId,
      overrideReason,
      coGuests,
      foreignDetails,
    } = body;

    const finalRoomIds = roomIds || (roomId ? [roomId] : []);
    if (finalRoomIds.length === 0) {
      return NextResponse.json({ error: "No room selected for check-in." }, { status: 400 });
    }

    const result = await checkInGuest({
      propertyId,
      reservationId,
      guestData,
      roomIds: finalRoomIds,
      groupBilling: groupBilling !== undefined ? groupBilling : true,
      roomRates, // NEW
      arrivalAt: arrivalAt ? new Date(arrivalAt) : undefined,
      expectedDepartureAt: new Date(expectedDepartureAt),
      adults: Number(adults) || 2,
      children: Number(children) || 0,
      paxM: paxM !== undefined ? Number(paxM) : undefined,
      paxF: paxF !== undefined ? Number(paxF) : undefined,
      paxC: paxC !== undefined ? Number(paxC) : undefined,
      depositAmount: Number(depositAmount) || 0,
      agreedTariff: agreedTariff !== undefined ? Number(agreedTariff) : undefined,
      extraBeds: extraBeds !== undefined ? Number(extraBeds) : 0,
      extraBedRate: extraBedRate !== undefined ? Number(extraBedRate) : 500,
      actorId,
      overrideReason,
      coGuests,
      foreignDetails,
    });

    return NextResponse.json({ ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
