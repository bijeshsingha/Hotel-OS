"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ChevronRight, CircleHelp, Eye, EyeOff, KeyRound, LockKeyhole, Plus, RefreshCw, Search, ShieldCheck, UserRound, Users, X } from "lucide-react";
import { useHotel } from "@/lib/context/hotel-context";
import { authRequest } from "@/lib/auth/client-request";
import { buildStaffPayload, CAPABILITY_GROUPS, draftFor, emptyDraft, isOwner, needsLogin, roleAllows, roleHighlights, roleSummary, validateStaffDraft, type EditorSection, type StaffDraft, type StaffUser, type SystemProperty, type SystemRole } from "./staff-access";
import styles from "./staff-management.module.css";

export type { StaffGrant, StaffUser, SystemRole, SystemProperty } from "./staff-access";
interface Props { onNotify?: (text: string, type?: "success" | "error") => void }
type Notice = { text: string; type: "success" | "error" };
type Confirmation = { kind: "suspend" | "activate" | "remove"; user: StaffUser } | { kind: "discard" };
const sectionNames: Record<EditorSection, string> = { profile: "Profile", login: "Login details", access: "Role & hotels" };
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase(); }
function statusLabel(user: StaffUser) { return user.status === "ACTIVE" ? "Active" : user.status === "REVOKED" ? "Access removed" : "Suspended"; }
function lastSeen(value?: string | null) {
  if (!value) return "Hasn’t signed in yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Last sign-in unavailable" : `Last sign-in ${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function UserManagementTab({ onNotify }: Props) {
  const { refreshData, activeProperty, user: signedInUser } = useHotel();
  const prefix = useId();
  const id = (name: string) => `${prefix}-${name}`;
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [properties, setProperties] = useState<SystemProperty[]>([]);
  const [reserved, setReserved] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [view, setView] = useState<"members" | "roles">("members");
  const [query, setQuery] = useState("");
  const [hotelFilter, setHotelFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [guideRole, setGuideRole] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [section, setSection] = useState<EditorSection>("profile");
  const [draft, setDraft] = useState<StaffDraft>(emptyDraft);
  const [initial, setInitial] = useState<StaffDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ReturnType<typeof validateStaffDraft>>(null);
  const [saveError, setSaveError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [dialogError, setDialogError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const loadSequence = useRef(0);
  const dirty = editorOpen && JSON.stringify(draft) !== JSON.stringify(initial);
  const editingOwner = editing ? isOwner(editing) : false;
  const emailLogin = Boolean(editing?.rawEmail && !editing.rawEmail.endsWith("@hotelos.internal"));

  const notify = (text: string, type: "success" | "error" = "success") => {
    setNotice({ text, type }); onNotify?.(text, type);
  };
  const fetchUsers = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true); setLoadError("");
    try {
      const { response, data } = await authRequest("/api/v1/admin/users");
      if (!response.ok) throw new Error(data?.error || "We couldn’t load your staff. Please try again.");
      if (!Array.isArray(data.users) || !Array.isArray(data.roles) || !Array.isArray(data.properties)) throw new Error("We couldn’t load your staff. Please try again.");
      if (sequence !== loadSequence.current) return;
      setUsers(data.users); setRoles(data.roles); setProperties(data.properties);
      setReserved(Array.isArray(data.reservedUsernames) ? data.reservedUsernames : []);
      setGuideRole(current => current || data.roles.find((role: SystemRole) => role.code === "FD_AGENT")?.id || data.roles[0]?.id || "");
    } catch (failure) {
      if (sequence === loadSequence.current) setLoadError(failure instanceof Error ? failure.message : "Unable to load staff.");
    } finally { if (sequence === loadSequence.current) setLoading(false); }
  }, []);
  useEffect(() => { void fetchUsers(); return () => { loadSequence.current++; }; }, [fetchUsers]);
  useEffect(() => {
    if (editorOpen) headingRef.current?.focus();
  }, [editorOpen]);
  useEffect(() => {
    if (!error) return;
    document.getElementById(`${prefix}-${error.field}`)?.focus();
  }, [error, section, prefix]);
  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (confirmation && dialog && !dialog.open) { setDialogError(""); dialog.showModal(); }
    if (!confirmation && dialog?.open) dialog.close();
  }, [confirmation]);
  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView({ block: "nearest" });
  }, [notice]);

  const filtered = useMemo(() => users.filter(member => {
    const text = `${member.name} ${member.username} ${member.email} ${member.roleName} ${member.phone || ""}`.toLowerCase();
    const matchesStatus = statusFilter === "all" || (statusFilter === "login" ? member.status === "ACTIVE" && needsLogin(member) : member.status === statusFilter);
    return (!query.trim() || text.includes(query.trim().toLowerCase()))
      && (hotelFilter === "all" || isOwner(member) || member.grants.some(grant => grant.propertyId === hotelFilter))
      && (roleFilter === "all" || member.grants.some(grant => grant.roleId === roleFilter))
      && matchesStatus;
  }), [users, query, hotelFilter, roleFilter, statusFilter]);
  const activeCount = users.filter(member => member.status === "ACTIVE").length;
  const suspendedCount = users.filter(member => member.status === "SUSPENDED").length;
  const loginCount = users.filter(member => member.status === "ACTIVE" && needsLogin(member)).length;
  const hasFilters = Boolean(query || hotelFilter !== "all" || roleFilter !== "all" || statusFilter !== "all");
  const selectedRole = roles.find(role => role.id === (editorOpen ? draft.roleId : guideRole));
  const selectedHotels = draft.allHotels ? properties : properties.filter(property => draft.propertyIds.includes(property.id));
  const fields = (field: keyof StaffDraft) => ({ id: id(field), "aria-invalid": error?.field === field || undefined, "aria-describedby": [(["username", "password", "pin", "roleId"].includes(field) ? id(`${field}-help`) : ""), error?.field === field ? id("form-error") : ""].filter(Boolean).join(" ") || undefined });
  const update = <K extends keyof StaffDraft>(field: K, value: StaffDraft[K]) => { setDraft(current => ({ ...current, [field]: value })); setError(null); setSaveError(""); };
  const restoreTrigger = () => requestAnimationFrame(() => { const target = triggerRef.current?.id ? document.getElementById(triggerRef.current.id) : null; (target || document.getElementById(id("add-staff")))?.focus(); });
  const closeEditor = () => { setEditorOpen(false); setEditing(null); setDraft(emptyDraft()); setInitial(emptyDraft()); setError(null); setSaveError(""); restoreTrigger(); };
  const requestClose = () => { if (submitting) return; if (dirty) setConfirmation({ kind: "discard" }); else closeEditor(); };
  const openEditor = (member: StaffUser | null, target: EditorSection = "profile") => {
    triggerRef.current = document.activeElement as HTMLElement;
    const value = member ? draftFor(member, properties) : { ...emptyDraft(), roleId: roles.find(role => role.code === "FD_AGENT")?.id || roles[0]?.id || "", propertyIds: activeProperty && properties.some(property => property.id === activeProperty.id) ? [activeProperty.id] : properties[0] ? [properties[0].id] : [] };
    setEditing(member); setDraft(value); setInitial(value); setSection(target); setError(null); setSaveError(""); setShowPassword(false); setShowPin(false); setNotice(null); setEditorOpen(true);
  };
  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault(); if (submitting) return;
    const issue = validateStaffDraft(draft, initial, editing, roles, reserved);
    if (issue) { setError(issue); setSection(issue.section); return; }
    setSubmitting(true); setSaveError("");
    try {
      const { response, data } = await authRequest(editing ? `/api/v1/admin/users/${editing.id}` : "/api/v1/admin/users", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildStaffPayload(draft, initial, editing)) });
      if (!response.ok) throw new Error(data?.error || "We couldn’t save these changes. Please try again.");
      const selfEdit = editing?.id === signedInUser?.id;
      const message = editing ? `${draft.name.trim()}’s details have been updated.${selfEdit ? " Sign in again to continue." : " They’ll need to sign in again."}` : `${draft.name.trim()} has been added to your team.`;
      closeEditor(); notify(message); await fetchUsers();
      // Only changing the currently signed-in account requires refreshing its session.
      if (selfEdit) void refreshData();
    } catch (failure) { setSaveError(failure instanceof Error ? failure.message : "Unable to save staff."); }
    finally { setSubmitting(false); }
  };
  const confirmAction = async () => {
    if (!confirmation || submitting) return;
    if (confirmation.kind === "discard") { setConfirmation(null); closeEditor(); return; }
    setSubmitting(true); setDialogError("");
    const { user: member, kind } = confirmation;
    try {
      const { response, data } = await authRequest(`/api/v1/admin/users/${member.id}`, { method: kind === "remove" ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, ...(kind === "remove" ? {} : { body: JSON.stringify({ status: kind === "suspend" ? "SUSPENDED" : "ACTIVE" }) }) });
      if (!response.ok) throw new Error(data?.error || "We couldn’t update access. Please try again.");
      setConfirmation(null); closeEditor(); notify(`${member.name}’s access has been ${kind === "remove" ? "removed" : kind === "suspend" ? "suspended" : "restored"}.`); await fetchUsers();
    } catch (failure) { setDialogError(failure instanceof Error ? failure.message : "Unable to update access."); }
    finally { setSubmitting(false); }
  };
  const clearFilters = () => { setQuery(""); setHotelFilter("all"); setRoleFilter("all"); setStatusFilter("all"); };
  const handleTabKeys = (event: React.KeyboardEvent<HTMLButtonElement>, index: number, values: string[], select: (value: string) => void, group: string) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % values.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + values.length) % values.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = values.length - 1;
    else return;
    event.preventDefault(); select(values[next]); document.getElementById(id(`${group}-${values[next]}`))?.focus();
  };
  const permissions = (role: SystemRole) => <div className={styles.capabilityGroups}>{CAPABILITY_GROUPS.map(group => <section key={group.title} className={styles.capabilityGroup}><h4>{group.title}</h4><ul>{group.items.map(([permission, label]) => { const allowed = roleAllows(role.code, permission); return <li key={permission} className={allowed ? styles.allowed : styles.restricted}>{allowed ? <Check size={16} aria-hidden="true" /> : <span className={styles.dash} aria-hidden="true">—</span>}<span>{label}</span><span className={styles.srOnly}>{allowed ? ": Allowed" : ": Not included"}</span></li>; })}</ul></section>)}</div>;

  return <div className={styles.workspace}>
    <a className={styles.skipLink} href={`#${id("content")}`}>Skip to staff management</a>
    {notice && <div ref={noticeRef} className={`${styles.notice} ${notice.type === "error" ? styles.noticeError : ""}`} role={notice.type === "error" ? "alert" : "status"}>{notice.type === "success" ? <CheckCircle2 size={20} aria-hidden="true" /> : <CircleHelp size={20} aria-hidden="true" />}<span>{notice.text}</span><button className={(styles.iconButton) + " ui-control"} type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={17} /></button></div>}
    {editorOpen ? <>
      <button type="button" className={(styles.backLink) + " ui-control"} onClick={requestClose} disabled={submitting}><ArrowLeft size={17} aria-hidden="true" /> Back to staff</button>
      <header className={styles.editorHeader}><div className={styles.avatarLarge} aria-hidden="true">{editing ? initials(editing.name) : <UserRound size={25} />}</div><div><p className={styles.eyebrow}>{editing ? "Team member" : "Grow your team"}</p><h1 ref={headingRef} tabIndex={-1} className="ui-page-title">{editing ? editing.name : "Add a staff member"}</h1><p>{editing ? "Update their details, login and hotel access." : "Create a login and choose where they can work."}</p></div>{editingOwner && <span className={styles.ownerBadge}><ShieldCheck size={15} aria-hidden="true" /> Organization owner</span>}</header>
      <form id={id("staff-form")} onSubmit={saveUser} noValidate>
        <div className={styles.editorLayout}>
          <div className={styles.editorMain}>
            <div className={styles.editorTabs} role="tablist" aria-label="Staff settings">{(Object.keys(sectionNames) as EditorSection[]).map((value, index) => <button type="button" role="tab" id={id(`section-${value}`)} aria-selected={section === value} aria-controls={id(`section-panel-${value}`)} tabIndex={section === value ? 0 : -1} key={value} className={(section === value ? styles.editorTabActive : styles.editorTab) + " ui-control"} onClick={() => setSection(value)} onKeyDown={event => handleTabKeys(event, index, Object.keys(sectionNames), value => setSection(value as EditorSection), "section")}><span className={styles.step}>{index + 1}</span>{sectionNames[value]}</button>)}</div>
            <section className={styles.editorPanel} role="tabpanel" id={id(`section-panel-${section}`)} aria-labelledby={id(`section-${section}`)}>
              {(error || saveError) && <div id={id("form-error")} className={styles.inlineError} role="alert"><CircleHelp size={18} aria-hidden="true" /><span>{error?.message || saveError}</span></div>}
              {section === "profile" && <>
                <div className={styles.sectionIntro}><UserRound size={21} aria-hidden="true" /><div><h2 className="ui-section-title">Profile details</h2><p>The information you and your team will see.</p></div></div>
                <div className={styles.formFields}>
                  <div className={styles.fieldGroup}><label htmlFor={id("name")} className="ui-label">Full name <span className={styles.required}>Required</span></label><input className={(styles.field) + " ui-field"} {...fields("name")} value={draft.name} onChange={event => update("name", event.target.value)} autoComplete="name" maxLength={120} required placeholder="Staff member’s full name" disabled={submitting} aria-label="Full name" /></div>
                  <div className={styles.fieldGroup}><label htmlFor={id("username")} className="ui-label">Username <span className={styles.required}>Required</span></label><input className={(styles.field) + " ui-field"} {...fields("username")} value={draft.username} onChange={event => update("username", event.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))} autoComplete="off" spellCheck={false} autoCapitalize="none" maxLength={80} required readOnly={emailLogin} disabled={submitting} aria-label="Username" /><p id={id("username-help")} className={styles.fieldHelp}>{emailLogin ? "This account uses the email login shown below. Profile edits keep it unchanged." : "A unique name for signing in. Letters, numbers, periods, underscores and hyphens are allowed."}</p></div>
                  {editing?.email && <div className={styles.readOnlyField}><span>Email login</span><strong>{editing.email}</strong></div>}
                  <div className={styles.fieldGroup}><label htmlFor={id("phone")} className="ui-label">Phone number <span className={styles.optional}>Optional</span></label><input className={(styles.field) + " ui-field"} {...fields("phone")} value={draft.phone} onChange={event => update("phone", event.target.value)} type="tel" autoComplete="tel" maxLength={30} placeholder="Contact phone number" disabled={submitting} aria-label="Phone number" /></div>
                </div>
              </>}
              {section === "login" && <>
                <div className={styles.sectionIntro}><KeyRound size={21} aria-hidden="true" /><div><h2 className="ui-section-title">{editing ? "Update login details" : "Set up their login"}</h2><p>{editing ? "Leave a field empty to keep its current value." : "Set a password or PIN before this person can sign in."}</p></div></div>
                {editing && <div className={styles.credentialState}><span><span className={editing.hasPassword ? styles.stateGood : styles.stateNeutral} aria-hidden="true" />{editing.hasPassword === undefined ? "Password status unavailable" : editing.hasPassword ? "Password set" : "No password set"}</span><span><span className={editing.hasPin ? styles.stateGood : styles.stateNeutral} aria-hidden="true" />{editing.hasPin === undefined ? "PIN status unavailable" : editing.hasPin ? "PIN set" : "No PIN set"}</span></div>}
                <div className={styles.formFields}>
                  <div className={styles.fieldGroup}><label htmlFor={id("password")} className="ui-label">{editing ? "New password" : "Password"}</label><div className={styles.passwordField}><input className={(styles.field) + " ui-field"} {...fields("password")} value={draft.password} onChange={event => update("password", event.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" maxLength={1024} disabled={submitting} /><button type="button" className={(styles.reveal) + " ui-control"} onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p id={id("password-help")} className={styles.fieldHelp}>At least 12 characters. A longer phrase is easier to remember.</p></div>
                  <div className={styles.fieldGroup}><label htmlFor={id("confirmPassword")} className="ui-label">Confirm {editing ? "new " : ""}password</label><input className={(styles.field) + " ui-field"} {...fields("confirmPassword")} value={draft.confirmPassword} onChange={event => update("confirmPassword", event.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" maxLength={1024} disabled={submitting} aria-label="Confirm password" /></div>
                  <div className={styles.fieldGroup}><label htmlFor={id("pin")} className="ui-label">{editing ? "New quick PIN" : "Quick PIN"} <span className={styles.optional}>Optional</span></label><div className={styles.passwordField}><input className={(styles.field) + " ui-field"} {...fields("pin")} value={draft.pin} onChange={event => update("pin", event.target.value.replace(/\D/g, ""))} type={showPin ? "text" : "password"} inputMode="numeric" autoComplete="off" maxLength={12} disabled={submitting} /><button type="button" className={(styles.reveal) + " ui-control"} onClick={() => setShowPin(value => !value)} aria-label={showPin ? "Hide PIN" : "Show PIN"} aria-pressed={showPin}>{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p id={id("pin-help")} className={styles.fieldHelp}>Use 6 to 12 digits. Existing passwords and PINs cannot be viewed.</p></div>
                </div>
                <div className={styles.helpNote}><LockKeyhole size={18} aria-hidden="true" /><p>{editing ? "A staff member can sign in with either their password or PIN. Changing only one leaves the other working. Saving changes ends their current sessions." : "Share login details privately with the staff member. They can sign in using their username and either their password or PIN."}</p></div>
              </>}
              {section === "access" && <>
                <div className={styles.sectionIntro}><ShieldCheck size={21} aria-hidden="true" /><div><h2 className="ui-section-title">Role & hotel access</h2><p>Choose what this person can do and where they can work.</p></div></div>
                {editingOwner && <div className={styles.helpNote}><LockKeyhole size={18} aria-hidden="true" /><p>The organization owner keeps access to every hotel. This role and access cannot be restricted.</p></div>}
                <div className={styles.fieldGroup}><label htmlFor={id("roleId")} className="ui-label">Staff role <span className={styles.required}>Required</span></label><select className={(styles.field) + " ui-field"} {...fields("roleId")} value={draft.roleId} onChange={event => update("roleId", event.target.value)} disabled={editingOwner || submitting} aria-label="Staff role"><option value="" disabled>{editing ? "Keep existing per-hotel roles" : "Choose a role"}</option>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select><p id={id("roleId-help")} className={styles.fieldHelp}>{selectedRole ? roleSummary(selectedRole) : "This person has different roles at different hotels. Choose a role only if you want to replace those assignments."}</p></div>
                <fieldset className={styles.hotelChoices} disabled={editingOwner || submitting} id={id("propertyIds")} tabIndex={-1}><legend>Assigned hotels</legend><label className={(styles.scopeChoice) + " ui-label"}><input type="radio" name={id("hotel-mode")} checked={!draft.allHotels} onChange={() => update("allHotels", false)} className="ui-field" /><span><strong>Selected hotels</strong><small>Choose the hotels this staff member can access.</small></span></label><label className={(styles.scopeChoice) + " ui-label"}><input type="radio" name={id("hotel-mode")} checked={draft.allHotels} onChange={() => update("allHotels", true)} className="ui-field" /><span><strong>All current hotels</strong><small>Includes {properties.length} {properties.length === 1 ? "hotel" : "hotels"}. Assign newly added hotels separately.</small></span></label>{!draft.allHotels && <div className={styles.hotelList}>{properties.map(property => <label key={property.id} className={(styles.hotelChoice) + " ui-label"}><input type="checkbox" checked={draft.propertyIds.includes(property.id)} onChange={event => update("propertyIds", event.target.checked ? [...draft.propertyIds, property.id] : draft.propertyIds.filter(value => value !== property.id))} className="ui-field" /><span><strong>{property.displayName}</strong><small>{property.code}</small></span></label>)}</div>}</fieldset>
                {selectedRole && <details className={styles.permissionDetails}><summary>See what {selectedRole.name} can do <ChevronRight size={17} aria-hidden="true" /></summary><p className={styles.fieldHelp}>Role defaults. Hotel assignments and individual overrides determine final access.</p>{permissions(selectedRole)}</details>}
                {editing && !editingOwner && <section className={styles.accessActions}><h3>Account access</h3><p>Suspending access keeps the staff record so you can restore it later.</p><div><button type="button" className={(styles.buttonSecondary) + " ui-control"} disabled={submitting} onClick={() => setConfirmation({ kind: editing.status === "ACTIVE" ? "suspend" : "activate", user: editing })}>{editing.status === "ACTIVE" ? "Suspend access" : "Restore access"}</button><button type="button" className={(styles.dangerLink) + " ui-control"} disabled={submitting} onClick={() => setConfirmation({ kind: "remove", user: editing })}>Remove staff access</button></div></section>}
              </>}
            </section>
          </div>
          <aside className={styles.editorAside} aria-label="Staff access summary"><p className={styles.eyebrow}>At a glance</p><h3>{draft.name.trim() || "New staff member"}</h3><span className={styles.handle}>@{draft.username || "username"}</span><dl><div><dt>Role</dt><dd>{selectedRole?.name || "Existing per-hotel roles"}</dd></div><div><dt>Hotel access</dt><dd>{selectedHotels.length ? selectedHotels.map(hotel => hotel.displayName).join(", ") : "No hotels selected"}</dd></div><div><dt>Login changes</dt><dd>{draft.password || draft.pin ? [draft.password && "New password", draft.pin && "New PIN"].filter(Boolean).join(" & ") : editing ? "Keep current credentials" : "Not set yet"}</dd></div></dl><div className={styles.asideHelp}><CircleHelp size={18} aria-hidden="true" /><p>{editing ? "Changes take effect after you save. The staff member will need to sign in again." : "Start with the access this person needs. You can update their role and hotels later."}</p></div></aside>
        </div>
        <footer className={styles.saveBar}><span>{dirty ? "You have unsaved changes" : editing ? "Your changes will apply after saving" : "Complete all three sections to add this person"}</span><div><button type="button" className={(styles.buttonSecondary) + " ui-control"} onClick={requestClose} disabled={submitting}>Cancel</button><button type="submit" className={(styles.buttonPrimary) + " ui-control"} disabled={submitting || Boolean(editing && !dirty)}>{submitting ? <RefreshCw size={17} className={styles.spin} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}{submitting ? "Saving…" : editing ? "Save changes" : "Add staff member"}</button></div></footer>
      </form>
    </> : <>
      <header className={styles.intro}><div><p className={styles.eyebrow}>Team management</p><h1 className="ui-page-title">Staff & roles</h1><p>Manage your team, their logins and hotel access.</p></div><button type="button" id={id("add-staff")} className={(styles.buttonPrimary) + " ui-control"} onClick={() => openEditor(null)} disabled={loading || Boolean(loadError) || !roles.length || !properties.length}><Plus size={18} aria-hidden="true" /> Add staff</button></header>
      <div className={styles.overview} aria-label="Staff overview"><div><span className={styles.metricNumber}>{loading && !users.length ? "—" : users.length}</span><span>Team members</span></div><div><span className={styles.metricNumber}>{loading && !users.length ? "—" : activeCount}</span><span><span className={styles.stateGood} aria-hidden="true" /> Active</span></div><div><span className={styles.metricNumber}>{loading && !users.length ? "—" : properties.length}</span><span>Hotels</span></div><p><ShieldCheck size={16} aria-hidden="true" /> Managed by the organization owner</p></div>
      <div className={styles.navigation}><div className={styles.tabs} role="tablist" aria-label="Team views">{([['members', 'Staff directory', Users], ['roles', 'Role guide', ShieldCheck]] as const).map(([value, label, Icon], index) => <button type="button" key={value} role="tab" id={id(`view-${value}`)} aria-selected={view === value} aria-controls={id(`panel-${value}`)} tabIndex={view === value ? 0 : -1} className={(view === value ? styles.tabActive : styles.tab) + " ui-control"} onClick={() => setView(value)} onKeyDown={event => handleTabKeys(event, index, ['members', 'roles'], value => setView(value as "members" | "roles"), "view")}><Icon size={18} aria-hidden="true" />{label}{value === "members" && <span className={styles.tabCount}>{users.length}</span>}</button>)}</div><button className={(styles.textButton) + " ui-control"} type="button" disabled={loading} onClick={() => void fetchUsers()} aria-label="Refresh staff list"><RefreshCw size={16} className={loading ? styles.spin : ""} aria-hidden="true" /><span>Refresh</span></button></div>
      {loadError && <div className={styles.loadError} role="alert"><CircleHelp size={21} aria-hidden="true" /><div><strong>We couldn’t load your staff</strong><p>{loadError}</p></div><button className={(styles.buttonSecondary) + " ui-control"} type="button" disabled={loading} onClick={() => void fetchUsers()}>Try again</button></div>}
      <div id={id("content")} tabIndex={-1}>
        {view === "members" ? <section id={id("panel-members")} role="tabpanel" aria-labelledby={id("view-members")} aria-busy={loading}>
          <div className={styles.filters}><div className={styles.searchField}><label htmlFor={id("search")} className={(styles.srOnly) + " ui-label"}>Search staff</label><Search size={19} aria-hidden="true" /><input id={id("search")} className={(styles.field) + " ui-field"} type="search" placeholder="Search by name, username or role" value={query} onChange={event => setQuery(event.target.value)} aria-label="Search staff" />{query && <button type="button" className={(styles.iconButton) + " ui-control"} onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}</div><div className={styles.filterSelect}><label htmlFor={id("hotel-filter")} className="ui-label">Hotel</label><select id={id("hotel-filter")} className={(styles.field) + " ui-field"} value={hotelFilter} onChange={event => setHotelFilter(event.target.value)} aria-label="Hotel"><option value="all">All hotels</option>{properties.map(property => <option key={property.id} value={property.id}>{property.displayName}</option>)}</select></div><div className={styles.filterSelect}><label htmlFor={id("role-filter")} className="ui-label">Role</label><select id={id("role-filter")} className={(styles.field) + " ui-field"} value={roleFilter} onChange={event => setRoleFilter(event.target.value)} aria-label="Role"><option value="all">All roles</option>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div></div>
          <div className={styles.listToolbar}><div className={styles.statusFilters} aria-label="Filter by account status">{[['all', 'All staff', users.length], ['ACTIVE', 'Active', activeCount], ['SUSPENDED', 'Suspended', suspendedCount], ...(loginCount ? [['login', 'Needs login', loginCount]] : [])].map(([value, label, count]) => <button type="button" key={value} aria-pressed={statusFilter === value} className={(statusFilter === value ? styles.statusSelected : styles.statusFilter) + " ui-control"} onClick={() => setStatusFilter(String(value))}>{label}<span>{loading && !users.length ? "—" : count}</span></button>)}</div>{hasFilters && <button className={(styles.clearButton) + " ui-control"} type="button" onClick={clearFilters}>Clear filters</button>}</div>
          <div className={styles.directory}>
            <div className={styles.listHeading} aria-hidden="true"><span>Team member</span><span>Role & hotel access</span><span>Login</span><span>Manage</span></div>
            {loading && !users.length ? <div className={styles.skeleton} role="status"><span className={styles.srOnly}>Loading staff…</span>{[1, 2, 3, 4].map(value => <div key={value}><i /><span /><span /></div>)}</div> : !filtered.length ? <div className={styles.emptyState}><div><Users size={29} aria-hidden="true" /></div><h2 className="ui-section-title">{users.length ? "No staff match these filters" : loadError ? "Staff list unavailable" : "Your team starts here"}</h2><p>{users.length ? "Try another name, hotel or role to find the person you need." : loadError ? "Use Try again above to reload the staff list." : "Add your first staff member and choose their hotel access."}</p>{users.length ? <button type="button" className={(styles.buttonSecondary) + " ui-control"} onClick={clearFilters}>Clear filters</button> : !loadError && <button type="button" className={(styles.buttonPrimary) + " ui-control"} disabled={loading || !roles.length || !properties.length} onClick={() => openEditor(null)}><Plus size={17} aria-hidden="true" /> Add staff</button>}</div> : <ul className={styles.memberList}>{filtered.map(member => {
              const owner = isOwner(member);
              const hotels = owner ? properties.map(property => property.displayName) : [...new Set(member.grants.map(grant => grant.propertyName || grant.propertyCode || grant.propertyId))];
              return <li key={member.id} className={styles.memberRow}><div className={styles.memberIdentity}><div className={owner ? styles.ownerAvatar : styles.avatar} aria-hidden="true">{initials(member.name)}</div><div><h3>{member.name}{signedInUser?.id === member.id && <span className={styles.youLabel}>You</span>}</h3><span className={styles.handle}>@{member.username}</span><p>{lastSeen(member.lastLoginAt)}</p></div></div><div className={styles.memberAccess}><strong>{owner ? "Organization owner" : [...new Set(member.grants.map(grant => grant.roleName).filter(Boolean))].join(" · ") || member.roleName}</strong><span><Building2 size={14} aria-hidden="true" />{owner ? `All ${properties.length} hotels` : hotels.join(", ") || "No hotels assigned"}</span><span className={`${styles.badge} ${member.status === "ACTIVE" ? styles.badgeActive : styles.badgeInactive}`}><span aria-hidden="true" />{statusLabel(member)}</span></div><div className={styles.memberLogin}>{needsLogin(member) ? <><span className={styles.loginWarning}><KeyRound size={15} aria-hidden="true" /> Login not set up</span><button type="button" className={(styles.inlineLink) + " ui-control"} id={id(`login-${member.id}`)} aria-label={`Set up login for ${member.name}`} onClick={() => openEditor(member, "login")}>Set up login <ArrowRight size={13} aria-hidden="true" /></button></> : <><span className={styles.loginReady}><CheckCircle2 size={15} aria-hidden="true" />{member.status !== "ACTIVE" ? "Sign-in disabled" : member.hasPassword === undefined && member.hasPin === undefined ? "View login details" : "Login ready"}</span><button type="button" className={(styles.inlineLink) + " ui-control"} id={id(`login-${member.id}`)} onClick={() => openEditor(member, "login")} aria-label={`Change login for ${member.name}`}>Change login</button></>}</div><div className={styles.memberActions}><button type="button" className={(styles.editButton) + " ui-control"} id={id(`edit-${member.id}`)} onClick={() => openEditor(member)} aria-label={`Edit ${member.name}`}>Edit staff <ChevronRight size={16} aria-hidden="true" /></button></div></li>;
            })}</ul>}
          </div>
          <p className={styles.resultCount} role="status">{loading ? "Updating staff list…" : `Showing ${filtered.length} of ${users.length} team members`}</p>
        </section> : <section id={id("panel-roles")} role="tabpanel" aria-labelledby={id("view-roles")}>
          <div className={styles.guideIntro}><div><h2 className="ui-section-title">A clear view of each role</h2><p>Choose a role to see its default permissions. Assign roles from a staff member’s settings.</p></div><span className={styles.referenceBadge}>Read-only guide</span></div>
          <div className={styles.roleLayout}><div className={styles.mobileRole}><label htmlFor={id("guide-role")} className="ui-label">Choose a role</label><select id={id("guide-role")} className={(styles.field) + " ui-field"} value={guideRole} onChange={event => setGuideRole(event.target.value)} aria-label="Choose a role">{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div><nav className={styles.roleList} aria-label="Available staff roles">{roles.map(role => <button type="button" key={role.id} className={(guideRole === role.id ? styles.roleSelected : styles.roleOption) + " ui-control"} aria-pressed={guideRole === role.id} onClick={() => setGuideRole(role.id)}><span>{role.name}</span>{guideRole === role.id && <ChevronRight size={16} aria-hidden="true" />}</button>)}</nav><div className={styles.roleDetail}>{selectedRole ? <><div className={styles.roleDetailHeader}><div className={styles.roleIcon}><ShieldCheck size={24} aria-hidden="true" /></div><h3>{selectedRole.name}</h3><p>{roleSummary(selectedRole)}</p><div className={styles.roleTags}>{roleHighlights(selectedRole.code).map(label => <span key={label}>{label}</span>)}</div></div>{permissions(selectedRole)}<p className={styles.guideFootnote}><CircleHelp size={16} aria-hidden="true" /> Hotel assignments, individual overrides and additional approval rules determine final access. Only organization owners can manage staff.</p></> : <p>Select a role to view its permissions.</p>}</div></div>
        </section>}
      </div>
      <footer className={styles.pageFooter}><LockKeyhole size={15} aria-hidden="true" /><span>Changes to a staff account end that person’s existing sessions.</span><a href="/pms">Back to front desk <ArrowRight size={14} aria-hidden="true" /></a></footer>
    </>}
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={id("confirm-title")} aria-describedby={id("confirm-description")} onCancel={event => { if (submitting) event.preventDefault(); else setConfirmation(null); }} onClose={() => { setConfirmation(null); if (!editorOpen) restoreTrigger(); }}>
      <div className={styles.dialogContent}><div className={styles.dialogIcon}><LockKeyhole size={24} aria-hidden="true" /></div><h2 id={id("confirm-title")} className="ui-section-title">{confirmation?.kind === "discard" ? "Discard your changes?" : confirmation?.kind === "suspend" ? "Suspend staff access?" : confirmation?.kind === "remove" ? "Remove staff access?" : "Restore staff access?"}</h2><p id={id("confirm-description")}>{confirmation?.kind === "discard" ? "Your changes haven’t been saved. Go back to keep editing, or discard them." : confirmation && `${confirmation.user.name} ${confirmation.kind === "suspend" ? "will be signed out and won’t be able to sign in until you restore access. Their staff record will be kept." : confirmation.kind === "remove" ? "will lose access. Their account may be deleted; records needed for operational history are retained." : "will be able to sign in again with their existing login details."}`}</p>{dialogError && <p className={styles.inlineError} role="alert">{dialogError}</p>}<div className={styles.dialogActions}><button type="button" className={(styles.buttonSecondary) + " ui-control"} autoFocus disabled={submitting} onClick={() => setConfirmation(null)}>{confirmation?.kind === "discard" ? "Keep editing" : "Cancel"}</button><button type="button" className={(confirmation?.kind === "activate" ? styles.buttonPrimary : styles.buttonDanger) + " ui-control"} disabled={submitting} onClick={() => void confirmAction()}>{submitting ? "Updating…" : confirmation?.kind === "discard" ? "Discard changes" : confirmation?.kind === "suspend" ? "Suspend access" : confirmation?.kind === "remove" ? "Remove access" : "Restore access"}</button></div></div>
    </dialog>
  </div>;
}
