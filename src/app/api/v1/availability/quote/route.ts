import { NextResponse } from "next/server";
import { quoteStay, calculateAvailability } from "@/lib/domain/pms-service";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let propertyId = searchParams.get("propertyId");
    const roomTypeId = searchParams.get("roomTypeId");
    const arrivalDate =
      searchParams.get("arrivalDate") ||
      searchParams.get("checkIn") ||
      new Date().toISOString().split("T")[0];
    const departureDate =
      searchParams.get("departureDate") ||
      searchParams.get("checkOut") ||
      new Date(Date.now() + 86400000).toISOString().split("T")[0];

    if (!propertyId) {
      const prop = await prisma.property.findFirst();
      propertyId = prop?.id || "prop_ambarish";
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
      const totalRooms = avail.reduce((s, a) => s + a.totalRooms, 0);
      const availableRooms = avail.reduce((s, a) => s + a.availableCount, 0);

      return NextResponse.json({
        arrivalDate,
        departureDate,
        totalRooms,
        availableRooms,
        categories: avail,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
