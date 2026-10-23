import { calculateGST, round2 } from "@/lib/gst/calculator";

export function quoteReservationNight(ratePerNight: number, isRateInclusive: boolean, supplierStateCode = "18") {
  return calculateGST({
    grossOrBaseAmount: ratePerNight,
    isInclusive: isRateInclusive,
    sacHsn: "996311",
    supplierStateCode,
    // A complimentary room has no taxable charge.
    ...(ratePerNight === 0 ? { customTaxRate: 0 } : {}),
  });
}

export function quoteReservationRate({ ratePerNight, isRateInclusive, nightsCount, roomCount, depositAmount = 0, supplierStateCode = "18" }: {
  ratePerNight: number;
  isRateInclusive: boolean;
  nightsCount: number;
  roomCount: number;
  depositAmount?: number;
  supplierStateCode?: string;
}) {
  // Calculate each room-night first, matching the server's slabs and rounding.
  const night = quoteReservationNight(ratePerNight, isRateInclusive, supplierStateCode);
  const roomNights = nightsCount * roomCount;
  const totalAmount = round2(night.totalAmount * roomNights);
  return {
    nightsCount,
    roomCount,
    subtotal: round2(night.taxableAmount * roomNights),
    taxAmount: round2(night.taxAmount * roomNights),
    totalAmount,
    balanceDue: round2(Math.max(0, totalAmount - depositAmount)),
    effectiveTaxRate: night.components.effectiveTaxRate,
  };
}

export interface ReservationRateTerms {
  ratePerNight: number;
  isRateInclusive: boolean;
}

export function getReservationRateTerms(room: { nights?: { serviceDate?: string; snapshotJson?: string | null }[] } | null | undefined): ReservationRateTerms | null {
  const nights = [...(room?.nights || [])].sort((a, b) => (a.serviceDate || "").localeCompare(b.serviceDate || ""));
  for (const night of nights) {
    if (!night.snapshotJson) continue;
    try {
      const snapshot = JSON.parse(night.snapshotJson);
      if (snapshot && typeof snapshot.isRateInclusive === "boolean" && typeof snapshot.agreedRate === "number" && Number.isFinite(snapshot.agreedRate) && snapshot.agreedRate >= 0) {
        return { ratePerNight: snapshot.agreedRate, isRateInclusive: snapshot.isRateInclusive };
      }
    } catch {
      // Legacy/malformed snapshots keep their existing fallback behaviour.
    }
  }
  return null;
}
