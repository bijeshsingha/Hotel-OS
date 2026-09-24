"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import {
  Users,
  UserPlus,
  Shield,
  Building2,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Unlock,
  RefreshCw,
  Crown,
  KeyRound,
  Check,
  ChevronRight,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Minus,
  HelpCircle,
  BedDouble,
  Receipt,
  Wallet,
  Moon,
  Brush,
  SlidersHorizontal,
  AtSign,
  Layers,
  Building,
  ArrowLeft,
  Save,
  ShieldCheck,
} from "lucide-react";

export interface StaffGrant {
  id: string;
  propertyId: string;
  propertyCode?: string;
  propertyName?: string;
  roleId: string;
  roleCode?: string;
  roleName?: string;
}

export interface StaffUser {
  id: string;
  name: string;
  username: string;
  email: string;
  rawEmail?: string;
  phone?: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  lastLoginAt?: string | null;
  createdAt: string;
  role: string;
  roleName: string;
  propertyScope: string;
  grants: StaffGrant[];
}

export interface SystemRole {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  scopeType?: string;
}

export interface SystemProperty {
  id: string;
  code: string;
  displayName: string;
  legalName: string;
}

interface UserManagementTabProps {
  onNotify?: (text: string, type?: "success" | "error") => void;
}

// Module permission definitions for the RBAC Matrix
const MODULE_PERMISSIONS = [
  { key: "frontDesk", label: "Front Desk & GRC", shortName: "Front Desk", desc: "Check-in, GRC register, room assignment", icon: BedDouble },
  { key: "billing", label: "Billing & Folio", shortName: "Billing", desc: "Charge posting, discounts, invoices, refunds", icon: Receipt },
  { key: "cashier", label: "Cashier & Shifts", shortName: "Cashier", desc: "Shift open/close, cash handover, expense vouchers", icon: Wallet },
  { key: "nightAudit", label: "Night Audit", shortName: "Audit", desc: "Day rollover, automated room tariffs", icon: Moon },
  { key: "housekeeping", label: "Housekeeping & Tasks", shortName: "Housekeeping", desc: "Room cleaning Kanban, defect logs", icon: Brush },
  { key: "masterAdmin", label: "Master Database Admin", shortName: "Admin", desc: "Rates, hotel taxes, staff & roles setup", icon: SlidersHorizontal },
] as const;

export type AccessLevel = "FULL" | "READ" | "NONE";

const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<typeof MODULE_PERMISSIONS[number]["key"], AccessLevel>> = {
  ORG_OWNER: { frontDesk: "FULL", billing: "FULL", cashier: "FULL", nightAudit: "FULL", housekeeping: "FULL", masterAdmin: "FULL" },
  ADMIN_GM: { frontDesk: "FULL", billing: "FULL", cashier: "FULL", nightAudit: "FULL", housekeeping: "FULL", masterAdmin: "READ" },
  FD_MGR: { frontDesk: "FULL", billing: "FULL", cashier: "FULL", nightAudit: "FULL", housekeeping: "READ", masterAdmin: "NONE" },
  FD_AGENT: { frontDesk: "FULL", billing: "FULL", cashier: "FULL", nightAudit: "READ", housekeeping: "READ", masterAdmin: "NONE" },
  ACCT: { frontDesk: "READ", billing: "FULL", cashier: "FULL", nightAudit: "READ", housekeeping: "NONE", masterAdmin: "READ" },
  HK_SUP: { frontDesk: "READ", billing: "NONE", cashier: "NONE", nightAudit: "NONE", housekeeping: "FULL", masterAdmin: "NONE" },
  HK_ATT: { frontDesk: "NONE", billing: "NONE", cashier: "NONE", nightAudit: "NONE", housekeeping: "FULL", masterAdmin: "NONE" },
  MAINT_SUP: { frontDesk: "NONE", billing: "NONE", cashier: "NONE", nightAudit: "NONE", housekeeping: "FULL", masterAdmin: "NONE" },
  WAITER: { frontDesk: "NONE", billing: "READ", cashier: "FULL", nightAudit: "NONE", housekeeping: "NONE", masterAdmin: "NONE" },
  VIEWER: { frontDesk: "READ", billing: "READ", cashier: "READ", nightAudit: "READ", housekeeping: "READ", masterAdmin: "NONE" },
};

export function UserManagementTab({ onNotify }: UserManagementTabProps) {
  const { refreshData } = useHotel();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [properties, setProperties] = useState<SystemProperty[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view: MEMBERS or ROLES
  const [activeSubView, setActiveSubView] = useState<"MEMBERS" | "ROLES">("MEMBERS");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");

  // Full-Page Editor State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formHandle, setFormHandle] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formScopeMode, setFormScopeMode] = useState<"PORTFOLIO" | "CLUSTER" | "SINGLE">("PORTFOLIO");
  const [formSinglePropertyId, setFormSinglePropertyId] = useState("");
  const [formPropertyIds, setFormPropertyIds] = useState<string[]>([]);
  const [formPassword, setFormPassword] = useState("");
  const [formPin, setFormPin] = useState("");
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [customModulePermissions, setCustomModulePermissions] = useState<Record<string, AccessLevel>>({});

  // Dynamic RBAC Matrix state
  const [matrixPermissions, setMatrixPermissions] = useState(DEFAULT_ROLE_PERMISSIONS);

  const isEditing = showAddModal || editingUser !== null;

  // Close editor on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditing) {
        setShowAddModal(false);
        setEditingUser(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/users");
      if (!res.ok) throw new Error("Failed to load staff list");
      const data = await res.json();
      setUsers(data.users || []);
      setRoles(data.roles || []);
      setProperties(data.properties || []);
      if (!formRoleId && data.roles?.length > 0) {
        const defaultRole = data.roles.find((r: SystemRole) => r.code === "FD_MGR") || data.roles[0];
        setFormRoleId(defaultRole.id);
      }
    } catch (err: any) {
      onNotify?.(err.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    refreshData().catch(() => {});
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormName("");
    setFormHandle("");
    setFormEmail("");
    setFormPhone("");
    setFormScopeMode("PORTFOLIO");
    setFormPropertyIds(properties.map((p) => p.id));
    setFormSinglePropertyId(properties[0]?.id || "");
    const defaultRole = roles.find((r) => r.code === "FD_MGR") || roles[0];
    setFormRoleId(defaultRole?.id || "");
    setCustomModulePermissions(DEFAULT_ROLE_PERMISSIONS[defaultRole?.code || "FD_MGR"] || {
      frontDesk: "FULL",
      billing: "FULL",
      cashier: "FULL",
      nightAudit: "FULL",
      housekeeping: "READ",
      masterAdmin: "NONE",
    });
    setFormPassword("");
    setFormPin("");
    setShowModalPassword(false);
    setFormError(null);
    setShowAddModal(true);
  };

  const openEditModal = (u: StaffUser) => {
    setEditingUser(u);
    setFormName(u.name);
    const cleanHandle = u.username || (u.rawEmail?.endsWith("@hotelos.internal") ? u.rawEmail.replace("@hotelos.internal", "") : u.email.split("@")[0]);
    setFormHandle(cleanHandle);
    setFormEmail(u.rawEmail?.endsWith("@hotelos.internal") ? "" : u.email);
    setFormPhone(u.phone || "");
    const currentRoleId = u.grants[0]?.roleId || roles[0]?.id || "";
    setFormRoleId(currentRoleId);

    const isOwner = u.role === "ORG_OWNER";
    if (isOwner) {
      setFormScopeMode("PORTFOLIO");
      setFormPropertyIds(properties.map((p) => p.id));
      setCustomModulePermissions(DEFAULT_ROLE_PERMISSIONS["ORG_OWNER"]);
    } else {
      const assignedIds = u.grants.map((g) => g.propertyId);
      setFormPropertyIds(assignedIds);
      if (assignedIds.length === properties.length && properties.length > 0) {
        setFormScopeMode("PORTFOLIO");
        setFormSinglePropertyId(properties[0]?.id || "");
      } else if (assignedIds.length === 1) {
        setFormScopeMode("SINGLE");
        setFormSinglePropertyId(assignedIds[0]);
      } else {
        setFormScopeMode("CLUSTER");
        setFormSinglePropertyId(assignedIds[0] || properties[0]?.id || "");
      }

      setCustomModulePermissions(matrixPermissions[u.role] || DEFAULT_ROLE_PERMISSIONS[u.role] || {
        frontDesk: "FULL",
        billing: "FULL",
        cashier: "FULL",
        nightAudit: "FULL",
        housekeeping: "READ",
        masterAdmin: "NONE",
      });
    }

    setFormPassword("");
    setFormPin("");
    setShowModalPassword(false);
    setFormError(null);
  };

  const handleRoleChange = (roleId: string) => {
    if (editingUser?.role === "ORG_OWNER") return;
    setFormRoleId(roleId);
    const r = roles.find((role) => role.id === roleId);
    if (r && (matrixPermissions[r.code] || DEFAULT_ROLE_PERMISSIONS[r.code])) {
      setCustomModulePermissions(matrixPermissions[r.code] || DEFAULT_ROLE_PERMISSIONS[r.code]);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formHandle.trim()) {
      setFormError("Staff Full Name and Username / Work Handle are mandatory.");
      return;
    }

    const isOwner = editingUser?.role === "ORG_OWNER";

    let targetPropertyIds: string[] = [];
    let allProps = false;
    if (isOwner || formScopeMode === "PORTFOLIO") {
      allProps = true;
      targetPropertyIds = properties.map((p) => p.id);
    } else if (formScopeMode === "SINGLE") {
      const selectedId = formSinglePropertyId || properties[0]?.id;
      if (!selectedId) {
        setFormError("Select a property to assign terminal access.");
        return;
      }
      targetPropertyIds = [selectedId];
    } else {
      targetPropertyIds = formPropertyIds;
    }

    if (!allProps && targetPropertyIds.length === 0) {
      setFormError("Select at least one property or set scope to Portfolio-Wide.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: formName.trim(),
        username: formHandle.trim(),
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        roleId: isOwner ? (editingUser?.grants[0]?.roleId || formRoleId) : formRoleId,
        propertyIds: targetPropertyIds,
        allProperties: allProps,
        password: formPassword.trim() || undefined,
        pin: formPin.trim() || undefined,
      };

      if (editingUser) {
        const res = await fetch(`/api/v1/admin/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update staff member");
        onNotify?.(`Updated @${formHandle} (${formName}) successfully.`, "success");
        setEditingUser(null);
      } else {
        const res = await fetch("/api/v1/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create staff member");
        onNotify?.(`Staff member @${formHandle} created successfully.`, "success");
        setShowAddModal(false);
      }
      await fetchUsers();
      try {
        await refreshData();
      } catch {}
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: StaffUser) => {
    if (user.role === "ORG_OWNER") {
      onNotify?.("Root Organization Owner account cannot be suspended or locked.", "error");
      return;
    }
    const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change status");
      onNotify?.(`${user.name} is now ${nextStatus.toLowerCase()}.`, "success");
      await fetchUsers();
      try {
        await refreshData();
      } catch {}
    } catch (err: any) {
      onNotify?.(err.message, "error");
    }
  };

  const handleDeleteUser = async (user: StaffUser) => {
    if (user.role === "ORG_OWNER") {
      onNotify?.("Root Organization Owner account cannot be deleted.", "error");
      return;
    }
    if (!confirm(`Are you sure you want to remove staff access for "${user.name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove staff access");
      onNotify?.(`Access removed for ${user.name}.`, "success");
      await fetchUsers();
      try {
        await refreshData();
      } catch {}
    } catch (err: any) {
      onNotify?.(err.message, "error");
    }
  };

  // Toggle permission level in the interactive Matrix
  const handleToggleMatrixCell = (roleCode: string, modKey: typeof MODULE_PERMISSIONS[number]["key"]) => {
    if (roleCode === "ORG_OWNER") {
      onNotify?.("Organization Owner root permissions cannot be revoked.", "error");
      return;
    }

    setMatrixPermissions((prev) => {
      const roleMap = prev[roleCode] || (DEFAULT_ROLE_PERMISSIONS[roleCode] as any) || {};
      const current = roleMap[modKey] || "NONE";
      const next: AccessLevel = current === "FULL" ? "READ" : current === "READ" ? "NONE" : "FULL";
      const updated = {
        ...prev,
        [roleCode]: {
          ...roleMap,
          [modKey]: next,
        },
      };
      return updated;
    });

    onNotify?.(`Updated ${roleCode} scope for ${modKey}`, "success");
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        u.roleName.toLowerCase().includes(q);

      const matchesProperty =
        propertyFilter === "ALL" ||
        u.grants.some((g) => g.propertyId === propertyFilter) ||
        u.propertyScope.includes("All Properties");

      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;

      return matchesQuery && matchesProperty && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, propertyFilter, roleFilter, statusFilter]);

  // Selected Role for creation
  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === formRoleId) || roles[0] || null;
  }, [roles, formRoleId]);

  const getRoleBadgeStyle = (code: string) => {
    switch (code) {
      case "ORG_OWNER":
        return "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60";
      case "ADMIN_GM":
        return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60";
      case "FD_MGR":
      case "FD_AGENT":
        return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60";
      case "ACCT":
        return "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60";
      case "HK_SUP":
      case "HK_ATT":
        return "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
    }
  };

  // ====================================================
  // FULL PAGE VIEW: STAFF & SCOPE WORKSPACE EDITOR
  // When adding or editing, it takes over the ENTIRE PAGE VIEW
  // ====================================================
  if (isEditing) {
    const isEditingOwner = editingUser?.role === "ORG_OWNER";

    return (
      <div className="w-full flex-1 flex flex-col space-y-4 animate-in fade-in duration-150">
        {/* Full-Page Workspace Top Bar */}
        <div className="w-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingUser(null);
              }}
              className="h-10 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-zinc-200 dark:border-zinc-700 shrink-0"
              title="Return to Staff Directory"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Directory</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white truncate">
                  {editingUser ? (isEditingOwner ? `Edit Super Admin: ${editingUser.name}` : `Edit Staff: ${editingUser.name}`) : "Create New Staff Member"}
                </h2>
                {isEditingOwner && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    <span>Root Super Admin</span>
                  </span>
                )}
                {formHandle && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[11px] font-mono font-bold">
                    @{formHandle}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono font-bold uppercase">
                  Full-Page View
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isEditingOwner 
                  ? "Update display name, terminal login handle, and credentials. Root portfolio scope is permanently locked."
                  : "Define login credentials, assign security role, and configure multi-property operational permissions."}
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingUser(null);
              }}
              className="h-10 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveUser}
              disabled={submitting}
              className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>{editingUser ? (isEditingOwner ? "Save Super Admin Details" : "Save Changes & Scope") : "Create Staff Member"}</span>
            </button>
          </div>
        </div>

        {/* Lockout Protection Banner for Root Org Owner */}
        {isEditingOwner && (
          <div className="w-full rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/40 p-4 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-3 shadow-xs">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0 mt-0.5">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="font-extrabold text-purple-950 dark:text-purple-100 flex items-center gap-2">
                <span>Super Admin Lockout Prevention Active</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-200/80 dark:bg-purple-800/70 text-purple-900 dark:text-purple-200 text-[10px] font-mono font-bold">
                  IMMUTABLE ROOT ACCESS
                </span>
              </div>
              <p className="text-purple-800/90 dark:text-purple-300/90 leading-relaxed text-[11px]">
                To guarantee you can never accidentally lock yourself out of your system, the Organization Owner account permanently retains Portfolio-Wide roaming access across all properties with Full Capabilities across all modules. Role demotion, property restriction, and account suspension are locked. You can update your display name, username handle, phone, password, and security PIN below.
              </p>
            </div>
          </div>
        )}

        {formError && (
          <div className="w-full rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5 shadow-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span className="font-bold">{formError}</span>
          </div>
        )}

        {/* Full-Page Form: 2-Column Responsive Grid */}
        <form onSubmit={handleSaveUser} className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT COLUMN: Identity, Handle & Security Role (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1. Identity & Handle */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <AtSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Staff Identity & Terminal Login</span>
                </h3>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                  Email NOT required
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block text-xs">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suraj Das or Bhaskar Bora"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block text-xs">
                    Username / Work Handle *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-zinc-400 font-mono font-bold text-xs">@</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. suraj or ambarish_frontdesk"
                      value={formHandle}
                      onChange={(e) => setFormHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                      className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 pl-8 pr-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 font-mono font-bold focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 block">
                    Direct terminal sign-in handle. No email required to sign into hotel stations.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-zinc-700 dark:text-zinc-300 font-bold block text-xs">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. staff@hotel.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-700 dark:text-zinc-300 font-bold block text-xs">
                      Contact Phone (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98640 12345"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Security Role Selection */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Security Role Assignment</span>
                </h3>
                {selectedRole && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getRoleBadgeStyle(selectedRole.code)}`}>
                    {selectedRole.code}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <select
                  disabled={isEditingOwner}
                  value={formRoleId}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs focus:outline-none transition font-bold ${
                    isEditingOwner
                      ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                      : "bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:border-blue-500"
                  }`}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code}) — {r.scopeType === "ORG" ? "Portfolio Scope" : "Property Scope"}
                    </option>
                  ))}
                </select>

                {isEditingOwner && (
                  <p className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>Root Organization Owner role cannot be changed</span>
                  </p>
                )}

                {selectedRole && (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
                    <div>
                      Primary Role: <strong className="text-zinc-900 dark:text-white">{selectedRole.name}</strong>
                    </div>
                    <div>
                      Scope Domain: <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{selectedRole.scopeType === "ORG" ? "Organization / Portfolio-Wide" : "Assigned Hotel Terminals"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Terminal Authentication Credentials */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Terminal Passwords & Quick PIN</span>
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">Default: hotelos@2026</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-zinc-600 dark:text-zinc-400 font-medium block text-xs">
                    {editingUser ? "New Password (empty to keep)" : "Password *"}
                  </label>
                  <div className="relative">
                    <input
                      type={showModalPassword ? "text" : "password"}
                      placeholder={editingUser ? "•••••••• (unchanged)" : "Enter password"}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 pl-3 pr-9 py-2 text-xs text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {showModalPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-600 dark:text-zinc-400 font-medium block text-xs">
                    Quick Security PIN (4-6 digits)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Define Access Scope & Operational Rights (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. DEFINE HOTEL ACCESS SCOPE */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Define Hotel Access Scope</span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Define whether this staff member has portfolio-wide roaming rights or is constrained to specific terminals.
                  </p>
                </div>
              </div>

              {isEditingOwner ? (
                <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-purple-950 dark:text-purple-100">
                      <Building className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span>Portfolio-Wide Roaming Scope (All Properties)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-purple-200/80 dark:bg-purple-800/70 text-purple-900 dark:text-purple-200 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      <span>PERMANENTLY ASSIGNED</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-800/90 dark:text-purple-300/90 leading-relaxed">
                    The Super Admin possesses root access across all current and future properties ({properties.map((p) => p.displayName).join(", ")}). Scope restriction is locked to prevent accidental property terminal lockout.
                  </p>
                </div>
              ) : (
                <>
                  {/* 3-Way Scope Mode Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFormScopeMode("PORTFOLIO");
                        setFormPropertyIds(properties.map((p) => p.id));
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        formScopeMode === "PORTFOLIO"
                          ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shadow-2xs ring-1 ring-emerald-500/20"
                          : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Portfolio-Wide</span>
                      </div>
                      <div className="text-[10px] mt-1 text-zinc-500 dark:text-zinc-400 leading-snug">
                        Full access across all {properties.length} current & future properties.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormScopeMode("CLUSTER");
                        if (formPropertyIds.length === 0 && properties[0]) {
                          setFormPropertyIds([properties[0].id]);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        formScopeMode === "CLUSTER"
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200 shadow-2xs ring-1 ring-blue-500/20"
                          : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Multi-Property</span>
                      </div>
                      <div className="text-[10px] mt-1 text-zinc-500 dark:text-zinc-400 leading-snug">
                        Custom cluster of designated hotel properties.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormScopeMode("SINGLE");
                        if (!formSinglePropertyId && properties[0]) {
                          setFormSinglePropertyId(properties[0].id);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        formScopeMode === "SINGLE"
                          ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-400 dark:border-purple-700 text-purple-900 dark:text-purple-200 shadow-2xs ring-1 ring-purple-500/20"
                          : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span>Single Terminal</span>
                      </div>
                      <div className="text-[10px] mt-1 text-zinc-500 dark:text-zinc-400 leading-snug">
                        Strictly locked to one designated hotel property.
                      </div>
                    </button>
                  </div>

                  {/* Scope Configuration Details */}
                  {formScopeMode === "CLUSTER" && (
                    <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 block">
                        Select Granted Hotel Properties ({formPropertyIds.length} of {properties.length} selected):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {properties.map((p) => {
                          const checked = formPropertyIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                                checked
                                  ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-zinc-900 dark:text-white"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormPropertyIds([...formPropertyIds, p.id]);
                                    } else {
                                      setFormPropertyIds(formPropertyIds.filter((id) => id !== p.id));
                                    }
                                  }}
                                  className="rounded bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-0"
                                />
                                <div className="truncate">
                                  <span className="font-bold text-xs block truncate">{p.displayName}</span>
                                  <span className="text-[10px] text-zinc-400 font-mono">({p.code})</span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {formScopeMode === "SINGLE" && (
                    <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 block">
                        Designated Single Hotel Property:
                      </span>
                      <select
                        value={formSinglePropertyId}
                        onChange={(e) => setFormSinglePropertyId(e.target.value)}
                        className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                      >
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.displayName} ({p.code}) — {p.legalName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 2. DEFINE OPERATIONAL MODULE PERMISSIONS */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Define Operational Module Permissions</span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Click any permission button below to customize this staff member's exact module scope.
                  </p>
                </div>

                {!isEditingOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedRole && (matrixPermissions[selectedRole.code] || DEFAULT_ROLE_PERMISSIONS[selectedRole.code])) {
                        setCustomModulePermissions(matrixPermissions[selectedRole.code] || DEFAULT_ROLE_PERMISSIONS[selectedRole.code]);
                        onNotify?.(`Reset module permissions to ${selectedRole.name} defaults.`, "success");
                      }
                    }}
                    className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
                  >
                    Reset to Role Default
                  </button>
                )}
              </div>

              {/* 6 Module Cards in Wide Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MODULE_PERMISSIONS.map((mod) => {
                  const currentLevel = (customModulePermissions as any)[mod.key] || "NONE";
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.key}
                      className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">{mod.label}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{mod.desc}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isEditingOwner}
                        onClick={() => {
                          if (isEditingOwner) return;
                          const next: AccessLevel =
                            currentLevel === "FULL" ? "READ" : currentLevel === "READ" ? "NONE" : "FULL";
                          setCustomModulePermissions((prev) => ({ ...prev, [mod.key]: next }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold border transition shrink-0 shadow-2xs ${
                          isEditingOwner
                            ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 cursor-not-allowed"
                            : currentLevel === "FULL"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 cursor-pointer"
                            : currentLevel === "READ"
                            ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:bg-blue-100 cursor-pointer"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 cursor-pointer"
                        }`}
                        title={isEditingOwner ? "Root access cannot be restricted" : "Click to toggle permission: Granted ➜ View Only ➜ Restricted"}
                      >
                        {isEditingOwner ? "Full Access (Root)" : currentLevel === "FULL" ? "Granted" : currentLevel === "READ" ? "View Only" : "Restricted"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Bottom Action Bar */}
        <div className="sticky bottom-0 z-20 w-full p-4 rounded-2xl bg-white/95 dark:bg-[#111114]/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800 shadow-xl flex items-center justify-between gap-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <span>Configuring scope for:</span>
            <strong className="text-zinc-900 dark:text-white font-bold">{formName || "Staff Member"}</strong>
            {formHandle && <span className="font-mono text-blue-600 dark:text-blue-400">(@{formHandle})</span>}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingUser(null);
              }}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveUser}
              disabled={submitting}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>{editingUser ? "Save Changes & Scope" : "Create Staff Member"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // DEFAULT VIEW: DIRECTORY OR ROLES MATRIX
  // ====================================================
  return (
    <div className="w-full flex-1 flex flex-col space-y-4">
      {/* 1. TOP CONTROLLER & SUB-VIEW SWITCHER */}
      <div className="w-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Staff & Roles Console</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[11px] font-mono font-bold">
              {users.length} Active Staff Personnel
            </span>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Define multi-property terminal scopes, customize module capabilities, and inspect the operational RBAC matrix.
          </p>

          {/* Sub-view Switcher: Staff Directory vs Roles & Permissions Matrix */}
          <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-850 p-1 border border-zinc-200 dark:border-zinc-700 text-xs font-bold gap-1 mt-1">
            <button
              type="button"
              onClick={() => setActiveSubView("MEMBERS")}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-2 ${
                activeSubView === "MEMBERS"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs font-black"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Staff Directory</span>
              <span className="px-1.5 py-0.2 rounded-md bg-zinc-200 dark:bg-zinc-750 text-[10px] font-mono font-bold">
                {users.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView("ROLES")}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-2 ${
                activeSubView === "ROLES"
                  ? "bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs font-black"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Define Scope & Permissions Matrix</span>
              <span className="px-1.5 py-0.2 rounded-md bg-zinc-200 dark:bg-zinc-750 text-[10px] font-mono font-bold">
                {roles.length}
              </span>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
            title="Refresh staff records"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs active:scale-98 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: STAFF DIRECTORY TABLE (FULL PAGE) */}
      {activeSubView === "MEMBERS" && (
        <div className="w-full flex-1 flex flex-col space-y-3">
          {/* Refined Filter & Search Bar */}
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/90 dark:border-zinc-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by staff name, @username, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Property Filter */}
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 transition font-medium"
              >
                <option value="ALL">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName} ({p.code})
                  </option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 transition font-medium"
              >
                <option value="ALL">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 transition font-medium"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="SUSPENDED">Suspended Only</option>
              </select>
            </div>
          </div>

          {/* Full-Width High-Density Table */}
          <div className="w-full rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#111114] overflow-hidden shadow-xs flex-1">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 text-zinc-500 dark:text-zinc-400 font-mono text-[10.5px] uppercase tracking-wider">
                    <th className="py-3 px-3.5 font-bold min-w-[200px]">Staff Member & Handle</th>
                    <th className="py-3 px-3 font-bold min-w-[130px]">Security Role</th>
                    <th className="py-3 px-3 font-bold min-w-[125px]">Defined Property Scope</th>
                    <th className="py-3 px-3 font-bold min-w-[150px]">Operational Capabilities</th>
                    <th className="py-3 px-3 font-bold min-w-[85px]">Status</th>
                    <th className="py-3 px-3.5 text-right font-bold min-w-[95px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-zinc-400 font-mono">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          <span>Loading staff directory...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-zinc-400 font-mono">
                        No staff members found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const initials = u.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      const isOwner = u.role === "ORG_OWNER";
                      const cleanHandle = u.username || (u.rawEmail?.endsWith("@hotelos.internal") ? u.rawEmail.replace("@hotelos.internal", "") : u.email.split("@")[0]);
                      const permissions = matrixPermissions[u.role] || DEFAULT_ROLE_PERMISSIONS[u.role] || {};

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/40 transition group"
                        >
                          {/* Staff Identity Column */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                                  isOwner
                                    ? "bg-purple-100 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 shadow-2xs"
                                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
                                }`}
                              >
                                {isOwner ? <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400" /> : initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                                  <span>{u.name}</span>
                                  {isOwner && (
                                    <span className="rounded bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 text-[9px] font-mono font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                                      Super Admin
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] flex items-center gap-2 mt-0.5">
                                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                                    <AtSign className="h-3 w-3" />
                                    <span>{cleanHandle}</span>
                                  </span>
                                  {u.email && !u.email.endsWith("@hotelos.internal") && (
                                    <span className="hidden sm:flex items-center gap-1 text-zinc-400 font-mono text-[10px]">
                                      • <Mail className="h-2.5 w-2.5" />
                                      <span className="truncate max-w-[160px]">{u.email}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Column */}
                          <td className="py-3 px-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${getRoleBadgeStyle(
                                u.role
                              )}`}
                            >
                              <Shield className="h-3 w-3 shrink-0" />
                              <span>{u.roleName}</span>
                            </span>
                          </td>

                          {/* Property Access Scope */}
                          <td className="py-3 px-3.5">
                            <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
                              {u.propertyScope.includes("All") ? (
                                <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-mono font-bold flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  <span>Portfolio Scope (All Hotels)</span>
                                </span>
                              ) : u.grants.length > 0 ? (
                                u.grants.map((g) => (
                                  <span
                                    key={g.id}
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold border ${
                                      (g.propertyName || "").toLowerCase().includes("ambarish")
                                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                                        : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
                                    }`}
                                    title={g.propertyName}
                                  >
                                    {g.propertyCode || g.propertyName}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-zinc-400 font-mono">None assigned</span>
                              )}
                            </div>
                          </td>

                          {/* Operational Capabilities Column */}
                          <td className="py-3 px-3.5">
                            {isOwner ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                                <Crown className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                <span>Full System Access</span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-1 flex-wrap max-w-[220px]">
                                {MODULE_PERMISSIONS.map((mod) => {
                                  const level = (permissions as any)[mod.key] || "NONE";
                                  const Icon = mod.icon;
                                  if (level === "NONE") return null;
                                  return (
                                    <span
                                      key={mod.key}
                                      title={`${mod.label}: ${level === "FULL" ? "Full Access" : "View Only"}`}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold border ${
                                        level === "FULL"
                                          ? "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 border-zinc-300/80 dark:border-zinc-700"
                                          : "bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50"
                                      }`}
                                    >
                                      <Icon className="h-2.5 w-2.5" />
                                      <span>{mod.shortName}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            {u.status === "ACTIVE" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>Suspended</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(u)}
                                className="h-8 px-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                title={isOwner ? "Edit credentials & profile details" : "Open full-page editor to define scope & details"}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>{isOwner ? "Edit" : "Scope"}</span>
                              </button>

                              {!isOwner ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(u)}
                                  className={`p-2 rounded-xl border transition cursor-pointer ${
                                    u.status === "ACTIVE"
                                      ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                                      : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                                  }`}
                                  title={u.status === "ACTIVE" ? "Suspend terminal access" : "Reactivate terminal access"}
                                >
                                  {u.status === "ACTIVE" ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                </button>
                              ) : (
                                <span
                                  className="p-2 rounded-xl border border-purple-200/80 dark:border-purple-800/60 bg-purple-50/60 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 cursor-not-allowed flex items-center"
                                  title="Root Super Admin account cannot be suspended or locked"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                </span>
                              )}

                              {!isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 transition cursor-pointer"
                                  title="Delete staff record"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: INTERACTIVE ROLES & PERMISSIONS RBAC MATRIX */}
      {activeSubView === "ROLES" && (
        <div className="w-full flex-1 flex flex-col space-y-4">
          <div className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Interactive Multi-Property RBAC & Isolation Matrix</span>
              </h4>
              <p className="text-zinc-500 dark:text-zinc-400">
                Click any module access badge below to define and toggle operational permissions (Granted ➜ View Only ➜ Restricted).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMatrixPermissions(DEFAULT_ROLE_PERMISSIONS);
                onNotify?.("Reset RBAC Matrix to system standard defaults.", "success");
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer self-start sm:self-center"
            >
              Reset to Standard Defaults
            </button>
          </div>

          <div className="w-full rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#111114] overflow-hidden shadow-xs flex-1">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 text-zinc-500 dark:text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-bold min-w-[200px]">System Role</th>
                    {MODULE_PERMISSIONS.map((mod) => (
                      <th key={mod.key} className="py-3.5 px-3 font-bold text-center min-w-[140px]" title={mod.desc}>
                        <span>{mod.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {roles.map((r) => {
                    const permissions = matrixPermissions[r.code] || DEFAULT_ROLE_PERMISSIONS[r.code] || {
                      frontDesk: "READ",
                      billing: "NONE",
                      cashier: "NONE",
                      nightAudit: "NONE",
                      housekeeping: "READ",
                      masterAdmin: "NONE",
                    };

                    const isOwner = r.code === "ORG_OWNER";

                    return (
                      <tr key={r.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${getRoleBadgeStyle(r.code)}`}>
                              <Shield className="h-3 w-3 shrink-0" />
                              <span>{r.name}</span>
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">({r.code})</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                            {r.scopeType === "ORG" ? "Portfolio Scope" : "Property Scope"}
                          </div>
                        </td>

                        {MODULE_PERMISSIONS.map((mod) => {
                          const level = (permissions as any)[mod.key] || "NONE";
                          return (
                            <td key={mod.key} className="py-3.5 px-3 text-center">
                              <button
                                type="button"
                                disabled={isOwner}
                                onClick={() => handleToggleMatrixCell(r.code, mod.key)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                                  isOwner ? "cursor-not-allowed opacity-90" : "hover:scale-105 active:scale-95"
                                } ${
                                  level === "FULL"
                                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                                    : level === "READ"
                                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700"
                                }`}
                                title={isOwner ? "Owner permissions cannot be altered" : "Click to cycle permission level"}
                              >
                                {level === "FULL" ? (
                                  <>
                                    <Check className="h-3 w-3" />
                                    <span>Granted</span>
                                  </>
                                ) : level === "READ" ? (
                                  <>
                                    <Eye className="h-3 w-3" />
                                    <span>View Only</span>
                                  </>
                                ) : (
                                  <>
                                    <Minus className="h-3 w-3" />
                                    <span>Restricted</span>
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
