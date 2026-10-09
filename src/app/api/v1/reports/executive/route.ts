import { NextResponse } from "next/server";
import { getExecutiveReport } from "@/lib/domain/executive-report-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const report = await getExecutiveReport({
      propertyId,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error("Executive report generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to generate executive report",
      },
      { status: 500 }
    );
  }
}
