/**
 * Executive HTML Email Templates for Hotel OS Operational & Financial Reports
 * Designed for cross-client compatibility (Gmail, Outlook, Apple Mail) with clean, high-contrast layout.
 */

function formatCurrency(amount: number): string {
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}

export function generateDailyAuditEmailHtml(data: {
  property: { displayName: string; code: string; gstin?: string | null };
  reportDate: string;
  generatedAt: string;
  summary: {
    totalCollections: number;
    collectionsCount: number;
    collectionsByMethod: Record<string, number>;
    totalExpenses: number;
    expensesCount: number;
    expensesByCategory: Record<string, number>;
    netCashFlow: number;
    cashDrawerPosition: {
      openingBalance: number;
      cashIn: number;
      cashOut: number;
      netCashInHand: number;
    };
    occupancyPct?: number;
    revpar?: number;
    adr?: number;
    totalRooms?: number;
    occupiedRooms?: number;
  };
  memo?: string;
}): string {
  const { property, reportDate, generatedAt, summary, memo } = data;
  const drawer = summary.cashDrawerPosition || {
    openingBalance: 0,
    cashIn: 0,
    cashOut: 0,
    netCashInHand: 0,
  };

  const methodRows = Object.entries(summary.collectionsByMethod || {})
    .filter(([_, val]) => val > 0)
    .map(
      ([method, amount]) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b; font-weight: 600;">${method.replace(/_/g, " ")}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(amount)}</td>
      </tr>
    `
    )
    .join("");

  const expenseRows = Object.entries(summary.expensesByCategory || {})
    .filter(([_, val]) => val > 0)
    .map(
      ([cat, amount]) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b; font-weight: 600;">${cat.replace(/_/g, " ")}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #dc2626; text-align: right; font-family: monospace; font-weight: 700;">-${formatCurrency(amount)}</td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Daily Manager Midnight Audit Report - ${property.displayName}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
    
    <!-- HEADER -->
    <div style="background-color: #0f172a; padding: 24px 28px; color: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #38bdf8; background-color: rgba(56, 189, 248, 0.15); padding: 4px 8px; border-radius: 6px;">
            12:00 AM - 12:00 AM Midnight Audit
          </span>
          <h1 style="margin: 10px 0 4px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
            ${property.displayName}
          </h1>
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">
            Operational Business Date: <strong style="color: #f8fafc;">${reportDate}</strong> &bull; Property Code: ${property.code}
          </p>
        </div>
      </div>
      ${memo ? `<div style="margin-top: 14px; padding: 10px 14px; background-color: rgba(255,255,255,0.08); border-radius: 8px; font-size: 12px; color: #e2e8f0;">${memo}</div>` : ""}
    </div>

    <!-- 4 CORE KPI TILES -->
    <div style="padding: 20px 24px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 25%; padding: 8px; vertical-align: top;">
            <div style="background-color: #ffffff; padding: 14px; border-radius: 10px; border: 1px solid #cbd5e1;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Collections</span>
              <div style="font-size: 18px; font-weight: 800; color: #16a34a; margin-top: 4px; font-family: monospace;">${formatCurrency(summary.totalCollections)}</div>
              <span style="font-size: 11px; color: #64748b;">${summary.collectionsCount} payments</span>
            </div>
          </td>
          <td style="width: 25%; padding: 8px; vertical-align: top;">
            <div style="background-color: #ffffff; padding: 14px; border-radius: 10px; border: 1px solid #cbd5e1;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Expenses</span>
              <div style="font-size: 18px; font-weight: 800; color: #dc2626; margin-top: 4px; font-family: monospace;">${formatCurrency(summary.totalExpenses)}</div>
              <span style="font-size: 11px; color: #64748b;">${summary.expensesCount} vouchers</span>
            </div>
          </td>
          <td style="width: 25%; padding: 8px; vertical-align: top;">
            <div style="background-color: #ffffff; padding: 14px; border-radius: 10px; border: 1px solid #cbd5e1;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Net Cash Flow</span>
              <div style="font-size: 18px; font-weight: 800; color: ${summary.netCashFlow >= 0 ? "#0284c7" : "#e11d48"}; margin-top: 4px; font-family: monospace;">${formatCurrency(summary.netCashFlow)}</div>
              <span style="font-size: 11px; color: #64748b;">Inflows minus Outflows</span>
            </div>
          </td>
          <td style="width: 25%; padding: 8px; vertical-align: top;">
            <div style="background-color: #ffffff; padding: 14px; border-radius: 10px; border: 1px solid #0f766e; background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);">
              <span style="font-size: 11px; font-weight: 700; color: #0f766e; text-transform: uppercase;">Till In-Hand</span>
              <div style="font-size: 18px; font-weight: 800; color: #047857; margin-top: 4px; font-family: monospace;">${formatCurrency(drawer.netCashInHand)}</div>
              <span style="font-size: 11px; color: #0f766e;">Physical Drawer Float</span>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- PHYSICAL CASH DRAWER RECONCILIATION -->
    <div style="padding: 24px; border-bottom: 1px solid #e2e8f0;">
      <h2 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; margin: 0 0 12px 0;">
        Physical Front Desk Till Reconciliation
      </h2>
      <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 14px; font-size: 13px; color: #475569;">1. Opening Drawer Float (Configured Base)</td>
          <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; font-family: monospace; text-align: right; color: #334155;">${formatCurrency(drawer.openingBalance)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 14px; font-size: 13px; color: #16a34a;">2. Plus Physical Cash Collections Today</td>
          <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; font-family: monospace; text-align: right; color: #16a34a;">+${formatCurrency(drawer.cashIn)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 14px; font-size: 13px; color: #dc2626;">3. Less Physical Cash Outflows (Vouchers & Drawings)</td>
          <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; font-family: monospace; text-align: right; color: #dc2626;">-${formatCurrency(drawer.cashOut)}</td>
        </tr>
        <tr style="background-color: #ecfdf5;">
          <td style="padding: 12px 14px; font-size: 14px; font-weight: 800; color: #065f46;">Net Physical Cash In Hand (Drawer Total)</td>
          <td style="padding: 12px 14px; font-size: 15px; font-weight: 800; font-family: monospace; text-align: right; color: #047857;">${formatCurrency(drawer.netCashInHand)}</td>
        </tr>
      </table>
    </div>

    <!-- COLLECTIONS & EXPENSES BREAKDOWN -->
    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <!-- Collections by Channel -->
          <td style="width: 50%; vertical-align: top; padding-right: 12px;">
            <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #334155; margin: 0 0 10px 0;">
              Collections by Method
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${methodRows || `<tr><td colspan="2" style="padding: 10px; font-size: 12px; color: #94a3b8;">No collections recorded</td></tr>`}
            </table>
          </td>

          <!-- Expenses by Category -->
          <td style="width: 50%; vertical-align: top; padding-left: 12px;">
            <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #334155; margin: 0 0 10px 0;">
              Expenses by Category
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${expenseRows || `<tr><td colspan="2" style="padding: 10px; font-size: 12px; color: #94a3b8;">No expenses recorded</td></tr>`}
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- FOOTER -->
    <div style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
      <p style="margin: 0;">
        Generated automatically by <strong>Hotel OS</strong> on ${generatedAt} &bull; Confidential Management Record
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

export function generateCashierShiftEmailHtml(data: {
  property: { displayName: string; code: string };
  reportDate: string;
  cashierName?: string;
  summary: {
    totalCollections: number;
    totalExpenses: number;
    netCashFlow: number;
    cashDrawer: {
      openingBalance: number;
      cashIn: number;
      cashOut: number;
      netCashHandover: number;
    };
    collectionsByMethod: Record<string, number>;
  };
  memo?: string;
}): string {
  const { property, reportDate, cashierName, summary, memo } = data;
  const drawer = summary.cashDrawer;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Cashier Shift & Drawer Handover - ${property.displayName}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
  <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background-color: #1e1b4b; padding: 24px; color: #ffffff;">
      <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #a5b4fc; background: rgba(165,180,252,0.15); padding: 4px 8px; border-radius: 6px;">
        Cashier Shift Handover
      </span>
      <h1 style="margin: 8px 0 4px 0; font-size: 20px; font-weight: 800; color: #ffffff;">
        ${property.displayName}
      </h1>
      <p style="margin: 0; font-size: 13px; color: #c7d2fe;">
        Date: <strong>${reportDate}</strong> &bull; Cashier: ${cashierName || "Front Desk Manager"}
      </p>
      ${memo ? `<div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.08); border-radius: 6px; font-size: 12px; color: #e0e7ff;">${memo}</div>` : ""}
    </div>

    <div style="padding: 24px;">
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b;">Closing Physical Till Handover</div>
        <div style="font-size: 26px; font-weight: 800; color: #047857; font-family: monospace; margin: 6px 0;">
          ${formatCurrency(drawer.netCashHandover)}
        </div>
        <div style="font-size: 12px; color: #475569;">
          Opening Float: ${formatCurrency(drawer.openingBalance)} &bull; Cash In: +${formatCurrency(drawer.cashIn)} &bull; Cash Out: -${formatCurrency(drawer.cashOut)}
        </div>
      </div>

      <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #334155; margin: 0 0 12px 0;">
        Shift Collections Summary
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Gross Total Collections (All Modes)</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; font-family: monospace; color: #16a34a;">${formatCurrency(summary.totalCollections)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b;">Petty Cash Expenses & Outflows</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; font-family: monospace; color: #dc2626;">-${formatCurrency(summary.totalExpenses)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-weight: 800; color: #0f172a;">Net Shift Inflow</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 800; font-family: monospace; color: #0284c7;">${formatCurrency(summary.netCashFlow)}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
      Front Desk Shift Audit &bull; Hotel OS System Notification
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateExecutiveFlashEmailHtml(data: {
  property: { displayName: string; code: string; gstin?: string | null };
  businessDate: string;
  kpis: {
    occupancyPct: number;
    inHouseStays: number;
    totalRooms: number;
    availableRooms: number;
    adr: number;
    revpar: number;
    grossRevenue: number;
    roomRevenue: number;
    fbRevenue: number;
    totalTaxes: number;
    outstandingFolioBalance: number;
    arrivalsToday: number;
    departuresToday: number;
  };
  memo?: string;
}): string {
  const { property, businessDate, kpis, memo } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Executive Flash Briefing - ${property.displayName}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
  <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background-color: #0f172a; padding: 24px; color: #ffffff;">
      <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #38bdf8; background: rgba(56,189,248,0.15); padding: 4px 8px; border-radius: 6px;">
        Executive Flash Briefing
      </span>
      <h1 style="margin: 8px 0 4px 0; font-size: 20px; font-weight: 800; color: #ffffff;">
        ${property.displayName}
      </h1>
      <p style="margin: 0; font-size: 13px; color: #94a3b8;">
        Date: <strong>${businessDate}</strong> &bull; Code: ${property.code}
      </p>
      ${memo ? `<div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.08); border-radius: 6px; font-size: 12px; color: #e2e8f0;">${memo}</div>` : ""}
    </div>

    <div style="padding: 24px;">
      <!-- TOP METRIC CARDS -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="width: 50%; padding-right: 8px;">
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px;">
              <span style="font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase;">Occupancy</span>
              <div style="font-size: 24px; font-weight: 800; color: #166534; font-family: monospace; margin: 4px 0;">
                ${kpis.occupancyPct}%
              </div>
              <span style="font-size: 12px; color: #15803d;">${kpis.inHouseStays} / ${kpis.totalRooms} rooms occupied</span>
            </div>
          </td>
          <td style="width: 50%; padding-left: 8px;">
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px;">
              <span style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">Gross Revenue</span>
              <div style="font-size: 24px; font-weight: 800; color: #1e40af; font-family: monospace; margin: 4px 0;">
                ${formatCurrency(kpis.grossRevenue)}
              </div>
              <span style="font-size: 12px; color: #1d4ed8;">Room + Dining Revenue</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- PERFORMANCE GRID -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 0; color: #64748b;">Average Daily Rate (ADR)</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; font-family: monospace;">${formatCurrency(kpis.adr)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 0; color: #64748b;">Revenue Per Available Room (RevPAR)</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; font-family: monospace;">${formatCurrency(kpis.revpar)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 0; color: #64748b;">Room Tariff Revenue</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; font-family: monospace;">${formatCurrency(kpis.roomRevenue)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 0; color: #64748b;">Food & Beverage Revenue</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; font-family: monospace;">${formatCurrency(kpis.fbRevenue)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 0; color: #64748b;">GST / Tax Collected</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; font-family: monospace;">${formatCurrency(kpis.totalTaxes)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 0; color: #e11d48; font-weight: 600;">Unsettled In-House Folio Dues</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; font-family: monospace; color: #e11d48;">${formatCurrency(kpis.outstandingFolioBalance)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748b;">Front Desk Movement Today</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #0f172a;">
            ${kpis.arrivalsToday} Arrivals &bull; ${kpis.departuresToday} Departures
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
      Hotel OS Executive Briefing &bull; Delivered to ${property.displayName} Management
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateComprehensiveHotelReportEmailHtml(data: {
  report: {
    property: {
      displayName: string;
      code: string;
      gstin: string | null;
      address: string | null;
      phone: string | null;
      businessDate: string;
    };
    reportDate: string;
    generatedAt: string;
    money: {
      grossRevenue: number;
      roomRevenue: number;
      fbRevenue: number;
      ancillaryRevenue: number;
      taxableTurnover: number;
      totalTaxes: number;
      totalCollections: number;
      collectionsCount: number;
      collectionsByMethod: Record<string, number>;
      internalTransfers?: {
        transferredDueToMaster: number;
        advanceAllocatedFromPool: number;
      };
      totalExpenses: number;
      expensesCount: number;
      expensesByCategory: Record<string, number>;
      cashDrawer: {
        openingBalance: number;
        cashIn: number;
        cashOut: number;
        netCashInHand: number;
      };
      netCashFlow: number;
    };
    rooms: {
      totalRooms: number;
      occupiedRooms: number;
      vacantRooms: number;
      occupancyPct: number;
      adr: number;
      revpar: number;
      inHouseGuestsCount: number;
      arrivalsToday: number;
      departuresToday: number;
      roomStates: {
        inspected: number;
        clean: number;
        dirty: number;
        maintenance: number;
      };
    };
    adminModifications: {
      totalModificationsCount: number;
      records: Array<{
        timeFormatted: string;
        actorName: string;
        actionLabel: string;
        summary: string;
        reason: string;
      }>;
    };
  };
  memo?: string;
}): string {
  const { report, memo } = data;
  const { property, money, rooms, adminModifications } = report;

  const paymentModes = [
    { key: "CASH", label: "CASH" },
    { key: "UPI", label: "UPI" },
    { key: "BTC", label: "BTC (Bill to Company)" },
    { key: "CARD", label: "CARD" },
    { key: "BANK_TRANSFER", label: "BANK TRANSFER" },
    { key: "CHEQUE", label: "CHEQUE" },
  ];

  const tenderRows = paymentModes
    .map(({ key, label }) => {
      const amount = (money.collectionsByMethod as Record<string, number | undefined>)[key] || 0;
      if (key === "CHEQUE" && amount === 0) return "";
      return `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b; font-weight: 600;">${label}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #0f172a; text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(amount)}</td>
      </tr>`;
    })
    .join("");

  const extraTenderRows = Object.entries(money.collectionsByMethod || {})
    .filter(([m, val]) => !["CASH", "UPI", "BTC", "CARD", "BANK_TRANSFER", "CHEQUE", "OUTSTANDING", "TRANSFER", "ADVANCE_ALLOCATION"].includes(m) && (val || 0) > 0)
    .map(
      ([method, amount]) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b; font-weight: 600;">${method.replace(/_/g, " ")}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #0f172a; text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(amount || 0)}</td>
      </tr>`
    )
    .join("");

  const outstandingAmt = (money.collectionsByMethod as Record<string, number | undefined>)?.OUTSTANDING || 0;
  const outstandingRow = `
    <tr style="background-color: #fffbeb;">
      <td style="padding: 8px 12px; border-top: 1px solid #fde68a; font-size: 12px; color: #92400e; font-weight: 700;">OUTSTANDING (Pending Dues)</td>
      <td style="padding: 8px 12px; border-top: 1px solid #fde68a; font-size: 12px; color: #b45309; text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(outstandingAmt)}</td>
    </tr>`;

  const internalTransfersNote = money.internalTransfers &&
    (money.internalTransfers.transferredDueToMaster > 0 || money.internalTransfers.advanceAllocatedFromPool > 0)
      ? `
      <div style="padding: 8px 12px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b;">
        Reconciled Internal: ${money.internalTransfers.transferredDueToMaster > 0 ? `${formatCurrency(money.internalTransfers.transferredDueToMaster)} to Master` : ""}
        ${money.internalTransfers.transferredDueToMaster > 0 && money.internalTransfers.advanceAllocatedFromPool > 0 ? " &bull; " : ""}
        ${money.internalTransfers.advanceAllocatedFromPool > 0 ? `${formatCurrency(money.internalTransfers.advanceAllocatedFromPool)} from Advance Pool` : ""}
      </div>`
      : "";

  const expenseCategoryRows = Object.entries(money.expensesByCategory || {})
    .filter(([_, val]) => val > 0)
    .map(
      ([category, amount]) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b; font-weight: 600;">${category.replace(/_/g, " ")}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #b91c1c; text-align: right; font-family: monospace; font-weight: 700;">-${formatCurrency(amount)}</td>
      </tr>`
    )
    .join("");

  const adminRows = adminModifications.records.slice(0, 15).map(
    (record) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 12px; font-size: 12px; font-family: monospace; color: #64748b; vertical-align: top;">${record.timeFormatted}</td>
      <td style="padding: 10px 12px; font-size: 12px; vertical-align: top;">
        <div style="font-weight: 700; color: #0f172a;">${record.actionLabel}</div>
        <div style="font-size: 11px; color: #475569; margin-top: 2px;">${record.summary}</div>
      </td>
      <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #334155; vertical-align: top; white-space: nowrap;">${record.actorName}</td>
    </tr>`
  ).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Comprehensive Hotel Master Report - ${property.displayName}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 720px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
    
    <!-- HEADER -->
    <div style="background-color: #090d16; padding: 26px 30px; color: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #38bdf8; background-color: rgba(56, 189, 248, 0.15); padding: 4px 10px; border-radius: 6px; display: inline-block;">
            Hotel OS &bull; Daily Master Operations & Audit
          </span>
          <h1 style="margin: 10px 0 4px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
            ${property.displayName}
          </h1>
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">
            Business Date: <strong style="color: #f8fafc;">${report.reportDate}</strong> &bull; Property Code: <strong style="color: #38bdf8;">${property.code}</strong>
          </p>
          ${property.gstin ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px;">GSTIN: ${property.gstin}</div>` : ""}
        </div>
      </div>
      ${memo ? `<div style="margin-top: 14px; padding: 10px 14px; background-color: rgba(255,255,255,0.08); border-radius: 8px; font-size: 12px; color: #e2e8f0;">${memo}</div>` : ""}
    </div>

    <!-- 5 CORE KPI TILES -->
    <div style="padding: 18px 24px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 20%; padding: 6px; vertical-align: top;">
            <div style="background-color: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1;">
              <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Gross Revenue</span>
              <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace;">${formatCurrency(money.grossRevenue)}</div>
              <span style="font-size: 10px; color: #64748b;">Turnover</span>
            </div>
          </td>
          <td style="width: 20%; padding: 6px; vertical-align: top;">
            <div style="background-color: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1;">
              <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Collections</span>
              <div style="font-size: 16px; font-weight: 800; color: #15803d; margin-top: 4px; font-family: monospace;">${formatCurrency(money.totalCollections)}</div>
              <span style="font-size: 10px; color: #64748b;">${money.collectionsCount} receipts</span>
            </div>
          </td>
          <td style="width: 20%; padding: 6px; vertical-align: top;">
            <div style="background-color: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1;">
              <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Occupancy</span>
              <div style="font-size: 16px; font-weight: 800; color: #0284c7; margin-top: 4px; font-family: monospace;">${rooms.occupancyPct}%</div>
              <span style="font-size: 10px; color: #64748b;">${rooms.occupiedRooms}/${rooms.totalRooms} rooms</span>
            </div>
          </td>
          <td style="width: 20%; padding: 6px; vertical-align: top;">
            <div style="background-color: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #0f766e; background-color: #f0fdf4;">
              <span style="font-size: 10px; font-weight: 700; color: #0f766e; text-transform: uppercase;">Cash in Till</span>
              <div style="font-size: 16px; font-weight: 800; color: #047857; margin-top: 4px; font-family: monospace;">${formatCurrency(money.cashDrawer.netCashInHand)}</div>
              <span style="font-size: 10px; color: #0f766e;">Drawer Float</span>
            </div>
          </td>
          <td style="width: 20%; padding: 6px; vertical-align: top;">
            <div style="background-color: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1;">
              <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Admin Mods</span>
              <div style="font-size: 16px; font-weight: 800; color: #7c3aed; margin-top: 4px; font-family: monospace;">${adminModifications.totalModificationsCount}</div>
              <span style="font-size: 10px; color: #64748b;">Audit logs</span>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- SECTION 1: DAILY MONEY SUMMARY -->
    <div style="padding: 24px; border-bottom: 1px solid #e2e8f0;">
      <h2 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin: 0 0 14px 0;">
        1. Daily Money & Financial Position
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <!-- Collections Table -->
          <td style="width: 50%; padding-right: 12px; vertical-align: top;">
            <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
              <div style="background-color: #f8fafc; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">
                Mode of Payments
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                ${tenderRows || ""}${extraTenderRows || ""}
                <tr style="background-color: #f0fdf4;">
                  <td style="padding: 10px 12px; font-size: 12px; font-weight: 800; color: #166534;">Total Tender Collections</td>
                  <td style="padding: 10px 12px; font-size: 13px; font-weight: 800; color: #166534; text-align: right; font-family: monospace;">${formatCurrency(money.totalCollections)}</td>
                </tr>
                ${outstandingRow}
              </table>
              ${internalTransfersNote}
            </div>
          </td>
          <!-- Expenses Table -->
          <td style="width: 50%; padding-left: 12px; vertical-align: top;">
            <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
              <div style="background-color: #f8fafc; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">
                Expenses & Payouts by Category
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                ${expenseCategoryRows || '<tr><td colspan="2" style="padding: 12px; font-size: 12px; color: #94a3b8; text-align: center;">No expenses recorded</td></tr>'}
                <tr style="background-color: #fef2f2;">
                  <td style="padding: 10px 12px; font-size: 12px; font-weight: 800; color: #991b1b;">Total Expenses</td>
                  <td style="padding: 10px 12px; font-size: 13px; font-weight: 800; color: #991b1b; text-align: right; font-family: monospace;">-${formatCurrency(money.totalExpenses)}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- Physical Cash Drawer Reconciliation Box -->
      <div style="margin-top: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f766e; margin-bottom: 8px;">
          Front Desk Cash Drawer Reconciliation
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="color: #64748b; padding: 4px 0;">Opening Float: <strong style="color: #0f172a; font-family: monospace;">${formatCurrency(money.cashDrawer.openingBalance)}</strong></td>
            <td style="color: #16a34a; padding: 4px 0;">+ Cash Inflows: <strong style="font-family: monospace;">+${formatCurrency(money.cashDrawer.cashIn)}</strong></td>
            <td style="color: #dc2626; padding: 4px 0;">- Cash Outflows: <strong style="font-family: monospace;">-${formatCurrency(money.cashDrawer.cashOut)}</strong></td>
            <td style="color: #047857; font-weight: 800; text-align: right; padding: 4px 0;">Till Total: <span style="font-family: monospace; font-size: 14px;">${formatCurrency(money.cashDrawer.netCashInHand)}</span></td>
          </tr>
        </table>
      </div>
    </div>

    <!-- SECTION 2: DAILY ROOMS & OPERATIONS -->
    <div style="padding: 24px; border-bottom: 1px solid #e2e8f0;">
      <h2 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin: 0 0 14px 0;">
        2. Daily Room Inventory & Guest Operations
      </h2>
      <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 12px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 14px; color: #475569;">Total Inventory</td>
          <td style="padding: 10px 14px; font-weight: 700; text-align: right;">${rooms.totalRooms} Rooms</td>
          <td style="padding: 10px 14px; color: #475569; border-left: 1px solid #e2e8f0;">Occupied Rooms</td>
          <td style="padding: 10px 14px; font-weight: 700; color: #0284c7; text-align: right;">${rooms.occupiedRooms} (${rooms.occupancyPct}%)</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 14px; color: #475569;">Average Daily Rate (ADR)</td>
          <td style="padding: 10px 14px; font-weight: 700; font-family: monospace; text-align: right;">${formatCurrency(rooms.adr)}</td>
          <td style="padding: 10px 14px; color: #475569; border-left: 1px solid #e2e8f0;">RevPAR</td>
          <td style="padding: 10px 14px; font-weight: 700; font-family: monospace; text-align: right;">${formatCurrency(rooms.revpar)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 14px; color: #475569;">In-House Headcount</td>
          <td style="padding: 10px 14px; font-weight: 700; text-align: right;">${rooms.inHouseGuestsCount} Guests</td>
          <td style="padding: 10px 14px; color: #475569; border-left: 1px solid #e2e8f0;">Desk Movement Today</td>
          <td style="padding: 10px 14px; font-weight: 700; text-align: right;">${rooms.arrivalsToday} Arr / ${rooms.departuresToday} Dep</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #475569;">Housekeeping Status</td>
          <td colspan="3" style="padding: 10px 14px; text-align: right; color: #334155;">
            <strong style="color: #16a34a;">${rooms.roomStates.inspected} Inspected</strong> &bull;
            <strong style="color: #0284c7;">${rooms.roomStates.clean} Clean</strong> &bull;
            <strong style="color: #ca8a04;">${rooms.roomStates.dirty} Dirty</strong> &bull;
            <strong style="color: #dc2626;">${rooms.roomStates.maintenance} Out of Order</strong>
          </td>
        </tr>
      </table>
    </div>

    <!-- SECTION 3: ADMIN & MANAGEMENT MODIFICATIONS -->
    <div style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h2 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin: 0;">
          3. Modifications Made Through Admin / Management
        </h2>
        <span style="font-size: 11px; font-weight: 700; background-color: #f3e8ff; color: #7e22ce; padding: 2px 8px; border-radius: 9999px;">
          ${adminModifications.totalModificationsCount} Events Recorded
        </span>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b;">
            <th style="padding: 8px 12px; text-align: left; width: 60px;">Time</th>
            <th style="padding: 8px 12px; text-align: left;">Modification Details</th>
            <th style="padding: 8px 12px; text-align: left; width: 120px;">Staff / Role</th>
          </tr>
        </thead>
        <tbody>
          ${adminRows || '<tr><td colspan="3" style="padding: 16px; font-size: 12px; color: #94a3b8; text-align: center;">No admin modifications made on this business date.</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- FOOTER -->
    <div style="background-color: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
      <div><strong>${property.displayName}</strong> &bull; ${property.address || "MD Shah Road, Paltan Bazar, Guwahati"}</div>
      <div style="margin-top: 4px;">Hotel OS Automated Intelligence Audit &bull; Generated ${report.generatedAt}</div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

