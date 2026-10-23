/**
 * Hotel OS - Shared Booking & Stay Date Policy
 *
 * Enforces calendar date-only validation (YYYY-MM-DD), strict departure > arrival,
 * exclusive checkout boundaries, and interval overlap calculation.
 * Never uses Math.abs or allows reversed dates.
 */

export class DateValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "DateValidationError";
  }
}

/**
 * Validates whether a value is a valid YYYY-MM-DD calendar date.
 */
export function isValidDateOnly(str: unknown): str is string {
  if (typeof str !== "string") return false;
  const match = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export interface ValidatedStayInterval {
  arrivalDate: string;
  departureDate: string;
  nights: number;
  serviceDates: string[];
}

/**
 * Validates arrival and departure date strings.
 * Enforces:
 * - Both must be valid YYYY-MM-DD calendar dates
 * - Departure date must be strictly after arrival date
 * - Checkout is exclusive (departure date night is not occupied)
 */
export function validateStayInterval(
  arrivalDateStr?: string | null,
  departureDateStr?: string | null
): ValidatedStayInterval {
  if (!arrivalDateStr || typeof arrivalDateStr !== "string") {
    throw new DateValidationError("Arrival date is required.");
  }
  if (!departureDateStr || typeof departureDateStr !== "string") {
    throw new DateValidationError("Departure date is required.");
  }
  const arrival = arrivalDateStr.trim();
  const departure = departureDateStr.trim();

  if (!isValidDateOnly(arrival)) {
    throw new DateValidationError(`Invalid arrival date: "${arrivalDateStr}". Expected YYYY-MM-DD.`);
  }
  if (!isValidDateOnly(departure)) {
    throw new DateValidationError(`Invalid departure date: "${departureDateStr}". Expected YYYY-MM-DD.`);
  }

  if (arrival >= departure) {
    throw new DateValidationError("Departure date must be strictly after arrival date.");
  }

  const [ay, am, ad] = arrival.split("-").map(Number);
  const [dy, dm, dd] = departure.split("-").map(Number);

  const startUtc = Date.UTC(ay, am - 1, ad);
  const endUtc = Date.UTC(dy, dm - 1, dd);
  const diffDays = Math.round((endUtc - startUtc) / 86400000);

  if (diffDays <= 0) {
    throw new DateValidationError("Departure date must be strictly after arrival date.");
  }
  if (diffDays > 730) {
    throw new DateValidationError("A booking may span at most 730 nights per request.");
  }

  const serviceDates: string[] = [];
  for (let i = 0; i < diffDays; i++) {
    const cur = new Date(startUtc + i * 86400000);
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    serviceDates.push(`${y}-${m}-${d}`);
  }

  return {
    arrivalDate: arrival,
    departureDate: departure,
    nights: serviceDates.length,
    serviceDates,
  };
}

/**
 * Checks if two date intervals [startA, endA) and [startB, endB) overlap.
 * Checkout is exclusive: if endA === startB, they DO NOT overlap.
 */
export function intervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && startB < endA;
}

/**
 * Converts a Date or ISO date string into YYYY-MM-DD string.
 */
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
export function toServiceDate(val: Date | string, timeZone = "UTC"): string {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (isValidDateOnly(trimmed)) return trimmed;
  }
  const timestamp = typeof val === "string" ? new Date(val) : val;
  if (!Number.isFinite(timestamp.getTime())) throw new DateValidationError("Invalid inventory timestamp.");
  let formatter = dateFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    dateFormatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(timestamp);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
