import { z } from 'zod';

const csv = z
  .string()
  .optional()
  .transform((s) =>
    (s ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  );
const flag = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => v === 'true');
const opt = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const schema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    FRONTEND_ORIGIN: csv.refine((a) => a.length > 0, 'at least one origin is required'),
    JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
    OTP_SECRET: z.string().min(16, 'must be at least 16 characters'),
    DATABASE_URL: z.string().min(1, 'must be a Postgres connection string'),
    // AI providers are all OpenAI-compatible. Configure at least one key; a model id may be
    // prefixed with its provider (groq: / gemini: / nvidia:). An unprefixed id means "nvidia".
    NVIDIA_API_KEY: opt,
    NIM_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
    GROQ_API_KEY: opt,
    GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
    GEMINI_API_KEY: opt,
    GEMINI_BASE_URL: z.string().url().default('https://generativelanguage.googleapis.com/v1beta/openai/'),
    NIM_MODELS: csv.refine((a) => a.length > 0, 'at least one model id is required'),
    NIM_VERDICT_MODELS: csv,
    NIM_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
    NIM_USE_RESPONSE_FORMAT: flag,
    SEARCH_PROVIDER: z.enum(['tavily', 'brave']).default('tavily'),
    TAVILY_API_KEY: opt,
    BRAVE_API_KEY: opt,
    BREVO_API_KEY: opt,
    BREVO_SENDER_EMAIL: opt,
    BREVO_SENDER_NAME: z.string().optional().default('ChallengeX'),
    RESEND_API_KEY: opt,
    RESEND_FROM: opt,
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    ADMIN_EMAILS: csv.transform((a) => a.map((e) => e.toLowerCase())),
    ADMIN_PASSWORD: z.string().optional().refine((v) => v === undefined || v.length >= 8, 'must be at least 8 characters when set'),
    DEV_LOG_OTP: flag,
  })
  .superRefine((e, ctx) => {
    const need = (cond: boolean, path: string, message: string) => {
      if (!cond) ctx.addIssue({ code: 'custom', path: [path], message });
    };
    need(e.SEARCH_PROVIDER !== 'tavily' || !!e.TAVILY_API_KEY, 'TAVILY_API_KEY', 'required when SEARCH_PROVIDER=tavily');
    need(e.SEARCH_PROVIDER !== 'brave' || !!e.BRAVE_API_KEY, 'BRAVE_API_KEY', 'required when SEARCH_PROVIDER=brave');
    need(!e.BREVO_API_KEY || !!e.BREVO_SENDER_EMAIL, 'BREVO_SENDER_EMAIL', 'required when BREVO_API_KEY is set');
    need(!e.RESEND_API_KEY || !!e.RESEND_FROM, 'RESEND_FROM', 'required when RESEND_API_KEY is set');
    const hasEmail = (!!e.BREVO_API_KEY && !!e.BREVO_SENDER_EMAIL) || (!!e.RESEND_API_KEY && !!e.RESEND_FROM);
    need(e.NODE_ENV !== 'production' || hasEmail, 'BREVO_API_KEY', 'production needs Brevo or Resend configured for OTP email');
    const hasAi = !!(e.GROQ_API_KEY || e.GEMINI_API_KEY || e.NVIDIA_API_KEY);
    need(hasAi, 'GROQ_API_KEY', 'set at least one AI provider key: GROQ_API_KEY, GEMINI_API_KEY, or NVIDIA_API_KEY');
  });

export type Env = z.infer<typeof schema>;

/** OpenAI-compatible AI providers this app can route to. */
export type AiProvider = 'groq' | 'gemini' | 'nvidia';

const AI_PROVIDERS = new Set<string>(['groq', 'gemini', 'nvidia']);

/**
 * Split a configured model id into its provider and the bare model name.
 * A "provider:" prefix selects the provider; anything else (including NVIDIA ids that
 * themselves contain a colon, like "nvidia/foo:1.0.0") is treated as an NVIDIA model.
 */
export function parseModelId(id: string): { provider: AiProvider; model: string } {
  const i = id.indexOf(':');
  if (i > 0 && AI_PROVIDERS.has(id.slice(0, i))) return { provider: id.slice(0, i) as AiProvider, model: id.slice(i + 1) };
  return { provider: 'nvidia', model: id };
}

/** Base URL + API key for a provider (apiKey is undefined when that provider has no key configured). */
export function providerConfig(e: Env, provider: AiProvider): { baseUrl: string; apiKey: string | undefined } {
  if (provider === 'groq') return { baseUrl: e.GROQ_BASE_URL, apiKey: e.GROQ_API_KEY };
  if (provider === 'gemini') return { baseUrl: e.GEMINI_BASE_URL, apiKey: e.GEMINI_API_KEY };
  return { baseUrl: e.NIM_BASE_URL, apiKey: e.NVIDIA_API_KEY };
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.') || '(env)'}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}\nSee .env.example`);
  }
  return result.data;
}

let cached: Env | undefined;

export function env(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}

export function resetEnvCache(): void {
  cached = undefined;
}

export const emailProviders = () => {
  const e = env();
  return {
    brevo: !!e.BREVO_API_KEY && !!e.BREVO_SENDER_EMAIL,
    resend: !!e.RESEND_API_KEY && !!e.RESEND_FROM,
  };
};
