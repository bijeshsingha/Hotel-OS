import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AUDIT_CATEGORY_MAP, AuditCategory } from "@/lib/domain/audit-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const category = (searchParams.get("category") || "ALL").toUpperCase() as AuditCategory;
    const action = searchParams.get("action");
    const search = searchParams.get("search")?.trim();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 150));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    // Build actions filter based on category
    let allowedActions: string[] | undefined = undefined;
    if (category && category !== "ALL") {
      allowedActions = Object.entries(AUDIT_CATEGORY_MAP)
        .filter(([_, cats]) => cats.includes(category))
        .map(([act]) => act);
    }

    const where: any = {
      propertyId,
    };

    if (action) {
      where.action = action;
    } else if (allowedActions) {
      where.action = { in: allowedActions };
    }

    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) {
        where.occurredAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length === 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.occurredAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { action: { contains: search } },
        { actorName: { contains: search } },
        { actorId: { contains: search } },
        { targetType: { contains: search } },
        { targetId: { contains: search } },
        { reason: { contains: search } },
        { beforeJson: { contains: search } },
        { afterJson: { contains: search } },
      ];
    }

    const [logs, totalCount, allLogsForStats] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
      // Aggregate stats for property (total volume by category)
      prisma.auditLog.findMany({
        where: { propertyId },
        select: { action: true },
      }),
    ]);

    // Calculate category counts
    let financialCount = 0;
    let cashFlowCount = 0;
    let frontDeskCount = 0;
    let adminCount = 0;
    let reservationsCount = 0;
    let nightAuditCount = 0;

    for (const log of allLogsForStats) {
      const cats = AUDIT_CATEGORY_MAP[log.action] || ["ADMIN"];
      if (cats.includes("FINANCIAL")) financialCount++;
      if (cats.includes("CASH_FLOW")) cashFlowCount++;
      if (cats.includes("FRONT_DESK")) frontDeskCount++;
      if (cats.includes("ADMIN")) adminCount++;
      if (cats.includes("RESERVATIONS")) reservationsCount++;
      if (cats.includes("NIGHT_AUDIT")) nightAuditCount++;
    }

    const stats = {
      total: allLogsForStats.length,
      financial: financialCount,
      cashFlow: cashFlowCount,
      frontDesk: frontDeskCount,
      admin: adminCount,
      reservations: reservationsCount,
      nightAudit: nightAuditCount,
    };

    return NextResponse.json({
      logs,
      total: totalCount,
      limit,
      offset,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
