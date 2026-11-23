import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatStatus(status: string) {
  return status
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export  function getStatusStyles(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-emerald-50 text-emerald-700";

    case "paused":
      return "bg-amber-50 text-amber-700";

    case "failed":
      return "bg-red-50 text-red-700";

    default:
      return "bg-neutral-100 text-neutral-600";
  }
}
