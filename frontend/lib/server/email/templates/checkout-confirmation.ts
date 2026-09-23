import { EMAIL_SUBJECTS } from "@/lib/constants/email";
import {
  escapeHtml,
  htmlLink,
  htmlShell,
} from "@/lib/server/email/templates/_shared";
import type { CheckoutConfirmationEmailData } from "@/lib/types/email";

export function subject(): string {
  return EMAIL_SUBJECTS.checkoutConfirmation;
}

export function text(data: CheckoutConfirmationEmailData): string {
  const greeting = data.displayName ? `Hi ${data.displayName},` : "Hi there,";
  return [
    greeting,
    "",
    `Your skillmd Pro plan (${data.planLabel}) is active for ${data.amountLabel}.`,
    "",
    "Open your dashboard:",
    data.dashboardUrl,
    "",
    "Manage billing or download invoices:",
    data.invoicePortalUrl,
    "",
    "Reply to this email if anything looks off.",
    "",
    "— the skillmd team",
  ].join("\n");
}

export function html(data: CheckoutConfirmationEmailData): string {
  const greetingName = data.displayName ?? "there";
  return htmlShell([
    `<p>Hi ${escapeHtml(greetingName)},</p>`,
    `<p>Your skillmd Pro plan (${escapeHtml(data.planLabel)}) is active for ${escapeHtml(data.amountLabel)}.</p>`,
    `<p>${htmlLink(data.dashboardUrl, "Open your dashboard")}</p>`,
    `<p>${htmlLink(data.invoicePortalUrl, "Manage billing or download invoices")}</p>`,
    "<p>Reply to this email if anything looks off.</p>",
    "<p>— the skillmd team</p>",
  ]);
}
