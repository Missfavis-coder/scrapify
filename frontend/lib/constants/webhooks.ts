import type { WebhookProvider } from "@/lib/types/webhooks";

export const WEBHOOK_DELIVERY_TIMEOUT_MS = 5_000;
export const WEBHOOK_SIGNATURE_HEADER = "X-Skillmd-Signature";
export const WEBHOOK_SIGNATURE_PREFIX = "sha256=";
export const WEBHOOK_USER_AGENT = "getskillmd-webhook/1.0";
export const WEBHOOK_TARGET_MAX_LENGTH = 2048;
export const WEBHOOK_SECRET_MAX_LENGTH = 256;

export const WEBHOOK_EVENT_TYPES = {
  sourceChanged: "source.changed",
} as const;

export type WebhookEventType =
  (typeof WEBHOOK_EVENT_TYPES)[keyof typeof WEBHOOK_EVENT_TYPES];

export const WEBHOOK_PROVIDERS: Record<
  WebhookProvider,
  { label: string; helper: string }
> = {
  slack: {
    label: "Slack",
    helper: "Slack incoming webhook URL.",
  },
  discord: {
    label: "Discord",
    helper: "Discord channel webhook URL.",
  },
  generic: {
    label: "Generic JSON",
    helper:
      "Any HTTPS endpoint. Receives a signed JSON payload with the diff.",
  },
};

export const WEBHOOK_PROVIDER_KEYS = Object.keys(
  WEBHOOK_PROVIDERS
) as WebhookProvider[];

export const WEBHOOK_COPY = {
  sectionTitle: "Source change webhooks",
  sectionDescription:
    "Get notified in Slack, Discord, or any HTTPS endpoint when this skill's source detects a change.",
  addCta: "Add webhook",
  proGateLabel: "Pro feature",
  emptyHeading: "No webhooks yet",
  emptyDescription:
    "Add a webhook to be notified when the source page changes and the skill is regenerated.",
  modalTitle: "Add webhook",
  modalDescription:
    "Pick a provider and paste the destination URL. Generic targets can be signed with a shared secret.",
  providerLabel: "Provider",
  targetLabel: "Webhook URL",
  targetPlaceholder: "https://hooks.slack.com/services/...",
  targetHelper: "Must be HTTPS.",
  secretLabel: "Signing secret",
  secretOptionalLabel: "Signing secret (optional)",
  secretPlaceholder: "Used to sign generic webhook payloads.",
  saveLabel: "Save webhook",
  cancelLabel: "Cancel",
  enabledLabel: "Enabled",
  disabledLabel: "Disabled",
  signedLabel: "Signed",
  enableLabel: "Enable",
  disableLabel: "Disable",
  deleteLabel: "Delete",
  deleteConfirmTitle: "Delete webhook?",
  deleteConfirmDescription:
    "This webhook will stop receiving events. You can add it again later.",
  deleteConfirmCta: "Delete webhook",
  lastDeliveredLabel: "Last delivered",
  lastDeliveredNeverLabel: "Never delivered",
  createdLabel: "Created",
  saveSuccessLabel: "Webhook saved.",
  saveFailedLabel: "Could not save webhook.",
  deleteSuccessLabel: "Webhook deleted.",
  deleteFailedLabel: "Could not delete webhook.",
  toggleFailedLabel: "Could not update webhook.",
  signedInRequired: "Sign in to manage webhooks.",
  ownerRequired: "Only the owner of this skill can add webhooks.",
} as const;

export const WEBHOOK_ERROR_CODES = {
  missing: "WEBHOOK_NOT_FOUND",
  invalidTarget: "INVALID_WEBHOOK_TARGET",
  invalidProvider: "INVALID_WEBHOOK_PROVIDER",
  forbidden: "WEBHOOK_FORBIDDEN",
  proRequired: "PRO_REQUIRED",
  invalidBody: "INVALID_BODY",
  generationNotFound: "GENERATION_NOT_FOUND",
} as const;
