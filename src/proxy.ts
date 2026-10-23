import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
const PUBLIC_PAGES = new Set(["/login", "/checkin", "/order", "/guest", "/dining"]);
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/")) return NextResponse.next(); // Every protected handler verifies its session.
  const host = (request.headers.get("host") || "").toLowerCase();
  if (host.startsWith("checkin.") && path === "/") return NextResponse.redirect(new URL("/checkin", request.url));
  if (!PUBLIC_PAGES.has(path) && !request.cookies.get("hotel_os_session")) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next|.*\\.[\\w]+$).*)"] };
