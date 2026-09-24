// Australian display formats (CLAUDE.md "Coding Conventions": dates stored
// in UTC, displayed in Australia/Sydney time as DD/MM/YYYY; money as AUD
// with $). Keep all formatting here so it stays consistent everywhere.

const SYDNEY_TZ = "Australia/Sydney";

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Formats integer cents as AUD, e.g. 420000 -> "$4,200.00". */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}
