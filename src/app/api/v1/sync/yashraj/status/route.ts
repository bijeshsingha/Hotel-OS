import { NextResponse } from "next/server";
import { getYashrajStatus } from "@/lib/sync/yashraj-sync";

export async function GET() {
  try {
    const status = await getYashrajStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    console.error("Yashraj status API error:", error);
    return NextResponse.json(
      {
        connected: false,
        error: error.message || "Failed to query Yashraj database status",
      },
      { status: 500 }
    );
  }
}
