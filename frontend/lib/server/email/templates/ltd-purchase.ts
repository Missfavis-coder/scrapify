import { EMAIL_SUBJECTS } from "@/lib/constants/email";
import {
  escapeHtml,
  htmlLink,
  htmlShell,
} from "@/lib/server/email/templates/_shared";
import type { LtdPurchaseEmailData } from "@/lib/types/email";

export function subject(): string {
  return EMAIL_SUBJECTS.ltdPurchase;
}

export function text(data: LtdPurchaseEmailData): string {
  const greeting = data.displayName ? `Hi ${data.displayName},` : "Hi there,";
  const lines = [
    greeting,
    "",
    "Your skillmd lifetime deal is active. Every Pro feature we ship — yours, forever.",
    "",
    "Open your dashboard:",
    data.dashboardUrl,
  ];
  if (data.receiptUrl) {
    lines.push("", "Download your receipt:", data.receiptUrl);
  }
  lines.push("", "Reply to this email any time.", "", "— the skillmd team");
  return lines.join("\n");
}

export function html(data: LtdPurchaseEmailData): string {
  const greetingName = data.displayName ?? "there";
  const parts = [
    `<p>Hi ${escapeHtml(greetingName)},</p>`,
    "<p>Your skillmd lifetime deal is active. Every Pro feature we ship — yours, forever.</p>",
    `<p>${htmlLink(data.dashboardUrl, "Open your dashboard")}</p>`,
  ];
  if (data.receiptUrl) {
    parts.push(`<p>${htmlLink(data.receiptUrl, "Download your receipt")}</p>`);
  }
  parts.push("<p>Reply to this email any time.</p>");
  parts.push("<p>— the skillmd team</p>");
  return htmlShell(parts);
}
