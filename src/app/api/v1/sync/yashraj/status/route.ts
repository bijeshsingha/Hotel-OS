import { NextResponse } from "next/server";

// Yashraj sync is disabled — will be re-enabled from the backend
export async function GET() {
  return NextResponse.json(
    { error: "Yashraj sync is not available in this version. Sync will be managed from the backend." },
    { status: 503 }
  );
}
