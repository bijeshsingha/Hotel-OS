import { NextResponse } from "next/server";
import { recordPayment } from "@/lib/domain/folio-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folioId } = await params;
    const body = await request.json();
    const { folioWindowId, amount, method = "CASH", reference, payerName, actorId } = body;

    const payment = await recordPayment({
      folioId,
      folioWindowId,
      amount: Number(amount),
      method,
      reference,
      payerName,
      actorId,
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
