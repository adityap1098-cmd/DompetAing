// ══════════════════════════════════════════════════════════
// AES-256-GCM Encryption for sensitive data (OAuth tokens)
//
// Format: iv:authTag:ciphertext (all base64)
// Key: 32-byte hex string from ENCRYPTION_KEY env var
// ══════════════════════════════════════════════════════════
import crypto from "crypto";
import { env } from "../env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = env.ENCRYPTION_KEY;
  if (!key || key.length < 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  }
  return Buffer.from(key, "hex");
}

/** Encrypt plaintext → "iv:authTag:ciphertext" (base64 encoded) */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/** Decrypt "iv:authTag:ciphertext" → plaintext */
export function decrypt(encryptedStr: string): string {
  const key = getKey();
  const parts = encryptedStr.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format — expected iv:authTag:ciphertext");
  }

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const ciphertext = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/** Check if a string looks like it's already encrypted (has iv:authTag:ciphertext format) */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  // Each part should be valid base64
  try {
    Buffer.from(parts[0], "base64");
    Buffer.from(parts[1], "base64");
    Buffer.from(parts[2], "base64");
    return parts[0].length >= 20 && parts[1].length >= 20;
  } catch {
    return false;
  }
}

/** Encrypt token if not already encrypted. Returns null for null input. */
export function encryptToken(token: string | null): string | null {
  if (!token) return null;
  if (isEncrypted(token)) return token; // already encrypted
  return encrypt(token);
}

/** Decrypt token. If it's not encrypted (plain text), return as-is. */
export function decryptToken(token: string | null): string | null {
  if (!token) return null;
  if (!isEncrypted(token)) return token; // plain text, not encrypted
  try {
    return decrypt(token);
  } catch {
    // If decryption fails, return as-is (might be plain text from before encryption was added)
    return token;
  }
}
