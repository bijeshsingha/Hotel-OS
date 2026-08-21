/**
 * Built-in Roles & Permission Matrix (Hotel OS V1 - Section 5)
 */

export const BUILT_IN_ROLES = {
  ORG_OWNER: {
    code: "ORG_OWNER",
    name: "Organization Owner",
    description: "All properties, organization settings, users, exports, financial governance",
    scopeType: "ORG",
  },
  ADMIN_GM: {
    code: "ADMIN_GM",
    name: "Property Admin / GM",
    description: "All operations and settings for assigned properties except org ownership",
    scopeType: "PROPERTY",
  },
  FD_MGR: {
    code: "FD_MGR",
    name: "Front Desk Manager",
    description: "Reservations, stays, folios, overrides, refunds, room moves, night audit close",
    scopeType: "PROPERTY",
  },
  FD_AGENT: {
    code: "FD_AGENT",
    name: "Front Desk Agent",
    description: "Daily reservations, check-in/out, payment collection, limited reversals",
    scopeType: "PROPERTY",
  },
  HK_SUP: {
    code: "HK_SUP",
    name: "Housekeeping Supervisor",
    description: "Room clean state, task assignment, inspections, HK reports",
    scopeType: "PROPERTY",
  },
  HK_ATT: {
    code: "HK_ATT",
    name: "Housekeeping Attendant",
    description: "Assigned tasks and room cleaning updates",
    scopeType: "PROPERTY",
  },
  FNB_MGR: {
    code: "FNB_MGR",
    name: "F&B Manager",
    description: "Menu, POS, discounts/void approval, outlet reports, shift closures",
    scopeType: "PROPERTY",
  },
  WAITER: {
    code: "WAITER",
    name: "Waiter / Cashier",
    description: "Tables, orders, KOT firing, settlement within thresholds",
    scopeType: "PROPERTY",
  },
  KITCHEN: {
    code: "KITCHEN",
    name: "Kitchen Staff",
    description: "View/print KOTs, acknowledge, prepare, ready tickets on KDS",
    scopeType: "PROPERTY",
  },
  MAINT_SUP: {
    code: "MAINT_SUP",
    name: "Maintenance Supervisor",
    description: "All maintenance issues, assignment, room block requests, reports",
    scopeType: "PROPERTY",
  },
  TECH: {
    code: "TECH",
    name: "Technician",
    description: "Assigned issues, notes, work status, resolution evidence",
    scopeType: "PROPERTY",
  },
  ACCT: {
    code: "ACCT",
    name: "Accountant / Auditor",
    description: "Billing & reports read/export, credit notes, refunds, cashier ledgers",
    scopeType: "PROPERTY",
  },
  VIEWER: {
    code: "VIEWER",
    name: "Owner Viewer",
    description: "Org and property dashboards and reports, no writes or guest documents",
    scopeType: "PROPERTY",
  },
  SUPPORT: {
    code: "SUPPORT",
    name: "Platform Support",
    description: "Audited troubleshooting, no financial export by default",
    scopeType: "ORG",
  },
} as const;

export type RoleCode = keyof typeof BUILT_IN_ROLES;

export const PERMISSIONS = {
  // Tenancy & Config
  ORG_MANAGE: "org.manage",
  PROPERTY_CONFIG: "property.config",
  USER_MANAGE: "user.manage",
  
  // PMS & Front Desk
  RESERVATION_MANAGE: "reservation.manage",
  RESERVATION_CREATE: "reservation.create",
  CHECKIN_CHECKOUT: "stay.checkin_checkout",
  ROOM_MOVE_EXTEND: "stay.move_extend",
  GUEST_PII_VIEW: "guest.pii_view",
  GUEST_DOCUMENT_VIEW: "guest.document.view",
  GUEST_DOCUMENT_UPLOAD: "guest.document.upload",
  
  // Housekeeping & Maintenance
  ROOM_STATE_MANAGE: "room_state.manage",
  HK_TASK_ASSIGN: "hk.task_assign",
  HK_TASK_EXECUTE: "hk.task_execute",
  HK_INSPECT: "hk.inspect",
  MAINT_MANAGE: "maint.manage",
  MAINT_EXECUTE: "maint.execute",
  ROOM_BLOCK: "room.block",
  
  // POS & KOT
  POS_MANAGE: "pos.manage",
  POS_ORDER_CREATE: "pos.order_create",
  KOT_FIRE: "kot.fire",
  KOT_VOID_CANCEL: "kot.void_cancel",
  KDS_STATUS_UPDATE: "kds.status_update",
  
  // Billing & Folio
  FOLIO_VIEW: "folio.view",
  FOLIO_CHARGE_POST: "folio.charge_post",
  FOLIO_ADJUST: "folio.adjust",
  PAYMENT_COLLECT: "payment.collect",
  PAYMENT_REFUND: "payment.refund",
  INVOICE_ISSUE: "invoice.issue",
  INVOICE_CREDIT_NOTE: "invoice.credit_note",
  DISCOUNT_OVERRIDE: "discount.override",
  
  // Night Audit & Reports
  NIGHT_AUDIT_CLOSE: "night_audit.close",
  NIGHT_AUDIT_REOPEN: "night_audit.reopen",
  REPORT_OPS_VIEW: "report.ops_view",
  REPORT_FINANCE_VIEW: "report.finance_view",
  REPORT_EXPORT: "report.export",
  AUDIT_LOG_VIEW: "audit_log.view",
} as const;

export function hasPermission(roleCode: RoleCode, permissionCode: string): boolean {
  if (roleCode === "ORG_OWNER" || roleCode === "ADMIN_GM") return true;

  switch (roleCode) {
    case "FD_MGR":
      return [
        PERMISSIONS.PROPERTY_CONFIG,
        PERMISSIONS.RESERVATION_MANAGE,
        PERMISSIONS.RESERVATION_CREATE,
        PERMISSIONS.CHECKIN_CHECKOUT,
        PERMISSIONS.ROOM_MOVE_EXTEND,
        PERMISSIONS.GUEST_PII_VIEW,
        PERMISSIONS.GUEST_DOCUMENT_VIEW,
        PERMISSIONS.GUEST_DOCUMENT_UPLOAD,
        PERMISSIONS.ROOM_STATE_MANAGE,
        PERMISSIONS.FOLIO_VIEW,
        PERMISSIONS.FOLIO_CHARGE_POST,
        PERMISSIONS.FOLIO_ADJUST,
        PERMISSIONS.PAYMENT_COLLECT,
        PERMISSIONS.PAYMENT_REFUND,
        PERMISSIONS.INVOICE_ISSUE,
        PERMISSIONS.INVOICE_CREDIT_NOTE,
        PERMISSIONS.DISCOUNT_OVERRIDE,
        PERMISSIONS.NIGHT_AUDIT_CLOSE,
        PERMISSIONS.REPORT_OPS_VIEW,
        PERMISSIONS.REPORT_FINANCE_VIEW,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.AUDIT_LOG_VIEW,
      ].includes(permissionCode as any);

    case "FD_AGENT":
      return [
        PERMISSIONS.RESERVATION_CREATE,
        PERMISSIONS.CHECKIN_CHECKOUT,
        PERMISSIONS.ROOM_MOVE_EXTEND,
        PERMISSIONS.GUEST_PII_VIEW,
        PERMISSIONS.GUEST_DOCUMENT_UPLOAD,
        PERMISSIONS.ROOM_STATE_MANAGE,
        PERMISSIONS.FOLIO_VIEW,
        PERMISSIONS.FOLIO_CHARGE_POST,
        PERMISSIONS.PAYMENT_COLLECT,
        PERMISSIONS.INVOICE_ISSUE,
        PERMISSIONS.REPORT_OPS_VIEW,
      ].includes(permissionCode as any);

    case "HK_SUP":
      return [
        PERMISSIONS.ROOM_STATE_MANAGE,
        PERMISSIONS.HK_TASK_ASSIGN,
        PERMISSIONS.HK_TASK_EXECUTE,
        PERMISSIONS.HK_INSPECT,
        PERMISSIONS.MAINT_EXECUTE,
        PERMISSIONS.REPORT_OPS_VIEW,
      ].includes(permissionCode as any);

    case "HK_ATT":
      return [
        PERMISSIONS.HK_TASK_EXECUTE,
        PERMISSIONS.MAINT_EXECUTE,
      ].includes(permissionCode as any);

    case "FNB_MGR":
      return [
        PERMISSIONS.POS_MANAGE,
        PERMISSIONS.POS_ORDER_CREATE,
        PERMISSIONS.KOT_FIRE,
        PERMISSIONS.KOT_VOID_CANCEL,
        PERMISSIONS.KDS_STATUS_UPDATE,
        PERMISSIONS.FOLIO_CHARGE_POST,
        PERMISSIONS.PAYMENT_COLLECT,
        PERMISSIONS.DISCOUNT_OVERRIDE,
        PERMISSIONS.REPORT_OPS_VIEW,
      ].includes(permissionCode as any);

    case "WAITER":
      return [
        PERMISSIONS.POS_ORDER_CREATE,
        PERMISSIONS.KOT_FIRE,
        PERMISSIONS.FOLIO_CHARGE_POST,
        PERMISSIONS.PAYMENT_COLLECT,
      ].includes(permissionCode as any);

    case "KITCHEN":
      return [
        PERMISSIONS.KDS_STATUS_UPDATE,
        PERMISSIONS.KOT_FIRE,
      ].includes(permissionCode as any);

    case "MAINT_SUP":
      return [
        PERMISSIONS.MAINT_MANAGE,
        PERMISSIONS.MAINT_EXECUTE,
        PERMISSIONS.ROOM_BLOCK,
        PERMISSIONS.REPORT_OPS_VIEW,
      ].includes(permissionCode as any);

    case "TECH":
      return [
        PERMISSIONS.MAINT_EXECUTE,
      ].includes(permissionCode as any);

    case "ACCT":
      return [
        PERMISSIONS.FOLIO_VIEW,
        PERMISSIONS.INVOICE_ISSUE,
        PERMISSIONS.INVOICE_CREDIT_NOTE,
        PERMISSIONS.PAYMENT_REFUND,
        PERMISSIONS.REPORT_OPS_VIEW,
        PERMISSIONS.REPORT_FINANCE_VIEW,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.AUDIT_LOG_VIEW,
      ].includes(permissionCode as any);

    case "VIEWER":
      return [
        PERMISSIONS.REPORT_OPS_VIEW,
        PERMISSIONS.REPORT_FINANCE_VIEW,
      ].includes(permissionCode as any);

    default:
      return false;
  }
}
