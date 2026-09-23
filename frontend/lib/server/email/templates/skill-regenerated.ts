import { EMAIL_SUBJECTS } from "@/lib/constants/email";
import {
  escapeHtml,
  htmlButton,
  htmlLink,
  htmlShell,
} from "@/lib/server/email/templates/_shared";
import type { SkillRegeneratedEmailData } from "@/lib/types/email";

export function subject(data: SkillRegeneratedEmailData): string {
  return `${EMAIL_SUBJECTS.skillRegenerated}: ${data.skillName}`;
}

export function text(data: SkillRegeneratedEmailData): string {
  const greeting = data.displayName ? `Hi ${data.displayName},` : "Hi there,";
  return [
    greeting,
    "",
    `Your skill ${data.skillName} failed to generate earlier, so our team regenerated it for you. It's ready to use now.`,
    "",
    "View your skill:",
    data.skillDetailUrl,
    "",
    "Reply to this email if anything still looks off.",
    "",
    "— the skillmd team",
  ].join("\n");
}

export function html(data: SkillRegeneratedEmailData): string {
  const greetingName = data.displayName ?? "there";
  return htmlShell([
    `<p>Hi ${escapeHtml(greetingName)},</p>`,
    `<p>Your skill <strong>${escapeHtml(data.skillName)}</strong> failed to generate earlier, so our team regenerated it for you. It's ready to use now.</p>`,
    `<p style="margin: 24px 0;">${htmlButton(data.skillDetailUrl, "View your skill")}</p>`,
    `<p>Or open it directly: ${htmlLink(data.skillDetailUrl, data.skillDetailUrl)}</p>`,
    "<p>Reply to this email if anything still looks off.</p>",
    "<p>— the skillmd team</p>",
  ]);
}
