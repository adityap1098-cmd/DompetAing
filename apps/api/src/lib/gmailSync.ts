// Gmail sync engine — processes emails and creates PendingReviews

import { prisma } from "./db.js";
import {
  getValidToken,
  searchGmailMessages,
  fetchGmailMessage,
  extractEmailContent,
  fetchGmailProfile,
} from "./gmail.js";
import { detectBank, buildBankEmailQuery } from "./emailParsers.js";

export interface SyncResult {
  emails_processed: number;
  transactions_found: number;
  pending_review: number;
  banks_detected: { bank_name: string; sender_email: string; count: number }[];
}

// Suggest category for a transaction based on bank + type + merchant keyword
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

  // Try merchant keyword matching
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

  // GoPay / OVO default → Makanan & Minuman
  if (bankName === "GoPay" || bankName === "OVO") {
    const cat = categories.find((c) => c.name === "Makanan & Minuman");
    return { category_id: cat?.id ?? null, sub_category_id: null };
  }

  // Default: Lainnya
  const other = categories.find((c) => c.name === "Lainnya");
  return { category_id: other?.id ?? null, sub_category_id: null };
}

// Suggest account based on bank name
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

// forceFullScan = true → always scan 6 months back (manual sync)
// forceFullScan = false → incremental from gmail_last_sync (cron)
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

  // Get valid access token, refresh if needed
  const { token, refreshed } = await getValidToken(user);

  if (refreshed) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        access_token: refreshed.access_token,
        token_expiry: refreshed.token_expiry,
      },
    });
  }

  // Determine scan window:
  // - forceFullScan (manual): always 6 months back → ensures user can always rescan
  // - cron (incremental): since last sync to avoid re-processing
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const afterDate = forceFullScan ? sixMonthsAgo : (user.gmail_last_sync ?? sixMonthsAgo);

  const query = buildBankEmailQuery(afterDate);

  // Collect all message IDs (paginate up to 500)
  const allMessages: { id: string }[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const result = await searchGmailMessages(token, query, 100, pageToken);
    allMessages.push(...result.messages);
    pageToken = result.nextPageToken;
    pages++;
  } while (pageToken && pages < 5);

  const result: SyncResult = {
    emails_processed: 0,
    transactions_found: 0,
    pending_review: 0,
    banks_detected: [],
  };

  const bankCounts: Map<string, { sender: string; count: number }> = new Map();

  for (const msg of allMessages) {
    result.emails_processed++;

    // Dedup: skip if already in pending_reviews or transactions
    const [existingPending, existingTxn] = await Promise.all([
      prisma.pendingReview.findFirst({ where: { user_id: userId, gmail_message_id: msg.id } }),
      prisma.transaction.findFirst({ where: { user_id: userId, gmail_message_id: msg.id } }),
    ]);

    if (existingPending || existingTxn) continue;

    // Fetch full message
    let msgDetail;
    try {
      msgDetail = await fetchGmailMessage(token, msg.id);
    } catch {
      continue;
    }

    const { subject, body, date, sender } = extractEmailContent(msgDetail);
    const bank = detectBank(sender, subject);
    if (!bank) continue;

    const parsed = bank.parse(subject, body, date);
    if (!parsed) continue;

    result.transactions_found++;

    // Track bank source
    const existing = bankCounts.get(bank.bankName);
    if (existing) {
      existing.count++;
    } else {
      bankCounts.set(bank.bankName, { sender, count: 1 });
    }

    // Upsert GmailSource
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

    // Suggest category + account
    const { category_id, sub_category_id } = user.gmail_auto_categorize
      ? await suggestCategory(userId, parsed.type, parsed.bankName, parsed.merchant)
      : { category_id: null, sub_category_id: null };

    const account_id = await suggestAccount(userId, parsed.bankName);

    // Create PendingReview
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

  // Build banks_detected from bankCounts
  result.banks_detected = Array.from(bankCounts.entries()).map(([bank_name, v]) => ({
    bank_name,
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

export async function getGmailStats(userId: string): Promise<{
  emails_processed: number;
  transactions_detected: number;
  approved: number;
  pending: number;
  skipped: number;
}> {
  const [total, pending, skipped, approved] = await Promise.all([
    prisma.pendingReview.count({ where: { user_id: userId } }),
    prisma.pendingReview.count({ where: { user_id: userId, status: "pending" } }),
    prisma.pendingReview.count({ where: { user_id: userId, status: "skipped" } }),
    prisma.pendingReview.count({ where: { user_id: userId, status: "approved" } }),
  ]);

  const gmailTxns = await prisma.transaction.count({
    where: { user_id: userId, source: "gmail" },
  });

  return {
    emails_processed: total,
    transactions_detected: total,
    approved: approved + gmailTxns,
    pending,
    skipped,
  };
}
