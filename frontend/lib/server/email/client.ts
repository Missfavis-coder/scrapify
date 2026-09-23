import { Resend } from "resend";
import { getServerEnv } from "@/lib/server/env";
import { EMAIL } from "@/lib/constants/email";
import { logError, logEvent } from "@/lib/server/logger";
import type { SendEmailInput, SendEmailResult } from "@/lib/types/email";

let cached: Resend | null = null;

function getResend(): Resend | null {
  if (cached) return cached;
  try {
    const env = getServerEnv();
    if (!env.RESEND_API_KEY) return null;
    cached = new Resend(env.RESEND_API_KEY);
    return cached;
  } catch {
    return null;
  }
}

export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const resend = getResend();
  if (!resend) {
    logEvent("email.skipped_no_api_key", { to: input.to, subject: input.subject });
    return { ok: false, reason: "RESEND_NOT_CONFIGURED" };
  }

  try {
    const response = await resend.emails.send({
      from: input.from ?? EMAIL.fromAddress,
      to: input.to,
      replyTo: input.replyTo ?? EMAIL.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    if (response.error) {
      logError("email.send_failed", new Error(response.error.message), {
        to: input.to,
        subject: input.subject,
      });
      return { ok: false, reason: response.error.message };
    }

    return { ok: true, id: response.data?.id };
  } catch (error) {
    logError("email.send_failed", error, {
      to: input.to,
      subject: input.subject,
    });
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "unknown",
    };
  }
}

export function sendEmailFireAndForget(input: SendEmailInput): void {
  void sendEmail(input).catch((error) => {
    logError("email.fire_and_forget_failed", error, {
      to: input.to,
      subject: input.subject,
    });
  });
}
