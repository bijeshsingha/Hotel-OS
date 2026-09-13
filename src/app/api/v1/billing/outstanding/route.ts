import { NextResponse } from "next/server";
import { getOutstandingList } from "@/lib/domain/outstanding-ledger-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId") || undefined;
    const status = searchParams.get("status") || "ALL";

    let records = await getOutstandingList(propertyId);
    if (status !== "ALL") {
      records = records.filter((r) => r.status === status);
    }

    return NextResponse.json({
      records,
      totalCount: records.length,
      unsettledCount: records.filter((r) => r.status !== "SETTLED").length,
      unsettledTotal: records
        .filter((r) => r.status !== "SETTLED")
        .reduce((s, r) => s + (r.outstandingAmount || 0), 0),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
