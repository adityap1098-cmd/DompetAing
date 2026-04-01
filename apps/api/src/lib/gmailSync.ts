// Gmail sync engine — processes bank + marketplace emails, anti-duplikat enrichment

import { prisma } from "./db.js";
import {
  getValidToken,
  searchGmailMessages,
  fetchGmailMessage,
  extractEmailContent,
} from "./gmail.js";
import { detectBank, buildBankEmailQuery } from "./emailParsers.js";
import {
  detectMarketplace,
  buildMarketplaceEmailQuery,
  suggestCategoryFromKeywords,
  type ParsedMarketplaceTransaction,
} from "./marketplaceParsers.js";
import { encryptToken } from "./crypto.js";

export interface SyncResult {
  emails_processed: number;
  transactions_found: number;
  pending_review: number;
  enriched: number;
  banks_detected: { bank_name: string; sender_email: string; count: number }[];
  marketplaces_detected: { marketplace_name: string; sender_email: string; count: number }[];
}

// ─────────────────────────────────────────────
// CATEGORY SUGGESTION
// ─────────────────────────────────────────────

async function suggestCategory(
  userId: string,
  type: "expense" | "income",
  bankName: string,
  merchant: string | null
): Promise<{ category_id: string | null; sub_category_id: string | null }> {
  const categories = await prisma.category.findMany({
    where: { user_id: userId },
    include: { sub_categories: true },
  });

  if (type === "income") {
    const income = categories.find((c) => c.name === "Gaji" || c.name === "Bisnis");
    return { category_id: income?.id ?? null, sub_category_id: null };
  }

  if (merchant) {
    const merchantLower = merchant.toLowerCase();
    const foodKeywords = ["makan", "food", "resto", "kopi", "coffee", "indomaret", "alfamart", "warung", "kedai"];
    const transKeywords = ["grab", "gojek", "gocar", "ojek", "taxi", "parkir", "bbm", "bensin", "pertamina"];
    const shopKeywords = ["tokopedia", "shopee", "lazada", "blibli", "toko", "belanja", "shop"];
    const utilityKeywords = ["telkom", "pln", "listrik", "indihome", "wifi", "internet"];

    if (foodKeywords.some((k) => merchantLower.includes(k))) {
      const cat = categories.find((c) => c.name === "Makanan & Minuman");
      return { category_id: cat?.id ?? null, sub_category_id: null };
    }
    if (transKeywords.some((k) => merchantLower.includes(k))) {
      const cat = categories.find((c) => c.name === "Transportasi");
      return { category_id: cat?.id ?? null, sub_category_id: null };
    }
    if (shopKeywords.some((k) => merchantLower.includes(k))) {
      const cat = categories.find((c) => c.name === "Belanja");
      return { category_id: cat?.id ?? null, sub_category_id: null };
    }
    if (utilityKeywords.some((k) => merchantLower.includes(k))) {
      const cat = categories.find((c) => c.name === "Rumah");
      return { category_id: cat?.id ?? null, sub_category_id: null };
    }
  }

  if (bankName === "GoPay" || bankName === "OVO") {
    const cat = categories.find((c) => c.name === "Makanan & Minuman");
    return { category_id: cat?.id ?? null, sub_category_id: null };
  }

  const other = categories.find((c) => c.name === "Lainnya");
  return { category_id: other?.id ?? null, sub_category_id: null };
}

/** Suggest category by marketplace category name */
async function suggestCategoryByName(
  userId: string,
  categoryName: string
): Promise<{ category_id: string | null; sub_category_id: string | null }> {
  const categories = await prisma.category.findMany({
    where: { user_id: userId },
  });

  // Try exact name match first
  const exact = categories.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (exact) return { category_id: exact.id, sub_category_id: null };

  // Partial match
  const partial = categories.find((c) =>
    c.name.toLowerCase().includes(categoryName.toLowerCase()) ||
    categoryName.toLowerCase().includes(c.name.toLowerCase())
  );
  if (partial) return { category_id: partial.id, sub_category_id: null };

  // Fallback to "Belanja" or "Lainnya"
  const belanja = categories.find((c) => c.name === "Belanja");
  if (belanja) return { category_id: belanja.id, sub_category_id: null };

  const other = categories.find((c) => c.name === "Lainnya");
  return { category_id: other?.id ?? null, sub_category_id: null };
}

// ─────────────────────────────────────────────
// ACCOUNT SUGGESTION
// ─────────────────────────────────────────────

async function suggestAccount(userId: string, bankName: string): Promise<string | null> {
  const accounts = await prisma.account.findMany({
    where: { user_id: userId, is_active: true },
  });

  if (!accounts.length) return null;

  const bankLower = bankName.toLowerCase();
  const matched = accounts.find((a) => {
    const nameLower = (a.bank_name ?? a.name).toLowerCase();
    return nameLower.includes(bankLower) || a.name.toLowerCase().includes(bankLower);
  });

  return matched?.id ?? accounts[0].id;
}

// ─────────────────────────────────────────────
// ANTI-DUPLIKAT: Find matching bank transaction
// ─────────────────────────────────────────────
// When a marketplace email arrives, check if there's already a bank transaction
// with a similar amount (±Rp 5.000) and date (±1 day). If found, ENRICH it
// instead of creating a duplicate.

const AMOUNT_TOLERANCE = 5000; // Rp 5.000 tolerance for admin fees
const DATE_TOLERANCE_MS = 24 * 60 * 60 * 1000; // ±1 day

async function findMatchingBankTransaction(
  userId: string,
  amount: number,
  date: Date
): Promise<{
  id: string;
  amount: number;
  description: string;
  category_id: string | null;
  source: string;
  date: Date;
} | null> {
  const dayBefore = new Date(date.getTime() - DATE_TOLERANCE_MS);
  const dayAfter = new Date(date.getTime() + DATE_TOLERANCE_MS);

  // Find expense transactions in the date range from bank emails
  const candidates = await prisma.transaction.findMany({
    where: {
      user_id: userId,
      type: "expense",
      date: {
        gte: dayBefore,
        lte: dayAfter,
      },
      // Only match bank-sourced or manual transactions, not marketplace ones
      source: { in: ["gmail", "manual"] },
    },
    select: {
      id: true,
      amount: true,
      description: true,
      category_id: true,
      source: true,
      date: true,
    },
  });

  // Find the first candidate with amount within tolerance
  for (const txn of candidates) {
    const txnAmount = Number(txn.amount);
    const diff = Math.abs(txnAmount - amount);
    if (diff <= AMOUNT_TOLERANCE) {
      return {
        ...txn,
        amount: txnAmount,
        date: txn.date,
      };
    }
  }

  // Also check pending reviews (approved → transaction may already exist)
  // to avoid creating duplicate pending reviews
  return null;
}

/** Check if a pending review already exists for a similar marketplace transaction */
async function findMatchingPendingReview(
  userId: string,
  amount: number,
  date: Date
): Promise<boolean> {
  const dayBefore = new Date(date.getTime() - DATE_TOLERANCE_MS);
  const dayAfter = new Date(date.getTime() + DATE_TOLERANCE_MS);

  const existing = await prisma.pendingReview.findFirst({
    where: {
      user_id: userId,
      status: "pending",
      parsed_date: { gte: dayBefore, lte: dayAfter },
      bank_name: {
        in: ["Shopee", "Tokopedia", "Grab", "Gojek", "Traveloka"],
      },
    },
  });

  if (!existing) return false;

  const existingAmount = Number(existing.parsed_amount ?? 0);
  return Math.abs(existingAmount - amount) <= AMOUNT_TOLERANCE;
}

// ─────────────────────────────────────────────
// MAIN SYNC ENGINE
// ─────────────────────────────────────────────

export async function syncGmailForUser(userId: string, forceFullScan = false): Promise<SyncResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      token_expiry: true,
      gmail_last_sync: true,
      gmail_review_before_save: true,
      gmail_auto_categorize: true,
    },
  });

  if (!user || !user.refresh_token) {
    throw new Error("User not found or no refresh token.");
  }

  const { token, refreshed } = await getValidToken(user);

  if (refreshed) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        access_token: encryptToken(refreshed.access_token),
        token_expiry: refreshed.token_expiry,
      },
    });
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const afterDate = forceFullScan ? sixMonthsAgo : (user.gmail_last_sync ?? sixMonthsAgo);

  // ── Get active sources to know which marketplaces are enabled ──
  const activeSources = await prisma.gmailSource.findMany({
    where: { user_id: userId, is_active: true },
    select: { bank_name: true, sender_email: true },
  });
  // All sources that are explicitly disabled
  const disabledSources = await prisma.gmailSource.findMany({
    where: { user_id: userId, is_active: false },
    select: { bank_name: true, sender_email: true },
  });
  const disabledBankNames = new Set(disabledSources.map((s) => s.bank_name));

  const result: SyncResult = {
    emails_processed: 0,
    transactions_found: 0,
    pending_review: 0,
    enriched: 0,
    banks_detected: [],
    marketplaces_detected: [],
  };

  const bankCounts: Map<string, { sender: string; count: number }> = new Map();
  const marketplaceCounts: Map<string, { sender: string; count: number }> = new Map();

  // ── Phase 1: Fetch bank emails (same as before) ──
  const bankQuery = buildBankEmailQuery(afterDate);
  console.log(`[GmailSync] User ${userId}: bank query = "${bankQuery}"`);
  const allBankMessages: { id: string }[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const r = await searchGmailMessages(token, bankQuery, 100, pageToken);
    allBankMessages.push(...r.messages);
    pageToken = r.nextPageToken;
    pages++;
  } while (pageToken && pages < 5);

  console.log(`[GmailSync] User ${userId}: ${allBankMessages.length} bank emails found`);

  for (const msg of allBankMessages) {
    result.emails_processed++;

    const [existingPending, existingTxn] = await Promise.all([
      prisma.pendingReview.findFirst({ where: { user_id: userId, gmail_message_id: msg.id } }),
      prisma.transaction.findFirst({ where: { user_id: userId, gmail_message_id: msg.id } }),
    ]);
    if (existingPending || existingTxn) continue;

    let msgDetail;
    try {
      msgDetail = await fetchGmailMessage(token, msg.id);
    } catch {
      continue;
    }

    const { subject, body, date, sender } = extractEmailContent(msgDetail);
    const bank = detectBank(sender, subject);
    if (!bank) continue;

    // Skip if this bank source is disabled
    if (disabledBankNames.has(bank.bankName)) continue;

    const parsed = bank.parse(subject, body, date);
    if (!parsed) continue;

    result.transactions_found++;

    const existing = bankCounts.get(bank.bankName);
    if (existing) {
      existing.count++;
    } else {
      bankCounts.set(bank.bankName, { sender, count: 1 });
    }

    await prisma.gmailSource.upsert({
      where: { user_id_sender_email: { user_id: userId, sender_email: sender } },
      create: {
        user_id: userId,
        bank_name: bank.bankName,
        sender_email: sender,
        sender_pattern: sender,
        total_detected: 1,
      },
      update: { total_detected: { increment: 1 } },
    });

    const { category_id, sub_category_id } = user.gmail_auto_categorize
      ? await suggestCategory(userId, parsed.type, parsed.bankName, parsed.merchant)
      : { category_id: null, sub_category_id: null };

    const account_id = await suggestAccount(userId, parsed.bankName);

    await prisma.pendingReview.create({
      data: {
        user_id: userId,
        gmail_message_id: msg.id,
        raw_subject: subject,
        raw_body: body.slice(0, 2000),
        parsed_amount: parsed.amount,
        parsed_merchant: parsed.merchant,
        parsed_date: date,
        parsed_type: parsed.type,
        suggested_category_id: category_id,
        suggested_sub_category_id: sub_category_id,
        suggested_account_id: account_id,
        bank_name: parsed.bankName,
        status: "pending",
      },
    });

    result.pending_review++;
  }

  // ── Phase 2: Fetch marketplace emails ──
  const mpQuery = buildMarketplaceEmailQuery(afterDate);
  const allMpMessages: { id: string }[] = [];
  pageToken = undefined;
  pages = 0;

  do {
    const r = await searchGmailMessages(token, mpQuery, 100, pageToken);
    allMpMessages.push(...r.messages);
    pageToken = r.nextPageToken;
    pages++;
  } while (pageToken && pages < 5);

  for (const msg of allMpMessages) {
    result.emails_processed++;

    // Dedup by gmail_message_id
    const [existingPending, existingTxn] = await Promise.all([
      prisma.pendingReview.findFirst({ where: { user_id: userId, gmail_message_id: msg.id } }),
      prisma.transaction.findFirst({ where: { user_id: userId, gmail_message_id: msg.id } }),
    ]);
    if (existingPending || existingTxn) continue;

    let msgDetail;
    try {
      msgDetail = await fetchGmailMessage(token, msg.id);
    } catch {
      continue;
    }

    const { subject, body, date, sender } = extractEmailContent(msgDetail);
    const marketplace = detectMarketplace(sender, subject);
    if (!marketplace) continue;

    // Skip if this marketplace source is disabled
    if (disabledBankNames.has(marketplace.marketplaceName)) continue;

    const parsed = marketplace.parse(subject, body, date);
    if (!parsed) continue;

    result.transactions_found++;

    // Track marketplace source
    const existingMp = marketplaceCounts.get(marketplace.marketplaceName);
    if (existingMp) {
      existingMp.count++;
    } else {
      marketplaceCounts.set(marketplace.marketplaceName, { sender, count: 1 });
    }

    // Upsert GmailSource for marketplace
    await prisma.gmailSource.upsert({
      where: { user_id_sender_email: { user_id: userId, sender_email: sender } },
      create: {
        user_id: userId,
        bank_name: marketplace.marketplaceName, // reuse bank_name field for marketplace name
        sender_email: sender,
        sender_pattern: sender,
        total_detected: 1,
      },
      update: { total_detected: { increment: 1 } },
    });

    // ── ANTI-DUPLIKAT LOGIC ──
    // Check if there's already an approved bank transaction with similar
    // amount (±Rp 5.000) and date (±1 day). If so, ENRICH it.
    const matchingTxn = await findMatchingBankTransaction(userId, parsed.amount, parsed.date);

    if (matchingTxn) {
      // ENRICH existing transaction with marketplace details
      const { category_id: newCategoryId } = user.gmail_auto_categorize
        ? await suggestCategoryByName(userId, parsed.suggestedCategoryName)
        : { category_id: null };

      await prisma.transaction.update({
        where: { id: matchingTxn.id },
        data: {
          description: parsed.description, // e.g. "Shopee: Charger USB-C" instead of "Pembayaran ke Shopee"
          ...(newCategoryId && { category_id: newCategoryId }),
          source: "gmail_enriched",
        },
      });

      result.enriched++;
      continue;
    }

    // Also check if there's a pending review from bank with matching amount
    // If so, enrich the pending review
    const dayBefore = new Date(parsed.date.getTime() - DATE_TOLERANCE_MS);
    const dayAfter = new Date(parsed.date.getTime() + DATE_TOLERANCE_MS);

    const matchingPending = await prisma.pendingReview.findFirst({
      where: {
        user_id: userId,
        status: "pending",
        parsed_date: { gte: dayBefore, lte: dayAfter },
        // Only match bank-sourced pending reviews (not marketplace ones)
        bank_name: {
          notIn: ["Shopee", "Tokopedia", "Grab", "Gojek", "Traveloka"],
        },
      },
    });

    if (matchingPending) {
      const pendingAmount = Number(matchingPending.parsed_amount ?? 0);
      if (Math.abs(pendingAmount - parsed.amount) <= AMOUNT_TOLERANCE) {
        // Enrich the pending review with marketplace details
        const { category_id: newCategoryId } = user.gmail_auto_categorize
          ? await suggestCategoryByName(userId, parsed.suggestedCategoryName)
          : { category_id: null };

        await prisma.pendingReview.update({
          where: { id: matchingPending.id },
          data: {
            parsed_merchant: parsed.merchant ?? matchingPending.parsed_merchant,
            raw_subject: `${matchingPending.raw_subject} → ${parsed.description}`,
            ...(newCategoryId && { suggested_category_id: newCategoryId }),
            bank_name: `${matchingPending.bank_name} + ${parsed.marketplaceName}`,
          },
        });

        // Mark this marketplace email as processed (create a skipped record)
        await prisma.pendingReview.create({
          data: {
            user_id: userId,
            gmail_message_id: msg.id,
            raw_subject: subject,
            raw_body: body.slice(0, 2000),
            parsed_amount: parsed.amount,
            parsed_merchant: parsed.merchant,
            parsed_date: parsed.date,
            parsed_type: "expense",
            bank_name: parsed.marketplaceName,
            status: "skipped", // skipped because it enriched an existing pending review
          },
        });

        result.enriched++;
        continue;
      }
    }

    // No match found — create a new pending review
    const { category_id, sub_category_id } = user.gmail_auto_categorize
      ? await suggestCategoryByName(userId, parsed.suggestedCategoryName)
      : { category_id: null, sub_category_id: null };

    const account_id = await suggestAccount(userId, "default");

    await prisma.pendingReview.create({
      data: {
        user_id: userId,
        gmail_message_id: msg.id,
        raw_subject: subject,
        raw_body: body.slice(0, 2000),
        parsed_amount: parsed.amount,
        parsed_merchant: parsed.merchant ?? parsed.description,
        parsed_date: parsed.date,
        parsed_type: "expense",
        suggested_category_id: category_id,
        suggested_sub_category_id: sub_category_id ?? null,
        suggested_account_id: account_id,
        bank_name: parsed.marketplaceName,
        status: "pending",
      },
    });

    result.pending_review++;
  }

  // Build result arrays
  result.banks_detected = Array.from(bankCounts.entries()).map(([bank_name, v]) => ({
    bank_name,
    sender_email: v.sender,
    count: v.count,
  }));

  result.marketplaces_detected = Array.from(marketplaceCounts.entries()).map(([marketplace_name, v]) => ({
    marketplace_name,
    sender_email: v.sender,
    count: v.count,
  }));

  // Update last sync time
  await prisma.user.update({
    where: { id: userId },
    data: { gmail_last_sync: new Date() },
  });

  return result;
}

// ─────────────────────────────────────────────
// DEBUG SYNC — scan only, no writes
// ─────────────────────────────────────────────

export interface DebugEmailInfo {
  subject: string;
  sender: string;
  date: string;
  matched: boolean;
  match_type: "bank" | "marketplace" | null;
  match_name: string | null;
  parse_result: {
    amount: number | null;
    merchant: string | null;
    type: string | null;
  } | null;
  skip_reason: string | null;
}

export interface DebugSyncResult {
  total_emails_fetched: number;
  bank_query: string;
  broad_query: string;
  bank_emails: DebugEmailInfo[];
  broad_emails: DebugEmailInfo[];
  banks_detected: string[];
  total_matched: number;
  total_unmatched: number;
  user_tokens_ok: boolean;
}

export async function debugSyncForUser(userId: string): Promise<DebugSyncResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      token_expiry: true,
      gmail_last_sync: true,
    },
  });

  if (!user || !user.refresh_token) {
    return {
      total_emails_fetched: 0,
      bank_query: "",
      broad_query: "",
      bank_emails: [],
      broad_emails: [],
      banks_detected: [],
      total_matched: 0,
      total_unmatched: 0,
      user_tokens_ok: false,
    };
  }

  const { token, refreshed } = await getValidToken(user);
  if (refreshed) {
    await prisma.user.update({
      where: { id: userId },
      data: { access_token: encryptToken(refreshed.access_token), token_expiry: refreshed.token_expiry },
    });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // ── 1. Standard bank query ──
  const bankQuery = buildBankEmailQuery(thirtyDaysAgo);
  const bankEmails: DebugEmailInfo[] = [];
  const banksDetected = new Set<string>();
  let totalMatched = 0;

  try {
    const bankResult = await searchGmailMessages(token, bankQuery, 20);
    for (const msg of bankResult.messages) {
      try {
        const detail = await fetchGmailMessage(token, msg.id);
        const { subject, body, date, sender } = extractEmailContent(detail);
        const bank = detectBank(sender, subject);

        if (bank) {
          const parsed = bank.parse(subject, body, date);
          banksDetected.add(bank.bankName);
          totalMatched++;
          bankEmails.push({
            subject, sender, date: date.toISOString(),
            matched: true, match_type: "bank", match_name: bank.bankName,
            parse_result: parsed ? { amount: parsed.amount, merchant: parsed.merchant, type: parsed.type } : null,
            skip_reason: parsed ? null : "parse_failed",
          });
        } else {
          bankEmails.push({
            subject, sender, date: date.toISOString(),
            matched: false, match_type: null, match_name: null,
            parse_result: null,
            skip_reason: "no_bank_match",
          });
        }
      } catch (e) {
        bankEmails.push({
          subject: `[fetch error: ${msg.id}]`, sender: "", date: "",
          matched: false, match_type: null, match_name: null,
          parse_result: null,
          skip_reason: `fetch_error: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
  } catch (e) {
    console.error("[DebugSync] Bank query failed:", e);
  }

  // ── 2. Broad keyword query (catch banks we don't have specific senders for) ──
  const y = thirtyDaysAgo.getFullYear();
  const mo = String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0");
  const d = String(thirtyDaysAgo.getDate()).padStart(2, "0");
  const broadQuery = `(subject:(transaksi OR pembayaran OR transfer OR debit OR berhasil OR receipt OR "top up" OR tagihan)) after:${y}/${mo}/${d}`;

  const broadEmails: DebugEmailInfo[] = [];

  try {
    const broadResult = await searchGmailMessages(token, broadQuery, 20);
    for (const msg of broadResult.messages) {
      try {
        const detail = await fetchGmailMessage(token, msg.id);
        const { subject, body, date, sender } = extractEmailContent(detail);
        const bank = detectBank(sender, subject);
        const marketplace = detectMarketplace(sender, subject);

        if (bank) {
          totalMatched++;
          banksDetected.add(bank.bankName);
          broadEmails.push({
            subject, sender, date: date.toISOString(),
            matched: true, match_type: "bank", match_name: bank.bankName,
            parse_result: null, skip_reason: null,
          });
        } else if (marketplace) {
          totalMatched++;
          broadEmails.push({
            subject, sender, date: date.toISOString(),
            matched: true, match_type: "marketplace", match_name: marketplace.marketplaceName,
            parse_result: null, skip_reason: null,
          });
        } else {
          broadEmails.push({
            subject, sender, date: date.toISOString(),
            matched: false, match_type: null, match_name: null,
            parse_result: null,
            skip_reason: `unrecognized_sender: ${sender}`,
          });
        }
      } catch {
        // skip
      }
    }
  } catch (e) {
    console.error("[DebugSync] Broad query failed:", e);
  }

  return {
    total_emails_fetched: bankEmails.length + broadEmails.length,
    bank_query: bankQuery,
    broad_query: broadQuery,
    bank_emails: bankEmails,
    broad_emails: broadEmails,
    banks_detected: Array.from(banksDetected),
    total_matched: totalMatched,
    total_unmatched: (bankEmails.length + broadEmails.length) - totalMatched,
    user_tokens_ok: true,
  };
}

export async function getGmailStats(userId: string): Promise<{
  emails_processed: number;
  transactions_detected: number;
  approved: number;
  pending: number;
  skipped: number;
  enriched: number;
}> {
  const [total, pending, skipped, approved] = await Promise.all([
    prisma.pendingReview.count({ where: { user_id: userId } }),
    prisma.pendingReview.count({ where: { user_id: userId, status: "pending" } }),
    prisma.pendingReview.count({ where: { user_id: userId, status: "skipped" } }),
    prisma.pendingReview.count({ where: { user_id: userId, status: "approved" } }),
  ]);

  const [gmailTxns, enrichedTxns] = await Promise.all([
    prisma.transaction.count({ where: { user_id: userId, source: "gmail" } }),
    prisma.transaction.count({ where: { user_id: userId, source: "gmail_enriched" } }),
  ]);

  return {
    emails_processed: total,
    transactions_detected: total,
    approved: approved + gmailTxns,
    pending,
    skipped,
    enriched: enrichedTxns,
  };
}
