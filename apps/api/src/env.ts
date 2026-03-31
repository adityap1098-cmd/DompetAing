// Environment validation — fail fast if required vars are missing

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  SESSION_SECRET: required("SESSION_SECRET"),
  GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET"),
  GOOGLE_REDIRECT_URI: optional("GOOGLE_REDIRECT_URI", "http://localhost:3001/v1/auth/google/callback"),
  GMAIL_REDIRECT_URI: optional("GMAIL_REDIRECT_URI", "http://localhost:3001/v1/gmail/callback"),
  PORT: parseInt(optional("PORT", "3001"), 10),
  NODE_ENV: optional("NODE_ENV", "development"),
  FRONTEND_URL: optional("FRONTEND_URL", "http://localhost:5173"),
  // Midtrans
  MIDTRANS_SERVER_KEY: optional("MIDTRANS_SERVER_KEY", ""),
  MIDTRANS_CLIENT_KEY: optional("MIDTRANS_CLIENT_KEY", ""),
  MIDTRANS_IS_PRODUCTION: optional("MIDTRANS_IS_PRODUCTION", "false") === "true",
} as const;
