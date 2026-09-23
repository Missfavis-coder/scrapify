import { EMAIL_SUBJECTS } from "@/lib/constants/email";
import {
  escapeHtml,
  htmlLink,
  htmlShell,
} from "@/lib/server/email/templates/_shared";
import type { WelcomeEmailData } from "@/lib/types/email";

export function subject(): string {
  return EMAIL_SUBJECTS.welcome;
}

export function text(data: WelcomeEmailData): string {
  const greeting = data.displayName ? `Hi ${data.displayName},` : "Hi there,";
  return [
    greeting,
    "",
    "Thanks for signing up to skillmd. Paste any URL and turn it into a skill file your AI agent can use as context.",
    "",
    "Open your dashboard:",
    data.dashboardUrl,
    "",
    "Reply to this email if you run into anything.",
    "",
    "— the skillmd team",
  ].join("\n");
}

export function html(data: WelcomeEmailData): string {
  const greetingName = data.displayName ?? "there";
  return htmlShell([
    `<p>Hi ${escapeHtml(greetingName)},</p>`,
    "<p>Thanks for signing up to skillmd. Paste any URL and turn it into a skill file your AI agent can use as context.</p>",
    `<p>${htmlLink(data.dashboardUrl, "Open your dashboard")}</p>`,
    "<p>Reply to this email if you run into anything.</p>",
    "<p>— the skillmd team</p>",
  ]);
}
