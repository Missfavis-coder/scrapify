const FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const SHORT_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatLongDate(iso: string): string {
  return FORMATTER.format(new Date(iso));
}

export function formatShortDate(iso: string): string {
  try {
    return SHORT_FORMATTER.format(new Date(iso));
  } catch {
    return iso;
  }
}
