import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getMidnightDayBoundaries } from "@/lib/domain/daily-report-service";

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
          reference: p.reference && !p.reference.startsWith("GRC-DEPOSIT-") ? p.reference : "—",
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
      const entryWhere: any = { propertyId, status: "POSTED" };
      if (date) {
        entryWhere.OR = [
          { serviceDate: date },
          { postedAt: dateFilter },
        ];
      } else if (dateFilter) {
        entryWhere.postedAt = dateFilter;
      }

      const entries = await prisma.folioEntry.findMany({
        where: entryWhere,
        include: { folio: { include: { stay: { include: { primaryGuest: true } } } } },
        orderBy: { postedAt: "desc" },
      });

      return NextResponse.json({
        reportType,
        dayCycle: "12:00 AM – 12:00 AM Midnight",
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
      const orderWhere: any = { propertyId };
      if (dateFilter) {
        orderWhere.createdAt = dateFilter;
      }

      const orders = await prisma.order.findMany({
        where: orderWhere,
        include: {
          outlet: true,
          table: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        reportType,
        dayCycle: "12:00 AM – 12:00 AM Midnight",
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
          .filter((e) => e.chargeCode === "ROOM_TARIFF" && e.type === "CHARGE")
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

        const balance = folio?.balance ?? (grossTotal - totalPaid);
        const settlementStatus =
          stay.status === "CHECKED_OUT" || (balance === 0 && totalPaid > 0)
            ? "SETTLED"
            : stay.status === "IN_HOUSE"
            ? "IN_HOUSE"
            : "OPEN";

        return {
          stayId: stay.id,
          folioId: folio?.id || "—",
          invoiceNo: `INV-2627-${stay.id.slice(-4).toUpperCase()}`,
          grcNo: grc?.registrationNo || "—",
          guestName: stay.primaryGuest?.name || grc?.fullName || "—",
          phone: stay.primaryGuest?.phone || grc?.mobilePhone || "—",
          companyName: stay.primaryGuest?.companyName || "—",
          gstin: stay.primaryGuest?.gstin || "—",
          roomDisplay,
          roomsCount: uniqueRooms.length,
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
          settlementStatus,
          paymentMethod: methodDisplay,
          paymentsList: payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            receiptNo: p.receiptNo,
            receivedAt: p.receivedAt,
          })),
        };
      });

      const summary = {
        totalBills: bills.length,
        settledCount: bills.filter((b) => b.settlementStatus === "SETTLED").length,
        inHouseCount: bills.filter((b) => b.stayStatus === "IN_HOUSE").length,
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

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
