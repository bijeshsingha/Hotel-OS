import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { buildStaffPayload, draftFor, needsLogin, roleAllows, validateStaffDraft, type StaffUser } from "../src/components/admin/staff-access";
import { PERMISSIONS as P } from "../src/lib/auth/roles";

const properties = [{ id: "p1", code: "A", displayName: "Hotel A", legalName: "Hotel A" }, { id: "p2", code: "B", displayName: "Hotel B", legalName: "Hotel B" }];
const roles = [{ id: "agent", code: "FD_AGENT", name: "Front Desk Agent" }];
const member: StaffUser = { id: "staff", name: "Synthetic Staff", username: "staff.member", email: "staff.member@example.invalid", rawEmail: "staff.member@example.invalid", status: "ACTIVE", createdAt: "2026-10-23", role: "FD_AGENT", roleName: "Front Desk Agent", propertyScope: "Hotel A", grants: [{ id: "g1", propertyId: "p1", roleId: "agent", roleCode: "FD_AGENT" }], hasPassword: true, hasPin: true };

test("profile edits keep email-based sign-in and hotel roles unchanged", () => {
  const initial = draftFor(member, properties);
  const payload = buildStaffPayload({ ...initial, name: "Updated Name", phone: "9000000000" }, initial, member);
  assert.deepEqual(payload, { name: "Updated Name", phone: "9000000000" });
});
test("password changes do not silently rename or reassign the staff account", () => {
  const initial = draftFor(member, properties);
  const secret = randomUUID();
  const payload = buildStaffPayload({ ...initial, password: secret, confirmPassword: secret }, initial, member);
  assert.equal(payload.password, secret);
  for (const field of ["username", "email", "roleId", "propertyIds", "allProperties", "pin"]) assert.equal(Object.hasOwn(payload, field), false);
});
test("profile edits preserve different roles at different hotels", () => {
  const mixed = { ...member, grants: [...member.grants, { id: "g2", propertyId: "p2", roleId: "housekeeping", roleCode: "HK_ATT" }] };
  const initial = draftFor(mixed, properties);
  assert.equal(initial.roleId, "");
  const changed = { ...initial, phone: "1234567890" };
  assert.equal(validateStaffDraft(changed, initial, mixed, roles, []), null);
  assert.equal(Object.hasOwn(buildStaffPayload(changed, initial, mixed), "roleId"), false);
});
test("changing a mixed-role hotel assignment requires an explicit replacement role", () => {
  const mixed = { ...member, grants: [...member.grants, { id: "g2", propertyId: "p2", roleId: "housekeeping", roleCode: "HK_ATT" }] };
  const initial = draftFor(mixed, properties);
  const changed = { ...initial, allHotels: false, propertyIds: ["p1"] };
  assert.equal(validateStaffDraft(changed, initial, mixed, roles, [])?.field, "roleId");
});
test("reserved aliases are blocked for new usernames without blocking an unchanged login", () => {
  const initial = draftFor(member, properties);
  assert.equal(validateStaffDraft({ ...initial, username: "frontdesk" }, initial, member, roles, ["frontdesk"])?.field, "username");
  const existing = { ...member, username: "frontdesk" };
  const preserved = draftFor(existing, properties);
  assert.equal(validateStaffDraft(preserved, preserved, existing, roles, ["frontdesk"]), null);
});
test("password and PIN instructions match the API credential contract", () => {
  const initial = draftFor(member, properties);
  assert.equal(validateStaffDraft({ ...initial, pin: "1234" }, initial, member, roles, [])?.field, "pin");
  assert.equal(validateStaffDraft({ ...initial, pin: "483920675184" }, initial, member, roles, []), null);
  assert.equal(validateStaffDraft({ ...initial, password: "short", confirmPassword: "short" }, initial, member, roles, [])?.field, "password");
  assert.equal(validateStaffDraft({ ...initial, password: randomUUID() }, initial, member, roles, [])?.field, "confirmPassword");
});
test("accounts without credentials are directed to login setup before saving", () => {
  const missing = { ...member, hasPassword: false, hasPin: false };
  const initial = draftFor(missing, properties);
  assert.equal(needsLogin(missing), true);
  assert.equal(validateStaffDraft(initial, initial, missing, roles, [])?.section, "login");
  assert.equal(needsLogin({ ...member, hasPassword: undefined, hasPin: undefined }), false);
});
test("role guide does not claim financial writes for viewers or staff management for managers", () => {
  assert.equal(roleAllows("VIEWER", P.REPORT_FINANCE_VIEW), true);
  assert.equal(roleAllows("VIEWER", P.PAYMENT_COLLECT), false);
  assert.equal(roleAllows("FD_AGENT", P.PAYMENT_REFUND), false);
  assert.equal(roleAllows("ADMIN_GM", P.USER_MANAGE), false);
  assert.equal(roleAllows("ORG_OWNER", P.USER_MANAGE), true);
  assert.equal(roleAllows("ACCT", P.PAYMENT_COLLECT), false);
});
