import { z } from "zod";

const geminiProviderSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.toLowerCase() === "vertex"
      ? "vertex"
      : "google",
  z.enum(["google", "vertex"])
);

const envSchema = z.object({
  AI_GEMINI_PROVIDER: geminiProviderSchema,
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
  GOOGLE_VERTEX_PROJECT: z.string().min(1).optional(),
  GOOGLE_VERTEX_LOCATION: z.string().min(1).optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
  GOOGLE_VERTEX_CREDENTIALS_JSON: z.string().min(1).optional(),
  DATABASE_URL: z.string().url(),

  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),
  R2_KEY_PREFIX: z.string().default("getskillmd"),

  IP_HASH_SALT: z.string().min(16),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  DAILY_TOKEN_BUDGET: z.coerce.number().int().positive().default(5_000_000),
  HOST_DAILY_LIMIT: z.coerce.number().int().positive().default(10),

  DODO_PAYMENTS_API_KEY: z.string().min(1).optional(),
  DODO_PAYMENTS_ENVIRONMENT: z
    .enum(["test_mode", "live_mode", "test", "live"])
    .optional(),
  DODO_PAYMENTS_WEBHOOK_SECRET: z.string().min(1).optional(),
  DODO_PRODUCT_PRO_MONTHLY: z.string().optional(),
  DODO_PRODUCT_PRO_YEARLY: z.string().optional(),
  DODO_PRODUCT_LTD: z.string().optional(),

  TEKCIFY_CLIENT_ID: z.string().optional(),
  TEKCIFY_CLIENT_SECRET: z.string().optional(),
  TEKCIFY_REDIRECT_URI: z.string().url().optional(),
  TEKCIFY_AUTH_SERVER_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  GETSKILLMD_PUBLIC_URL: z.string().url().optional(),

  RESEND_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  DISCORD_PRO_ROLE_WEBHOOK_URL: z.string().url().optional(),
  FIGMA_TOKEN: z.string().optional(),
  FIGMA_OAUTH_CLIENT_ID: z.string().optional(),
  FIGMA_OAUTH_CLIENT_SECRET: z.string().optional(),
});

const envSchemaWithProviderRules = envSchema.superRefine((env, ctx) => {
  if (env.AI_GEMINI_PROVIDER === "vertex") {
    if (!env.GOOGLE_VERTEX_PROJECT || !env.GOOGLE_VERTEX_LOCATION) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "AI_GEMINI_PROVIDER=vertex requires GOOGLE_VERTEX_PROJECT and GOOGLE_VERTEX_LOCATION to be set",
      });
    }
    return;
  }
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "GOOGLE_GENERATIVE_AI_API_KEY is required when AI_GEMINI_PROVIDER=google",
    });
  }
});

type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = envSchemaWithProviderRules.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server environment: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}
