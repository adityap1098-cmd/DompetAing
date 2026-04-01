// Marketplace email parsers — Shopee, Tokopedia, Grab, Gojek, Traveloka

export interface ParsedMarketplaceTransaction {
  amount: number;
  type: "expense";
  description: string;
  merchant: string | null;
  productName: string | null;
  date: Date;
  marketplaceName: string;
  rawSubject: string;
  /** Suggested category name based on product/service keywords */
  suggestedCategoryName: string;
}

export interface MarketplacePattern {
  marketplaceName: string;
  senderPatterns: string[];
  parse(subject: string, body: string, date: Date): ParsedMarketplaceTransaction | null;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function parseIdrAmount(numStr: string): number | null {
  const normalized = numStr.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return !isNaN(n) && n > 0 ? Math.round(n) : null;
}

function extractAmount(text: string): number | null {
  const patterns = [
    /(?:total\s+(?:pembayaran|pesanan|bayar|tagihan|harga))\s*:?\s*(?:IDR|Rp\.?)\s*([\d.,]+)/i,
    /(?:total)\s*:?\s*(?:IDR|Rp\.?)\s*([\d.,]+)/i,
    /(?:nominal|jumlah)\s*:?\s*(?:IDR|Rp\.?)\s*([\d.,]+)/i,
    /sebesar\s+(?:IDR|Rp\.?)\s*([\d.,]+)/i,
    /(?:IDR|Rp\.?)\s*([\d.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseIdrAmount(m[1]);
      if (n && n >= 1000) return n; // marketplace transactions are at least Rp 1.000
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// SMART CATEGORY MAPPING
// ─────────────────────────────────────────────

const CATEGORY_KEYWORDS: { keywords: string[]; categoryName: string }[] = [
  {
    keywords: ["makanan", "food", "resto", "makan", "snack", "minuman", "kopi", "coffee", "nasi", "mie", "ayam", "sate", "bakso", "pizza", "burger", "rice", "warung", "kedai", "catering"],
    categoryName: "Makanan & Minuman",
  },
  {
    keywords: ["elektronik", "gadget", "phone", "laptop", "charger", "kabel", "headset", "earphone", "speaker", "powerbank", "adapter", "mouse", "keyboard", "monitor", "tablet", "ipad", "iphone", "samsung", "xiaomi", "oppo", "vivo", "realme", "smartphone", "computer"],
    categoryName: "Teknologi",
  },
  {
    keywords: ["baju", "celana", "sepatu", "fashion", "pakaian", "kaos", "kemeja", "jaket", "hoodie", "dress", "rok", "sandal", "tas", "topi", "underwear", "pakaian dalam", "jeans", "blazer", "sweater"],
    categoryName: "Fashion",
  },
  {
    keywords: ["obat", "vitamin", "kesehatan", "masker", "sanitizer", "suplemen", "p3k", "thermometer", "tensi", "medical", "farmasi"],
    categoryName: "Kesehatan",
  },
  {
    keywords: ["pulsa", "internet", "data", "paket data", "kuota"],
    categoryName: "Teknologi",
  },
  {
    keywords: ["hotel", "flight", "pesawat", "tiket", "booking", "penginapan", "resort", "hostel", "villa", "airbnb", "travel", "wisata", "trip", "tour"],
    categoryName: "Hiburan",
  },
  {
    keywords: ["kecantikan", "skincare", "makeup", "kosmetik", "serum", "moisturizer", "sunscreen", "foundation", "lipstick", "parfum", "perawatan", "shampoo", "conditioner", "sabun"],
    categoryName: "Kecantikan",
  },
  {
    keywords: ["mainan", "toy", "game", "gaming", "console", "playstation", "nintendo"],
    categoryName: "Hiburan",
  },
  {
    keywords: ["rumah", "furniture", "alat rumah", "dapur", "kasur", "bantal", "selimut", "lampu", "sapu", "pel", "deterjen", "sabun cuci"],
    categoryName: "Rumah",
  },
];

export function suggestCategoryFromKeywords(text: string): string {
  const lower = text.toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.categoryName;
    }
  }
  return "Belanja";
}

// ─────────────────────────────────────────────
// MARKETPLACE PATTERNS
// ─────────────────────────────────────────────

export const MARKETPLACE_PATTERNS: MarketplacePattern[] = [
  // ── Shopee ──────────────────────────────────
  {
    marketplaceName: "Shopee",
    senderPatterns: [
      "noreply@shopee.co.id",
      "notification@shopee.co.id",
      "no-reply@shopee.co.id",
      "noreply@mail.shopee.co.id",
    ],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      // Skip non-order emails (promo, voucher, etc)
      const subjectLower = subject.toLowerCase();
      const bodyLower = body.toLowerCase();
      const isOrderEmail =
        subjectLower.includes("pesanan") ||
        subjectLower.includes("order") ||
        subjectLower.includes("pembayaran") ||
        subjectLower.includes("konfirmasi") ||
        bodyLower.includes("pesanan") ||
        bodyLower.includes("order") ||
        bodyLower.includes("pembayaran berhasil");
      if (!isOrderEmail) return null;

      // Extract product name
      const productPatterns = [
        /(?:nama\s+produk|produk|barang|item)\s*:?\s*([^\n\r]+)/i,
        /(?:pesanan|order)\s*:?\s*([^\n\r]+)/i,
      ];
      let productName: string | null = null;
      for (const p of productPatterns) {
        const m = body.match(p);
        if (m?.[1]?.trim()) {
          productName = m[1].trim().slice(0, 100);
          break;
        }
      }

      // Extract merchant/shop name from body
      const merchantPatterns = [
        /(?:nama\s+toko|toko|seller|penjual|dari\s+toko)\s*:?\s*([^\n\r]+)/i,
      ];
      let merchant: string | null = null;
      for (const p of merchantPatterns) {
        const m = body.match(p);
        if (m?.[1]?.trim()) {
          merchant = m[1].trim().slice(0, 80);
          break;
        }
      }

      const description = productName
        ? `Shopee: ${productName}`
        : merchant
        ? `Shopee: ${merchant}`
        : "Belanja Shopee";

      const suggestedCategoryName = suggestCategoryFromKeywords(
        `${productName ?? ""} ${subject}`
      );

      return {
        amount,
        type: "expense",
        description,
        merchant,
        productName,
        date,
        marketplaceName: "Shopee",
        rawSubject: subject,
        suggestedCategoryName,
      };
    },
  },

  // ── Tokopedia ───────────────────────────────
  {
    marketplaceName: "Tokopedia",
    senderPatterns: [
      "noreply@tokopedia.com",
      "info@tokopedia.com",
      "notification@tokopedia.com",
      "no-reply@tokopedia.com",
    ],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      const subjectLower = subject.toLowerCase();
      const bodyLower = body.toLowerCase();
      const isOrderEmail =
        subjectLower.includes("invoice") ||
        subjectLower.includes("pesanan") ||
        subjectLower.includes("pembayaran") ||
        subjectLower.includes("order") ||
        bodyLower.includes("invoice") ||
        bodyLower.includes("pesanan") ||
        bodyLower.includes("pembayaran berhasil");
      if (!isOrderEmail) return null;

      // Extract product name
      let productName: string | null = null;
      const productPatterns = [
        /(?:nama\s+produk|produk|barang|item)\s*:?\s*([^\n\r]+)/i,
        /(?:pesanan|order)\s*:?\s*([^\n\r]+)/i,
      ];
      for (const p of productPatterns) {
        const m = body.match(p);
        if (m?.[1]?.trim()) {
          productName = m[1].trim().slice(0, 100);
          break;
        }
      }

      // Extract invoice number
      const invoiceMatch = body.match(/(?:invoice|inv|no\.?\s*invoice)\s*:?\s*(INV[\w/-]+)/i);
      const invoiceNumber = invoiceMatch?.[1] ?? null;

      // Extract merchant
      let merchant: string | null = null;
      const merchantPatterns = [
        /(?:nama\s+toko|toko|seller|penjual)\s*:?\s*([^\n\r]+)/i,
      ];
      for (const p of merchantPatterns) {
        const m = body.match(p);
        if (m?.[1]?.trim()) {
          merchant = m[1].trim().slice(0, 80);
          break;
        }
      }

      const description = productName
        ? `Tokopedia: ${productName}`
        : merchant
        ? `Tokopedia: ${merchant}`
        : invoiceNumber
        ? `Tokopedia: ${invoiceNumber}`
        : "Belanja Tokopedia";

      const suggestedCategoryName = suggestCategoryFromKeywords(
        `${productName ?? ""} ${subject}`
      );

      return {
        amount,
        type: "expense",
        description,
        merchant,
        productName,
        date,
        marketplaceName: "Tokopedia",
        rawSubject: subject,
        suggestedCategoryName,
      };
    },
  },

  // ── Grab (GrabFood / GrabCar / GrabBike) ───
  {
    marketplaceName: "Grab",
    senderPatterns: [
      "noreply@grab.com",
      "receipt@grab.com",
      "no-reply@grab.com",
    ],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      const combined = (subject + " " + body).toLowerCase();

      // Detect service type
      let serviceType: "GrabFood" | "GrabCar" | "GrabBike" | "Grab" = "Grab";
      let suggestedCategoryName = "Belanja";

      if (combined.includes("grabfood") || combined.includes("grab food")) {
        serviceType = "GrabFood";
        suggestedCategoryName = "Makanan & Minuman";
      } else if (combined.includes("grabcar") || combined.includes("grab car")) {
        serviceType = "GrabCar";
        suggestedCategoryName = "Transportasi";
      } else if (combined.includes("grabbike") || combined.includes("grab bike")) {
        serviceType = "GrabBike";
        suggestedCategoryName = "Transportasi";
      } else if (combined.includes("food") || combined.includes("resto") || combined.includes("restaurant")) {
        serviceType = "GrabFood";
        suggestedCategoryName = "Makanan & Minuman";
      } else if (combined.includes("ride") || combined.includes("trip") || combined.includes("perjalanan")) {
        serviceType = "GrabCar";
        suggestedCategoryName = "Transportasi";
      }

      // Extract restaurant/destination name
      let merchant: string | null = null;
      const merchantPatterns = [
        /(?:restaurant|restoran|resto|nama\s+resto|dari|from|toko)\s*:?\s*([^\n\r]+)/i,
        /(?:pick.?up|tujuan|destination|drop.?off)\s*:?\s*([^\n\r]+)/i,
      ];
      for (const p of merchantPatterns) {
        const m = body.match(p);
        if (m?.[1]?.trim()) {
          merchant = m[1].trim().slice(0, 80);
          break;
        }
      }

      const description = merchant
        ? `${serviceType}: ${merchant}`
        : `${serviceType}`;

      return {
        amount,
        type: "expense",
        description,
        merchant,
        productName: null,
        date,
        marketplaceName: "Grab",
        rawSubject: subject,
        suggestedCategoryName,
      };
    },
  },

  // ── Gojek (GoFood / GoRide / GoCar) ────────
  {
    marketplaceName: "Gojek",
    senderPatterns: [
      "noreply@gojek.com",
      "no-reply@gojek.com",
    ],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      const combined = (subject + " " + body).toLowerCase();

      // Skip if this looks like a GoPay transaction (handled by bank parser)
      // Only process receipt/order emails
      const isReceiptEmail =
        combined.includes("receipt") ||
        combined.includes("trip") ||
        combined.includes("order") ||
        combined.includes("pesanan") ||
        combined.includes("gofood") ||
        combined.includes("goride") ||
        combined.includes("gocar");
      if (!isReceiptEmail) return null;

      // Detect service type
      let serviceType: "GoFood" | "GoRide" | "GoCar" | "Gojek" = "Gojek";
      let suggestedCategoryName = "Belanja";

      if (combined.includes("gofood") || combined.includes("go food") || combined.includes("go-food")) {
        serviceType = "GoFood";
        suggestedCategoryName = "Makanan & Minuman";
      } else if (combined.includes("goride") || combined.includes("go ride") || combined.includes("go-ride")) {
        serviceType = "GoRide";
        suggestedCategoryName = "Transportasi";
      } else if (combined.includes("gocar") || combined.includes("go car") || combined.includes("go-car")) {
        serviceType = "GoCar";
        suggestedCategoryName = "Transportasi";
      } else if (combined.includes("food") || combined.includes("resto") || combined.includes("restaurant")) {
        serviceType = "GoFood";
        suggestedCategoryName = "Makanan & Minuman";
      } else if (combined.includes("ride") || combined.includes("trip") || combined.includes("perjalanan")) {
        serviceType = "GoRide";
        suggestedCategoryName = "Transportasi";
      }

      // Extract restaurant/destination
      let merchant: string | null = null;
      const merchantPatterns = [
        /(?:restaurant|restoran|resto|nama\s+resto|dari|from|toko)\s*:?\s*([^\n\r]+)/i,
        /(?:pick.?up|tujuan|destination|drop.?off)\s*:?\s*([^\n\r]+)/i,
      ];
      for (const p of merchantPatterns) {
        const m = body.match(p);
        if (m?.[1]?.trim()) {
          merchant = m[1].trim().slice(0, 80);
          break;
        }
      }

      const description = merchant
        ? `${serviceType}: ${merchant}`
        : `${serviceType}`;

      return {
        amount,
        type: "expense",
        description,
        merchant,
        productName: null,
        date,
        marketplaceName: "Gojek",
        rawSubject: subject,
        suggestedCategoryName,
      };
    },
  },

  // ── Traveloka ───────────────────────────────
  {
    marketplaceName: "Traveloka",
    senderPatterns: [
      "noreply@traveloka.com",
      "no-reply@traveloka.com",
      "notification@traveloka.com",
    ],
    parse(subject, body, date) {
      const amount = extractAmount(body) ?? extractAmount(subject);
      if (!amount) return null;

      const combined = (subject + " " + body).toLowerCase();

      // Skip promo emails
      const isBookingEmail =
        combined.includes("booking") ||
        combined.includes("konfirmasi") ||
        combined.includes("confirmation") ||
        combined.includes("e-ticket") ||
        combined.includes("voucher hotel") ||
        combined.includes("pembayaran berhasil") ||
        combined.includes("pesanan");
      if (!isBookingEmail) return null;

      // Detect booking type
      let bookingType: "Flight" | "Hotel" | "Activity" | "Traveloka" = "Traveloka";
      let suggestedCategoryName = "Hiburan";

      if (combined.includes("flight") || combined.includes("pesawat") || combined.includes("tiket pesawat") || combined.includes("e-ticket")) {
        bookingType = "Flight";
        suggestedCategoryName = "Transportasi";
      } else if (combined.includes("hotel") || combined.includes("penginapan") || combined.includes("resort") || combined.includes("villa")) {
        bookingType = "Hotel";
        suggestedCategoryName = "Hiburan";
      } else if (combined.includes("activity") || combined.includes("aktivitas") || combined.includes("atraksi") || combined.includes("tiket")) {
        bookingType = "Activity";
        suggestedCategoryName = "Hiburan";
      }

      // Extract detail
      let merchant: string | null = null;
      const merchantPatterns = [
        /(?:hotel|airline|maskapai|nama hotel)\s*:?\s*([^\n\r]+)/i,
        /(?:rute|route|dari|from)\s*:?\s*([^\n\r]+)/i,
      ];
      for (const p of merchantPatterns) {
        const m = body.match(p);
        if (m?.[1]?.trim()) {
          merchant = m[1].trim().slice(0, 80);
          break;
        }
      }

      const description = merchant
        ? `Traveloka ${bookingType}: ${merchant}`
        : `Traveloka ${bookingType}`;

      return {
        amount,
        type: "expense",
        description,
        merchant,
        productName: null,
        date,
        marketplaceName: "Traveloka",
        rawSubject: subject,
        suggestedCategoryName,
      };
    },
  },
];

// ─────────────────────────────────────────────
// MARKETPLACE DETECTION
// ─────────────────────────────────────────────

export function detectMarketplace(sender: string, subject: string): MarketplacePattern | null {
  const senderLower = sender.toLowerCase();

  // Note: Gojek sender overlaps with GoPay bank parser.
  // We distinguish by checking if this is a receipt/order email (not a GoPay payment notif).
  // The marketplace parser itself filters for receipt emails internally.
  for (const pattern of MARKETPLACE_PATTERNS) {
    if (pattern.senderPatterns.some((p) => senderLower.includes(p))) {
      return pattern;
    }
  }

  return null;
}

// ─────────────────────────────────────────────
// GMAIL SEARCH QUERY — Marketplace
// ─────────────────────────────────────────────

export function buildMarketplaceEmailQuery(afterDate: Date): string {
  const senders = [
    // Shopee
    "noreply@shopee.co.id",
    "notification@shopee.co.id",
    "no-reply@shopee.co.id",
    "noreply@mail.shopee.co.id",
    // Tokopedia
    "noreply@tokopedia.com",
    "info@tokopedia.com",
    // Grab
    "noreply@grab.com",
    "receipt@grab.com",
    // Gojek (receipt emails — GoPay handled by bank parser)
    // NOTE: gojek sender shared with GoPay; marketplace parser filters by content
    // We don't add gojek here since it's already in bank query
    // Traveloka
    "noreply@traveloka.com",
    "no-reply@traveloka.com",
  ];

  const fromClause = senders.map((s) => `from:${s}`).join(" OR ");
  const y = afterDate.getFullYear();
  const mo = String(afterDate.getMonth() + 1).padStart(2, "0");
  const d = String(afterDate.getDate()).padStart(2, "0");

  return `(${fromClause}) after:${y}/${mo}/${d}`;
}
