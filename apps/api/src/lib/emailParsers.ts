// Bank email parsers — BCA, Mandiri/Livin, GoPay, OVO, BNI, BRI, DANA, ShopeePay, SeaBank, Jago

export interface ParsedTransaction {
  amount: number;
  type: "expense" | "income";
  description: string;
  merchant: string | null;
  date: Date;
  bankName: string;
  rawSubject: string;
}

export interface BankPattern {
  bankName: string;
  senderPatterns: string[];
  subjectPatterns: string[];
  parse(subject: string, body: string, date: Date): ParsedTransaction | null;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Month name → index mapping (Indonesian + English)
const MONTH_ID: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4,
  jun: 5, jul: 6, agu: 7, aug: 7, sep: 8,
  okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
};

// Parse numeric string with Indonesian format:
// "178.404,00" → 178404  |  "1.000.000" → 1000000  |  "179404" → 179404
function parseIdrAmount(numStr: string): number | null {
  const normalized = numStr.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return !isNaN(n) && n > 0 ? Math.round(n) : null;
}

/** Parse BCA English-style amount: "IDR 164,800.00" → 164800 */
function parseBcaEnglishAmount(numStr: string): number | null {
  // English format: comma = thousands, dot = decimal → remove commas, parse float
  const cleaned = numStr.trim().replace(/,/g, "");
  const n = parseFloat(cleaned);
  return !isNaN(n) && n > 0 ? Math.round(n) : null;
}

/** Extract amount from BCA email body (English format: IDR 164,800.00) */
function extractBcaAmount(text: string): number | null {
  const patterns = [
    /total\s+payment\s*:\s*IDR\s*([\d.,]+)/i,
    /total\s+transaksi?\s*:\s*IDR\s*([\d.,]+)/i,
    /amount\s*:\s*IDR\s*([\d.,]+)/i,
    /nominal\s*:\s*IDR\s*([\d.,]+)/i,
    /IDR\s+([\d,]+\.\d{2})/i,       // "IDR 164,800.00" — must have .XX decimal
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseBcaEnglishAmount(m[1]);
      if (n) return n;
    }
  }
  return null;
}

/** Parse BCA date: "Transaction Date: 24 Mar 2026 14:13:14" */
function parseBcaDate(body: string, fallback: Date): Date {
  const m = body.match(/transaction\s+date\s*:\s*(\d{1,2})\s+(\w{3,})\s+(\d{4})\s+(\d{2}:\d{2}:\d{2})/i);
  if (!m) return parseBodyDate(body, fallback);

  const day = parseInt(m[1], 10);
  const monthKey = m[2].toLowerCase().slice(0, 3);
  const year = parseInt(m[3], 10);
  const monthNum = MONTH_ID[monthKey];
  if (monthNum === undefined) return fallback;

  const [h, mi, s] = m[4].split(":").map(Number);
  // BCA times are WIB (UTC+7)
  const d = new Date(Date.UTC(year, monthNum, day, h - 7, mi, s));
  return d;
}

// Generic amount extraction — tries common Indonesian bank email patterns
// Supports: Rp1.000.000 | Rp 1.000.000,50 | IDR 179.404,00 | sebesar Rp...
function extractAmount(text: string): number | null {
  const patterns = [
    /(?:total\s+transaksi|total\s+pembayaran)\s*:\s*(?:IDR|Rp\.?)\s*([\d.,]+)/i,
    /(?:nominal|jumlah)\s+transaksi\s*:\s*(?:IDR|Rp\.?)\s*([\d.,]+)/i,
    /sebesar\s+(?:IDR|Rp\.?)\s*([\d.,]+)/i,
    /(?:IDR|Rp\.?)\s*([\d.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseIdrAmount(m[1]);
      if (n) return n;
    }
  }
  return null;
}

// Parse Indonesian date + time from email body.
// Handles: "Tanggal: 28 Mar 2026" + "Jam: 10:04:21 WIB"

function parseBodyDate(body: string, fallback: Date): Date {
  const dateMatch = body.match(
    /(?:tanggal|date|tgl)\s*[:\-]?\s*(\d{1,2})\s+(\w{3,})\s+(\d{4})/i
  );
  if (!dateMatch) return fallback;

  const day = parseInt(dateMatch[1], 10);
  const month = MONTH_ID[dateMatch[2].toLowerCase().slice(0, 3)];
  const year = parseInt(dateMatch[3], 10);
  if (month === undefined || isNaN(day) || isNaN(year)) return fallback;

  const timeMatch = body.match(
    /(?:jam|time|waktu)\s*[:\-]?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/i
  );
  const h = timeMatch ? parseInt(timeMatch[1], 10) : 0;
  const m = timeMatch ? parseInt(timeMatch[2], 10) : 0;
  const s = timeMatch?.[3] ? parseInt(timeMatch[3], 10) : 0;

  return new Date(year, month, day, h, m, s);
}

// Type detection: scan subject + body for income/expense keywords
function detectType(subject: string, body: string): "expense" | "income" {
  const combined = (subject + " " + body).toLowerCase();
  const incomeKw = [
    "kredit", " cr ", "masuk", "terima", "diterima", "transfer masuk",
    "top up", "topup", "isi saldo", "credit", "received", "incoming",
    "setoran", "penerimaan", "pembayaran diterima",
  ];
  if (incomeKw.some((kw) => combined.includes(kw))) return "income";
  return "expense";
}

// Extract first match from a list of regex patterns (returns capture group 1)
function extractFromPattern(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

// ─────────────────────────────────────────────
// BANK PATTERNS
// ─────────────────────────────────────────────

export const BANK_PATTERNS: BankPattern[] = [

  // ── BCA ──────────────────────────────────────
  {
    bankName: "BCA",
    senderPatterns: [
      "bca.co.id",          // catch-all: notifikasi@, ebanking@, info@, noreply@, dst
      "klikbca.com",        // catch-all: no_reply@klikbca.com, dst
    ],
    subjectPatterns: ["bca", "klikbca"],
    parse(subject, body, date) {
      // Skip jika status bukan Successful
      const statusMatch = body.match(/status\s*:\s*(\w+)/i);
      if (statusMatch && statusMatch[1].toLowerCase() !== "successful") return null;

      // BCA pakai English number format: "IDR 164,800.00" (koma = ribuan, titik = desimal)
      const amount = extractBcaAmount(body) ?? extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      // Type: default expense. Income hanya jika keyword masuk/receive/credit
      const txnTypeMatch = body.match(/transaction\s*type\s*:\s*([^\n\r]+)/i);
      const txnType = txnTypeMatch?.[1]?.trim().toLowerCase() ?? "";
      const incomeKeywords = ["transfer masuk", "receive", "credit", "terima", "refund", "pengembalian"];
      const type: "expense" | "income" = incomeKeywords.some(k => txnType.includes(k) || body.toLowerCase().includes(k))
        ? "income" : "expense";

      // Merchant dari "Payment to:" atau "Transfer to:" atau pola Indonesia
      const merchant = extractFromPattern(body, [
        /payment\s+to\s*:\s*([^\n\r]+)/i,
        /transfer\s+to\s*:\s*([^\n\r]+)/i,
        /paid\s+to\s*:\s*([^\n\r]+)/i,
        /(?:tujuan|penerima|merchant)\s*:\s*([^\n\r]+)/i,
        /(?:kepada|ke)\s*:\s*([^\n\r]+)/i,
      ]);

      // Date dari "Transaction Date: 24 Mar 2026 14:13:14"
      const bcaDate = parseBcaDate(body, date);

      const description = merchant ? `BCA: ${merchant}` : (txnType ? `BCA: ${txnType}` : subject.trim() || "Transaksi BCA");
      return { amount, type, description, merchant, date: bcaDate, bankName: "BCA", rawSubject: subject };
    },
  },

  // ── Mandiri / Livin ───────────────────────────
  {
    bankName: "Mandiri",
    senderPatterns: [
      "noreply.livin@bankmandiri.co.id",
      "mc@bankmandiri.co.id",
      "bankmandiri.co.id",
      "mandiri.co.id",
    ],
    subjectPatterns: ["mandiri", "livin"],
    parse(subject, body, date) {
      // ── Amount: prefer "Total Transaksi" (includes fees) over "Nominal" ──
      const totalRaw  = body.match(/Total\s+Transaksi\s*:\s*(?:IDR|Rp\.?)\s*([\d.,]+)/i)?.[1];
      const nominalRaw = body.match(/Nominal\s+Transaksi\s*:\s*(?:IDR|Rp\.?)\s*([\d.,]+)/i)?.[1];
      const amount =
        (totalRaw  ? parseIdrAmount(totalRaw)  : null) ??
        (nominalRaw ? parseIdrAmount(nominalRaw) : null) ??
        extractAmount(body) ??
        extractAmount(subject);
      if (!amount) return null;

      // ── Merchant from "Penerima:" field ──
      const merchant = extractFromPattern(body, [
        /Penerima\s*:\s*([^\n\r]+)/i,
        /(?:tujuan|kepada|ke|nama)\s*:\s*([^\n\r]+)/i,
      ]);

      // ── Date from body ──
      const parsedDate = parseBodyDate(body, date);

      // ── Type: DEFAULT expense — bank notif = uang keluar dari rekening user.
      // "Pembayaran" / "Transfer" / "Top Up" = semua EXPENSE (uang keluar ke merchant/ewallet).
      // Hanya income jika body EKSPLISIT menyebut uang masuk ke rekening user.
      const bodyLower = body.toLowerCase();
      const type: "expense" | "income" =
        bodyLower.includes("transfer masuk") ||
        bodyLower.includes("terima transfer") ||
        bodyLower.includes("dana masuk") ||
        bodyLower.includes("refund") ||
        bodyLower.includes("pengembalian")
          ? "income"
          : "expense";

      const description = merchant ? `Mandiri: ${merchant}` : (subject.trim() || "Transaksi Mandiri");
      return { amount, type, description, merchant, date: parsedDate, bankName: "Mandiri", rawSubject: subject };
    },
  },

  // ── GoPay ────────────────────────────────────
  {
    bankName: "GoPay",
    senderPatterns: ["noreply@gojek.com", "no-reply@gojek.com", "gopay@gojek.com", "gojek.com"],
    subjectPatterns: ["gopay", "gojek"],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      const type = detectType(subject, body);
      const merchant = extractFromPattern(body, [
        /(?:merchant|toko|penerima|kepada|ke)\s*:?\s*([^\n\r]+)/i,
        /(?:kamu membayar|pembayaran ke|bayar ke)\s+([^\n\r\d]+)/i,
      ]);

      const description = merchant ? `GoPay: ${merchant}` : (subject.trim() || "Transaksi GoPay");
      return { amount, type, description, merchant, date: parseBodyDate(body, date), bankName: "GoPay", rawSubject: subject };
    },
  },

  // ── OVO ──────────────────────────────────────
  {
    bankName: "OVO",
    senderPatterns: ["no-reply@ovo.id", "ovo@ovo.id", "ovo.id"],
    subjectPatterns: ["ovo"],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      const type = detectType(subject, body);
      const merchant = extractFromPattern(body, [
        /(?:merchant|penerima|toko|kepada|ke)\s*:?\s*([^\n\r]+)/i,
        /(?:kamu membayar|pembayaran ke|transaksi ke)\s+([^\n\r\d]+)/i,
      ]);

      const description = merchant ? `OVO: ${merchant}` : (subject.trim() || "Transaksi OVO");
      return { amount, type, description, merchant, date: parseBodyDate(body, date), bankName: "OVO", rawSubject: subject };
    },
  },

  // ── BNI ──────────────────────────────────────
  {
    bankName: "BNI",
    senderPatterns: ["notifikasi@bni.co.id", "no-reply@bni.co.id", "bni.co.id"],
    subjectPatterns: ["bni"],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      const type = detectType(subject, body);
      const merchant = extractFromPattern(body, [
        /(?:tujuan|penerima|merchant|nama|kepada|ke)\s*:\s*([^\n\r]+)/i,
      ]);

      const description = merchant ? `BNI: ${merchant}` : (subject.trim() || "Transaksi BNI");
      return { amount, type, description, merchant, date: parseBodyDate(body, date), bankName: "BNI", rawSubject: subject };
    },
  },

  // ── BRI / BRImo ──────────────────────────────
  {
    bankName: "BRI",
    senderPatterns: ["info@bri.co.id", "notifikasi@bri.co.id", "bri.co.id"],
    subjectPatterns: ["brimo", "bri"],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      const type = detectType(subject, body);
      const merchant = extractFromPattern(body, [
        /(?:tujuan|penerima|merchant|nama|kepada|ke|toko)\s*:\s*([^\n\r]+)/i,
      ]);

      const description = merchant ? `BRI: ${merchant}` : (subject.trim() || "Transaksi BRI");
      return { amount, type, description, merchant, date: parseBodyDate(body, date), bankName: "BRI", rawSubject: subject };
    },
  },

  // ── DANA ─────────────────────────────────────
  {
    bankName: "DANA",
    senderPatterns: ["noreply@dana.id", "cs@dana.id", "dana.id"],
    subjectPatterns: ["dana"],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      const type = detectType(subject, body);
      const merchant = extractFromPattern(body, [
        /(?:penerima|merchant|nama penerima|toko|kepada|ke)\s*:?\s*([^\n\r]+)/i,
        /(?:kamu membayar|pembayaran ke|bayar ke)\s+([^\n\r\d]+)/i,
      ]);

      const description = merchant ? `DANA: ${merchant}` : (subject.trim() || "Transaksi DANA");
      return { amount, type, description, merchant, date: parseBodyDate(body, date), bankName: "DANA", rawSubject: subject };
    },
  },

  // ── ShopeePay ────────────────────────────────
  {
    bankName: "ShopeePay",
    senderPatterns: ["noreply@email.shopee.co.id", "noreply@shopee.co.id", "shopee.co.id"],
    subjectPatterns: ["shopeepay", "shopee"],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      const type = detectType(subject, body);
      const merchant = extractFromPattern(body, [
        /(?:nama toko|toko|penerima|merchant|kepada|ke)\s*:?\s*([^\n\r]+)/i,
      ]);

      const description = merchant ? `ShopeePay: ${merchant}` : (subject.trim() || "Transaksi ShopeePay");
      return { amount, type, description, merchant, date: parseBodyDate(body, date), bankName: "ShopeePay", rawSubject: subject };
    },
  },

  // ── SeaBank ──────────────────────────────────
  {
    bankName: "SeaBank",
    senderPatterns: ["noreply@seabank.co.id", "info@seabank.co.id", "seabank.co.id"],
    subjectPatterns: ["seabank"],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      const type = detectType(subject, body);
      const merchant = extractFromPattern(body, [
        /(?:tujuan|penerima|merchant|nama|kepada|ke)\s*:?\s*([^\n\r]+)/i,
      ]);

      const description = merchant ? `SeaBank: ${merchant}` : (subject.trim() || "Transaksi SeaBank");
      return { amount, type, description, merchant, date: parseBodyDate(body, date), bankName: "SeaBank", rawSubject: subject };
    },
  },

  // ── Bank Jago ────────────────────────────────
  {
    bankName: "Jago",
    senderPatterns: ["noreply@jago.com", "jago.com"],
    subjectPatterns: ["jago"],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      // Subject: "Kamu telah membayar ke MERCHANT💸"
      //          "Kamu telah menerima dari MERCHANT💸"
      const subjectLower = subject.toLowerCase();
      const type: "expense" | "income" =
        subjectLower.includes("menerima") || subjectLower.includes("masuk")
          ? "income"
          : "expense";

      const merchant =
        subject
          .replace(/💸.*$/u, "")
          .match(/(?:membayar ke|transfer ke|menerima dari)\s+(.+)$/i)?.[1]
          ?.trim() ?? null;

      const description = merchant
        ? `Jago: ${merchant}`
        : (subject.replace(/💸/u, "").trim() || "Transaksi Jago");

      return { amount, type, description, merchant, date, bankName: "Jago", rawSubject: subject };
    },
  },
];

// ─────────────────────────────────────────────
// BANK DETECTION
// ─────────────────────────────────────────────

export function detectBank(sender: string, subject: string): BankPattern | null {
  const senderLower = sender.toLowerCase();
  const subjectLower = subject.toLowerCase();

  // Sender match is definitive — prevents false positives from subject keywords
  // (e.g. Jago email paying to "GoPay merchant" must not match GoPay parser)
  for (const pattern of BANK_PATTERNS) {
    if (pattern.senderPatterns.some((p) => senderLower.includes(p))) {
      return pattern;
    }
  }

  // Fallback: subject match only when sender is unrecognised
  for (const pattern of BANK_PATTERNS) {
    if (pattern.subjectPatterns.some((p) => subjectLower.includes(p))) {
      return pattern;
    }
  }

  return null;
}

// ─────────────────────────────────────────────
// GMAIL SEARCH QUERY
// ─────────────────────────────────────────────

export function buildBankEmailQuery(afterDate: Date): string {
  const senders = [
    // BCA (semua variasi)
    "notifikasi@bca.co.id",
    "no_reply@klikbca.com",
    "ebanking@bca.co.id",
    "klikbca@bca.co.id",
    "noreply@bca.co.id",
    "info@bca.co.id",
    "bca@bca.co.id",
    // Mandiri / Livin
    "noreply.livin@bankmandiri.co.id",
    "mc@bankmandiri.co.id",
    // GoPay
    "noreply@gojek.com",
    "no-reply@gojek.com",
    // OVO
    "no-reply@ovo.id",
    // BNI
    "notifikasi@bni.co.id",
    "noreply@bni.co.id",
    // BRI
    "info@bri.co.id",
    "notifikasi@bri.co.id",
    "noreply@bri.co.id",
    // DANA
    "noreply@dana.id",
    // ShopeePay
    "noreply@email.shopee.co.id",
    // SeaBank
    "noreply@seabank.co.id",
    // Jago
    "noreply@jago.com",
    // CIMB
    "noreply@cimb.co.id",
    "octo@cimbniaga.co.id",
    // Permata / PermataME
    "noreply@permatabank.com",
    // Jenius / BTPN
    "noreply@btpn.com",
    "info@jenius.com",
    // BTN
    "noreply@btn.co.id",
    // Maybank
    "noreply@maybank.co.id",
    // DBS / Digibank
    "noreply@dbs.com",
    // OCBC NISP
    "noreply@ocbc.id",
  ];

  const fromClause = senders.map((s) => `from:${s}`).join(" OR ");
  const y = afterDate.getFullYear();
  const mo = String(afterDate.getMonth() + 1).padStart(2, "0");
  const d = String(afterDate.getDate()).padStart(2, "0");

  return `(${fromClause}) after:${y}/${mo}/${d}`;
}
