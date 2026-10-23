/** Report days are calendar days in the property's timezone, independent of the server. */
export function validReportDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900 &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function validateReportRange(start: string, end = start): void {
  if (!validReportDate(start) || !validReportDate(end)) throw new RangeError("Choose valid report dates (YYYY-MM-DD).");
  if (start > end) throw new RangeError("The start date must be on or before the end date.");
  if ((Date.parse(end) - Date.parse(start)) / 86400000 > 3659) throw new RangeError("Select a report period of ten years or less.");
}

export function shiftReportDate(date: string, days: number): string {
  validateReportRange(date);
  return new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
}

export function reportDateOf(value: string | Date, timeZone = "Asia/Kolkata"): string {
  if (typeof value === "string" && validReportDate(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map(key => parts.find(p => p.type === key)?.value).join("-");
}

function zonedMidnight(date: string, timeZone: string): Date {
  const target = Date.parse(`${date}T00:00:00Z`);
  let instant = target;
  const format = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let i = 0; i < 5; i++) {
    const parts = format.formatToParts(new Date(instant));
    const n = (key: string) => Number(parts.find(p => p.type === key)?.value);
    const wallTime = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
    const correction = target - wallTime;
    if (!correction) return new Date(instant);
    instant += correction;
  }
  throw new RangeError("This timezone does not have a midnight on the selected date.");
}

export function reportDayBounds(date: string, timeZone = "Asia/Kolkata") {
  validateReportRange(date);
  const startUtc = zonedMidnight(date, timeZone);
  const endUtc = new Date(zonedMidnight(shiftReportDate(date, 1), timeZone).getTime() - 1);
  // Compatibility aliases deliberately describe the same instants, not an expanded window.
  return { startUtc, endUtc, localStart: startUtc, localEnd: endUtc, dateStr: date };
}

export function matchesReportPeriod(value: string | Date, preset: string, anchor: string, start = "", end = "", timeZone = "Asia/Kolkata"): boolean {
  if (preset === "ALL_TIME") return true;
  const date = reportDateOf(value, timeZone);
  if (!date || !validReportDate(anchor)) return false;
  if (preset === "TODAY") return date === anchor;
  if (preset === "YESTERDAY") return date === shiftReportDate(anchor, -1);
  if (preset === "LAST_7_DAYS") return date >= shiftReportDate(anchor, -6) && date <= anchor;
  if (preset === "THIS_MONTH") return date.slice(0, 7) === anchor.slice(0, 7) && date <= anchor;
  if (preset === "CUSTOM") return (!start || date >= start) && (!end || date <= end) && (!start || !end || start <= end);
  return true;
}
