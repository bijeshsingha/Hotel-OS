import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getMidnightDayBoundaries } from "@/lib/domain/daily-report-service";
import { calculateGST } from "@/lib/gst/calculator";
import { isEntryForRoom } from "@/lib/domain/folio-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const reportType = searchParams.get("type") || "CASHIER_COLLECTIONS_EXPENSES";
    const date = searchParams.get("date") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    // Compute 12 AM to 12 AM Midnight Date Range Boundaries
    let dateFilter: { gte: Date; lte: Date } | undefined = undefined;
    if (date) {
      const bounds = getMidnightDayBoundaries(date);
      dateFilter = {
        gte: bounds.localStart < bounds.startUtc ? bounds.localStart : bounds.startUtc,
        lte: bounds.localEnd > bounds.endUtc ? bounds.localEnd : bounds.endUtc,
      };
    } else if (startDate && endDate) {
      const s = getMidnightDayBoundaries(startDate);
      const e = getMidnightDayBoundaries(endDate);
      dateFilter = {
        gte: s.localStart < s.startUtc ? s.localStart : s.startUtc,
        lte: e.localEnd > e.endUtc ? e.localEnd : e.endUtc,
      };
    }

    // 1. DAILY COLLECTIONS & EXPENSES COMPREHENSIVE CASHIER AUDIT
    if (reportType === "CASHIER_COLLECTIONS_EXPENSES" || reportType === "COLLECTIONS" || reportType === "EXPENSES") {
      const paymentWhere: any = { propertyId, status: "SUCCEEDED" };
      if (dateFilter) {
        paymentWhere.receivedAt = dateFilter;
      }


      const expenseWhere: any = { propertyId, status: "PAID" };
      if (date) {
        expenseWhere.OR = [
          { businessDate: date },
          { paidAt: dateFilter },
        ];
      } else if (dateFilter) {
        expenseWhere.paidAt = dateFilter;
      }


      const [payments, expenses, property] = await Promise.all([
        prisma.payment.findMany({
          where: paymentWhere,
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
          where: expenseWhere,
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
        let incomeCategory = "";
        let incomeCategoryLabel = "";
        let snapshot: any = {};

        if (p.payerSnapshot) {
          try {
            snapshot = JSON.parse(p.payerSnapshot);
            if (snapshot.name) payerName = snapshot.name;
            if (snapshot.category) incomeCategory = snapshot.category;
            if (snapshot.categoryLabel) incomeCategoryLabel = snapshot.categoryLabel;
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
          incomeCategory === "BAR_FOOD_BILL" ||
          incomeCategory === "BAR_BEVERAGE_DIRECT" ||
          (!p.folioId && (refLower.includes("bar food") || refLower.includes("bar")))
        ) {
          sourceCategory = "BAR_BEVERAGE";
          sourceLabel = incomeCategoryLabel || "Bar Food Orders (Kitchen Food Bill)";
        } else if (incomeCategory === "BANQUET_EVENT_ADVANCE" || (!p.folioId && refLower.includes("banquet"))) {
          sourceCategory = "BANQUET_ADVANCE";
          sourceLabel = incomeCategoryLabel || "Banquet & Event Advance Deposit";
        } else if (incomeCategory === "OUTSIDER_WALKIN_DINING" || (!p.folioId && (refLower.includes("walk-in") || refLower.includes("dining")))) {
          sourceCategory = "POS_RESTAURANT";
          sourceLabel = incomeCategoryLabel || "Direct Non-Resident Walk-In Dining";
        } else if (incomeCategory === "MISC_OUTLET_REVENUE") {
          sourceCategory = "MISC_OUTLET";
          sourceLabel = incomeCategoryLabel || "Ancillary & Other Outlet Collections";
        } else if (
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
          refLower.includes("restaurant")
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
          companyName: snapshot.companyName || null,
          gstin: snapshot.gstin || null,
          kotNo: snapshot.kotNo || null,
          roomNumber,
          stayId,
          folioId: p.folioId || "—",
          amount: p.amount,
          method: p.method, // UPI, CASH, CARD, OTA_VCC, BANK_TRANSFER, DIRECT_BILL
          reference: p.reference && !p.reference.startsWith("GRC-DEPOSIT-") ? p.reference : "—",
          status: p.status,
          receivedBy: p.createdById || "Front Desk Cashier",
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
        BAR_BEVERAGE: 0,
        BANQUET_ADVANCE: 0,
        MISC_OUTLET: 0,
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
        OWNER_PAYOUT: 0,
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
        dayCycle: "12:00 AM – 12:00 AM Midnight",
        filterDate: date || (startDate && endDate ? `${startDate} to ${endDate}` : "All Time"),
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
        allTransactions: [
          ...formattedCollections.map((c) => {
            const kotFormatted = c.kotNo
              ? c.kotNo.toUpperCase().startsWith("KOT")
                ? c.kotNo
                : `KOT #${c.kotNo}`
              : null;
            return {
              ...c,
              recordId: c.receiptNo,
              flow: "INFLOW",
              party: c.companyName ? `${c.payerName} (${c.companyName})` : c.payerName,
              particulars:
                c.roomNumber && c.roomNumber !== "—"
                  ? `Room ${c.roomNumber} (${c.sourceLabel})`
                  : `${c.sourceLabel}${kotFormatted ? ` [${kotFormatted}]` : ""}${c.gstin ? ` [GST: ${c.gstin}]` : ""}${c.reference && c.reference !== "—" && !c.reference.includes(c.sourceLabel) ? ` - ${c.reference}` : ""}`,
              netAmount: c.amount,
            };
          }),
          ...formattedExpenses.map((e) => ({
            ...e,
            recordId: e.voucherNo,
            flow: "OUTFLOW",
            party: e.payeeName,
            sourceLabel: e.category === "OWNER_PAYOUT" ? "Owner Payout / Drawing" : e.category.replace(/_/g, " "),
            particulars: `${e.category === "OWNER_PAYOUT" ? "Owner Payout / Drawing" : e.category.replace(/_/g, " ")}: ${e.description}`,
            netAmount: -e.totalAmount,
          })),
        ].sort((a, b) => new Date(b.fullTimestamp).getTime() - new Date(a.fullTimestamp).getTime()),
      });
    }

    // 2. FRONT OFFICE GUEST LEDGER
    if (reportType === "FRONT_OFFICE") {
      const stayWhere: any = { propertyId };
      if (date) {
        stayWhere.arrivalAt = { lte: dateFilter?.lte };
        stayWhere.expectedDepartureAt = { gte: dateFilter?.gte };
      }

      const stays = await prisma.stay.findMany({
        where: stayWhere,
        include: {
          primaryGuest: true,
          roomAssignments: { include: { room: { include: { roomType: true } } } },
          folio: true,
        },
        orderBy: { arrivalAt: "desc" },
      });

      return NextResponse.json({
        reportType,
        dayCycle: "12:00 AM – 12:00 AM Midnight",
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
      const entryWhere: any = { propertyId, status: "POSTED", type: "CHARGE" };

      const [entries, property] = await Promise.all([
        prisma.folioEntry.findMany({
          where: entryWhere,
          include: {
            folio: {
              include: {
                stay: {
                  include: {
                    primaryGuest: true,
                    roomAssignments: {
                      include: { room: true },
                      orderBy: { startsAt: "desc" },
                    },
                  },
                },
              },
            },
          },
          orderBy: [{ serviceDate: "desc" }, { postedAt: "desc" }],
        }),
        prisma.property.findUnique({
          where: { id: propertyId },
          select: { displayName: true, code: true, gstin: true, stateCode: true, businessDate: true },
        }),
      ]);

      let totalGrossRevenue = 0;
      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const departmentBreakdown = {
        ROOMS: 0,
        FNB: 0,
        EXTRA: 0,
        ANCILLARY: 0,
      };

      const taxRateBreakdown: Record<string, number> = {
        "0%": 0,
        "5%": 0,
        "12%": 0,
        "18%": 0,
        "28%": 0,
      };

      const formattedRows = entries.map((e) => {
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        let effectiveTaxRate = 0;

        if (e.taxComponentsJson) {
          try {
            const comp = JSON.parse(e.taxComponentsJson);
            if (typeof comp === "object" && comp !== null) {
              cgstAmount = Number(comp.cgstAmount || 0);
              sgstAmount = Number(comp.sgstAmount || 0);
              igstAmount = Number(comp.igstAmount || 0);
              effectiveTaxRate = Number(
                comp.effectiveTaxRate || (comp.cgstRate ? comp.cgstRate * 2 : 0)
              );
            }
          } catch {}
        }

        const calculatedTax =
          cgstAmount + sgstAmount + igstAmount ||
          Math.max(0, e.totalAmount - (e.taxableAmount || 0));

        if (effectiveTaxRate === 0 && e.taxableAmount > 0 && calculatedTax > 0) {
          effectiveTaxRate = Math.round((calculatedTax / e.taxableAmount) * 100);
        }

        // Categorize Department
        let department: "ROOMS" | "FNB" | "EXTRA" | "ANCILLARY" = "ANCILLARY";
        let departmentLabel = "Ancillary & Misc";

        const code = (e.chargeCode || "").toUpperCase();
        const desc = (e.description || "").toLowerCase();

        if (code === "ROOM_TARIFF" || code === "STAY_EXTENSION") {
          department = "ROOMS";
          departmentLabel = code === "STAY_EXTENSION" ? "Stay Extension" : "Room Tariff";
        } else if (code === "EXTRA_PAX" || code === "EXTRA_BED") {
          department = "EXTRA";
          departmentLabel = "Extra Pax / Bed";
        } else if (
          code.includes("FOOD") ||
          code.includes("RESTAURANT") ||
          code.includes("DINING") ||
          code.includes("BREAKFAST") ||
          desc.includes("dinner") ||
          desc.includes("food") ||
          e.sourceType === "POS_ORDER"
        ) {
          department = "FNB";
          departmentLabel = "F&B Dining";
        } else if (code.includes("LAUNDRY")) {
          department = "ANCILLARY";
          departmentLabel = "Laundry";
        } else if (code.includes("MINIBAR")) {
          department = "ANCILLARY";
          departmentLabel = "Minibar";
        }

        // Accumulate statistics
        totalGrossRevenue += e.totalAmount;
        totalTaxable += e.taxableAmount || 0;
        totalCgst += cgstAmount;
        totalSgst += sgstAmount;
        totalIgst += igstAmount;
        departmentBreakdown[department] += e.totalAmount;

        const rateKey = `${effectiveTaxRate}%`;
        taxRateBreakdown[rateKey] = (taxRateBreakdown[rateKey] || 0) + e.totalAmount;

        const primaryGuest = e.folio?.stay?.primaryGuest;
        const roomAssignments = e.folio?.stay?.roomAssignments || [];
        const roomNumber = roomAssignments[0]?.room?.number || "—";

        return {
          id: e.id,
          folioId: e.folioId,
          stayId: e.folio?.stayId || "—",
          serviceDate: e.serviceDate,
          postedAt: e.postedAt.toISOString(),
          chargeCode: e.chargeCode,
          department,
          departmentLabel,
          description: e.description,
          guestName: primaryGuest?.name || "Direct Guest / Resident",
          phone: primaryGuest?.phone || "—",
          companyName: primaryGuest?.companyName || null,
          gstin: primaryGuest?.gstin || null,
          roomNumber,
          qty: e.qty || 1,
          unitAmount: e.unitAmount || e.totalAmount,
          taxableAmount: Math.round((e.taxableAmount || 0) * 100) / 100,
          cgstAmount: Math.round(cgstAmount * 100) / 100,
          sgstAmount: Math.round(sgstAmount * 100) / 100,
          igstAmount: Math.round(igstAmount * 100) / 100,
          taxAmount: Math.round(calculatedTax * 100) / 100,
          effectiveTaxRate,
          totalAmount: Math.round(e.totalAmount * 100) / 100,
          sourceType: e.sourceType || "PMS_CHARGE",
        };
      });

      const totalTax = totalCgst + totalSgst + totalIgst;

      return NextResponse.json({
        reportType,
        dayCycle: "12:00 AM – 12:00 AM Midnight",
        generatedAt: new Date().toISOString(),
        property,
        summary: {
          totalEntries: formattedRows.length,
          totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
          totalTaxable: Math.round(totalTaxable * 100) / 100,
          totalTax: Math.round(totalTax * 100) / 100,
          totalCgst: Math.round(totalCgst * 100) / 100,
          totalSgst: Math.round(totalSgst * 100) / 100,
          totalIgst: Math.round(totalIgst * 100) / 100,
          departmentBreakdown: {
            ROOMS: Math.round(departmentBreakdown.ROOMS * 100) / 100,
            FNB: Math.round(departmentBreakdown.FNB * 100) / 100,
            EXTRA: Math.round(departmentBreakdown.EXTRA * 100) / 100,
            ANCILLARY: Math.round(departmentBreakdown.ANCILLARY * 100) / 100,
          },
          taxRateBreakdown,
        },
        rows: formattedRows,
      });
    }

    // 4. KITCHEN ORDERS & F&B COLLECTIONS REPORT
    if (reportType === "FNB" || reportType === "KITCHEN_ORDERS") {
      const orderWhere: any = { propertyId };
      if (dateFilter) {
        orderWhere.createdAt = dateFilter;
      }

      const [orders, directPayments, property] = await Promise.all([
        prisma.order.findMany({
          where: orderWhere,
          include: {
            outlet: true,
            table: true,
            stay: {
              include: {
                primaryGuest: true,
                roomAssignments: { include: { room: true } },
              },
            },
            items: true,
            kots: {
              include: {
                station: true,
                lines: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.payment.findMany({
          where: {
            propertyId,
            status: "SUCCEEDED",
            folioId: null,
            ...(dateFilter ? { receivedAt: dateFilter } : {}),
          },
          orderBy: { receivedAt: "desc" },
        }),
        prisma.property.findUnique({
          where: { id: propertyId },
          select: { displayName: true, code: true, gstin: true, stateCode: true },
        }),
      ]);

      let totalGross = 0;
      let totalTaxable = 0;
      let totalGst = 0;
      let totalItemsPrepared = 0;
      let totalKotsCount = 0;
      let folioPostedAmount = 0;
      let directSettledAmount = 0;

      const destinationsBreakdown = {
        ROOM_SERVICE: { count: 0, amount: 0 },
        TABLE_DINE_IN: { count: 0, amount: 0 },
        BAR_LOUNGE: { count: 0, amount: 0 },
        TAKEAWAY: { count: 0, amount: 0 },
      };

      const rows = orders.map((o) => {
        const subtotal = o.items.reduce((sum, i) => sum + (i.total || i.unitPrice * i.qty), 0);
        const gst = calculateGST({
          grossOrBaseAmount: subtotal,
          sacHsn: "996331",
          supplierStateCode: property?.stateCode || "18",
        });

        const orderItemCount = o.items.reduce((sum, i) => sum + i.qty, 0);
        totalItemsPrepared += orderItemCount;
        totalGross += gst.totalAmount;
        totalTaxable += gst.taxableAmount;
        totalGst += gst.taxAmount;
        totalKotsCount += o.kots.length;

        // Destination Classification
        let destinationCategory: "ROOM_SERVICE" | "TABLE_DINE_IN" | "BAR_LOUNGE" | "TAKEAWAY" = "TABLE_DINE_IN";
        let destinationLabel = "Dine-In";
        let roomNo = "—";
        let guestName = o.customerName || "Walk-in Guest";

        if (o.mode === "ROOM_SERVICE" || o.customerName?.toLowerCase().includes("room")) {
          destinationCategory = "ROOM_SERVICE";
          roomNo = o.stay?.roomAssignments?.[0]?.room?.number || o.customerName?.replace(/[^0-9]/g, "") || "—";
          destinationLabel = `Room ${roomNo}`;
          if (o.stay?.primaryGuest?.name) {
            guestName = o.stay.primaryGuest.name;
          }
        } else if (o.customerName?.toLowerCase().includes("bar") || o.customerName?.toLowerCase().includes("lounge")) {
          destinationCategory = "BAR_LOUNGE";
          destinationLabel = o.customerName || "Bar Counter";
        } else if (o.mode === "TAKEAWAY" || o.customerName?.toLowerCase().includes("takeaway") || o.customerName?.toLowerCase().includes("parcel")) {
          destinationCategory = "TAKEAWAY";
          destinationLabel = o.customerName || "Takeaway / Parcel";
        } else if (o.table?.name) {
          destinationCategory = "TABLE_DINE_IN";
          destinationLabel = `${o.table.name}`;
        } else {
          destinationCategory = "TABLE_DINE_IN";
          destinationLabel = o.customerName || "Dine-In Table";
        }

        // Settlement Status
        let settlementType: "POSTED_TO_ROOM" | "DIRECT_PAID" | "UNSETTLED" = "UNSETTLED";
        if (o.stayId || o.status === "POSTED_TO_ROOM" || destinationCategory === "ROOM_SERVICE") {
          settlementType = "POSTED_TO_ROOM";
          folioPostedAmount += gst.totalAmount;
        } else if (o.status === "PAID" || o.status === "BILLED") {
          settlementType = "DIRECT_PAID";
          directSettledAmount += gst.totalAmount;
        } else {
          settlementType = "UNSETTLED";
          directSettledAmount += gst.totalAmount;
        }

        destinationsBreakdown[destinationCategory].count += 1;
        destinationsBreakdown[destinationCategory].amount += gst.totalAmount;

        const kotNumbers = o.kots.map((k) => k.kotNo).join(", ") || `KOT-${o.orderNo.replace("ORD-", "")}`;
        const itemsSummary = o.items.map((i) => `${i.nameSnapshot} (×${i.qty})`).join(", ");

        return {
          id: o.id,
          orderNo: o.orderNo,
          kotNumbers,
          kotsCount: o.kots.length,
          outletName: o.outlet.name,
          mode: o.mode,
          destinationCategory,
          destinationLabel,
          roomNo,
          guestName,
          covers: o.covers || 2,
          waiterName: o.waiterId || "Steward",
          itemCount: orderItemCount,
          items: o.items.map((i) => ({
            id: i.id,
            name: i.nameSnapshot,
            qty: i.qty,
            unitPrice: i.unitPrice,
            total: i.total,
            notes: i.notes,
          })),
          itemsSummary,
          subtotal,
          taxableAmount: gst.taxableAmount,
          cgst: gst.components.cgstAmount,
          sgst: gst.components.sgstAmount,
          totalTax: gst.taxAmount,
          totalAmount: gst.totalAmount,
          settlementType,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
          timeFormatted: new Date(o.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          dateFormatted: new Date(o.createdAt).toISOString().split("T")[0],
        };
      });

      // Process Direct F&B, Bar & Banquet Collections (Non-POS)
      const directFnbCollections = directPayments
        .map((p) => {
          let snapshot: any = {};
          try {
            if (p.payerSnapshot) snapshot = JSON.parse(p.payerSnapshot);
          } catch (e) {}

          const refLower = (p.reference || "").toLowerCase();
          const isFnbRelated =
            snapshot.category === "BAR_FOOD_BILL" ||
            snapshot.category === "BAR_BEVERAGE_DIRECT" ||
            snapshot.category === "BANQUET_EVENT_ADVANCE" ||
            snapshot.category === "OUTSIDER_WALKIN_DINING" ||
            snapshot.category === "MISC_OUTLET_REVENUE" ||
            p.orderId ||
            refLower.includes("bar food") ||
            refLower.includes("bar") ||
            refLower.includes("dining") ||
            refLower.includes("restaurant") ||
            refLower.includes("banquet");

          if (!isFnbRelated) return null;

          const amount = p.amount;
          const taxable = Math.round((amount / 1.05) * 100) / 100;
          const tax = Math.round((amount - taxable) * 100) / 100;

          return {
            id: p.id,
            receiptNo: p.receiptNo,
            category: snapshot.category || "OUTSIDER_WALKIN_DINING",
            categoryLabel:
              snapshot.categoryLabel ||
              (refLower.includes("bar")
                ? "Bar Food Orders (Kitchen Food Bill)"
                : refLower.includes("banquet")
                ? "Banquet & Event Advance Deposit"
                : "Direct Non-Resident Walk-In Dining"),
            payerName:
              snapshot.companyName
                ? `${snapshot.name || "Guest"} (${snapshot.companyName})`
                : snapshot.name || (snapshot.category?.startsWith("BAR") ? "Bar Counter (Food)" : "Walk-In Guest"),
            phone: snapshot.phone || null,
            kotNo: snapshot.kotNo || null,
            companyName: snapshot.companyName || null,
            gstin: snapshot.gstin || null,
            amount,
            taxableAmount: taxable,
            taxAmount: tax,
            method: p.method,
            reference: p.reference || "—",
            notes: snapshot.notes || null,
            receivedAt: p.receivedAt.toISOString(),
            dateFormatted: p.receivedAt.toISOString().split("T")[0],
            timeFormatted: p.receivedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          };
        })
        .filter(Boolean);

      const directFnbTotal = directFnbCollections.reduce((sum: number, d: any) => sum + d.amount, 0);
      const directFnbTaxable = directFnbCollections.reduce((sum: number, d: any) => sum + d.taxableAmount, 0);
      const directFnbTax = directFnbCollections.reduce((sum: number, d: any) => sum + d.taxAmount, 0);

      const combinedGross = totalGross + directFnbTotal;
      const combinedTaxable = totalTaxable + directFnbTaxable;
      const combinedGst = totalGst + directFnbTax;
      const combinedDirectSettled = directSettledAmount + directFnbTotal;

      return NextResponse.json({
        reportType: "FNB",
        dayCycle: "12:00 AM – 12:00 AM Midnight",
        generatedAt: new Date().toISOString(),
        summary: {
          totalOrdersCount: orders.length,
          totalKotsFired: totalKotsCount,
          totalItemsPrepared,
          grossCollection: combinedGross,
          taxableSales: combinedTaxable,
          gstCollected: combinedGst,
          folioPostedAmount,
          directSettledAmount: combinedDirectSettled,
          directFnbTotal,
          destinationsBreakdown,
        },
        rows,
        directFnbCollections,
      });
    }

    // 5. ROOM TRANSFERS & ROOM MOVES AUDIT REPORT
    if (reportType === "ROOM_TRANSFERS") {
      const stayWhere: any = {
        propertyId,
        roomAssignments: {
          some: {
            endsAt: { not: null },
          },
        },
      };

      const staysWithTransfers = await prisma.stay.findMany({
        where: stayWhere,
        include: {
          primaryGuest: true,
          roomAssignments: {
            include: {
              room: {
                include: { roomType: true },
              },
            },
            orderBy: { startsAt: "asc" },
          },
          folio: {
            include: {
              entries: true,
              payments: true,
            },
          },
        },
        orderBy: { arrivalAt: "desc" },
      });

      const grcs = await prisma.guestRegistration.findMany({
        where: {
          propertyId,
          stayId: { in: staysWithTransfers.map((s) => s.id) },
        },
      });
      const grcMap = new Map(grcs.map((g) => [g.stayId, g]));

      const rawTransfers: any[] = [];
      for (const stay of staysWithTransfers) {
        const grc = grcMap.get(stay.id);
        const assignments = stay.roomAssignments;

        for (const endedAssign of assignments.filter((a) => a.endsAt)) {
          const succeedingAssign = assignments.find(
            (a) =>
              a.id !== endedAssign.id &&
              a.roomId !== endedAssign.roomId &&
              new Date(a.startsAt).getTime() >= new Date(endedAssign.startsAt).getTime() + 10000
          );

          if (succeedingAssign) {
            const transferTime = endedAssign.endsAt;
            const durMs =
              new Date(endedAssign.endsAt!).getTime() - new Date(endedAssign.startsAt).getTime();
            const durHours = Math.round((durMs / (1000 * 60 * 60)) * 10) / 10;
            const durDays = Math.floor(durHours / 24);
            const remHours = Math.round(durHours % 24);
            const durationText =
              durDays > 0
                ? `${durDays}d ${remHours}h (${Math.max(1, durDays)} nt${durDays > 1 ? "s" : ""})`
                : `${durHours} hrs`;

            let agreedRate = 0;
            if (succeedingAssign.moveReason?.includes("AGREED_RATE:")) {
              const parts = succeedingAssign.moveReason.split(":");
              agreedRate = Number(parts[1]) || 0;
            }

            rawTransfers.push({
              transferId: `${endedAssign.id}_to_${succeedingAssign.id}`,
              stayId: stay.id,
              folioId: stay.folio?.id || null,
              stayStatus: stay.status,
              grcNo: grc?.registrationNo || "—",
              guestName: stay.primaryGuest?.name || grc?.fullName || "—",
              phone: stay.primaryGuest?.phone || grc?.mobilePhone || "—",
              transferDate: transferTime?.toISOString(),
              formattedDate: transferTime
                ? new Date(transferTime).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—",
              fromRoomId: endedAssign.roomId,
              fromRoomNumber: endedAssign.room?.number || "—",
              fromRoomType: endedAssign.room?.roomType?.name || endedAssign.room?.name || "—",
              fromRoomFloor: endedAssign.room?.floor || 1,
              toRoomId: succeedingAssign.roomId,
              toRoomNumber: succeedingAssign.room?.number || "—",
              toRoomType: succeedingAssign.room?.roomType?.name || succeedingAssign.room?.name || "—",
              toRoomFloor: succeedingAssign.room?.floor || 1,
              moveReason: endedAssign.moveReason || succeedingAssign.moveReason || "Room Change / Upgrade",
              rateHandling: succeedingAssign.rateHandling || "RETAIN_RATE",
              agreedRate,
              durationHours: durHours,
              durationText,
              startedAt: endedAssign.startsAt.toISOString(),
              endedAt: endedAssign.endsAt!.toISOString(),
              currentRoomStatus: succeedingAssign.endsAt
                ? "HISTORICAL_TRANSFER"
                : stay.status === "IN_HOUSE"
                ? "CURRENTLY_OCCUPIED"
                : "CHECKED_OUT",
            });
          }
        }
      }

      rawTransfers.sort(
        (a, b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime()
      );

      return NextResponse.json({
        reportType,
        generatedAt: new Date().toISOString(),
        totalCount: rawTransfers.length,
        inHouseCount: rawTransfers.filter((t) => t.currentRoomStatus === "CURRENTLY_OCCUPIED").length,
        transfers: rawTransfers,
      });
    }

    // 6. FINAL BILLS & TAX INVOICES MASTER LIST REPORT
    if (reportType === "FINAL_BILLS") {
      const stayWhere: any = { propertyId };

      const stays = await prisma.stay.findMany({
        where: stayWhere,
        include: {
          primaryGuest: true,
          roomAssignments: {
            include: { room: { include: { roomType: true } } },
            orderBy: { startsAt: "asc" },
          },
          folio: {
            include: {
              entries: true,
              payments: true,
              windows: {
                include: {
                  invoices: {
                    include: { lines: true, creditNotes: true },
                    orderBy: { issuedAt: "desc" },
                  },
                },
              },
            },
          },
        },
        orderBy: { arrivalAt: "desc" },
      });

      const grcs = await prisma.guestRegistration.findMany({
        where: {
          propertyId,
          stayId: { in: stays.map((s) => s.id) },
        },
      });
      const grcMap = new Map(grcs.map((g) => [g.stayId, g]));

      const bills = stays.map((stay) => {
        const grc = grcMap.get(stay.id);
        const folio = stay.folio;
        const entries = folio?.entries || [];
        const payments = folio?.payments || [];

        const roomTariff = entries
          .filter((e) => (e.chargeCode === "ROOM_TARIFF" || e.chargeCode === "STAY_EXTENSION") && e.type === "CHARGE")
          .reduce((sum, e) => sum + e.totalAmount, 0);

        const extraPax = entries
          .filter((e) => e.chargeCode === "EXTRA_PAX" && e.type === "CHARGE")
          .reduce((sum, e) => sum + e.totalAmount, 0);

        const fnbCharges = entries
          .filter(
            (e) =>
              ["FOOD", "RESTAURANT", "ROOM_SERVICE", "DINNER", "BREAKFAST"].some(
                (k) =>
                  e.chargeCode.includes(k) ||
                  e.description.toLowerCase().includes("dinner") ||
                  e.description.toLowerCase().includes("food")
              ) && e.type === "CHARGE"
          )
          .reduce((sum, e) => sum + e.totalAmount, 0);

        const otherCharges = entries
          .filter(
            (e) =>
              e.chargeCode !== "ROOM_TARIFF" &&
              e.chargeCode !== "STAY_EXTENSION" &&
              e.chargeCode !== "EXTRA_PAX" &&
              !["FOOD", "RESTAURANT", "ROOM_SERVICE", "DINNER", "BREAKFAST"].some(
                (k) =>
                  e.chargeCode.includes(k) ||
                  e.description.toLowerCase().includes("dinner") ||
                  e.description.toLowerCase().includes("food")
              ) &&
              e.type === "CHARGE"
          )
          .reduce((sum, e) => sum + e.totalAmount, 0);

        const taxableAmount = entries
          .filter((e) => e.type === "CHARGE")
          .reduce((sum, e) => sum + (e.taxableAmount || 0), 0);

        let totalCgst = 0;
        let totalSgst = 0;
        for (const e of entries.filter((x) => x.type === "CHARGE")) {
          if (e.taxComponentsJson) {
            try {
              const comp = JSON.parse(e.taxComponentsJson);
              totalCgst += Number(comp.cgstAmount || 0);
              totalSgst += Number(comp.sgstAmount || 0);
            } catch {}
          }
        }

        const grossTotal = entries
          .filter((e) => e.type === "CHARGE")
          .reduce((sum, e) => sum + e.totalAmount, 0);

        const totalPaid = payments
          .filter((p) => p.status === "SUCCEEDED")
          .reduce((sum, p) => sum + p.amount, 0);

        const sortedAssignments = [...stay.roomAssignments].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        );

        const uniqueRooms: string[] = [];
        sortedAssignments.forEach((ra) => {
          const num = ra.room?.number;
          if (num && !uniqueRooms.includes(num)) {
            uniqueRooms.push(num);
          }
        });

        let isSequentialTransfer = false;
        if (uniqueRooms.length > 1) {
          // Check if assignments were sequential moves (started >10 mins apart or explicit move reason)
          for (let i = 0; i < sortedAssignments.length - 1; i++) {
            const current = sortedAssignments[i];
            const next = sortedAssignments[i + 1];
            const timeDiff = new Date(next.startsAt).getTime() - new Date(current.startsAt).getTime();
            if (
              (current.endsAt && timeDiff > 10 * 60 * 1000) ||
              current.moveReason?.toLowerCase().includes("moved") ||
              current.moveReason?.toLowerCase().includes("transfer")
            ) {
              isSequentialTransfer = true;
              break;
            }
          }
        }

        const roomDisplay =
          uniqueRooms.length <= 1
            ? (uniqueRooms[0] || "—")
            : isSequentialTransfer
            ? uniqueRooms.join(" ➔ ")
            : `${uniqueRooms.join(", ")} (${uniqueRooms.length} Rooms)`;

        const nights = Math.max(
          1,
          Math.round(
            (new Date(stay.actualDepartureAt || stay.expectedDepartureAt).getTime() -
              new Date(stay.arrivalAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );

        const methods = Array.from(new Set(payments.map((p) => p.method).filter(Boolean)));
        const methodDisplay =
          methods.length === 0
            ? "UNPAID"
            : methods.length === 1
            ? methods[0]
            : `SPLIT (${methods.join(", ")})`;

        const invoices = folio?.windows?.flatMap((w) => w.invoices || []) || [];
        const primaryInvoice = invoices[0] || null;
        const invoiceNo = primaryInvoice?.invoiceNo || `INV-2627-${stay.id.slice(-4).toUpperCase()}`;

        const balance = Math.round((folio?.balance ?? (grossTotal - totalPaid)) * 100) / 100;
        const isOutstanding = balance > 0.5;
        const settlementStatus =
          isOutstanding
            ? "OUTSTANDING"
            : stay.status === "IN_HOUSE"
            ? "IN_HOUSE"
            : "SETTLED";

        return {
          stayId: stay.id,
          folioId: folio?.id || "—",
          invoiceNo,
          allInvoices: invoices,
          primaryInvoice,
          grcNo: grc?.registrationNo || "—",
          guestName: stay.primaryGuest?.name || grc?.fullName || "—",
          phone: stay.primaryGuest?.phone || grc?.mobilePhone || "—",
          companyName: stay.primaryGuest?.companyName || "—",
          gstin: stay.primaryGuest?.gstin || "—",
          roomDisplay,
          roomsCount: uniqueRooms.length,
          allRooms: uniqueRooms,
          checkInDate: stay.arrivalAt.toISOString(),
          checkOutDate: (stay.actualDepartureAt || stay.expectedDepartureAt).toISOString(),
          nights,
          stayStatus: stay.status,
          roomTariff,
          extraPax,
          fnbCharges,
          otherCharges,
          taxableAmount: Math.round(taxableAmount * 100) / 100,
          totalCgst: Math.round(totalCgst * 100) / 100,
          totalSgst: Math.round(totalSgst * 100) / 100,
          totalTax: Math.round((totalCgst + totalSgst) * 100) / 100,
          grossTotal,
          totalPaid,
          balance,
          isOutstanding,
          settlementStatus,
          paymentMethod: methodDisplay,
          paymentsList: payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            receiptNo: p.receiptNo,
            receivedAt: p.receivedAt,
          })),
          stayData: {
            ...stay,
            guestRegistration: grc || null,
          },
        };
      });

      const summary = {
        totalBills: bills.length,
        settledCount: bills.filter((b) => b.settlementStatus === "SETTLED").length,
        outstandingCount: bills.filter((b) => b.settlementStatus === "OUTSTANDING").length,
        inHouseCount: bills.filter((b) => b.settlementStatus === "IN_HOUSE").length,
        totalGrossRevenue: bills.reduce((sum, b) => sum + b.grossTotal, 0),
        totalCollected: bills.reduce((sum, b) => sum + b.totalPaid, 0),
        totalOutstandingBalance: bills.reduce((sum, b) => sum + Math.max(0, b.balance), 0),
        totalTaxCollected: bills.reduce((sum, b) => sum + b.totalTax, 0),
      };

      return NextResponse.json({
        reportType,
        generatedAt: new Date().toISOString(),
        summary,
        bills,
      });
    }

    // 7. DAILY CURRENT IN-HOUSE GUEST OUTSTANDING / DUE REPORT
    if (reportType === "INHOUSE_GUEST_OUTSTANDING" || reportType === "INHOUSE_OUTSTANDING") {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { displayName: true, code: true, gstin: true, businessDate: true, address: true, phone: true },
      });

      const stayWhere: any = {
        propertyId,
        status: "IN_HOUSE",
      };

      if (dateFilter) {
        stayWhere.status = { in: ["IN_HOUSE", "CHECKED_OUT"] };
        stayWhere.arrivalAt = { lte: dateFilter.lte };
        stayWhere.OR = [
          { actualDepartureAt: null },
          { actualDepartureAt: { gte: dateFilter.gte } },
        ];
      }

      const stays = await prisma.stay.findMany({
        where: stayWhere,
        include: {
          primaryGuest: true,
          roomAssignments: {
            include: { room: { include: { roomType: true } } },
          },
          folio: {
            include: {
              windows: {
                include: {
                  entries: { where: { status: "POSTED" } },
                },
              },
              payments: { where: { status: "SUCCEEDED" } },
            },
          },
        },
        orderBy: { arrivalAt: "desc" },
      });

      const guestRows: any[] = [];
      let totalBilledSum = 0;
      let totalPaidSum = 0;
      let totalDueSum = 0;
      let totalSurplusSum = 0;
      let clearedCount = 0;
      let dueCount = 0;
      let surplusCount = 0;

      for (const stay of stays) {
        const assignments = stay.roomAssignments || [];
        const activeAssignments = assignments.filter((a) => !a.endsAt || (dateFilter && (!stay.actualDepartureAt || new Date(stay.actualDepartureAt) >= dateFilter.gte)));
        const targetAssignments = activeAssignments.length > 0 ? activeAssignments : [assignments[0]];

        const allEntries = stay.folio?.windows?.flatMap((w) => w.entries) || [];
        const allPayments = stay.folio?.payments || [];
        const totalCharges = allEntries.reduce((s, e) => s + e.totalAmount, 0);
        const totalPayments = allPayments.reduce((s, p) => s + p.amount, 0);

        const allRoomNumbers = targetAssignments.map((a) => a?.room?.number || "Unassigned");
        const isMultiRoom = allRoomNumbers.length > 1;

        for (const assignment of targetAssignments) {
          const roomNo = assignment?.room?.number || "Unassigned";
          const roomTypeName = assignment?.room?.roomType?.name || "Standard";

          // If multi-room, isolate room charges
          const roomEntries = isMultiRoom
            ? allEntries.filter((e) => isEntryForRoom(e, roomNo, allRoomNumbers))
            : allEntries;
          const roomCharges = roomEntries.length > 0 ? roomEntries.reduce((s, e) => s + e.totalAmount, 0) : (isMultiRoom ? totalCharges / targetAssignments.length : totalCharges);

          // Room payments
          let roomPaid = 0;
          if (isMultiRoom) {
            allPayments.forEach((p) => {
              const text = `${p.reference || ""} ${p.payerSnapshot || ""}`;
              if (new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${roomNo}\\b`, "i").test(text)) {
                roomPaid += p.amount;
              }
            });
            if (roomPaid === 0 && allPayments.length > 0) {
              roomPaid = totalPayments / targetAssignments.length;
            }
          } else {
            roomPaid = totalPayments;
          }

          const roomBalance = Math.round((roomCharges - roomPaid) * 100) / 100;
          let status: "CLEARED" | "DUE_REMAINING" | "SURPLUS_CREDIT" = "CLEARED";
          if (roomBalance > 1.0) {
            status = "DUE_REMAINING";
            dueCount++;
            totalDueSum += roomBalance;
          } else if (roomBalance < -1.0) {
            status = "SURPLUS_CREDIT";
            surplusCount++;
            totalSurplusSum += Math.abs(roomBalance);
          } else {
            status = "CLEARED";
            clearedCount++;
          }

          totalBilledSum += roomCharges;
          totalPaidSum += roomPaid;

          // Parse guest address
          let addressStr = "";
          if ((stay.primaryGuest as any).addressJson) {
            try {
              const parsedAddr = JSON.parse((stay.primaryGuest as any).addressJson);
              addressStr = [parsedAddr.street, parsedAddr.city, parsedAddr.state, parsedAddr.postalCode, parsedAddr.country]
                .filter(Boolean)
                .join(", ");
            } catch {}
          }

          guestRows.push({
            stayId: stay.id,
            folioId: stay.folio?.id || null,
            roomNumber: roomNo,
            roomType: roomTypeName,
            guestName: stay.primaryGuest.name,
            phone: stay.primaryGuest.phone || "—",
            email: stay.primaryGuest.email || "",
            residentialAddress: addressStr,
            companyName: stay.primaryGuest.companyName || "",
            gstin: stay.primaryGuest.gstin || "",
            arrivalDate: stay.arrivalAt.toISOString(),
            expectedDepartureDate: stay.expectedDepartureAt.toISOString(),
            actualDepartureDate: stay.actualDepartureAt?.toISOString() || null,
            totalCharges: Math.round(roomCharges * 100) / 100,
            totalPayments: Math.round(roomPaid * 100) / 100,
            balanceDue: roomBalance,
            status,
            stayStatus: stay.status,
            isGroup: isMultiRoom,
            groupRooms: allRoomNumbers,
          });
        }
      }

      const totalOccupied = guestRows.length;
      const clearedPercentage = totalOccupied > 0 ? Math.round((clearedCount / totalOccupied) * 100) : 0;

      return NextResponse.json({
        reportType: "INHOUSE_GUEST_OUTSTANDING",
        property,
        filterDate: date || property?.businessDate || new Date().toISOString().split("T")[0],
        summary: {
          totalOccupied,
          clearedCount,
          clearedPercentage,
          dueCount,
          totalDueAmount: Math.round(totalDueSum * 100) / 100,
          surplusCount,
          totalSurplusAmount: Math.round(totalSurplusSum * 100) / 100,
          totalBilledAmount: Math.round(totalBilledSum * 100) / 100,
          totalCollectedAmount: Math.round(totalPaidSum * 100) / 100,
        },
        records: guestRows,
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
