import { NextResponse } from "next/server";
import { checkoutAndIssueInvoice } from "@/lib/domain/folio-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stayId } = await params;
    const body = await request.json().catch(() => ({}));
    const { folioWindowId, actorId } = body;

    const result = await checkoutAndIssueInvoice({
      stayId,
      folioWindowId,
      actorId,
    });

    return NextResponse.json({
      ...result,
      invoiceNo: result.invoice?.invoiceNo,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
