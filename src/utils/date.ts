// The API serializes timestamps as ISO strings without a zone ("2026-09-20T10:00:00"), sometimes
// with 7 fractional digits (.NET ticks). A zone-less string is read as local time - exactly what
// the MAUI app's DateTime parsing did - and the fraction is trimmed to milliseconds because not
// every JS engine accepts more digits.
export function parseServerDate(value: string): Date {
  const trimmed = value.replace(/(\.\d{3})\d+/, "$1");
  return new Date(trimmed);
}

// Timestamps that are real instants (chat messages) are stored as UTC, but the API is inconsistent
// about marking them: a freshly-sent message comes back with a "Z", while the same message read back
// from the database has no zone at all. Reading the zone-less form as local time (as parseServerDate
// does, correctly, for appointment slots) would shift every chat time by the user's UTC offset - so
// for instants a missing zone means UTC.
const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export function parseServerUtcDate(value: string): Date {
  const trimmed = value.replace(/(\.\d{3})\d+/, "$1");
  return new Date(HAS_ZONE.test(trimmed) ? trimmed : `${trimmed}Z`);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** yyyy-MM-dd in local time - the date query parameter the slots endpoint expects. */
export function toApiDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Start of today (local). */
export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// ---- display formats (the MAUI .NET format strings each one replaces are noted) ----

/** "dddd, MMMM d" -> Sunday, September 20 */
export function formatWeekdayMonthDay(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

/** "h:mm tt" -> 3:05 PM */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "MMMM d, yyyy" -> September 20, 2026 */
export function formatMonthDayYear(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

/** "MMM d, h:mm tt" -> Sep 20, 3:05 PM (chat bubble timestamp) */
export function formatChatStamp(date: Date): string {
  const day = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day}, ${formatTime(date)}`;
}

/** "dddd, MMMM d 'at' h:mm tt" -> Sunday, September 20 at 3:05 PM */
export function formatLongWithTime(date: Date): string {
  return `${formatWeekdayMonthDay(date)} at ${formatTime(date)}`;
}
