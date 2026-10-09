import { NextResponse } from "next/server";
import { getExecutiveReport } from "@/lib/domain/executive-report-service";
import { generateExecutiveReportExcel } from "@/lib/domain/executive-report-excel";
import { sendMail } from "@/lib/email/mailer";
import { formatINR } from "@/lib/gst/calculator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      startDate,
      endDate,
      recipientEmail: rawRecipientEmail,
      subject: customSubject,
      memo,
      attachExcel = true,
      senderName = "Hotel Management",
    } = body;

    const recipientEmail = rawRecipientEmail?.trim();
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid recipient email address is required" },
        { status: 400 }
      );
    }

    const report = await getExecutiveReport({
      propertyId,
      startDate,
      endDate,
    });

    const isSingleDay = report.filter.startDate === report.filter.endDate;
    const periodLabel = isSingleDay
      ? report.filter.startDate
      : `${report.filter.startDate} to ${report.filter.endDate}`;

    const subject =
      customSubject?.trim() ||
      `Executive Daily Report: ${report.property.displayName} (${periodLabel})`;

    // Generate HTML email content with strict antislop formatting (no em dashes, high contrast, clean typography)
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; line-height: 1.5; }
    .container { max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .header { background: #0f172a; color: #ffffff; padding: 24px; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
    .header p { margin: 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 24px; }
    .memo-box { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 14px; margin-bottom: 24px; font-size: 14px; color: #1e293b; border-radius: 0 4px 4px 0; }
    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 24px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .metrics-grid { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .metrics-grid th { text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; }
    .metrics-grid td { padding: 10px 12px; font-size: 13px; border: 1px solid #e2e8f0; }
    .val { font-weight: 600; text-align: right; }
    .alert-banner { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Executive Management Report</h1>
      <p>${report.property.displayName} | Period: ${periodLabel} | Generated: ${report.filter.generatedAt}</p>
    </div>
    <div class="content">
      ${
        memo
          ? `<div class="memo-box"><strong>Management Memo:</strong><br>${escapeHtml(
              memo
            )}</div>`
          : ""
      }

      <div class="section-title">Key Hotel Performance Indicators</div>
      <table class="metrics-grid">
        <tr>
          <th>Metric</th>
          <th style="text-align: right;">Current Period</th>
          <th style="text-align: right;">Prior Period</th>
          <th style="text-align: right;">Variance</th>
        </tr>
        <tr>
          <td>Occupancy Rate</td>
          <td class="val">${report.summary.occupancyPct.current.toFixed(1)}%</td>
          <td class="val">${report.summary.occupancyPct.previous.toFixed(1)}%</td>
          <td class="val">${report.summary.occupancyPct.pctChange >= 0 ? "+" : ""}${report.summary.occupancyPct.pctChange.toFixed(1)}%</td>
        </tr>
        <tr>
          <td>Average Daily Rate (ADR)</td>
          <td class="val">${formatINR(report.summary.adr.current)}</td>
          <td class="val">${formatINR(report.summary.adr.previous)}</td>
          <td class="val">${report.summary.adr.pctChange >= 0 ? "+" : ""}${report.summary.adr.pctChange.toFixed(1)}%</td>
        </tr>
        <tr>
          <td>RevPAR</td>
          <td class="val">${formatINR(report.summary.revpar.current)}</td>
          <td class="val">${formatINR(report.summary.revpar.previous)}</td>
          <td class="val">${report.summary.revpar.pctChange >= 0 ? "+" : ""}${report.summary.revpar.pctChange.toFixed(1)}%</td>
        </tr>
        <tr>
          <td>Rooms Sold / Available</td>
          <td class="val">${report.summary.roomsSold.current} / ${report.summary.availableRoomNights}</td>
          <td class="val">${report.summary.roomsSold.previous} / ${report.summary.availableRoomNights}</td>
          <td class="val">${report.summary.roomsSold.pctChange >= 0 ? "+" : ""}${report.summary.roomsSold.pctChange.toFixed(1)}%</td>
        </tr>
        <tr>
          <td>In-House Guests (Adults / Children)</td>
          <td class="val">${report.summary.inHouseGuestsCount.current} (${report.summary.checkInAdults} / ${report.summary.checkInChildren})</td>
          <td class="val">${report.summary.inHouseGuestsCount.previous}</td>
          <td class="val">${report.summary.inHouseGuestsCount.pctChange >= 0 ? "+" : ""}${report.summary.inHouseGuestsCount.pctChange.toFixed(1)}%</td>
        </tr>
      </table>

      <div class="section-title">Financial Performance: Earned Revenue vs Collections</div>
      <table class="metrics-grid">
        <tr>
          <td>Earned Room Revenue</td>
          <td class="val">${formatINR(report.summary.roomRevenue.current)}</td>
        </tr>
        <tr>
          <td>Earned Food and Beverage Revenue</td>
          <td class="val">${formatINR(report.summary.foodRevenue.current)}</td>
        </tr>
        <tr>
          <td>Earned Other Services Revenue</td>
          <td class="val">${formatINR(report.summary.otherRevenue.current)}</td>
        </tr>
        <tr style="background: #f8fafc; font-weight: 700;">
          <td>Total Earned Revenue (Excluding Tax)</td>
          <td class="val">${formatINR(report.summary.totalRevenue.current)}</td>
        </tr>
        <tr style="background: #f0fdf4; font-weight: 700;">
          <td>Total Money Collected (Cash, UPI, Cards, Bank)</td>
          <td class="val" style="color: #166534;">${formatINR(report.summary.totalCollections.current)}</td>
        </tr>
        <tr>
          <td>Total Operating Expenses Incurred</td>
          <td class="val" style="color: #991b1b;">${formatINR(report.summary.totalExpenses.current)}</td>
        </tr>
        <tr style="font-weight: 700;">
          <td>Net Operational Surplus (Earned Revenue minus Expenses)</td>
          <td class="val" style="color: ${report.insights.netOperationalSurplus >= 0 ? "#166534" : "#991b1b"};">
            ${formatINR(report.insights.netOperationalSurplus)}
          </td>
        </tr>
      </table>

      ${
        report.highReceivables.totalOverThresholdCount > 0
          ? `
      <div class="alert-banner">
        <strong>High Balance Notice:</strong> ${report.highReceivables.totalOverThresholdCount} room account(s) have outstanding balances exceeding ₹5,000, totaling ${formatINR(report.highReceivables.totalOverThresholdAmount)}.
      </div>
      `
          : ""
      }

      <div class="section-title">Cash Drawer Movement & Reconciliation</div>
      <table class="metrics-grid">
        <tr>
          <td>Opening Cash Balance</td>
          <td class="val">${formatINR(report.cashReconciliation.openingBalance)}</td>
        </tr>
        <tr>
          <td>Cash Collections Received</td>
          <td class="val" style="color: #166534;">+${formatINR(report.cashReconciliation.cashCollections)}</td>
        </tr>
        <tr>
          <td>Cash Paid Out (Petty Expenses)</td>
          <td class="val" style="color: #991b1b;">-${formatINR(report.cashReconciliation.cashExpenses)}</td>
        </tr>
        <tr style="background: #f8fafc; font-weight: 700;">
          <td>Expected Closing Cash</td>
          <td class="val">${formatINR(report.cashReconciliation.expectedClosingCash)}</td>
        </tr>
        ${
          report.cashReconciliation.actualClosingCash !== null
            ? `
        <tr>
          <td>Actual Physical Closing Cash</td>
          <td class="val">${formatINR(report.cashReconciliation.actualClosingCash)}</td>
        </tr>
        <tr style="font-weight: 700; color: ${report.cashReconciliation.discrepancy === 0 ? "#166534" : "#991b1b"};">
          <td>Cash Discrepancy</td>
          <td class="val">${formatINR(report.cashReconciliation.discrepancy || 0)}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>
    <div class="footer">
      Sent by ${escapeHtml(senderName)} via Hotel OS Operations.<br>
      This email contains business confidential data. Property Timezone: ${report.property.timezone}.
    </div>
  </div>
</body>
</html>
    `;

    // Attach Excel workbook if requested
    const attachments = [];
    if (attachExcel) {
      const excelBuffer = await generateExecutiveReportExcel(report);
      const safePropertyCode = (report.property.code || "HOTEL").replace(/[^a-zA-Z0-9_-]/g, "");
      const dateRangeSlug = report.filter.startDate === report.filter.endDate
        ? report.filter.startDate
        : `${report.filter.startDate}_to_${report.filter.endDate}`;
      const filename = `Executive_Report_${safePropertyCode}_${dateRangeSlug}.xlsx`;

      attachments.push({
        filename,
        content: excelBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    }

    const mailResult = await sendMail({
      to: recipientEmail,
      subject,
      html,
      attachments,
    });

    if (!mailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: mailResult.error || "Failed to dispatch email via SMTP transporter",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: mailResult.messageId,
      recipient: recipientEmail,
      subject,
      attachedExcel: attachExcel,
    });
  } catch (error: any) {
    console.error("Executive report email dispatch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to dispatch executive report email",
      },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
