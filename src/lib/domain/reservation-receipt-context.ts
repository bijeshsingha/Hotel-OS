import { prisma } from "../db/prisma";

type Receipt = { id: string; reservationId: string | null; propertyId: string };
export async function reservationReceiptContext(payments: Receipt[]) {
  const ids = [...new Set(payments.flatMap(p => p.reservationId ? [p.reservationId] : []))];
  const result = new Map<string, { reservationNo: string; guestName: string; phone: string | null; companyName: string | null; gstin: string | null; arrivalDate: string; departureDate: string; roomNumbers: string; stayId: string | null }>();
  if (!ids.length) return result;
  const reservations = await prisma.reservation.findMany({ where: { id: { in: ids } }, include: { primaryGuest: true, rooms: { include: { stays: { include: { roomAssignments: { include: { room: true } } } } } } } });
  const assignedIds = reservations.flatMap(r => r.rooms.flatMap(room => room.assignedRoomId ? [room.assignedRoomId] : []));
  const assignedRooms = await prisma.room.findMany({ where: { id: { in: assignedIds } }, select: { id: true, number: true, propertyId: true } });
  for (const payment of payments) {
    const reservation = reservations.find(r => r.id === payment.reservationId && r.propertyId === payment.propertyId);
    if (!reservation) continue;
    const stays = reservation.rooms.flatMap(r => r.stays);
    const activeRooms = stays.flatMap(s => s.roomAssignments.filter(a => !a.endsAt).map(a => a.room.number));
    const reservedRooms = reservation.rooms.flatMap(r => assignedRooms.filter(room => room.id === r.assignedRoomId && room.propertyId === reservation.propertyId).map(room => room.number));
    result.set(payment.id, { reservationNo: reservation.confirmationNo, guestName: reservation.primaryGuest.name, phone: reservation.primaryGuest.phone, companyName: reservation.primaryGuest.companyName, gstin: reservation.primaryGuest.gstin, arrivalDate: reservation.arrivalDate, departureDate: reservation.departureDate, roomNumbers: [...new Set(activeRooms.length ? activeRooms : reservedRooms)].join(", "), stayId: stays.find(s => s.status === "IN_HOUSE")?.id || stays[0]?.id || null });
  }
  return result;
}
