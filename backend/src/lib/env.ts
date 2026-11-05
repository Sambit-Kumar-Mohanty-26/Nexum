import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("4000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("postgresql://user:password@localhost:5432/nexum"),
  CORS_ORIGIN: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters").default("nexum-platform-session-secret-default-key-32chars"),
  PAYPAL_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional().default(""),
  ENABLE_FAULT_INJECTOR: z.string().optional().default("false"),
  AI_DAILY_BUDGET: z.string().optional().default("50"),
  GEMINI_API_KEY: z.string().optional().default(""),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  GROQ_API_KEY: z.string().optional().default(""),
  DEEPSEEK_API_KEY: z.string().optional().default(""),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  HUGGINGFACE_API_KEY: z.string().optional().default(""),
  GITHUB_TOKEN: z.string().optional().default(""),
  EMAILJS_SERVICE_ID: z.string().optional().default(""),
  EMAILJS_TEMPLATE_ID: z.string().optional().default(""),
  EMAILJS_PUBLIC_KEY: z.string().optional().default(""),
  EMAILJS_PRIVATE_KEY: z.string().optional().default(""),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CALLBACK_URL: z.string().optional().default("http://localhost:3000/api/auth/google/callback"),
  MICROSOFT_CLIENT_ID: z.string().optional().default(""),
  MICROSOFT_CLIENT_SECRET: z.string().optional().default(""),
  MICROSOFT_CALLBACK_URL: z.string().optional().default("http://localhost:3000/api/auth/microsoft/callback"),
  GITHUB_CLIENT_ID: z.string().optional().default(""),
  GITHUB_CLIENT_SECRET: z.string().optional().default(""),
  GITHUB_CALLBACK_URL: z.string().optional().default("http://localhost:3000/api/auth/github/callback"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(customEnv?: Record<string, string | undefined>): EnvConfig {
  const result = envSchema.safeParse(customEnv || process.env);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new Error(`Environment validation failed: ${errorDetails}`);
  }
  return result.data;
}

export const env = validateEnv();
