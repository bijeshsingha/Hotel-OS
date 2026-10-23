import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS as P } from "./roles";
import { AccessError, SessionUser, accessFailure, accessibleProperties, mayPerform, ownerOrganizationIds, requireSession, rolesForProperty, verifyRequestOrigin } from "./session";

type Property = Awaited<ReturnType<typeof accessibleProperties>>[number];
export interface ApiAccess { user: SessionUser; property: Property; properties: Property[]; roles: string[]; request: Request }
const contexts = new WeakMap<Request, ApiAccess>();
export function getApiAccess(request: Request): ApiAccess {
  const context = contexts.get(request);
  if (!context) throw new AccessError(401, "Please sign in to continue.");
  return context;
}

function policy(path: string, method: string, body: Record<string, unknown>, query: URLSearchParams) {
  const read = method === "GET";
  if (path.startsWith("/api/v1/admin/backups")) return { databaseOwner: true, permissions: [P.ORG_MANAGE] };
  if (path.startsWith("/api/v1/admin/users") || path === "/api/v1/onboarding") return { owner: true, permissions: [P.USER_MANAGE] };
  if (path.startsWith("/api/v1/admin") || path.startsWith("/api/v1/properties")) return { permissions: [P.PROPERTY_CONFIG] };
  if (path.startsWith("/api/v1/audit-logs")) return { permissions: [P.AUDIT_LOG_VIEW] };
  if (path.startsWith("/api/v1/housekeeping")) return { permissions: [read ? P.HK_TASK_EXECUTE : method === "POST" ? P.HK_TASK_ASSIGN : body.status === "INSPECTED_PASSED" || body.status === "FAILED_INSPECTION" ? P.HK_INSPECT : P.HK_TASK_EXECUTE] };
  if (path.startsWith("/api/v1/maintenance")) return {
    permissions: [read || method === "PATCH" ? P.MAINT_EXECUTE : P.MAINT_MANAGE],
    allPermissions: [
      ...(method === "PATCH" && ["TRIAGED", "ASSIGNED", "VERIFIED", "CLOSED", "REOPENED", "CANCELLED"].includes(String(body.status || "").toUpperCase()) ? [P.MAINT_MANAGE] : []),
      ...(body.blockRoom !== undefined ? [P.ROOM_BLOCK] : []),
    ],
  };
  if (path.startsWith("/api/v1/rooms")) return { permissions: [P.ROOM_STATE_MANAGE, ...(read ? [P.GUEST_PII_VIEW] : [])] };
  if (path.startsWith("/api/v1/guests")) return { permissions: [P.GUEST_PII_VIEW] };
  if (path.startsWith("/api/v1/registrations")) return { permissions: [P.CHECKIN_CHECKOUT] };
  if (path.startsWith("/api/v1/availability")) return { permissions: [P.RESERVATION_CREATE] };
  if (path.startsWith("/api/v1/reservations")) return { permissions: [read ? P.GUEST_PII_VIEW : method === "POST" ? P.RESERVATION_CREATE : P.RESERVATION_MANAGE] };
  if (path.startsWith("/api/v1/stays")) return { permissions: [read ? P.GUEST_PII_VIEW : /move|grace-period|add-room/.test(path) ? P.ROOM_MOVE_EXTEND : /transfer-balance/.test(path) ? P.FOLIO_ADJUST : P.CHECKIN_CHECKOUT] };
  if (path.startsWith("/api/v1/folios")) {
    // Correcting or deleting a recorded receipt is restricted to the master administrator.
    // Owner scope is verified against the folio's organization later in this guard.
    if (/^\/api\/v1\/folios\/[^/]+\/payments\/?$/.test(path) && ["PUT", "DELETE"].includes(method)) {
      return { owner: true, permissions: [P.FOLIO_ADJUST] };
    }
    const refund = body.isRefund === true || Number(body.amount) < 0 || /REFUND|PAYOUT/i.test(String(body.method || ""));
    return { permissions: [read ? P.FOLIO_VIEW : path.includes("/payments") ? refund ? P.PAYMENT_REFUND : method === "POST" ? P.PAYMENT_COLLECT : P.FOLIO_ADJUST : method === "DELETE" || body.type === "DISCOUNT" ? P.FOLIO_ADJUST : P.FOLIO_CHARGE_POST] };
  }
  if (path.startsWith("/api/v1/billing")) return { permissions: [read ? P.FOLIO_VIEW : P.PAYMENT_COLLECT] };
  if (path.startsWith("/api/v1/night-audit")) return { permissions: [read ? P.REPORT_OPS_VIEW : P.NIGHT_AUDIT_CLOSE] };
  if (path.startsWith("/api/v1/reports")) return {
    permissions: [P.REPORT_FINANCE_VIEW],
    allPermissions: !read || /\/export(?:-|\/|$)/.test(path) || ["csv", "xlsx", "excel"].includes((query.get("format") || "").toLowerCase()) ? [P.REPORT_EXPORT] : [],
  };
  if (path.startsWith("/api/v1/expenses") || path.startsWith("/api/v1/income")) return { permissions: [read ? P.REPORT_FINANCE_VIEW : P.PAYMENT_COLLECT] };
  if (path.startsWith("/api/v1/companies") || path.startsWith("/api/v1/b2b") || path.startsWith("/api/v1/events")) return { permissions: [P.RESERVATION_MANAGE] };
  if (path.startsWith("/api/v1/pos/kots") || path.startsWith("/api/v1/kots")) return { permissions: read ? [P.KDS_STATUS_UPDATE, P.POS_MANAGE, P.POS_ORDER_CREATE] : method === "PATCH" ? [P.KDS_STATUS_UPDATE, P.POS_MANAGE] : [P.POS_ORDER_CREATE] };
  if (path.startsWith("/api/v1/pos") || path.startsWith("/api/v1/guest")) return { permissions: [P.POS_MANAGE, P.POS_ORDER_CREATE] };
  if (path === "/api/v1/dashboard") return { permissions: [P.REPORT_OPS_VIEW] };
  if (path.startsWith("/api/v1/network") || path.startsWith("/api/v1/sync")) return { owner: true, permissions: [P.ORG_MANAGE] };
  throw new AccessError(403, "This endpoint has no access policy.");
}

type RecordData = Record<string, unknown>;
type ModelDelegate = { findUnique(args: { where: { id: string } }): Promise<RecordData | null> };
const models = prisma as unknown as Record<string, ModelDelegate>;
const referenceModels: Record<string, string> = {
  roomId: "room", roomIds: "room", targetRoomId: "room", assignedRoomId: "room",
  stayId: "stay", targetStayId: "stay", sourceStayId: "stay", stayIds: "stay",
  folioId: "folio", targetFolioId: "folio", sourceFolioId: "folio", folioWindowId: "folioWindow",
  paymentId: "payment", depositId: "deposit", chargeId: "folioEntry", registrationId: "guestRegistration",
  orderId: "order", kotId: "kOT", outletId: "outlet", taskId: "housekeepingTask", issueId: "maintenanceIssue",
  roomTypeId: "roomType", ratePlanId: "ratePlan", guestId: "guest", companyId: "companyMaster",
  menuItemId: "menuItem", variantId: "menuItemVariant", stationId: "kitchenStation",
};
async function lookupScope(model: string, id: string, depth = 0): Promise<RecordData> {
  if (depth > 5 || !models[model]) throw new AccessError(400, "Invalid record reference.");
  const record = await models[model].findUnique({ where: { id } });
  if (!record) throw new AccessError(404, "Record not found.");
  if (record.propertyId || record.organizationId) return record;
  for (const key of ["folioId", "orderId", "menuItemId", "outletId", "stayId", "paymentId", "roomId"]) {
    if (typeof record[key] === "string" && referenceModels[key]) return lookupScope(referenceModels[key], record[key] as string, depth + 1);
  }
  if (typeof record.categoryId === "string") return lookupScope("menuCategory", record.categoryId, depth + 1);
  throw new AccessError(403, "Record scope cannot be verified.");
}
function rootModel(path: string): { model: string; id: string } | null {
  const patterns: Array<[RegExp, string]> = [
    [/^\/api\/v1\/stays\/([^/]+)(?:\/|$)/, "stay"], [/^\/api\/v1\/folios\/([^/]+)(?:\/|$)/, "folio"],
    [/^\/api\/v1\/rooms\/([^/]+)\/state$/, "room"], [/^\/api\/v1\/registrations\/([^/]+)\/fulfill$/, "guestRegistration"],
    [/^\/api\/v1\/pos\/orders\/([^/]+)(?:\/|$)/, "order"], [/^\/api\/v1\/guest\/orders\/([^/]+)$/, "order"],
    [/^\/api\/v1\/pos\/kots\/([^/]+)$/, "kOT"], [/^\/api\/v1\/pos\/outlets\/([^/]+)\/orders$/, "outlet"],
    [/^\/api\/v1\/properties\/([^/]+)\/config$/, "property"], [/^\/api\/v1\/expenses\/([^/]+)$/, "expense"],
  ];
  for (const [pattern, model] of patterns) {
    const match = path.match(pattern);
    if (match && !["check-in", "add-room"].includes(match[1])) return { model, id: decodeURIComponent(match[1]) };
  }
  return null;
}
function collectReferences(value: unknown, refs: Array<{ model: string; id: string }>, depth = 0) {
  if (depth > 8) throw new AccessError(400, "Request nesting limit exceeded.");
  if (Array.isArray(value)) { for (const item of value) collectReferences(item, refs, depth + 1); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (referenceModels[key]) {
      for (const id of Array.isArray(item) ? item : [item]) if (typeof id === "string" && id) refs.push({ model: referenceModels[key], id });
    } else if (typeof item === "object") collectReferences(item, refs, depth + 1);
  }
}

/** Each handler invokes this guard before it reads or writes operational data. */
export async function authorizeRequest(original: Request): Promise<ApiAccess | Response> {
  try {
    verifyRequestOrigin(original);
    const session = await requireSession(original);
    const properties = await accessibleProperties(session.user);
    const url = new URL(original.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const isJson = original.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";
    if (original.body && !isJson && path !== "/api/v1/admin/backups/upload") throw new AccessError(415, "Use application/json for this request.");
    let body: Record<string, unknown>;
    try { body = isJson ? await original.clone().json() : {}; }
    catch { throw new AccessError(400, "Invalid JSON body."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AccessError(400, "Invalid request body.");
    const rule = { ...policy(path, original.method, body, url.searchParams), databaseOwner: path.startsWith("/api/v1/admin/backups") || (path === "/api/v1/admin/grc" && url.searchParams.get("archived") === "true") };
    const owners = ownerOrganizationIds(session.user);
    if (rule.owner && !owners.length) throw new AccessError(403, "Organization owner access is required.");
    if (rule.databaseOwner) {
      const organizations = await prisma.organization.findMany({ select: { id: true } });
      if (!organizations.length || organizations.some((organization) => !owners.includes(organization.id))) throw new AccessError(403, "Database recovery requires ownership of every organization in this database.");
    }
    const references: Array<{ model: string; id: string }> = [];
    const root = rootModel(path);
    if (root) references.push(root);
    const chargeMatch = path.match(/^\/api\/v1\/folios\/[^/]+\/charges\/([^/]+)$/);
    if (chargeMatch) references.push({ model: "folioEntry", id: decodeURIComponent(chargeMatch[1]) });
    collectReferences(body, references);
    collectReferences(Object.fromEntries(url.searchParams), references);
    const genericModel = path === "/api/v1/reservations" ? "reservation" : path === "/api/v1/registrations" || path === "/api/v1/admin/grc" ? "guestRegistration" : path === "/api/v1/admin/rooms" ? "room" : path === "/api/v1/companies" ? "companyMaster" : null;
    const genericId = body.id || url.searchParams.get("id");
    if (genericModel && typeof genericId === "string") references.push({ model: genericModel, id: genericId });
    if (references.length > 200) throw new AccessError(400, "Too many record references.");
    const scopes: RecordData[] = [];
    for (const ref of references) scopes.push(await lookupScope(ref.model, ref.id));
    const identifiers = [body.propertyId, url.searchParams.get("propertyId"), url.searchParams.get("property"), url.searchParams.get("propertyCode"), url.searchParams.get("code")].filter((value): value is string => typeof value === "string" && !!value);
    let property = properties.find((property) => identifiers[0] ? property.id === identifiers[0] || property.code.toLowerCase() === identifiers[0].toLowerCase() : property.id === (root?.model === "property" ? root.id : scopes.find((scope) => scope.propertyId)?.propertyId)) || (!identifiers.length && !scopes.some((scope) => scope.propertyId) && root?.model !== "property" ? properties[0] : undefined);
    if (!property || identifiers.some((identifier) => identifier !== property.id && identifier.toLowerCase() !== property.code.toLowerCase())) throw new AccessError(403, "Property access denied.");
    if (root?.model === "property" && root.id !== property.id) throw new AccessError(403, "Property access denied.");
    if (rule.owner && !owners.includes(property.organizationId)) throw new AccessError(403, "Organization owner access is required.");
    for (const scope of scopes) if ((scope.propertyId && scope.propertyId !== property.id) || (scope.organizationId && scope.organizationId !== property.organizationId)) throw new AccessError(403, "Record access denied.");
    if (typeof body.organizationId === "string" && body.organizationId !== property.organizationId) throw new AccessError(403, "Organization access denied.");
    if (Array.isArray(body.propertyIds) && body.propertyIds.some((id) => !properties.some((candidate) => candidate.id === id && candidate.organizationId === property.organizationId))) throw new AccessError(403, "Property assignment denied.");
    const userMatch = path.match(/^\/api\/v1\/admin\/users\/([^/]+)$/);
    if (userMatch) {
      const memberships = await prisma.membership.findMany({ where: { userId: decodeURIComponent(userMatch[1]) }, select: { organizationId: true } });
      if (!memberships.length || memberships.some((membership) => !owners.includes(membership.organizationId))) throw new AccessError(404, "User not found.");
    }
    const allowed = await Promise.all(rule.permissions.map((permission) => mayPerform(session.user, property.id, property.organizationId, permission)));
    if (!allowed.some(Boolean)) throw new AccessError(403, "You do not have permission to perform this action.");
    const requiredPermissions = await Promise.all((rule.allPermissions || []).map((permission) => mayPerform(session.user, property.id, property.organizationId, permission)));
    if (!requiredPermissions.every(Boolean)) throw new AccessError(403, "Additional approval permission is required.");
    const grace = url.searchParams.get("graceMinutes") ?? body.gracePeriodMinutes ?? body.graceMinutes;
    if (grace !== undefined && grace !== null && !await mayPerform(session.user, property.id, property.organizationId, Number(grace) >= 1440 ? P.DISCOUNT_OVERRIDE : P.ROOM_MOVE_EXTEND)) throw new AccessError(403, "You do not have permission to change this stay's grace period.");
    if (!['GET', 'HEAD'].includes(original.method) && path.startsWith("/api/v1/folios") && !path.includes("/payments") && (body.type === "DISCOUNT" || /DISCOUNT/.test(String(body.chargeCode || "")) || Number(body.amount) < 0) && !await mayPerform(session.user,property.id,property.organizationId,P.DISCOUNT_OVERRIDE)) throw new AccessError(403, "Discount approval is required.");
    const roles = rolesForProperty(session.user, property.id, property.organizationId);
    if (roles.includes("HK_ATT") && typeof body.taskId === "string") {
      const task = await prisma.housekeepingTask.findUnique({ where: { id: body.taskId } });
      if (task?.assigneeId !== session.user.id) throw new AccessError(403, "This task is not assigned to you.");
    }
    if (root?.model === "folio" && typeof (body.paymentId || url.searchParams.get("paymentId")) === "string") {
      const payment = await prisma.payment.findUnique({ where: { id: String(body.paymentId || url.searchParams.get("paymentId")) } });
      if (payment?.folioId !== root.id) throw new AccessError(403, "Payment does not belong to this folio.");
    }
    if (root?.model === "folio" && chargeMatch) {
      const entry = await prisma.folioEntry.findUnique({ where: { id: decodeURIComponent(chargeMatch[1]) } });
      if (entry?.folioId !== root.id) throw new AccessError(403, "Charge does not belong to this folio.");
    }
    if (path.startsWith("/api/v1/maintenance") && typeof body.issueId === "string" && !await mayPerform(session.user, property.id, property.organizationId, P.MAINT_MANAGE)) {
      const issue = await prisma.maintenanceIssue.findUnique({ where: { id: body.issueId } });
      if (issue?.assigneeId !== session.user.id) throw new AccessError(403, "This issue is not assigned to you.");
    }
    url.searchParams.set("propertyId", property.id);
    url.searchParams.set("organizationId", property.organizationId);
    for (const key of ["property", "propertyCode", "code"]) if (url.searchParams.has(key)) url.searchParams.set(key, property.id);
    const headers = new Headers(original.headers);
    let request: Request;
    if (isJson) {
      body.propertyId = property.id;
      body.organizationId = property.organizationId;
      body.actorId = session.user.id;
      body.actorName = session.user.name;
      body.createdById = session.user.id;
      body.createdByName = session.user.name;
      body.waiterName = session.user.name;
      headers.delete("content-length");
      request = new Request(url, { method: original.method, headers, body: JSON.stringify(body) });
    } else request = new Request(url, original);
    const context = { user: session.user, property, properties, roles, request };
    contexts.set(request, context);
    return context;
  } catch (error) { return accessFailure(error); }
}
