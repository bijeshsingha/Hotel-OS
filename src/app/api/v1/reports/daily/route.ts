import { NextResponse } from "next/server";
import { getDailyMidnightReport, saveMidnightSnapshot } from "@/lib/domain/daily-report-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const date = searchParams.get("date") || undefined;

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const report = await getDailyMidnightReport(propertyId, date);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Daily report error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate daily report" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId, businessDate, actorId } = body;

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const report = await saveMidnightSnapshot(propertyId, businessDate, actorId);
    return NextResponse.json({ success: true, message: "12 AM Midnight Daily Report archived successfully", report });
  } catch (error: any) {
    console.error("Daily report snapshot error:", error);
    return NextResponse.json({ error: error.message || "Failed to save midnight snapshot" }, { status: 500 });
  }
}
