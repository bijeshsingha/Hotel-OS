import { getExecutiveReport } from "@/lib/domain/executive-report-service";
import { generateExecutiveReportExcel } from "@/lib/domain/executive-report-excel";

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

    const excelBuffer = await generateExecutiveReportExcel(report);

    const safePropertyCode = (report.property.code || "HOTEL").replace(/[^a-zA-Z0-9_-]/g, "");
    const dateRangeSlug = report.filter.startDate === report.filter.endDate
      ? report.filter.startDate
      : `${report.filter.startDate}_to_${report.filter.endDate}`;
    const filename = `Executive_Report_${safePropertyCode}_${dateRangeSlug}.xlsx`;

    // Convert Buffer to Uint8Array for Next Response compatibility
    const fileBytes = new Uint8Array(excelBuffer);

    return new Response(fileBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBytes.byteLength.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Executive Excel export failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Failed to generate Excel report",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
