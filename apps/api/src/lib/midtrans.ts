// ═══════════════════════════════════════
// Midtrans Snap Integration
// ═══════════════════════════════════════
import { env } from "../env.js";
import crypto from "crypto";

// ── Types ──
interface SnapTransactionParams {
  order_id: string;
  gross_amount: number;
  customer_email: string;
  customer_name: string;
  item_name: string;
}

interface SnapResponse {
  token: string;
  redirect_url: string;
}

interface MidtransNotification {
  order_id: string;
  transaction_id?: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  gross_amount: string;
  signature_key: string;
  status_code: string;
  [key: string]: unknown;
}

// ── Snap API ──
const SNAP_URL = env.MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

export async function createSnapTransaction(params: SnapTransactionParams): Promise<SnapResponse> {
  const serverKey = env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY not configured");

  const authString = Buffer.from(`${serverKey}:`).toString("base64");

  const body = {
    transaction_details: {
      order_id: params.order_id,
      gross_amount: params.gross_amount,
    },
    item_details: [
      {
        id: params.order_id,
        price: params.gross_amount,
        quantity: 1,
        name: params.item_name,
      },
    ],
    customer_details: {
      email: params.customer_email,
      first_name: params.customer_name,
    },
    callbacks: {
      finish: `${env.FRONTEND_URL}/payment-success`,
    },
  };

  const res = await fetch(SNAP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${authString}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Midtrans] Snap error:", res.status, text);
    throw new Error(`Midtrans Snap API error: ${res.status}`);
  }

  const data = (await res.json()) as SnapResponse;
  return data;
}

// ── Verify Webhook Signature ──
export function verifySignature(notification: MidtransNotification): boolean {
  const serverKey = env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;

  const { order_id, status_code, gross_amount, signature_key } = notification;

  const payload = `${order_id}${status_code}${gross_amount}${serverKey}`;
  const expected = crypto.createHash("sha512").update(payload).digest("hex");

  return expected === signature_key;
}

// ── Check if notification means payment is successful ──
export function isPaymentSuccess(notification: MidtransNotification): boolean {
  const { transaction_status, fraud_status } = notification;

  if (transaction_status === "capture") {
    return fraud_status === "accept";
  }

  return (
    transaction_status === "settlement" ||
    transaction_status === "authorize"  // for card pre-auth
  );
}

// ── Check if payment is pending ──
export function isPaymentPending(notification: MidtransNotification): boolean {
  return notification.transaction_status === "pending";
}

// ── Check if payment failed/expired ──
export function isPaymentFailed(notification: MidtransNotification): boolean {
  const { transaction_status } = notification;
  return (
    transaction_status === "deny" ||
    transaction_status === "cancel" ||
    transaction_status === "expire"
  );
}

// ── Generate unique order ID ──
export function generateOrderId(userId: string, planType: "monthly" | "yearly"): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `DA-${planType.charAt(0).toUpperCase()}-${userId.slice(-6)}-${ts}-${rand}`;
}

export type { MidtransNotification };
