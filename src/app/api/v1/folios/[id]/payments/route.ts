import { NextResponse } from "next/server";
import { recordPayment } from "@/lib/domain/folio-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folioId } = await params;
    const body = await request.json();
    const {
      folioWindowId,
      amount,
      method = "CASH",
      reference,
      payerName,
      companyName,
      gstin,
      creditPeriod,
      billingRemarks,
      isRefund,
      actorId,
    } = body;

    let snapshotStr: string | undefined = undefined;
    if (companyName || gstin || creditPeriod || method === "DIRECT_BILL") {
      snapshotStr = JSON.stringify({
        name: payerName || "Guest",
        companyName: companyName || "",
        gstin: gstin || "",
        creditPeriod: creditPeriod || "30_DAYS",
        remarks: billingRemarks || "",
        billToCompany: method === "DIRECT_BILL",
      });
    }

    const payment = await recordPayment({
      folioId,
      folioWindowId,
      amount: Number(amount),
      method,
      reference: reference || (method === "DIRECT_BILL" ? `BTC-${companyName || "CORP"}` : undefined),
      payerName: companyName ? `${payerName || "Guest"} (${companyName})` : payerName,
      payerSnapshot: snapshotStr,
      isRefund: Boolean(isRefund),
      actorId,
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
