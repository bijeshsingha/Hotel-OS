import { prisma } from "../db/prisma";
import { calculateGST } from "../gst/calculator";
import { getNextDocumentNumber } from "../sequence/generator";

export async function createPOSOrder({
  propertyId,
  outletId,
  mode = "DINE_IN",
  tableId,
  stayId,
  customerName,
  customerContact,
  covers = 2,
  waiterId,
}: {
  propertyId: string;
  outletId: string;
  mode?: "DINE_IN" | "TAKEAWAY" | "ROOM_SERVICE";
  tableId?: string;
  stayId?: string;
  customerName?: string;
  customerContact?: string;
  covers?: number;
  waiterId?: string;
}) {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
  });

  const seq = await getNextDocumentNumber(propertyId, "ORDER");

  const order = await prisma.order.create({
    data: {
      organizationId: property.organizationId,
      propertyId,
      orderNo: seq.formattedNumber,
      outletId,
      mode,
      tableId,
      stayId,
      customerName,
      customerContact,
      covers,
      waiterId,
      status: "OPEN",
    },
    include: {
      table: true,
      stay: {
        include: { primaryGuest: true },
      },
    },
  });

  return order;
}

export async function addItemsToOrder({
  orderId,
  items,
}: {
  orderId: string;
  items: Array<{
    menuItemId?: string;
    variantId?: string;
    name: string;
    qty: number;
    unitPrice: number;
    stationId?: string;
    notes?: string;
    course?: string;
  }>;
}) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
  });

  const createdItems = [];
  for (const item of items) {
    const total = item.qty * item.unitPrice;
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        menuItemId: item.menuItemId,
        variantId: item.variantId,
        nameSnapshot: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        total,
        stationId: item.stationId,
        status: "DRAFT",
        notes: item.notes,
        course: item.course || "MAIN",
      },
    });
    createdItems.push(orderItem);
  }

  return createdItems;
}

export async function fireKOT({
  orderId,
  actorId,
}: {
  orderId: string;
  actorId?: string;
}) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: {
        where: { status: "DRAFT" },
      },
      outlet: {
        include: { kitchenStations: true },
      },
    },
  });

  if (order.items.length === 0) {
    throw new Error("No unsent items in this order to fire KOT.");
  }

  // Group unsent items by station
  const defaultStationId = order.outlet.kitchenStations[0]?.id;
  const itemsByStation = new Map<string, typeof order.items>();

  for (const item of order.items) {
    const stId = item.stationId || defaultStationId;
    if (!stId) continue;
    const list = itemsByStation.get(stId) || [];
    list.push(item);
    itemsByStation.set(stId, list);
  }

  const generatedKOTs = [];

  for (const [stationId, stationItems] of itemsByStation.entries()) {
    const seq = await getNextDocumentNumber(order.propertyId, "KOT");

    const kot = await prisma.kOT.create({
      data: {
        organizationId: order.organizationId,
        propertyId: order.propertyId,
        kotNo: seq.formattedNumber,
        orderId: order.id,
        stationId,
        status: "QUEUED",
        printStatus: "PRINTED",
      },
    });

    for (const item of stationItems) {
      await prisma.kOTLine.create({
        data: {
          kotId: kot.id,
          orderItemId: item.id,
          qty: item.qty,
          action: "NEW",
          notesSnapshot: item.notes,
        },
      });

      await prisma.orderItem.update({
        where: { id: item.id },
        data: { status: "SENT" },
      });
    }

    generatedKOTs.push(kot);
  }

  // Update order status to KOT_SENT
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "KOT_SENT" },
  });

  return generatedKOTs;
}

export async function postOrderToRoomFolio({
  orderId,
  stayId,
  actorId,
}: {
  orderId: string;
  stayId: string;
  actorId?: string;
}) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: { where: { status: { not: "CANCELLED" } } },
      outlet: true,
      property: true,
    },
  });

  if (order.status === "POSTED_TO_ROOM" || order.status === "PAID") {
    throw new Error("Order has already been settled.");
  }

  // Verify stay is active and folio is open
  const stay = await prisma.stay.findUniqueOrThrow({
    where: { id: stayId },
    include: {
      folio: {
        include: { windows: true },
      },
      primaryGuest: true,
    },
  });

  if (stay.status !== "IN_HOUSE") {
    throw new Error(`Guest stay status is ${stay.status}. Room posting only permitted for IN_HOUSE guests.`);
  }

  const folio = stay.folio;
  if (!folio || folio.status !== "OPEN") {
    throw new Error("Guest folio is locked or closed.");
  }

  const primaryWindow = folio.windows[0];
  if (!primaryWindow) {
    throw new Error("No open folio window found.");
  }

  // Calculate order totals with Restaurant GST (SAC 996331)
  const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const gst = calculateGST({
    grossOrBaseAmount: subtotal,
    isInclusive: false,
    sacHsn: "996331",
    supplierStateCode: order.property.stateCode || "18",
  });

  // Post Folio Entry
  const folioEntry = await prisma.folioEntry.create({
    data: {
      organizationId: order.organizationId,
      propertyId: order.propertyId,
      folioId: folio.id,
      folioWindowId: primaryWindow.id,
      serviceDate: order.property.businessDate || new Date().toISOString().split("T")[0],
      type: "CHARGE",
      chargeCode: "RESTAURANT_FOOD",
      description: `F&B Charge - ${order.outlet.name} (Order #${order.orderNo})`,
      qty: 1,
      unitAmount: subtotal,
      taxableAmount: gst.taxableAmount,
      taxComponentsJson: JSON.stringify(gst.components),
      totalAmount: gst.totalAmount,
      sourceType: "POS_ORDER",
      sourceId: order.id,
      status: "POSTED",
    },
  });

  // Update Folio Balance
  await prisma.folio.update({
    where: { id: folio.id },
    data: {
      balance: { increment: gst.totalAmount },
    },
  });

  // Create POSBill
  const billSeq = await getNextDocumentNumber(order.propertyId, "ORDER");
  const posBill = await prisma.pOSBill.create({
    data: {
      organizationId: order.organizationId,
      propertyId: order.propertyId,
      billNo: `BILL-${order.orderNo.replace("ORD-", "")}`,
      orderId: order.id,
      subtotal: gst.taxableAmount,
      taxTotal: gst.taxAmount,
      totalAmount: gst.totalAmount,
      status: "POSTED_TO_ROOM",
      folioChargeId: folioEntry.id,
    },
  });

  // Update order status
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "POSTED_TO_ROOM",
      stayId: stay.id,
    },
  });

  return { folioEntry, posBill, totalPosted: gst.totalAmount };
}
