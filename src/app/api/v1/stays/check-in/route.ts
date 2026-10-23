import { authorizeRequest, getApiAccess } from "@/lib/auth/api-access";
import { NextResponse } from "next/server";
import { checkInGuest } from "@/lib/domain/pms-service";
import { toServiceDate } from "@/lib/domain/booking-dates";

export async function POST(request: Request) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

  try {
    const body = await request.json();
    const {
      propertyId,
      reservationId,
      guestData,
      roomId,
      roomIds,
      groupBilling,
      roomRates,
      roomPax,
      arrivalAt,
      expectedDepartureAt,
      adults,
      children,
      paxM,
      paxF,
      paxC,
      depositAmount,
      additionalDepositAmount,
      depositMethod,
      depositRef,
      agreedTariff,
      isComplimentary,
      isRateInclusive,
      checkoutType,
      gracePeriodMinutes,
      extraBeds,
      extraBedRate,
      actorId,
      overrideReason,
      coGuests,
      foreignDetails,
      kitchenDining,
      diningFixedRate,
    } = body;

    const finalRoomIds = roomIds || (roomId ? [roomId] : []);
    if (finalRoomIds.length === 0) {
      return NextResponse.json({ error: "No room selected for check-in." }, { status: 400 });
    }

    const effectiveDep = expectedDepartureAt || body.departureDate || body.checkOut;
    const effectiveArr = arrivalAt || body.arrivalDate || body.checkIn || new Date();
    const effectiveGuestData = guestData || {
      name: body.guestName || "Guest",
      phone: body.guestPhone,
      email: body.guestEmail,
    };

    if (!effectiveDep) {
      return NextResponse.json({ error: "expectedDepartureAt is required." }, { status: 400 });
    }

    const { property } = getApiAccess(request);
    const arrDate = toServiceDate(effectiveArr, property.timezone);
    const depDate = toServiceDate(effectiveDep, property.timezone);
    if (depDate <= arrDate) {
      return NextResponse.json({ error: "Departure date must be strictly after arrival date." }, { status: 400 });
    }

    const result = await checkInGuest({
      propertyId,
      reservationId,
      guestData: effectiveGuestData,
      roomIds: finalRoomIds,
      groupBilling: groupBilling !== undefined ? groupBilling : true,
      roomRates,
      roomPax,
      arrivalAt: effectiveArr ? new Date(effectiveArr) : undefined,
      expectedDepartureAt: new Date(effectiveDep),
      adults: Number(adults) || 2,
      children: Number(children) || 0,
      paxM: paxM !== undefined ? Number(paxM) : undefined,
      paxF: paxF !== undefined ? Number(paxF) : undefined,
      paxC: paxC !== undefined ? Number(paxC) : undefined,
      depositAmount: depositAmount === undefined ? 0 : Number(depositAmount),
      additionalDepositAmount: additionalDepositAmount === undefined ? undefined : Number(additionalDepositAmount),
      depositMethod: depositMethod || "CASH",
      depositRef: depositRef || undefined,
      agreedTariff: agreedTariff !== undefined ? Number(agreedTariff) : undefined,
      isComplimentary: Boolean(isComplimentary),
      isRateInclusive: isRateInclusive !== undefined ? Boolean(isRateInclusive) : true,
      checkoutType: checkoutType || "FIXED_TIME",
      gracePeriodMinutes: gracePeriodMinutes !== undefined ? Number(gracePeriodMinutes) : 0,
      extraBeds: extraBeds !== undefined ? Number(extraBeds) : 0,
      extraBedRate: extraBedRate !== undefined ? Number(extraBedRate) : 500,
      actorId,
      overrideReason,
      coGuests,
      foreignDetails,
      kitchenDining,
      diningFixedRate: diningFixedRate !== undefined ? Number(diningFixedRate) : undefined,
    });

    return NextResponse.json({ ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 400 });
  }
}
