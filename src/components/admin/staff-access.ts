import { hasPermission, PERMISSIONS as P, type RoleCode } from "@/lib/auth/roles";

export interface StaffGrant {
  id: string; propertyId: string; propertyCode?: string; propertyName?: string;
  roleId: string; roleCode?: string; roleName?: string;
}
export interface StaffUser {
  id: string; name: string; username: string; email: string; rawEmail?: string; phone?: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED"; lastLoginAt?: string | null; createdAt: string;
  role: string; roleName: string; propertyScope: string; grants: StaffGrant[];
  hasPassword?: boolean; hasPin?: boolean;
}
export interface SystemRole { id: string; code: string; name: string; description?: string | null; scopeType?: string }
export interface SystemProperty { id: string; code: string; displayName: string; legalName: string }
export type EditorSection = "profile" | "login" | "access";
export interface StaffDraft {
  name: string; username: string; phone: string; roleId: string;
  allHotels: boolean; propertyIds: string[]; password: string; confirmPassword: string; pin: string;
}
export const emptyDraft = (): StaffDraft => ({ name: "", username: "", phone: "", roleId: "", allHotels: false, propertyIds: [], password: "", confirmPassword: "", pin: "" });
export const isOwner = (user: StaffUser) => user.role === "ORG_OWNER" || user.grants.some(grant => grant.roleCode === "ORG_OWNER");
export const needsLogin = (user: StaffUser) => user.hasPassword === false && user.hasPin === false;
export function draftFor(user: StaffUser, properties: SystemProperty[]): StaffDraft {
  const roleIds = [...new Set(user.grants.map(grant => grant.roleId))];
  return { ...emptyDraft(), name: user.name, username: user.username, phone: user.phone || "", roleId: isOwner(user) ? user.grants.find(grant => grant.roleCode === "ORG_OWNER")?.roleId || roleIds[0] || "" : roleIds.length === 1 ? roleIds[0] : "", allHotels: isOwner(user) || properties.length > 0 && properties.every(property => user.grants.some(grant => grant.propertyId === property.id)), propertyIds: user.grants.map(grant => grant.propertyId) };
}
const sameIds = (a: string[], b: string[]) => [...a].sort().join("|") === [...b].sort().join("|");
export function accessChanged(draft: StaffDraft, initial: StaffDraft) {
  return draft.roleId !== initial.roleId || draft.allHotels !== initial.allHotels || !sameIds(draft.propertyIds, initial.propertyIds);
}
export function validateStaffDraft(draft: StaffDraft, initial: StaffDraft, user: StaffUser | null, roles: SystemRole[], reserved: string[]) {
  const fail = (field: keyof StaffDraft, section: EditorSection, message: string) => ({ field, section, message });
  if (!draft.name.trim()) return fail("name", "profile", "Enter the staff member’s full name.");
  const usernameChanged = !user || draft.username.trim() !== initial.username;
  if (!draft.username.trim() || usernameChanged && !/^[a-z0-9_.-]+$/.test(draft.username.trim())) return fail("username", "profile", "Use lowercase letters, numbers, periods, underscores or hyphens.");
  if (usernameChanged && reserved.includes(draft.username.trim())) return fail("username", "profile", "This username is reserved for an existing login. Choose a different username.");
  if (draft.password.trim() && draft.password.trim().length < 12) return fail("password", "login", "Use a password with at least 12 characters.");
  if (draft.password.trim() !== draft.confirmPassword.trim()) return fail("confirmPassword", "login", "The passwords do not match.");
  if (draft.pin && !/^\d{6,12}$/.test(draft.pin)) return fail("pin", "login", "Use a PIN with 6 to 12 digits.");
  if ((!user || needsLogin(user)) && !draft.password.trim() && !draft.pin) return fail("password", "login", "Set a password or PIN so this staff member can sign in.");
  if ((!user || accessChanged(draft, initial)) && !roles.some(role => role.id === draft.roleId)) return fail("roleId", "access", "Choose a role for this hotel assignment.");
  if (!draft.allHotels && draft.propertyIds.length === 0) return fail("propertyIds", "access", "Select at least one hotel.");
  return null;
}
export function buildStaffPayload(draft: StaffDraft, initial: StaffDraft, user: StaffUser | null) {
  const payload: Record<string, unknown> = { name: draft.name.trim(), phone: draft.phone.trim() };
  // A routine profile/password edit must not replace an email login or flatten per-hotel roles.
  if (!user || draft.username.trim() !== initial.username) payload.username = draft.username.trim();
  if (!user || accessChanged(draft, initial)) {
    if (draft.roleId) payload.roleId = draft.roleId;
    payload.allProperties = draft.allHotels;
    payload.propertyIds = draft.propertyIds;
  }
  if (draft.password.trim()) payload.password = draft.password.trim();
  if (draft.pin) payload.pin = draft.pin;
  return payload;
}
export const CAPABILITY_GROUPS = [
  { title: "Front desk", items: [[P.RESERVATION_CREATE, "Create reservations"], [P.RESERVATION_MANAGE, "Manage reservations"], [P.CHECKIN_CHECKOUT, "Check guests in and out"], [P.ROOM_MOVE_EXTEND, "Move rooms and extend stays"]] },
  { title: "Billing & payments", items: [[P.FOLIO_VIEW, "View guest folios"], [P.FOLIO_CHARGE_POST, "Post charges"], [P.PAYMENT_COLLECT, "Collect payments"], [P.PAYMENT_REFUND, "Issue refunds"], [P.DISCOUNT_OVERRIDE, "Approve discounts"]] },
  { title: "Hotel operations", items: [[P.HK_TASK_EXECUTE, "Update cleaning tasks"], [P.HK_INSPECT, "Inspect cleaned rooms"], [P.MAINT_EXECUTE, "Update maintenance work"], [P.POS_ORDER_CREATE, "Take dining orders"], [P.KDS_STATUS_UPDATE, "Update kitchen tickets"]] },
  { title: "Reports & administration", items: [[P.REPORT_OPS_VIEW, "View operations reports"], [P.REPORT_FINANCE_VIEW, "View financial reports"], [P.REPORT_EXPORT, "Export reports"], [P.NIGHT_AUDIT_CLOSE, "Close the business day"], [P.PROPERTY_CONFIG, "Configure hotel settings"], [P.USER_MANAGE, "Manage staff and roles"]] },
] as const;
export function roleAllows(code: string, permission: string) {
  // Staff administration has an additional owner-only API policy.
  if (permission === P.USER_MANAGE) return code === "ORG_OWNER";
  return hasPermission(code as RoleCode, permission);
}
export function roleHighlights(code: string) {
  const entries = [[P.CHECKIN_CHECKOUT, "Front desk"], [P.PAYMENT_COLLECT, "Payments"], [P.PAYMENT_REFUND, "Refunds"], [P.HK_TASK_EXECUTE, "Housekeeping"], [P.MAINT_EXECUTE, "Maintenance"], [P.POS_ORDER_CREATE, "Dining"], [P.KDS_STATUS_UPDATE, "Kitchen"], [P.REPORT_FINANCE_VIEW, "Finance reports"], [P.REPORT_OPS_VIEW, "Operations reports"]];
  return entries.filter(([permission]) => roleAllows(code, permission)).map(([, label]) => label);
}
export function roleSummary(role: SystemRole) {
  const summaries: Record<string, string> = {
    ORG_OWNER: "Manage the team, settings and operations across every hotel in the organization.",
    ADMIN_GM: "Manage hotel operations, settings and finance. Staff administration stays with the organization owner.",
    FD_MGR: "Manage front desk operations, including refunds, overrides and closing the business day.",
    FD_AGENT: "Create reservations, check guests in and out, and collect payments. Refunds require additional permission.",
    HK_SUP: "Assign cleaning work, update room states and inspect completed tasks.",
    HK_ATT: "Update cleaning tasks and maintenance work without access to guest billing.",
    FNB_MGR: "Manage dining orders, menu operations and kitchen tickets, with payment and discount permissions.",
    WAITER: "Take dining orders, send kitchen tickets, post charges and collect payments.",
    KITCHEN: "View kitchen tickets and update their preparation status.",
    MAINT_SUP: "Manage maintenance issues, assign work and control room blocks.",
    TECH: "Update maintenance work without approving room blocks or inspecting completed repairs.",
    ACCT: "Review folios and reports, issue credit notes, refund payments and export reports.",
    VIEWER: "Read operations and financial reports without making changes.",
    SUPPORT: "No operational permissions are enabled for this role by default.",
  };
  return summaries[role.code] || role.description || "Access is limited to the hotels assigned to this staff member.";
}
