import { prisma } from "@/lib/db/prisma";

export type AuditCategory =
  | "ALL"
  | "FINANCIAL"
  | "CASH_FLOW"
  | "FRONT_DESK"
  | "RESERVATIONS"
  | "NIGHT_AUDIT"
  | "ADMIN"
  | "POS_DINING";

export interface LogAuditEventParams {
  organizationId: string;
  propertyId: string;
  actorId?: string | null;
  actorName?: string | null;
  effectiveActorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  beforeJson?: any;
  afterJson?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const AUDIT_CATEGORY_MAP: Record<string, AuditCategory[]> = {
  // Financial
  PAYMENT_RECEIVE: ["FINANCIAL", "CASH_FLOW"],
  REFUND_PAYOUT: ["FINANCIAL", "CASH_FLOW"],
  PAYMENT_EDIT: ["FINANCIAL"],
  FOLIO_CHARGE_ADD: ["FINANCIAL"],
  FOLIO_DISCOUNT_APPLIED: ["FINANCIAL"],
  DELETE_FOLIO_CHARGE: ["FINANCIAL"],
  GROUP_PAYMENT_SETTLE: ["FINANCIAL"],
  CHECK_OUT: ["FINANCIAL", "FRONT_DESK"],

  // Cash Inflows & Outflows
  EXPENSE_VOUCHER_CREATE: ["CASH_FLOW", "FINANCIAL"],
  DIRECT_INCOME_COLLECT: ["CASH_FLOW", "FINANCIAL"],

  // Front Desk
  CHECK_IN: ["FRONT_DESK"],
  ROOM_MOVE: ["FRONT_DESK"],
  UPDATE_GRACE_PERIOD: ["FRONT_DESK", "FINANCIAL"],
  STAY_ADD_ROOM: ["FRONT_DESK"],
  ROOM_STATE_CHANGE: ["FRONT_DESK"],
  REGISTRATION_CREATE: ["FRONT_DESK"],
  DIGITAL_CHECKIN_SUBMIT: ["FRONT_DESK"],
  FULFILL_CHECKIN: ["FRONT_DESK"],

  // Reservations
  RESERVATION_CREATE: ["RESERVATIONS"],
  RESERVATION_STATUS_CHANGE: ["RESERVATIONS"],
  RESERVATION_CANCEL: ["RESERVATIONS"],

  // Night Audit
  NIGHT_AUDIT_CLOSE: ["NIGHT_AUDIT", "FINANCIAL"],
  DAILY_MIDNIGHT_REPORT_GENERATED: ["NIGHT_AUDIT"],

  // POS
  POS_KOT_FIRED: ["POS_DINING"],
  GUEST_QR_ORDER_CREATE: ["POS_DINING"],

  // Admin
  ADMIN_PORTAL_LOGIN: ["ADMIN"],
  ADMIN_UPDATE_GRC: ["ADMIN"],
  ADMIN_UPDATE_GRC_SYNCHRONIZED: ["ADMIN"],
  ADMIN_DELETE_GRC: ["ADMIN"],
  ADMIN_DELETE_GRC_PRESERVED_IN_BACKUP: ["ADMIN"],
  ROOM_CREATE: ["ADMIN"],
  ROOM_UPDATE: ["ADMIN"],
  RATE_MATRIX_UPDATE: ["ADMIN"],
  HOTEL_PROFILE_UPDATE: ["ADMIN"],
  OPENING_CASH_BALANCE_SET: ["FINANCIAL", "CASH_FLOW", "ADMIN"],
  REPORT_EMAILED: ["ADMIN", "FINANCIAL"],
};

export function getAuditCategoriesForAction(action: string): AuditCategory[] {
  return AUDIT_CATEGORY_MAP[action] || ["ADMIN"];
}

export function matchesAuditCategory(action: string, category: AuditCategory): boolean {
  if (category === "ALL") return true;
  const categories = getAuditCategoriesForAction(action);
  return categories.includes(category);
}

/**
 * Resilient, safe audit logging function.
 * Ensures failures in audit logging do not crash the primary operational transaction.
 */
export async function logAuditEvent({
  organizationId,
  propertyId,
  actorId,
  actorName,
  effectiveActorId,
  action,
  targetType,
  targetId,
  reason,
  beforeJson,
  afterJson,
  ipAddress,
  userAgent,
}: LogAuditEventParams) {
  try {
    const stringifiedBefore =
      beforeJson === undefined || beforeJson === null
        ? null
        : typeof beforeJson === "string"
        ? beforeJson
        : JSON.stringify(beforeJson);

    const stringifiedAfter =
      afterJson === undefined || afterJson === null
        ? null
        : typeof afterJson === "string"
        ? afterJson
        : JSON.stringify(afterJson);

    return await prisma.auditLog.create({
      data: {
        organizationId,
        propertyId,
        actorId: actorId || null,
        actorName: actorName || "Staff",
        effectiveActorId: effectiveActorId || null,
        action,
        targetType,
        targetId: String(targetId),
        reason: reason || null,
        beforeJson: stringifiedBefore,
        afterJson: stringifiedAfter,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    console.error(`[AUDIT_LOG_ERROR] Failed to record audit log for action ${action}:`, error);
    return null;
  }
}
