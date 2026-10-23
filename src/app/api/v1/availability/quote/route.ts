import { authorizeRequest, getApiAccess } from "@/lib/auth/api-access";
import { NextResponse } from "next/server";
import { quoteStay, calculateAvailability } from "@/lib/domain/pms-service";
import { validateStayInterval, DateValidationError } from "@/lib/domain/booking-dates";

export async function GET(request: Request) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const roomTypeId = searchParams.get("roomTypeId");
    const arrivalDate =
      searchParams.get("arrivalDate") ||
      searchParams.get("checkIn");
    const departureDate =
      searchParams.get("departureDate") ||
      searchParams.get("checkOut");

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    if (!arrivalDate || !departureDate) {
      return NextResponse.json({ error: "arrivalDate and departureDate are required" }, { status: 400 });
    }

    // Validate stay dates strictly with shared date policy
    const interval = validateStayInterval(arrivalDate, departureDate);

    if (roomTypeId) {
      const quote = await quoteStay({
        propertyId,
        roomTypeId,
        arrivalDate: interval.arrivalDate,
        departureDate: interval.departureDate,
      });
      return NextResponse.json(quote);
    } else {
      const avail = await calculateAvailability(propertyId, interval.arrivalDate, interval.departureDate);
      const totalRooms = avail.reduce((s, a) => s + a.totalRooms, 0);
      const availableRooms = avail.reduce((s, a) => s + a.availableCount, 0);

      return NextResponse.json({
        arrivalDate: interval.arrivalDate,
        departureDate: interval.departureDate,
        totalRooms,
        availableRooms,
        categories: avail,
      });
    }
  } catch (error: any) {
    if (error instanceof DateValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request: Request) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

  try {
    const body = await request.json();
    const { propertyId, roomTypeId, arrivalDate, departureDate, checkIn, checkOut } = body;

    const effArrival = arrivalDate || checkIn;
    const effDeparture = departureDate || checkOut;

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    if (!effArrival || !effDeparture) {
      return NextResponse.json({ error: "arrivalDate and departureDate are required" }, { status: 400 });
    }

    const interval = validateStayInterval(effArrival, effDeparture);

    if (roomTypeId) {
      const quote = await quoteStay({
        propertyId,
        roomTypeId,
        arrivalDate: interval.arrivalDate,
        departureDate: interval.departureDate,
      });
      return NextResponse.json(quote);
    } else {
      const avail = await calculateAvailability(propertyId, interval.arrivalDate, interval.departureDate);
      const totalRooms = avail.reduce((s, a) => s + a.totalRooms, 0);
      const availableRooms = avail.reduce((s, a) => s + a.availableCount, 0);

      return NextResponse.json({
        arrivalDate: interval.arrivalDate,
        departureDate: interval.departureDate,
        totalRooms,
        availableRooms,
        categories: avail,
      });
    }
  } catch (error: any) {
    if (error instanceof DateValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

