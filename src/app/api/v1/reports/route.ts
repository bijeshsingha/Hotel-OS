import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const reportType = searchParams.get("type") || "CASHIER_COLLECTIONS_EXPENSES";

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    // 1. DAILY COLLECTIONS & EXPENSES COMPREHENSIVE CASHIER AUDIT
    if (reportType === "CASHIER_COLLECTIONS_EXPENSES" || reportType === "COLLECTIONS" || reportType === "EXPENSES") {
      const [payments, expenses, property] = await Promise.all([
        prisma.payment.findMany({
          where: { propertyId, status: "SUCCEEDED" },
          include: {
            folio: {
              include: {
                stay: {
                  include: {
                    primaryGuest: true,
                    roomAssignments: { include: { room: true } },
                  },
                },
              },
            },
          },
          orderBy: { receivedAt: "desc" },
        }),
        prisma.expense.findMany({
          where: { propertyId, status: "PAID" },
          orderBy: { paidAt: "desc" },
        }),
        prisma.property.findUnique({
          where: { id: propertyId },
          select: { displayName: true, code: true, gstin: true, businessDate: true },
        }),
      ]);

      const formattedCollections = payments.map((p) => {
        let payerName = "Guest Payer";
        let roomNumber = "—";
        let stayId = p.folio?.stayId || "—";

        if (p.payerSnapshot) {
          try {
            const parsed = JSON.parse(p.payerSnapshot);
            if (parsed.name) payerName = parsed.name;
          } catch (e) {}
        }
        if (p.folio?.stay?.primaryGuest?.name) {
          payerName = p.folio.stay.primaryGuest.name;
        }
        if (p.folio?.stay?.roomAssignments?.[0]?.room?.number) {
          roomNumber = p.folio.stay.roomAssignments[0].room.number;
        }

        const refLower = (p.reference || "").toLowerCase();
        const methodUpper = (p.method || "").toUpperCase();

        // Determine Collection Channel / Source Bifurcation
        let sourceCategory = "FOLIO_SETTLEMENT";
        let sourceLabel = "Room Folio Settlement";

        if (
          p.reservationId ||
          refLower.includes("grc-deposit") ||
          refLower.includes("advance") ||
          refLower.includes("deposit") ||
          refLower.includes("kiosk")
        ) {
          sourceCategory = "ADVANCE_DEPOSIT";
          sourceLabel = "Advance Deposit";
        } else if (
          p.orderId ||
          refLower.includes("pos") ||
          refLower.includes("order-") ||
          refLower.includes("restaurant") ||
          refLower.includes("dining")
        ) {
          sourceCategory = "POS_RESTAURANT";
          sourceLabel = "Restaurant / POS Direct";
        } else if (
          methodUpper === "OTA_VCC" ||
          methodUpper === "DIRECT_BILL" ||
          refLower.includes("ota") ||
          refLower.includes("makemytrip") ||
          refLower.includes("booking.com") ||
          refLower.includes("agoda") ||
          refLower.includes("mmt") ||
          refLower.includes("goibibo")
        ) {
          sourceCategory = "OTA_COLLECTION";
          sourceLabel = "OTA / Channel / VCC";
        } else if (p.folioId) {
          sourceCategory = "FOLIO_SETTLEMENT";
          sourceLabel = "Folio Settlement";
        } else {
          sourceCategory = "DIRECT_PAYMENT";
          sourceLabel = "Direct Collection";
        }

        return {
          id: p.id,
          receiptNo: p.receiptNo,
          date: p.receivedAt.toISOString().split("T")[0],
          time: p.receivedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          fullTimestamp: p.receivedAt.toISOString(),
          type: "COLLECTION",
          sourceCategory,
          sourceLabel,
          collectionType: sourceLabel,
          payerName,
          roomNumber,
          stayId,
          folioId: p.folioId || "—",
          amount: p.amount,
          method: p.method, // UPI, CASH, CARD, OTA_VCC, BANK_TRANSFER, DIRECT_BILL
          reference: p.reference || "N/A",
          status: p.status,
          receivedBy: "Front Desk Cashier",
        };
      });

      const formattedExpenses = expenses.map((e) => ({
        id: e.id,
        voucherNo: e.voucherNo,
        date: e.paidAt.toISOString().split("T")[0],
        time: e.paidAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        fullTimestamp: e.paidAt.toISOString(),
        type: "EXPENSE",
        category: e.category, // DRIVER_COMMISSION, VENDOR_PAYMENT, STAFF_ADVANCE, FB_PURCHASE, MAINTENANCE, HOUSEKEEPING, PETTY_CASH, UTILITIES, GUEST_REFUND
        payeeName: e.payeeName,
        description: e.description,
        amount: e.amount,
        taxAmount: e.taxAmount,
        totalAmount: e.totalAmount,
        method: e.paymentMethod, // CASH, UPI, BANK_TRANSFER, CHEQUE
        reference: e.reference || "Voucher Record",
        status: e.status,
        authorizedBy: e.createdByName || "Hotel Manager",
      }));

      // Method & Source Breakdown for Collections
      const collectionsByMethod: Record<string, number> = {
        UPI: 0,
        CASH: 0,
        CARD: 0,
        OTA_VCC: 0,
        BANK_TRANSFER: 0,
        DIRECT_BILL: 0,
        CHEQUE: 0,
      };

      const collectionsBySource: Record<string, number> = {
        ADVANCE_DEPOSIT: 0,
        FOLIO_SETTLEMENT: 0,
        POS_RESTAURANT: 0,
        OTA_COLLECTION: 0,
        DIRECT_PAYMENT: 0,
      };

      let totalCollections = 0;
      formattedCollections.forEach((c) => {
        totalCollections += c.amount;
        const m = c.method || "CASH";
        collectionsByMethod[m] = (collectionsByMethod[m] || 0) + c.amount;
        const src = c.sourceCategory || "FOLIO_SETTLEMENT";
        collectionsBySource[src] = (collectionsBySource[src] || 0) + c.amount;
      });

      // Category & Method Breakdown for Expenses
      const expensesByCategory: Record<string, number> = {
        DRIVER_COMMISSION: 0,
        VENDOR_PAYMENT: 0,
        STAFF_ADVANCE: 0,
        FB_PURCHASE: 0,
        MAINTENANCE: 0,
        HOUSEKEEPING: 0,
        PETTY_CASH: 0,
        UTILITIES: 0,
        GUEST_REFUND: 0,
        OTHER: 0,
      };
      const expensesByMethod: Record<string, number> = {
        CASH: 0,
        UPI: 0,
        BANK_TRANSFER: 0,
        CHEQUE: 0,
      };
      let totalExpenses = 0;
      formattedExpenses.forEach((e) => {
        totalExpenses += e.totalAmount;
        const cat = e.category || "OTHER";
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.totalAmount;
        const m = e.method || "CASH";
        expensesByMethod[m] = (expensesByMethod[m] || 0) + e.totalAmount;
      });

      const cashCollections = collectionsByMethod["CASH"] || 0;
      const cashExpenses = expensesByMethod["CASH"] || 0;
      const netCashFlow = totalCollections - totalExpenses;
      const netCashDrawer = cashCollections - cashExpenses;

      return NextResponse.json({
        reportType,
        generatedAt: new Date().toISOString(),
        property,
        summary: {
          totalCollections,
          collectionsCount: formattedCollections.length,
          collectionsByMethod,
          collectionsBySource,
          totalExpenses,
          expensesCount: formattedExpenses.length,
          expensesByCategory,
          expensesByMethod,
          netCashFlow,
          cashDrawerPosition: {
            cashIn: cashCollections,
            cashOut: cashExpenses,
            netCashInHand: netCashDrawer,
          },
        },
        collections: formattedCollections,
        expenses: formattedExpenses,
        // Combined chronological audit feed
        allTransactions: [
          ...formattedCollections.map((c) => ({
            ...c,
            recordId: c.receiptNo,
            flow: "INFLOW",
            party: c.payerName,
            particulars: `Room ${c.roomNumber} (${c.sourceLabel})`,
            netAmount: c.amount,
          })),
          ...formattedExpenses.map((e) => ({
            ...e,
            recordId: e.voucherNo,
            flow: "OUTFLOW",
            party: e.payeeName,
            particulars: `${e.category.replace("_", " ")}: ${e.description}`,
            netAmount: -e.totalAmount,
          })),
        ].sort((a, b) => new Date(b.fullTimestamp).getTime() - new Date(a.fullTimestamp).getTime()),
      });
    }

    // 2. FRONT OFFICE GUEST LEDGER
    if (reportType === "FRONT_OFFICE") {
      const stays = await prisma.stay.findMany({
        where: { propertyId },
        include: {
          primaryGuest: true,
          roomAssignments: { include: { room: { include: { roomType: true } } } },
          folio: true,
        },
        orderBy: { arrivalAt: "desc" },
      });

      return NextResponse.json({
        reportType,
        generatedAt: new Date().toISOString(),
        rows: stays.map((s) => ({
          stayId: s.id,
          guestName: s.primaryGuest.name,
          phone: s.primaryGuest.phone,
          roomNumber: s.roomAssignments[0]?.room.number || "Unassigned",
          roomType: s.roomAssignments[0]?.room.roomType.name || "N/A",
          arrival: s.arrivalAt.toISOString().split("T")[0],
          departure: s.expectedDepartureAt.toISOString().split("T")[0],
          status: s.status,
          folioBalance: s.folio?.balance || 0,
        })),
      });
    }

    // 3. REVENUE & GST JOURNAL
    if (reportType === "REVENUE") {
      const entries = await prisma.folioEntry.findMany({
        where: { propertyId, status: "POSTED" },
        include: { folio: { include: { stay: { include: { primaryGuest: true } } } } },
        orderBy: { postedAt: "desc" },
      });

      return NextResponse.json({
        reportType,
        generatedAt: new Date().toISOString(),
        rows: entries.map((e) => ({
          id: e.id,
          serviceDate: e.serviceDate,
          chargeCode: e.chargeCode,
          description: e.description,
          guestName: e.folio.stay.primaryGuest.name,
          taxableAmount: e.taxableAmount,
          totalAmount: e.totalAmount,
          taxAmount: e.totalAmount - e.taxableAmount,
        })),
      });
    }

    // 4. F&B SALES REPORT
    if (reportType === "FNB") {
      const orders = await prisma.order.findMany({
        where: { propertyId },
        include: {
          outlet: true,
          table: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        reportType,
        generatedAt: new Date().toISOString(),
        rows: orders.map((o) => ({
          orderNo: o.orderNo,
          outletName: o.outlet.name,
          mode: o.mode,
          tableName: o.table?.name || "Room Service / Takeaway",
          itemCount: o.items.length,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
        })),
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
