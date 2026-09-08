type StoreDateStyle = "short" | "medium" | "full";

export function formatStoreDateTime(value: string, style: StoreDateStyle) {
  const date = parseStoreWallTime(value);
  if (!date) return "وقت غير متاح";
  const dateText = new Intl.DateTimeFormat("ar-EG", {
    timeZone: "UTC",
    ...(style === "full" ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: style === "short" ? "short" : "long",
    ...(style === "short" ? {} : { year: "numeric" }),
  }).format(date);
  const timeText = new Intl.DateTimeFormat("ar-EG", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${dateText} — ${timeText}`;
}

// WooCommerce supplies the store's wall-clock value. Parsing the offset in the
// browser would apply the device timezone again and shift the displayed hour.
function parseStoreWallTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0"] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  return Number.isNaN(date.getTime()) ? null : date;
}
