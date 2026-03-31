// Gmail API utilities — token management + message fetching

import { env } from "../env.js";

// ── Types ──

export interface GmailMessage {
  id: string;
  threadId: string;
}

export interface GmailPart {
  mimeType: string;
  filename?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  internalDate: string; // epoch ms as string
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: GmailPart[];
  };
}

export interface RefreshedTokens {
  access_token: string;
  expires_in: number;
  token_expiry: Date;
}

export interface ExtractedEmail {
  subject: string;
  body: string;
  date: Date;
  sender: string;
  messageId: string;
}

// ── Token management ──

export async function refreshGmailToken(refreshToken: string): Promise<RefreshedTokens> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail token refresh failed: ${err}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
    token_expiry: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function getValidToken(user: {
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: Date | null;
}): Promise<{ token: string; refreshed: RefreshedTokens | null }> {
  const bufferMs = 60 * 1000; // refresh 1 min early
  const now = Date.now();

  if (
    user.access_token &&
    user.token_expiry &&
    user.token_expiry.getTime() - bufferMs > now
  ) {
    return { token: user.access_token, refreshed: null };
  }

  if (!user.refresh_token) {
    throw new Error("No refresh token — user must reconnect Gmail.");
  }

  const refreshed = await refreshGmailToken(user.refresh_token);
  return { token: refreshed.access_token, refreshed };
}

// ── Gmail REST API calls ──

export async function fetchGmailProfile(
  accessToken: string
): Promise<{ emailAddress: string; messagesTotal: number }> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail profile fetch failed: ${res.statusText}`);
  return res.json() as Promise<{ emailAddress: string; messagesTotal: number }>;
}

export async function searchGmailMessages(
  accessToken: string,
  query: string,
  maxResults = 100,
  pageToken?: string
): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Gmail search failed: ${res.statusText}`);
  const data = (await res.json()) as { messages?: GmailMessage[]; nextPageToken?: string };
  return { messages: data.messages ?? [], nextPageToken: data.nextPageToken };
}

export async function fetchGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessageDetail> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Gmail message ${messageId} fetch failed: ${res.statusText}`);
  return res.json() as Promise<GmailMessageDetail>;
}

// ── Body decoding ──

function decodeBase64Url(encoded: string): string {
  const cleaned = encoded.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(cleaned, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFromParts(parts: GmailPart[]): string {
  let plainText = "";
  let htmlText = "";

  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      plainText += decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      htmlText += decodeBase64Url(part.body.data);
    } else if (part.parts) {
      const nested = extractFromParts(part.parts);
      if (nested) plainText += nested;
    }
  }

  // Prefer plain text; fall back to HTML stripped
  if (plainText.trim()) return plainText;
  if (htmlText.trim()) return stripHtml(htmlText);
  return "";
}

export function extractEmailContent(msg: GmailMessageDetail): ExtractedEmail {
  const headers = msg.payload.headers;
  const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "";
  const sender = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
  const date = new Date(parseInt(msg.internalDate, 10));

  let body = "";
  if (msg.payload.body?.data) {
    const raw = decodeBase64Url(msg.payload.body.data);
    // Top-level body might be HTML
    body = raw.trimStart().startsWith("<") ? stripHtml(raw) : raw;
  } else if (msg.payload.parts) {
    body = extractFromParts(msg.payload.parts);
  }

  return { subject, body, date, sender, messageId: msg.id };
}
