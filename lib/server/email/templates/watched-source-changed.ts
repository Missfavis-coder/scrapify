import { EMAIL_SUBJECTS } from "@/lib/constants/email";
import {
  escapeHtml,
  htmlLink,
  htmlShell,
} from "@/lib/server/email/templates/_shared";
import type { WatchedSourceChangedEmailData } from "@/lib/types/email";

export function subject(data: WatchedSourceChangedEmailData): string {
  return `${EMAIL_SUBJECTS.watchedSourceChanged}: ${data.skillName}`;
}

export function text(data: WatchedSourceChangedEmailData): string {
  const greeting = data.displayName ? `Hi ${data.displayName},` : "Hi there,";
  return [
    greeting,
    "",
    `A source you're watching changed: ${data.skillName}`,
    `Source: ${data.sourceUrl}`,
    "",
    "Diff summary:",
    data.diffSummary,
    "",
    "View the updated skill:",
    data.skillDetailUrl,
    "",
    "— the skillmd team",
  ].join("\n");
}

export function html(data: WatchedSourceChangedEmailData): string {
  const greetingName = data.displayName ?? "there";
  return htmlShell([
    `<p>Hi ${escapeHtml(greetingName)},</p>`,
    `<p>A source you're watching changed: <strong>${escapeHtml(data.skillName)}</strong></p>`,
    `<p>Source: ${htmlLink(data.sourceUrl, data.sourceUrl)}</p>`,
    `<p><strong>Diff summary:</strong></p>`,
    `<pre style="background:#f4f4f5; padding:12px; border-radius:8px; white-space:pre-wrap;">${escapeHtml(data.diffSummary)}</pre>`,
    `<p>${htmlLink(data.skillDetailUrl, "View the updated skill")}</p>`,
    "<p>— the skillmd team</p>",
  ]);
}
