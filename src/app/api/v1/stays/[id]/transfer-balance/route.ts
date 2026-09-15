import { NextResponse } from "next/server";
import { transferRoomBalanceMidStay } from "@/lib/domain/folio-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stayId } = await params;
    const body = await request.json().catch(() => ({}));
    const {
      fromRoomNumber,
      toRoomNumber,
      amount,
      type = "DEBIT_TRANSFER",
      remarks,
      actorId,
    } = body;

    if (!fromRoomNumber) {
      return NextResponse.json(
        { error: "fromRoomNumber is required" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "A valid transfer amount greater than 0 is required" },
        { status: 400 }
      );
    }

    const result = await transferRoomBalanceMidStay({
      stayId,
      fromRoomNumber,
      toRoomNumber,
      amount: numAmount,
      type,
      remarks,
      actorId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
