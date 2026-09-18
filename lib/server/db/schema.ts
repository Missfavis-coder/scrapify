import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const generations = pgTable(
  "generations",
  {
    id: text("id").primaryKey(),
    sourceUrl: text("source_url").notNull(),
    sourceHost: text("source_host").notNull(),
    mode: text("mode").notNull(),
    status: text("status").notNull(),
    ipHash: text("ip_hash").notNull(),
    cookieKey: text("cookie_key"),
    userId: text("user_id"),
    isPublic: boolean("is_public").notNull().default(false),
    frontend: boolean("frontend").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    bookmarkCount: integer("bookmark_count").notNull().default(0),
    errorMessage: text("error_message"),
    errorCode: text("error_code"),
    errorDetail: text("error_detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    parentGenerationId: text("parent_generation_id"),
    feedback: text("feedback"),
    sourceEtag: text("source_etag"),
    sourceLastModified: text("source_last_modified"),
    refreshLockAt: timestamp("refresh_lock_at", { withTimezone: true }),
    lastRefreshCheckAt: timestamp("last_refresh_check_at", { withTimezone: true }),
    sourceKind: text("source_kind").notNull().default("public_url"),
    isInspiration: boolean("is_inspiration").notNull().default(false),
    inspirationImageKey: text("inspiration_image_key"),
    inspirationParentIds: text("inspiration_parent_ids").array(),
    featuredRank: integer("featured_rank"),
    featuredViewBoost: integer("featured_view_boost").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    adminRescuedAt: timestamp("admin_rescued_at", { withTimezone: true }),
  },
  (table) => [
    index("generations_user_inspiration_idx").on(
      table.userId,
      table.isInspiration,
      table.createdAt
    ),
    index("generations_is_inspiration_idx").on(table.isInspiration),
    index("generations_featured_rank_idx").on(table.featuredRank),
    index("generations_cookie_key_idx").on(table.cookieKey),
    index("generations_public_list_idx")
      .on(
        table.featuredRank.asc().nullsLast(),
        table.frontend.desc(),
        table.createdAt.desc()
      )
      .where(
        sql`${table.isPublic} = true AND ${table.status} = 'done' AND ${table.isInspiration} = false`
      ),
    index("generations_public_mode_idx")
      .on(table.mode, table.createdAt.desc())
      .where(
        sql`${table.isPublic} = true AND ${table.status} = 'done' AND ${table.isInspiration} = false`
      ),
    index("generations_public_host_idx")
      .on(table.sourceHost, table.viewCount.desc(), table.createdAt.desc())
      .where(
        sql`${table.isPublic} = true AND ${table.status} = 'done' AND ${table.isInspiration} = false`
      ),
    index("generations_recent_done_idx")
      .on(table.sourceUrl, table.mode, table.completedAt.desc())
      .where(
        sql`${table.isPublic} = true AND ${table.status} = 'done' AND ${table.isInspiration} = false`
      ),
    index("generations_user_archived_idx")
      .on(table.userId, table.archivedAt.desc())
      .where(sql`${table.archivedAt} IS NOT NULL`),
    index("generations_user_active_idx")
      .on(table.userId, table.createdAt.desc())
      .where(sql`${table.archivedAt} IS NULL`),
  ]
);

export const generationViews = pgTable(
  "generation_views",
  {
    generationId: text("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    viewerKey: text("viewer_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.generationId, table.viewerKey] }),
    index("generation_views_generation_idx").on(table.generationId),
  ]
);

export type GenerationViewRow = typeof generationViews.$inferSelect;

export const generationArtifacts = pgTable(
  "generation_artifacts",
  {
    generationId: text("generation_id")
      .primaryKey()
      .references(() => generations.id, { onDelete: "cascade" }),
    screenshotAbove: text("screenshot_above"),
    screenshotFull: text("screenshot_full"),
    extractedData: jsonb("extracted_data"),
    extractedDataUrl: text("extracted_data_url"),
    extractedSummary: jsonb("extracted_summary"),
    skillMd: text("skill_md"),
    skillName: text("skill_name"),
    skillDescription: text("skill_description"),
    quality: jsonb("quality"),
  },
  (table) => [
    index("generation_artifacts_skill_name_idx")
      .on(table.skillName)
      .where(sql`${table.skillName} IS NOT NULL`),
  ]
);

export const generationVersions = pgTable(
  "generation_versions",
  {
    id: text("id").primaryKey(),
    generationId: text("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    skillMd: text("skill_md"),
    skillName: text("skill_name"),
    skillDescription: text("skill_description"),
    extractedData: jsonb("extracted_data"),
    extractedDataUrl: text("extracted_data_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("generation_versions_generation_idx").on(
      table.generationId,
      table.versionNumber.desc()
    ),
  ]
);

export const quotaUsage = pgTable(
  "quota_usage",
  {
    ipHash: text("ip_hash").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.ipHash, table.periodStart] })]
);

export const hostQuotaUsage = pgTable(
  "host_quota_usage",
  {
    sourceHost: text("source_host").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.sourceHost, table.periodStart] })]
);

export const dailyBudget = pgTable("daily_budget", {
  utcDate: text("utc_date").primaryKey(),
  tokensUsed: integer("tokens_used").notNull().default(0),
  generationsStarted: integer("generations_started").notNull().default(0),
  cacheHits: integer("cache_hits").notNull().default(0),
});

export const curatedSkills = pgTable(
  "curated_skills",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    slug: text("slug").notNull(),
    filePath: text("file_path"),
    defaultBranch: text("default_branch"),

    name: text("name"),
    description: text("description"),
    kind: text("kind").notNull().default("pending"),
    mode: text("mode"),
    canonicalUrl: text("canonical_url"),
    canonicalHost: text("canonical_host"),

    installCommand: text("install_command"),
    repoUrl: text("repo_url"),
    sourceUrl: text("source_url").notNull(),

    contentMd: text("content_md"),
    contentSha: text("content_sha"),
    contentBytes: integer("content_bytes"),

    status: text("status").notNull().default("pending"),
    errorMessage: text("error_message"),

    ingestedAt: timestamp("ingested_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("curated_skills_source_owner_repo_slug_idx").on(
      table.source,
      table.owner,
      table.repo,
      table.slug
    ),
    index("curated_skills_canonical_host_idx").on(table.canonicalHost),
    index("curated_skills_status_last_checked_idx").on(table.status, table.lastCheckedAt),
    index("curated_skills_list_idx").on(
      table.source,
      table.status,
      table.ingestedAt.desc()
    ),
  ]
);

export const curatedSkillUrls = pgTable(
  "curated_skill_urls",
  {
    id: text("id").primaryKey(),
    skillId: text("skill_id")
      .notNull()
      .references(() => curatedSkills.id, { onDelete: "cascade" }),
    host: text("host").notNull(),
    pathPrefix: text("path_prefix").notNull().default(""),
    matchType: text("match_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("curated_skill_urls_unique_idx").on(
      table.skillId,
      table.host,
      table.pathPrefix,
      table.matchType
    ),
    index("curated_skill_urls_host_idx").on(table.host),
  ]
);

export const userRole = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  tekcifyId: text("tekcify_id").unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  dodoCustomerId: text("dodo_customer_id"),
  cookieIdentity: text("cookie_identity"),
  role: userRole("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dodoSubscriptionId: text("dodo_subscription_id").unique(),
    productId: text("product_id"),
    plan: text("plan").notNull(),
    interval: text("interval").notNull(),
    status: text("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("subscriptions_user_idx").on(table.userId),
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_user_updated_idx").on(
      table.userId,
      table.updatedAt.desc()
    ),
    index("subscriptions_user_status_updated_idx").on(
      table.userId,
      table.status,
      table.updatedAt.desc()
    ),
  ]
);

export const lifetimeLicenses = pgTable("lifetime_licenses", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dodoPaymentId: text("dodo_payment_id").unique(),
  productId: text("product_id"),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cliTokens = pgTable(
  "cli_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    label: text("label"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("cli_tokens_user_idx").on(table.userId)]
);

export const deviceAuthCodes = pgTable("device_auth_codes", {
  id: text("id").primaryKey(),
  userCode: text("user_code").notNull().unique(),
  deviceCode: text("device_code").notNull().unique(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lifetimeDealCounter = pgTable("lifetime_deal_counter", {
  id: text("id").primaryKey(),
  soldCount: integer("sold_count").notNull().default(0),
  cap: integer("cap").notNull().default(500),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usageEvents = pgTable(
  "usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    ipHash: text("ip_hash"),
    cookieKey: text("cookie_key"),
    kind: text("kind").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("usage_events_user_kind_idx").on(table.userId, table.kind, table.createdAt),
    index("usage_events_cookie_kind_idx").on(table.cookieKey, table.kind, table.createdAt),
  ]
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    generationId: text("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bookmarks_user_generation_idx").on(table.userId, table.generationId),
    index("bookmarks_user_created_idx").on(table.userId, table.createdAt),
  ]
);

export const cliProjects = pgTable(
  "cli_projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    projectName: text("project_name"),
    templateName: text("template_name"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  },
  (table) => [
    index("cli_projects_user_idx").on(table.userId),
    index("cli_projects_user_generated_idx").on(table.userId, table.generatedAt),
    index("cli_projects_user_slug_idx").on(
      table.userId,
      table.slug,
      table.generatedAt.desc()
    ),
  ]
);

export const userTemplates = pgTable(
  "user_templates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    repoUrl: text("repo_url").notNull(),
    branch: text("branch"),
    description: text("description"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    lastValidationError: text("last_validation_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_templates_user_slug_idx").on(table.userId, table.slug),
    index("user_templates_user_idx").on(table.userId),
  ]
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: text("key_prefix").notNull(),
    label: text("label").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("api_keys_user_idx").on(table.userId),
    index("api_keys_user_active_idx")
      .on(table.userId, table.createdAt.desc())
      .where(sql`${table.revokedAt} IS NULL`),
  ]
);

export const webhookConfigs = pgTable(
  "webhook_configs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    generationId: text("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    target: text("target").notNull(),
    provider: text("provider").notNull(),
    secret: text("secret"),
    enabled: boolean("enabled").notNull().default(true),
    lastDeliveredAt: timestamp("last_delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("webhook_configs_user_idx").on(table.userId),
    index("webhook_configs_generation_idx").on(table.generationId),
  ]
);

export const designUpdateSubscribers = pgTable(
  "design_update_subscribers",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    source: text("source").notNull().default("footer"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("design_update_subscribers_created_idx").on(table.createdAt),
    index("design_update_subscribers_source_idx").on(table.source),
  ]
);

export const memberSpotlights = pgTable(
  "member_spotlights",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    generationId: text("generation_id").references(() => generations.id, {
      onDelete: "set null",
    }),
    headline: text("headline").notNull(),
    description: text("description"),
    featuredAt: timestamp("featured_at", { withTimezone: true }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("member_spotlights_active_featured_idx").on(table.active, table.featuredAt)]
);

export const userFigmaConnections = pgTable(
  "user_figma_connections",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    figmaUserId: text("figma_user_id").notNull(),
    figmaUserEmail: text("figma_user_email"),
    figmaUserHandle: text("figma_user_handle"),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    scope: text("scope").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("user_figma_connections_figma_user_idx").on(table.figmaUserId)]
);

export type UserFigmaConnectionRow = typeof userFigmaConnections.$inferSelect;

export const oauthClients = pgTable(
  "oauth_clients",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull().unique(),
    clientSecretHash: text("client_secret_hash"),
    clientName: text("client_name"),
    redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
    grantTypes: jsonb("grant_types").$type<string[]>().notNull(),
    responseTypes: jsonb("response_types").$type<string[]>().notNull(),
    scope: text("scope"),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull(),
    clientUri: text("client_uri"),
    logoUri: text("logo_uri"),
    softwareId: text("software_id"),
    registeredByUserId: text("registered_by_user_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("oauth_clients_client_id_idx").on(table.clientId)]
);

export const oauthAuthorizationCodes = pgTable(
  "oauth_authorization_codes",
  {
    id: text("id").primaryKey(),
    codeHash: text("code_hash").notNull().unique(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    redirectUri: text("redirect_uri").notNull(),
    scope: text("scope"),
    codeChallenge: text("code_challenge").notNull(),
    codeChallengeMethod: text("code_challenge_method").notNull(),
    resource: text("resource"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("oauth_auth_codes_user_idx").on(table.userId)]
);

export const oauthAccessTokens = pgTable(
  "oauth_access_tokens",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope"),
    resource: text("resource"),
    refreshTokenId: text("refresh_token_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("oauth_access_tokens_user_idx").on(table.userId),
    index("oauth_access_tokens_client_idx").on(table.clientId),
  ]
);

export const oauthRefreshTokens = pgTable(
  "oauth_refresh_tokens",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope"),
    resource: text("resource"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("oauth_refresh_tokens_user_idx").on(table.userId)]
);

export type OAuthClientRow = typeof oauthClients.$inferSelect;
export type OAuthAuthorizationCodeRow =
  typeof oauthAuthorizationCodes.$inferSelect;
export type OAuthAccessTokenRow = typeof oauthAccessTokens.$inferSelect;
export type OAuthRefreshTokenRow = typeof oauthRefreshTokens.$inferSelect;

export type GenerationRow = typeof generations.$inferSelect;
export type GenerationArtifactsRow = typeof generationArtifacts.$inferSelect;
export type GenerationVersionRow = typeof generationVersions.$inferSelect;
export type CuratedSkillRow = typeof curatedSkills.$inferSelect;
export type CuratedSkillUrlRow = typeof curatedSkillUrls.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type LifetimeLicenseRow = typeof lifetimeLicenses.$inferSelect;
export type CliTokenRow = typeof cliTokens.$inferSelect;
export type DeviceAuthCodeRow = typeof deviceAuthCodes.$inferSelect;
export type LifetimeDealCounterRow = typeof lifetimeDealCounter.$inferSelect;
export type UsageEventRow = typeof usageEvents.$inferSelect;
export type BookmarkRow = typeof bookmarks.$inferSelect;
export type CliProjectRow = typeof cliProjects.$inferSelect;
export type UserTemplateRow = typeof userTemplates.$inferSelect;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type WebhookConfigRow = typeof webhookConfigs.$inferSelect;
export type MemberSpotlightRow = typeof memberSpotlights.$inferSelect;
export type DesignUpdateSubscriberRow = typeof designUpdateSubscribers.$inferSelect;
