export type ProtectionWallKind =
  | "VERCEL_AUTH"
  | "CLOUDFLARE_ACCESS"
  | "CLOUDFLARE_CHALLENGE"
  | "NETLIFY_PASSWORD"
  | "GITHUB_PAGES_404"
  | "BASIC_AUTH"
  | "PAYWALL"
  | "BOT_CHALLENGE";

const KIND_LABELS: Record<ProtectionWallKind, string> = {
  VERCEL_AUTH: "Vercel Authentication",
  CLOUDFLARE_ACCESS: "Cloudflare Access",
  CLOUDFLARE_CHALLENGE: "Cloudflare bot challenge",
  NETLIFY_PASSWORD: "Netlify password protection",
  GITHUB_PAGES_404: "GitHub Pages 404",
  BASIC_AUTH: "HTTP Basic Auth",
  PAYWALL: "Paywall / login wall",
  BOT_CHALLENGE: "Bot detection challenge",
};

const PROTECTION_VERCEL_HOSTS = ["vercel.com/sso-api", "vercel.com/sso"];
const PROTECTION_CF_ACCESS_HOSTS = [".cloudflareaccess.com"];
const VERCEL_AUTH_BODY_HINTS = [
  "_vercel_sso_nonce",
  "vercel sso",
  "authentication required",
  "this deployment is protected",
];
const CF_ACCESS_BODY_HINTS = [
  "cloudflare access",
  "your team's identity provider",
];
const NETLIFY_BODY_HINTS = ["password protected", "netlify-protected"];
const GITHUB_PAGES_404_HINTS = [
  "there isn't a github pages site here",
  "for root urls (like http://example.com/) you must provide an index.html file",
];
const BASIC_AUTH_TITLE_HINTS = ["401 authorization required"];
const PAYWALL_BODY_HINTS = [
  "subscribe to read",
  "create a free account to continue reading",
];
const CF_CHALLENGE_TITLE_HINTS = [
  "just a moment",
  "attention required",
  "checking your browser",
  "please wait...",
  "verifying you are human",
];
const CF_CHALLENGE_BODY_MARKERS = [
  "/cdn-cgi/challenge-platform/",
  "cf-chl-bypass",
  "cf_chl_opt",
  "_cf_chl_",
  "cf-browser-verification",
  "cf-mitigated",
];
const BOT_CHALLENGE_TITLE_HINTS = [
  "you have been blocked",
  "pardon our interruption",
  "are you a robot",
];
const BOT_CHALLENGE_BODY_MARKERS = [
  "px-captcha",
  "datadome",
  "incapsula incident id",
  "distil_r_captcha",
  "/_incapsula_resource",
  "perimeterx",
];

const RETRIABLE_PROTECTION_KINDS: ReadonlySet<ProtectionWallKind> = new Set([
  "CLOUDFLARE_CHALLENGE",
  "BOT_CHALLENGE",
]);

export interface ProtectionDetectionInput {
  finalUrl: string;
  title: string;
  html: string;
}

export interface ProtectionDetection {
  kind: ProtectionWallKind;
  label: string;
}

export function detectProtectionWall(
  input: ProtectionDetectionInput
): ProtectionDetection | null {
  const finalUrl = input.finalUrl.toLowerCase();
  const title = input.title.toLowerCase();
  const html = input.html.toLowerCase();

  if (
    PROTECTION_VERCEL_HOSTS.some((host) => finalUrl.includes(host)) ||
    VERCEL_AUTH_BODY_HINTS.some((h) => html.includes(h))
  ) {
    return { kind: "VERCEL_AUTH", label: KIND_LABELS.VERCEL_AUTH };
  }

  if (
    PROTECTION_CF_ACCESS_HOSTS.some((host) => finalUrl.includes(host)) ||
    CF_ACCESS_BODY_HINTS.some((h) => html.includes(h))
  ) {
    return { kind: "CLOUDFLARE_ACCESS", label: KIND_LABELS.CLOUDFLARE_ACCESS };
  }

  if (
    CF_CHALLENGE_TITLE_HINTS.some((h) => title.includes(h)) ||
    CF_CHALLENGE_BODY_MARKERS.some((h) => html.includes(h))
  ) {
    return {
      kind: "CLOUDFLARE_CHALLENGE",
      label: KIND_LABELS.CLOUDFLARE_CHALLENGE,
    };
  }

  if (NETLIFY_BODY_HINTS.some((h) => html.includes(h))) {
    return { kind: "NETLIFY_PASSWORD", label: KIND_LABELS.NETLIFY_PASSWORD };
  }

  if (GITHUB_PAGES_404_HINTS.some((h) => html.includes(h))) {
    return { kind: "GITHUB_PAGES_404", label: KIND_LABELS.GITHUB_PAGES_404 };
  }

  if (BASIC_AUTH_TITLE_HINTS.some((h) => title.includes(h))) {
    return { kind: "BASIC_AUTH", label: KIND_LABELS.BASIC_AUTH };
  }

  if (PAYWALL_BODY_HINTS.some((h) => html.includes(h))) {
    return { kind: "PAYWALL", label: KIND_LABELS.PAYWALL };
  }

  if (
    BOT_CHALLENGE_TITLE_HINTS.some((h) => title.includes(h)) ||
    BOT_CHALLENGE_BODY_MARKERS.some((h) => html.includes(h))
  ) {
    return { kind: "BOT_CHALLENGE", label: KIND_LABELS.BOT_CHALLENGE };
  }

  return null;
}

export function isRetriableProtectionKind(kind: ProtectionWallKind): boolean {
  return RETRIABLE_PROTECTION_KINDS.has(kind);
}

export class ProtectionWallError extends Error {
  readonly kind: ProtectionWallKind;
  readonly label: string;
  readonly detectedAt: string;

  constructor(detection: ProtectionDetection, detectedAt: string) {
    super(`Blocked by ${detection.label} at ${detectedAt}`);
    this.name = "ProtectionWallError";
    this.kind = detection.kind;
    this.label = detection.label;
    this.detectedAt = detectedAt;
  }
}

export function isProtectionWallError(
  error: unknown
): error is ProtectionWallError {
  return error instanceof ProtectionWallError;
}
