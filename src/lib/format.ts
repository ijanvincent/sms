const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(date: Date | null | undefined): string {
  return date ? DATE_TIME_FORMATTER.format(date) : "—";
}
