import { createHmac } from "node:crypto";
import { markDelivered } from "@/lib/server/db/queries/webhook-configs";
import { logError, logEvent } from "@/lib/server/logger";
import {
  WEBHOOK_DELIVERY_TIMEOUT_MS,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_SIGNATURE_PREFIX,
  WEBHOOK_USER_AGENT,
  type WebhookEventType,
} from "@/lib/constants/webhooks";
import type { WebhookConfigRow } from "@/lib/server/db/schema";
import type {
  SourceChangeDiff,
  WebhookProvider,
} from "@/lib/types/webhooks";

interface DispatchSourceChangedInput {
  webhook: WebhookConfigRow;
  diff: SourceChangeDiff;
}

interface DispatchResult {
  ok: boolean;
  status: number | null;
  errorMessage?: string;
}

export async function dispatchSourceChanged(
  input: DispatchSourceChangedInput
): Promise<DispatchResult> {
  const { webhook, diff } = input;
  const provider = webhook.provider as WebhookProvider;
  const body = formatBody(provider, diff);
  const headers = buildHeaders(webhook.secret, body);

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    WEBHOOK_DELIVERY_TIMEOUT_MS
  );

  try {
    const response = await fetch(webhook.target, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.ok) {
      await markDelivered(webhook.id).catch(() => {});
      logEvent("webhook.delivered", {
        webhookId: webhook.id,
        provider,
        status: response.status,
      });
      return { ok: true, status: response.status };
    }

    logError("webhook.delivery_failed", new Error("non_2xx"), {
      webhookId: webhook.id,
      provider,
      status: response.status,
    });
    return { ok: false, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError("webhook.delivery_error", error, {
      webhookId: webhook.id,
      provider,
    });
    return { ok: false, status: null, errorMessage: message };
  } finally {
    clearTimeout(timer);
  }
}

export async function dispatchSourceChangedToAll(
  webhooks: WebhookConfigRow[],
  diff: SourceChangeDiff
): Promise<void> {
  if (webhooks.length === 0) return;
  await Promise.all(
    webhooks
      .filter((row) => row.enabled)
      .map((webhook) =>
        dispatchSourceChanged({ webhook, diff }).catch(() => undefined)
      )
  );
}

function formatBody(
  provider: WebhookProvider,
  diff: SourceChangeDiff
): string {
  if (provider === "slack") {
    return JSON.stringify({
      text: buildHumanMessage(diff),
    });
  }
  if (provider === "discord") {
    return JSON.stringify({
      content: buildHumanMessage(diff),
    });
  }
  const payload: GenericPayload = {
    event: WEBHOOK_EVENT_TYPES.sourceChanged,
    data: diff,
  };
  return JSON.stringify(payload);
}

function buildHumanMessage(diff: SourceChangeDiff): string {
  const slugPart = diff.slug ? ` (${diff.slug})` : "";
  return `Source changed for ${diff.sourceHost}${slugPart}: ${diff.summary}`;
}

function buildHeaders(
  secret: string | null,
  body: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": WEBHOOK_USER_AGENT,
  };
  if (secret && secret.length > 0) {
    const hmac = createHmac("sha256", secret).update(body).digest("hex");
    headers[WEBHOOK_SIGNATURE_HEADER] = `${WEBHOOK_SIGNATURE_PREFIX}${hmac}`;
  }
  return headers;
}

interface GenericPayload {
  event: WebhookEventType;
  data: SourceChangeDiff;
}
