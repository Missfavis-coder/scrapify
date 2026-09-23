import {
  claimAdminRescueNotification,
  getRescuedSkillName,
} from "@/lib/server/db/queries/admin-rescue";
import { findUserById } from "@/lib/server/db/queries/users";
import { sendEmail } from "@/lib/server/email/client";
import * as skillRegeneratedTemplate from "@/lib/server/email/templates/skill-regenerated";
import { EMAIL_LINKS } from "@/lib/constants/email";
import { SITE } from "@/lib/constants/site";
import { logError, logEvent } from "@/lib/server/logger";
import type { SkillRegeneratedEmailData } from "@/lib/types/email";

export async function notifyOwnerOfAdminRescue(
  generationId: string
): Promise<void> {
  try {
    const claim = await claimAdminRescueNotification(generationId);
    if (!claim) return;

    const user = await findUserById(claim.userId);
    if (!user) return;

    const skillName =
      (await getRescuedSkillName(generationId)) ?? claim.sourceHost;
    const data: SkillRegeneratedEmailData = {
      email: user.email,
      displayName: user.displayName ?? user.email.split("@")[0] ?? null,
      skillName,
      skillDetailUrl: `${SITE.url}${EMAIL_LINKS.skillBase}/${generationId}`,
    };

    const result = await sendEmail({
      to: data.email,
      subject: skillRegeneratedTemplate.subject(data),
      text: skillRegeneratedTemplate.text(data),
      html: skillRegeneratedTemplate.html(data),
    });

    if (result.ok) {
      logEvent("rescue.notification.sent", {
        generationId,
        userId: claim.userId,
      });
    }
  } catch (error) {
    logError("rescue.notification.failed", error, { generationId });
  }
}
