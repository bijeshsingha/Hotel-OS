import { authorizeRequest, getApiAccess } from "@/lib/auth/api-access";
import { NextResponse } from "next/server";

// Yashraj sync is disabled — will be re-enabled from the backend
export async function GET(request: Request) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

  return NextResponse.json(
    { error: "Yashraj sync is not available in this version. Sync will be managed from the backend." },
    { status: 503 }
  );
}
