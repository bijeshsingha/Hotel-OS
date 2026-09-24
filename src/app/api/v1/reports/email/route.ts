import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendMail } from "@/lib/email/mailer";
import {
  generateDailyAuditEmailHtml,
  generateCashierShiftEmailHtml,
  generateExecutiveFlashEmailHtml,
  generateComprehensiveHotelReportEmailHtml,
} from "@/lib/email/templates/report-email-templates";
import { getDailyMidnightReport } from "@/lib/domain/daily-report-service";
import { getComprehensiveHotelReport } from "@/lib/domain/comprehensive-report-service";
import { resolveSelectedProperty } from "@/lib/config/property-config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId: requestedPropId,
      reportType = "COMPREHENSIVE_AUDIT",
      recipientEmail = process.env.REPORT_RECIPIENT_EMAIL || "singhabijesh7@gmail.com",
      date,
      memo,
      actorName = "Hotel Management",
      actorId = "usr_admin",
    } = body;

    const targetProperty = await resolveSelectedProperty(requestedPropId);
    if (!targetProperty) {
      return NextResponse.json({ error: "Property not found. Please check SELECTED_HOTEL_ID in .env" }, { status: 404 });
    }
    const propertyId = targetProperty.id;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json({ error: "A valid recipientEmail is required" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        rooms: { where: { active: true }, include: { roomState: true } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const targetDate = date || property.businessDate || new Date().toISOString().split("T")[0];
    let subject = "";
    let htmlContent = "";

    if (reportType === "COMPREHENSIVE_AUDIT" || reportType === "COMPREHENSIVE_HOTEL_AUDIT") {
      const comprehensiveReport = await getComprehensiveHotelReport({
        propertyId,
        date: targetDate,
      });
      subject = `[Hotel OS] Comprehensive Hotel Master Report - ${property.displayName} (${targetDate})`;
      htmlContent = generateComprehensiveHotelReportEmailHtml({
        report: comprehensiveReport,
        memo,
      });
    } else if (reportType === "DAILY_MANAGER_MIDNIGHT") {
      const dailyReport = await getDailyMidnightReport(propertyId, targetDate);
      subject = `[Hotel OS] Daily Manager Midnight Audit Report - ${property.displayName} (${targetDate})`;
      htmlContent = generateDailyAuditEmailHtml({
        property: {
          displayName: property.displayName,
          code: property.code,
          gstin: property.gstin,
        },
        reportDate: targetDate,
        generatedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        summary: {
          totalCollections: dailyReport.financialSummary.totalCollections,
          collectionsCount: dailyReport.financialSummary.collectionsCount,
          collectionsByMethod: dailyReport.collectionsByMethod,
          totalExpenses: dailyReport.financialSummary.totalExpenses,
          expensesCount: dailyReport.financialSummary.expensesCount,
          expensesByCategory: dailyReport.expensesByCategory,
          netCashFlow: dailyReport.financialSummary.netCashFlow,
          cashDrawerPosition: {
            openingBalance: dailyReport.financialSummary.cashDrawerPosition.openingBalance || 0,
            cashIn: dailyReport.financialSummary.cashDrawerPosition.cashIn,
            cashOut: dailyReport.financialSummary.cashDrawerPosition.cashOut,
            netCashInHand: dailyReport.financialSummary.cashDrawerPosition.netCashInHand,
          },
          occupancyPct: dailyReport.pmsMetrics.occupancyPct,
          revpar: dailyReport.pmsMetrics.revpar,
          adr: dailyReport.pmsMetrics.adr,
          totalRooms: dailyReport.pmsMetrics.totalRooms,
          occupiedRooms: dailyReport.pmsMetrics.roomsSold,
        },
        memo,
      });
    } else if (reportType === "CASHIER_SHIFT") {
      // Aggregate cashier shift position
      const payments = await prisma.payment.findMany({
        where: {
          propertyId,
          status: "SUCCEEDED",
          receivedAt: {
            gte: new Date(`${targetDate}T00:00:00.000Z`),
            lte: new Date(`${targetDate}T23:59:59.999Z`),
          },
        },
      });

      const expenses = await prisma.expense.findMany({
        where: {
          propertyId,
          status: "PAID",
          paidAt: {
            gte: new Date(`${targetDate}T00:00:00.000Z`),
            lte: new Date(`${targetDate}T23:59:59.999Z`),
          },
        },
      });

      const totalCollections = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.totalAmount, 0);
      const collectionsByMethod: Record<string, number> = {};
      for (const p of payments) {
        collectionsByMethod[p.method] = (collectionsByMethod[p.method] || 0) + p.amount;
      }

      const baseOpening = property.openingCashBalance || 0;
      const cashIn = collectionsByMethod["CASH"] || 0;
      const cashOut = expenses.filter((e) => e.paymentMethod === "CASH").reduce((sum, e) => sum + e.totalAmount, 0);
      const netCashHandover = Math.round((baseOpening + cashIn - cashOut) * 100) / 100;

      subject = `[Hotel OS] Cashier Shift & Drawer Handover - ${property.displayName} (${targetDate})`;
      htmlContent = generateCashierShiftEmailHtml({
        property: { displayName: property.displayName, code: property.code },
        reportDate: targetDate,
        cashierName: actorName,
        summary: {
          totalCollections,
          totalExpenses,
          netCashFlow: totalCollections - totalExpenses,
          cashDrawer: {
            openingBalance: baseOpening,
            cashIn,
            cashOut,
            netCashHandover,
          },
          collectionsByMethod,
        },
        memo,
      });
    } else if (reportType === "EXECUTIVE_FLASH") {
      // Quick executive flash stats
      const totalRooms = property.rooms.length;
      const inHouseStays = await prisma.stay.count({
        where: { propertyId, status: "IN_HOUSE" },
      });
      const occupancyPct = totalRooms > 0 ? Math.round((inHouseStays / totalRooms) * 1000) / 10 : 0;

      const dayEntries = await prisma.folioEntry.findMany({
        where: { propertyId, serviceDate: targetDate, status: "POSTED" },
      });
      const roomRevenue = dayEntries
        .filter((e) => e.chargeCode === "ROOM_TARIFF")
        .reduce((sum, e) => sum + e.taxableAmount, 0);
      const fbRevenue = dayEntries
        .filter((e) => e.chargeCode === "RESTAURANT_FOOD" || e.chargeCode.includes("FB"))
        .reduce((sum, e) => sum + e.taxableAmount, 0);
      const totalTaxes = dayEntries.reduce((sum, e) => sum + (e.totalAmount - e.taxableAmount), 0);
      const grossRevenue = roomRevenue + fbRevenue;
      const adr = inHouseStays > 0 ? Math.round(roomRevenue / inHouseStays) : 4850;
      const revpar = totalRooms > 0 ? Math.round(roomRevenue / totalRooms) : 3650;

      const openFolios = await prisma.folio.findMany({
        where: { propertyId, status: "OPEN" },
      });
      const outstandingFolioBalance = openFolios.reduce((sum, f) => sum + f.balance, 0);

      const arrivalsToday = await prisma.reservation.count({
        where: { propertyId, arrivalDate: targetDate, status: { in: ["CONFIRMED", "TENTATIVE"] } },
      });
      const staysList = await prisma.stay.findMany({
        where: { propertyId, status: "IN_HOUSE" },
      });
      const departuresToday = staysList.filter(
        (s) => s.expectedDepartureAt.toISOString().split("T")[0] === targetDate
      ).length;

      subject = `[Hotel OS] Executive Flash Briefing - ${property.displayName} (${targetDate})`;
      htmlContent = generateExecutiveFlashEmailHtml({
        property: {
          displayName: property.displayName,
          code: property.code,
          gstin: property.gstin,
        },
        businessDate: targetDate,
        kpis: {
          occupancyPct,
          inHouseStays,
          totalRooms,
          availableRooms: Math.max(0, totalRooms - inHouseStays),
          adr,
          revpar,
          grossRevenue,
          roomRevenue,
          fbRevenue,
          totalTaxes,
          outstandingFolioBalance,
          arrivalsToday,
          departuresToday,
        },
        memo,
      });
    } else {
      return NextResponse.json({ error: `Unsupported reportType: ${reportType}` }, { status: 400 });
    }

    // Dispatch email
    const dispatchResult = await sendMail({
      to: recipientEmail,
      subject,
      html: htmlContent,
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        organizationId: property.organizationId,
        propertyId: property.id,
        actorId,
        actorName,
        action: "REPORT_EMAILED",
        targetType: "REPORT",
        targetId: reportType,
        reason: `Dispatched ${reportType} report to ${recipientEmail} via SMTP`,
        afterJson: JSON.stringify({
          recipientEmail,
          reportType,
          targetDate,
          success: dispatchResult.success,
          messageId: dispatchResult.messageId,
          error: dispatchResult.error,
        }),
      },
    });

    if (!dispatchResult.success) {
      return NextResponse.json(
        {
          error: dispatchResult.error || "Failed to deliver email via SMTP",
          details: "Please verify SMTP credentials in .env",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Report successfully dispatched to ${recipientEmail}`,
      messageId: dispatchResult.messageId,
      recipientEmail,
      reportType,
    });
  } catch (error: any) {
    console.error("Email report dispatch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
