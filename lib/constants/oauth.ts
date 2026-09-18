export const OAUTH_AUTHORIZATION_PATH = "/oauth/authorize";
export const OAUTH_AUTHORIZATION_DECISION_PATH = "/api/oauth/authorize";
export const OAUTH_TOKEN_PATH = "/api/oauth/token";
export const OAUTH_REGISTRATION_PATH = "/api/oauth/register";
export const OAUTH_REVOCATION_PATH = "/api/oauth/revoke";

export const OAUTH_AS_METADATA_PATH = "/.well-known/oauth-authorization-server";
export const OAUTH_PR_METADATA_PATH = "/.well-known/oauth-protected-resource";

export const OAUTH_RESOURCE_PATH = "/api/mcp";

export const OAUTH_SCOPES = [
  "skill:read",
  "skill:write",
  "inspiration:read",
  "offline_access",
] as const;

export type OAuthScope = (typeof OAUTH_SCOPES)[number];

export const OAUTH_DEFAULT_SCOPES: readonly OAuthScope[] = OAUTH_SCOPES;

export const OAUTH_OFFLINE_ACCESS_SCOPE = "offline_access";

export const OAUTH_GRANT_TYPES = [
  "authorization_code",
  "refresh_token",
] as const;

export const OAUTH_RESPONSE_TYPES = ["code"] as const;

export const OAUTH_CODE_CHALLENGE_METHODS = ["S256"] as const;

export const OAUTH_TOKEN_ENDPOINT_AUTH_METHODS = [
  "none",
  "client_secret_post",
  "client_secret_basic",
] as const;

export const OAUTH_CLIENT_ID_PREFIX = "gskmd_client_";
export const OAUTH_CLIENT_SECRET_PREFIX = "gskmd_cs_";
export const OAUTH_ACCESS_TOKEN_PREFIX = "gskmd_at_";
export const OAUTH_REFRESH_TOKEN_PREFIX = "gskmd_rt_";
export const OAUTH_AUTH_CODE_PREFIX = "gskmd_ac_";

export const OAUTH_TOKEN_RANDOM_BYTES = 32;
export const OAUTH_CLIENT_SECRET_RANDOM_BYTES = 32;
export const OAUTH_AUTH_CODE_RANDOM_BYTES = 32;
export const OAUTH_CLIENT_ID_RANDOM_BYTES = 16;

export const OAUTH_AUTH_CODE_TTL_SECONDS = 60 * 5;
export const OAUTH_ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const OAUTH_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export const OAUTH_MAX_REDIRECT_URIS = 10;
export const OAUTH_CLIENT_NAME_MAX_LENGTH = 128;

export const OAUTH_REGISTRATION_RATE_LIMIT = 15;
export const OAUTH_REGISTRATION_RATE_WINDOW_SECONDS = 60 * 60;
export const OAUTH_REGISTRATION_QUOTA_KEY_PREFIX = "oauth_reg:";

export const OAUTH_LOOPBACK_HOSTS = ["127.0.0.1", "::1", "localhost"] as const;
export const OAUTH_BLOCKED_REDIRECT_SCHEMES = [
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
] as const;

export const OAUTH_BEARER_TOKEN_TYPE = "Bearer";

export const OAUTH_ERROR_CODES = {
  invalidRequest: "invalid_request",
  invalidClient: "invalid_client",
  invalidGrant: "invalid_grant",
  unauthorizedClient: "unauthorized_client",
  unsupportedGrantType: "unsupported_grant_type",
  invalidScope: "invalid_scope",
  accessDenied: "access_denied",
  serverError: "server_error",
  unsupportedResponseType: "unsupported_response_type",
  invalidToken: "invalid_token",
  invalidClientMetadata: "invalid_client_metadata",
  invalidRedirectUri: "invalid_redirect_uri",
  tooManyRequests: "too_many_requests",
} as const;

export type OAuthErrorCode =
  (typeof OAUTH_ERROR_CODES)[keyof typeof OAUTH_ERROR_CODES];

export const OAUTH_COPY = {
  consentTitle: "Authorize access",
  consentSubtitlePrefix: "wants to access your skillmd account",
  consentScopesHeading: "This will allow it to:",
  approveLabel: "Authorize",
  denyLabel: "Deny",
  deniedHeading: "Access denied",
  deniedBody: "You denied the request. You can close this window.",
  invalidRequestHeading: "Invalid authorization request",
  scopeDescriptions: {
    "skill:read": "Read your saved skills, bundles, tokens, and screenshots",
    "skill:write": "Generate new skills and run design verifications",
    "inspiration:read": "Read your saved inspiration entries",
    offline_access: "Stay connected when you are away (refresh access)",
  },
} as const;
