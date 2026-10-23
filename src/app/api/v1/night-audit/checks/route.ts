import { authorizeRequest, getApiAccess } from "@/lib/auth/api-access";
import { NextResponse } from "next/server";
import { runNightAuditChecks } from "@/lib/domain/night-audit-service";

export async function GET(request: Request) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;

  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const checks = await runNightAuditChecks(propertyId);
    return NextResponse.json(checks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
