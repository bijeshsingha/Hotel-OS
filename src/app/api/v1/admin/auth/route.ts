import { NextResponse } from "next/server";
import { authorizeRequest, getApiAccess } from "@/lib/auth/api-access";
import { verifyPassword } from "@/lib/auth/password";
export async function POST(request: Request) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  request = access.request;
  const { user } = getApiAccess(request);
  const body = await request.json();
  if (!verifyPassword(body.password, user.passwordHash, user.pin)) return NextResponse.json({ error: "Invalid password or PIN." }, { status: 401 });
  return NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: access.roles[0] } }, { headers: { "Cache-Control": "no-store" } });
}
