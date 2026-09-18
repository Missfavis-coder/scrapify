import { EMAIL_SUBJECTS } from "@/lib/constants/email";
import {
  escapeHtml,
  htmlLink,
  htmlShell,
} from "@/lib/server/email/templates/_shared";
import type { PaymentFailedEmailData } from "@/lib/types/email";

export function subject(): string {
  return EMAIL_SUBJECTS.paymentFailed;
}

export function text(data: PaymentFailedEmailData): string {
  const greeting = data.displayName ? `Hi ${data.displayName},` : "Hi there,";
  return [
    greeting,
    "",
    "We tried to charge your card for skillmd Pro and it didn't go through.",
    "",
    "Update your card or try again here:",
    data.retryUrl,
    "",
    `Need help? Email ${data.supportEmail} and we'll sort it.`,
    "",
    "— the skillmd team",
  ].join("\n");
}

export function html(data: PaymentFailedEmailData): string {
  const greetingName = data.displayName ?? "there";
  return htmlShell([
    `<p>Hi ${escapeHtml(greetingName)},</p>`,
    "<p>We tried to charge your card for skillmd Pro and it didn't go through.</p>",
    `<p>${htmlLink(data.retryUrl, "Update your card or try again")}</p>`,
    `<p>Need help? Email ${escapeHtml(data.supportEmail)} and we'll sort it.</p>`,
    "<p>— the skillmd team</p>",
  ]);
}
