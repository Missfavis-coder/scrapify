import { EMAIL_SUBJECTS } from "@/lib/constants/email";
import {
  escapeHtml,
  htmlLink,
  htmlShell,
} from "@/lib/server/email/templates/_shared";
import type { CancellationConfirmedEmailData } from "@/lib/types/email";

export function subject(): string {
  return EMAIL_SUBJECTS.cancellationConfirmed;
}

export function text(data: CancellationConfirmedEmailData): string {
  const greeting = data.displayName ? `Hi ${data.displayName},` : "Hi there,";
  const endsAtLine = data.endsAtLabel
    ? `Your Pro features stay active until ${data.endsAtLabel}.`
    : "Your Pro features will be removed on your next billing date.";
  return [
    greeting,
    "",
    "Your skillmd subscription is set to cancel.",
    endsAtLine,
    "",
    "Change your mind? Reactivate any time:",
    data.reactivateUrl,
    "",
    "— the skillmd team",
  ].join("\n");
}

export function html(data: CancellationConfirmedEmailData): string {
  const greetingName = data.displayName ?? "there";
  const endsAtLine = data.endsAtLabel
    ? `Your Pro features stay active until ${escapeHtml(data.endsAtLabel)}.`
    : "Your Pro features will be removed on your next billing date.";
  return htmlShell([
    `<p>Hi ${escapeHtml(greetingName)},</p>`,
    "<p>Your skillmd subscription is set to cancel.</p>",
    `<p>${endsAtLine}</p>`,
    `<p>Change your mind? ${htmlLink(data.reactivateUrl, "Reactivate any time")}.</p>`,
    "<p>— the skillmd team</p>",
  ]);
}
