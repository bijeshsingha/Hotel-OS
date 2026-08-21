import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const reportType = searchParams.get("type") || "FRONT_OFFICE"; // FRONT_OFFICE, REVENUE, FNB, AUDIT

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    if (reportType === "FRONT_OFFICE") {
      const stays = await prisma.stay.findMany({
        where: { propertyId },
        include: {
          primaryGuest: true,
          roomAssignments: { include: { room: { include: { roomType: true } } } },
          folio: true,
        },
        orderBy: { arrivalAt: "desc" },
      });

      return NextResponse.json({
        reportType,
        generatedAt: new Date().toISOString(),
        rows: stays.map((s) => ({
          stayId: s.id,
          guestName: s.primaryGuest.name,
          phone: s.primaryGuest.phone,
          roomNumber: s.roomAssignments[0]?.room.number || "Unassigned",
          roomType: s.roomAssignments[0]?.room.roomType.name || "N/A",
          arrival: s.arrivalAt.toISOString().split("T")[0],
          departure: s.expectedDepartureAt.toISOString().split("T")[0],
          status: s.status,
          folioBalance: s.folio?.balance || 0,
        })),
      });
    }

    if (reportType === "REVENUE") {
      const entries = await prisma.folioEntry.findMany({
        where: { propertyId, status: "POSTED" },
        include: { folio: { include: { stay: { include: { primaryGuest: true } } } } },
        orderBy: { postedAt: "desc" },
      });

      return NextResponse.json({
        reportType,
        generatedAt: new Date().toISOString(),
        rows: entries.map((e) => ({
          id: e.id,
          serviceDate: e.serviceDate,
          chargeCode: e.chargeCode,
          description: e.description,
          guestName: e.folio.stay.primaryGuest.name,
          taxableAmount: e.taxableAmount,
          totalAmount: e.totalAmount,
          taxAmount: e.totalAmount - e.taxableAmount,
        })),
      });
    }

    if (reportType === "FNB") {
      const orders = await prisma.order.findMany({
        where: { propertyId },
        include: {
          outlet: true,
          table: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        reportType,
        generatedAt: new Date().toISOString(),
        rows: orders.map((o) => ({
          orderNo: o.orderNo,
          outletName: o.outlet.name,
          mode: o.mode,
          tableName: o.table?.name || "Room Service / Takeaway",
          itemCount: o.items.length,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
        })),
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
