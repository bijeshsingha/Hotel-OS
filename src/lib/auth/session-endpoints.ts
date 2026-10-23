import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { accessFailure, accessibleProperties, clearSessionCookie, ownerOrganizationIds, readSessionToken, requireSession, rolesForProperty, tokenHash, verifyRequestOrigin } from "./session";
import { usernameFor } from "./identity";
import { BUILT_IN_ROLES, RoleCode } from "./roles";

export async function currentSession(request: Request) {
  try {
    const { user } = await requireSession(request);
    const properties = await accessibleProperties(user);
    const requested = new URL(request.url).searchParams.get("propertyId");
    const activeProperty = (requested ? properties.find((property) => property.id === requested) : properties[0]) || null;
    if (requested && !activeProperty) return NextResponse.json({ error: "Property access denied." }, { status: 403 });
    const roles = activeProperty ? rolesForProperty(user, activeProperty.id, activeProperty.organizationId) : [];
    const activeRole = roles.includes("ORG_OWNER") ? "ORG_OWNER" : roles[0] || "UNASSIGNED";
    const ownerOrgs = ownerOrganizationIds(user);
    const staff = ownerOrgs.length ? await prisma.user.findMany({ where: { memberships: { some: { organizationId: { in: ownerOrgs }, status: "ACTIVE" } } }, select: { id: true, name: true, email: true, memberships: { where: { organizationId: { in: ownerOrgs } }, include: { propertyGrants: { include: { role: true, property: true } } } } } }) : [];
    return NextResponse.json({ initialized: true, user: { id: user.id, name: user.name, email: user.email, username: usernameFor(user.email), activeRole, roleName: BUILT_IN_ROLES[activeRole as RoleCode]?.name || "Unassigned" }, activeProperty, availableProperties: properties, allProperties: properties, allUsers: staff.map((staffUser) => ({ id: staffUser.id, name: staffUser.name, email: staffUser.email, username: usernameFor(staffUser.email), role: staffUser.memberships[0]?.propertyGrants[0]?.role.code || "UNASSIGNED", roleName: staffUser.memberships[0]?.propertyGrants[0]?.role.name || "Unassigned", propertyScope: staffUser.memberships.flatMap((membership) => membership.propertyGrants.map((grant) => grant.property.displayName)).join(", ") })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return accessFailure(error); }
}
export async function endSession(request: Request) {
  try {
    verifyRequestOrigin(request);
    const token = readSessionToken(request);
    if (token) await prisma.userSession.updateMany({ where: { tokenHash: tokenHash(token), revokedAt: null }, data: { revokedAt: new Date() } });
    return clearSessionCookie(NextResponse.json({ success: true }));
  } catch (error) { return accessFailure(error); }
}
