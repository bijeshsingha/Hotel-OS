export const reportMoney = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
type Entry = { type: string; status?: string; totalAmount: number; taxableAmount: number; chargeCode?: string; description?: string; taxComponentsJson?: string | null };
export type RecordedTotals = { base: number; tax: number; gross: number; cgst: number; sgst: number; igst: number };
export function recordedTax(entry: Pick<Entry, "totalAmount" | "taxableAmount" | "taxComponentsJson">): RecordedTotals {
  const gross = reportMoney(entry.totalAmount);
  const base = reportMoney(entry.taxableAmount ?? gross);
  let comp: Record<string, unknown> = {};
  try { comp = JSON.parse(entry.taxComponentsJson || "{}") || {}; } catch { /* legacy records may have no components */ }
  const number = (key: string) => Number.isFinite(Number(comp[key])) ? Number(comp[key]) : 0;
  return { base, gross, tax: reportMoney(gross - base), cgst: number("cgstAmount"), sgst: number("sgstAmount"), igst: number("igstAmount") };
}
export function revenueDepartment(entry: Pick<Entry, "chargeCode" | "description">): "room" | "food" | "other" {
  const code = (entry.chargeCode || "").toUpperCase();
  if (/ROOM_TARIFF|STAY_EXTENSION|ROOM_RENT|EXTRA_(PAX|BED)|ACCOMMODATION/.test(code)) return "room";
  if (/FOOD|RESTAURANT|BEVERAGE|FNB|^FB|ROOM_SERVICE|DINNER|BREAKFAST|KOT/.test(code) || /\b(DINING|FOOD|DINNER)\b/i.test(entry.description || "")) return "food";
  return "other";
}
export function summarizeReportLedger(entries: Entry[]) {
  const empty = (): RecordedTotals => ({ base: 0, tax: 0, gross: 0, cgst: 0, sgst: 0, igst: 0 });
  const streams = { room: empty(), food: empty(), other: empty(), adjustments: empty() };
  const net = { room: empty(), food: empty(), other: empty() };
  const total = empty();
  for (const entry of entries) {
    if ((entry.status && entry.status !== "POSTED") || !["CHARGE", "ADJUSTMENT"].includes(entry.type)) continue;
    const amounts = recordedTax(entry);
    const department = revenueDepartment(entry);
    const stream = amounts.gross < 0 ? streams.adjustments : streams[department];
    for (const key of Object.keys(total) as (keyof RecordedTotals)[]) {
      total[key] = reportMoney(total[key] + amounts[key]);
      stream[key] = reportMoney(stream[key] + amounts[key]);
      net[department][key] = reportMoney(net[department][key] + amounts[key]);
    }
  }
  return { streams, total, roomRev: net.room.gross, fbRev: net.food.gross, otherRev: net.other.gross,
    roomBase: net.room.base, taxable: total.base, tax: total.tax, discounts: -streams.adjustments.gross,
    netRev: total.gross, totalRev: total.gross,
    grossTurnover: reportMoney(streams.room.gross + streams.food.gross + streams.other.gross) };
}

/** Each amount is allocated exactly once; only amounts without a room tag are shared. */
export function allocateReportAmounts(rooms: string[], amounts: { amount: number; text: string }[]): number[] {
  if (!rooms.length) return [];
  const cents = rooms.map(() => 0);
  let unassigned = 0;
  for (const item of amounts) {
    const amount = Math.round(item.amount * 100);
    const match = rooms.findIndex(room => new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${room.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "i").test(item.text));
    if (match >= 0) cents[match] += amount;
    else unassigned += amount;
  }
  const share = Math.trunc(unassigned / rooms.length);
  const remainder = unassigned - share * rooms.length;
  return cents.map((amount, i) => (amount + share + (i < Math.abs(remainder) ? Math.sign(remainder) : 0)) / 100);
}

/** A transfer begins where the previous assignment ends, not at any later assignment in the stay. */
type ReportAssignment = { id: string; roomId: string; startsAt: Date; endsAt: Date | null; moveReason?: string | null; room?: { number: string } | null };
export function nextReportRoomAssignment<T extends ReportAssignment>(source: ReportAssignment, assignments: T[]): T | undefined {
  if (!source.endsAt) return undefined;
  const end = source.endsAt.getTime();
  const candidates = assignments.filter(a => a.id !== source.id && a.roomId !== source.roomId && a.startsAt.getTime() >= end - 1000)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const documentedRoom = source.moveReason?.match(/\bto\s+(?:(?:Room|Rm)\s*#?\s*)?([\w-]+)/i)?.[1];
  // Older records may have a gap before the receiving room was entered. Respect an explicit route.
  const documentedTarget = documentedRoom ? candidates.find(a => a.room?.number === documentedRoom) : undefined;
  if (documentedTarget) return documentedTarget;
  return candidates.filter(a => a.startsAt.getTime() <= end + 60000)
    .sort((a, b) => Math.abs(a.startsAt.getTime() - end) - Math.abs(b.startsAt.getTime() - end))[0];
}
