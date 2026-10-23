/** Limit receipt queries, then match the calendar day in the property's timezone. */
export function receiptBusinessDay(date: string, timeZone: string) {
  const midnight = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== date) {
    throw new Error("Invalid receipt business date.");
  }
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    // All IANA timezone offsets fit within this bounded three-day candidate window.
    // The exact local-date comparison handles DST without using the server timezone.
    from: new Date(midnight.getTime() - dayMs),
    to: new Date(midnight.getTime() + 2 * dayMs),
    includes(receivedAt: Date) {
      const parts = formatter.formatToParts(receivedAt);
      const value = (type: string) => parts.find((part) => part.type === type)?.value;
      return `${value("year")}-${value("month")}-${value("day")}` === date;
    },
  };
}
