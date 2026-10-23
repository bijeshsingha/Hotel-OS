import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hasPermission, RoleCode } from "./roles";

export const SESSION_COOKIE = "hotel_os_session";
export const SESSION_SECONDS = 8 * 60 * 60;
const userInclude = { memberships: { include: { organization: true, propertyGrants: { include: { property: true, role: true } } } } } satisfies Prisma.UserInclude;
export type SessionUser = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function readSessionToken(request: Request): string | null {
  const match = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = match?.slice(SESSION_COOKIE.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export function tokenHash(token: string): string { return crypto.createHash("sha256").update(token).digest("hex"); }
export async function getSession(request: Request) {
  const token = readSessionToken(request);
  if (!token) return null;
  const session = await prisma.userSession.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: { include: userInclude } } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
  return session;
}
export async function requireSession(request: Request) {
  const session = await getSession(request);
  if (!session) throw new AccessError(401, "Please sign in to continue.");
  return session;
}
export function activeMemberships(user: SessionUser) {
  return user.memberships.filter((membership) => membership.status === "ACTIVE" && membership.organization.status === "ACTIVE");
}
export function ownerOrganizationIds(user: SessionUser): string[] {
  return activeMemberships(user).filter((membership) => membership.propertyGrants.some((grant) => grant.role.code === "ORG_OWNER" && grant.property.organizationId === membership.organizationId)).map((membership) => membership.organizationId);
}
export async function accessibleProperties(user: SessionUser) {
  const owners = ownerOrganizationIds(user);
  const granted = activeMemberships(user).flatMap((membership) => membership.propertyGrants.filter((grant) => grant.property.organizationId === membership.organizationId).map((grant) => grant.propertyId));
  return prisma.property.findMany({ where: { status: "ACTIVE", organization: { status: "ACTIVE" }, OR: [{ id: { in: granted } }, { organizationId: { in: owners } }] }, orderBy: { createdAt: "asc" } });
}
export function rolesForProperty(user: SessionUser, propertyId: string, organizationId: string): string[] {
  const membership = activeMemberships(user).find((membership) => membership.organizationId === organizationId);
  if (!membership) return [];
  if (ownerOrganizationIds(user).includes(organizationId)) return ["ORG_OWNER"];
  return membership.propertyGrants.filter((grant) => grant.propertyId === propertyId && grant.property.organizationId === organizationId).map((grant) => grant.role.code);
}
export async function mayPerform(user: SessionUser, propertyId: string, organizationId: string, permission: string) {
  const overrides = await prisma.permissionOverride.findMany({ where: { userId: user.id, propertyId, permissionCode: permission, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
  if (overrides.some((override) => override.effect === "DENY")) return false;
  if (overrides.some((override) => override.effect === "ALLOW")) return true;
  return rolesForProperty(user, propertyId, organizationId).some((role) => hasPermission(role as RoleCode, permission));
}
export function verifyRequestOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new AccessError(403, "Cross-site requests are not allowed.");
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host");
  // Next may construct request.url from its bind address (e.g. 0.0.0.0).
  // Use the incoming authority; forwarded headers require an explicit APP_ORIGIN.
  let expected = process.env.APP_ORIGIN;
  if (!expected) {
    if (host && /[\s,/@\\?#]/.test(host)) throw new AccessError(403, "Request origin is not allowed.");
    try { expected = host ? new URL(`${requestUrl.protocol}//${host}`).origin : requestUrl.origin; }
    catch { throw new AccessError(403, "Request origin is not allowed."); }
  }
  if (origin !== expected) throw new AccessError(403, "Request origin is not allowed.");
}
export async function createSession(request: Request, userId: string, response: NextResponse) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  const previous = readSessionToken(request);
  await prisma.$transaction(async (tx) => {
    if (previous) await tx.userSession.updateMany({ where: { tokenHash: tokenHash(previous), revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.userSession.create({ data: { userId, tokenHash: tokenHash(token), expiresAt, device: request.headers.get("user-agent")?.slice(0, 256) } });
    await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  });
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", expires: expiresAt });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
export function accessFailure(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  console.error("[AUTH] Access check failed", error instanceof Error ? error.name : "Unknown error");
  return NextResponse.json({ error: "Unable to verify access. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
