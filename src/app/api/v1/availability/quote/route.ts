import { NextResponse } from "next/server";
import { quoteStay, calculateAvailability } from "@/lib/domain/pms-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const roomTypeId = searchParams.get("roomTypeId");
    const arrivalDate = searchParams.get("arrivalDate") || new Date().toISOString().split("T")[0];
    const departureDate =
      searchParams.get("departureDate") ||
      new Date(Date.now() + 86400000).toISOString().split("T")[0];

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    if (roomTypeId) {
      const quote = await quoteStay({
        propertyId,
        roomTypeId,
        arrivalDate,
        departureDate,
      });
      return NextResponse.json(quote);
    } else {
      const avail = await calculateAvailability(propertyId, arrivalDate, departureDate);
      return NextResponse.json(avail);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
