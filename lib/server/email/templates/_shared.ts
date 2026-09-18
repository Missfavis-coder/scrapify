export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function htmlShell(bodyParts: string[]): string {
  return [
    "<!doctype html>",
    "<html>",
    "<body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #18181b; line-height: 1.55;\">",
    ...bodyParts,
    "</body>",
    "</html>",
  ].join("");
}

export function htmlLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color: #6366f1; text-decoration: underline;">${escapeHtml(label)}</a>`;
}

export function htmlButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">${escapeHtml(label)}</a>`;
}
