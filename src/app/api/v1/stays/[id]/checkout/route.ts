import { NextResponse } from "next/server";
import { checkoutAndIssueInvoice } from "@/lib/domain/folio-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stayId } = await params;
    const body = await request.json().catch(() => ({}));
    const {
      roomId,
      roomNumber,
      folioWindowId,
      actorId,
      allowOutstanding,
      outstandingReason,
      outstandingRemarks,
      settlementDueDate,
    } = body;

    const result = await checkoutAndIssueInvoice({
      stayId,
      roomId,
      roomNumber,
      folioWindowId,
      actorId,
      allowOutstanding: Boolean(allowOutstanding),
      outstandingReason,
      outstandingRemarks,
      settlementDueDate,
    });

    return NextResponse.json({
      ...result,
      invoiceNo: result.invoice?.invoiceNo,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
