import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Toggle } from "@/components/ui/Toggle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import {
  useSubscription,
  useCheckout,
  usePaymentHistory,
  useToggleAutoRenew,
  useCancelSubscription,
} from "@/hooks/useSubscription";
import { formatRupiah, formatDate } from "@/lib/format";
import { PREMIUM_PRICES } from "@dompetaing/shared";

// ── Subscription Page ──
export function SubscriptionPage() {
  const { subscription, plan, isTrialActive, trialDaysLeft, isPremium } =
    useSubscription();
  const { data: paymentData } = usePaymentHistory();
  const checkout = useCheckout();
  const toggleAutoRenew = useToggleAutoRenew();
  const cancelSub = useCancelSubscription();

  const [showCancel, setShowCancel] = useState(false);
  const [activeTab, setActiveTab] = useState<"plan" | "history">("plan");

  async function handleCheckout(planType: "monthly" | "yearly") {
    try {
      const data = await checkout.mutateAsync(planType);
      // Redirect to Midtrans payment page
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat pembayaran";
      showToast(msg, "error");
    }
  }

  function handleCancel() {
    cancelSub.mutate(undefined, {
      onSuccess: (data) => {
        showToast(data.message, "success");
        setShowCancel(false);
      },
      onError: (err) => {
        showToast(err instanceof Error ? err.message : "Gagal membatalkan", "error");
      },
    });
  }

  const payments = paymentData?.payments ?? [];

  return (
    <div>
      <Header title="Langganan" />

      <div className="px-[17px] pt-4 pb-24 space-y-4">
        {/* Current Plan Card */}
        <div className="rounded-[14px] bg-accent-500 dark:bg-accent-dark p-4 space-y-1">
          <p className="text-white/70 text-[10px] uppercase tracking-wider">
            Plan Sekarang
          </p>
          <p className="text-[22px] font-extrabold text-white">
            {plan === "premium"
              ? "✨ Premium"
              : isTrialActive
              ? "✨ Trial Premium"
              : "🆓 Free"}
          </p>
          {isTrialActive && (
            <p className="text-white/80 text-[12px]">
              Trial berakhir dalam <strong>{trialDaysLeft} hari</strong>
            </p>
          )}
          {subscription?.premium_end && plan === "premium" && (
            <p className="text-white/80 text-[12px]">
              Aktif hingga{" "}
              <strong>
                {formatDate(subscription.premium_end, "short")}
              </strong>
              {subscription.premium_days_left != null && (
                <> ({subscription.premium_days_left} hari lagi)</>
              )}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#F0EEE9] dark:bg-[#1C1D1A] p-1 rounded-[10px]">
          {(["plan", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "flex-1 py-2 text-[11px] font-semibold rounded-[8px] transition-all",
                activeTab === tab
                  ? "bg-white dark:bg-[#2A2B28] text-[#1A1917] dark:text-[#F0EEE9] shadow-sm"
                  : "text-[#9E9B98] dark:text-[#4A4948]",
              ].join(" ")}
            >
              {tab === "plan" ? "Plan" : "Riwayat Bayar"}
            </button>
          ))}
        </div>

        {activeTab === "plan" && (
          <>
            {/* Feature Comparison */}
            <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5">
              <h3 className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-3">
                Perbandingan Fitur
              </h3>
              <div className="space-y-0">
                {[
                  { label: "Catat transaksi", free: true, premium: true },
                  { label: "Hutang & Piutang", free: true, premium: true },
                  { label: "Recurring", free: true, premium: true },
                  {
                    label: "Akun bank/e-wallet",
                    free: "Max 2",
                    premium: "Unlimited",
                  },
                  {
                    label: "Budget categories",
                    free: "Max 3",
                    premium: "Unlimited",
                  },
                  { label: "Gmail Sync", free: false, premium: true },
                  {
                    label: "Export (Excel/PDF/CSV)",
                    free: false,
                    premium: true,
                  },
                  {
                    label: "Laporan Lengkap",
                    free: "Bulan ini",
                    premium: "Semua",
                  },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-2 text-[11px] py-2 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] last:border-0"
                  >
                    <span className="flex-1 text-[#1A1917] dark:text-[#F0EEE9]">
                      {f.label}
                    </span>
                    <span className="w-14 text-center text-[10px] text-[#9E9B98] dark:text-[#4A4948]">
                      {f.free === true
                        ? "✅"
                        : f.free === false
                        ? "❌"
                        : f.free}
                    </span>
                    <span className="w-16 text-center text-[10px] font-medium text-accent-500 dark:text-accent-dark">
                      {f.premium === true
                        ? "✅"
                        : f.premium === false
                        ? "❌"
                        : f.premium}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-[10px] pt-2">
                  <span className="flex-1" />
                  <span className="w-14 text-center text-[#9E9B98] dark:text-[#4A4948] font-medium">
                    Free
                  </span>
                  <span className="w-16 text-center text-accent-500 dark:text-accent-dark font-semibold">
                    Premium
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing */}
            {plan !== "premium" && (
              <div className="space-y-3">
                <PriceCard
                  type="yearly"
                  price={PREMIUM_PRICES.yearly.amount}
                  label="per tahun"
                  badge="Hemat 30%"
                  onSelect={() => handleCheckout("yearly")}
                  loading={checkout.isPending}
                  recommended
                />
                <PriceCard
                  type="monthly"
                  price={PREMIUM_PRICES.monthly.amount}
                  label="per bulan"
                  badge={null}
                  onSelect={() => handleCheckout("monthly")}
                  loading={checkout.isPending}
                />
              </div>
            )}

            {/* Premium management */}
            {plan === "premium" && subscription && (
              <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
                <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948]">
                  Kelola Premium
                </p>

                {/* Auto-Renew */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
                  <div>
                    <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">
                      Perpanjang Otomatis
                    </p>
                    <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">
                      Bayar otomatis saat masa aktif habis
                    </p>
                  </div>
                  <Toggle
                    checked={subscription.auto_renew}
                    onChange={(v) =>
                      toggleAutoRenew.mutate(v, {
                        onSuccess: () =>
                          showToast(
                            v ? "Auto-renew diaktifkan" : "Auto-renew dinonaktifkan",
                            "success"
                          ),
                      })
                    }
                  />
                </div>

                {/* Extend */}
                {subscription.premium_days_left != null &&
                  subscription.premium_days_left <= 7 && (
                    <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
                      <p className="text-[12px] text-[#C94A1C] dark:text-[#E87340] font-semibold mb-2">
                        ⚠️ Premium berakhir dalam {subscription.premium_days_left} hari
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCheckout("monthly")}
                          disabled={checkout.isPending}
                          className="flex-1 py-2 text-[11px] font-semibold bg-accent-500 dark:bg-accent-dark text-white rounded-[10px] disabled:opacity-50"
                        >
                          +1 Bulan
                        </button>
                        <button
                          onClick={() => handleCheckout("yearly")}
                          disabled={checkout.isPending}
                          className="flex-1 py-2 text-[11px] font-semibold bg-accent-500 dark:bg-accent-dark text-white rounded-[10px] disabled:opacity-50"
                        >
                          +1 Tahun
                        </button>
                      </div>
                    </div>
                  )}

                {/* Cancel */}
                <button
                  type="button"
                  onClick={() => setShowCancel(true)}
                  className="w-full px-4 py-3 text-[12px] text-[#C94A1C] dark:text-[#E87340] hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors text-left"
                >
                  Batalkan Langganan
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "history" && (
          <div className="space-y-2">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-4xl mb-3">🧾</span>
                <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96]">
                  Belum ada riwayat pembayaran
                </p>
              </div>
            ) : (
              payments.map((p) => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                        {formatRupiah(p.amount)}
                      </p>
                      <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">
                        {p.midtrans_order_id}
                      </p>
                    </div>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#9E9B98] dark:text-[#4A4948]">
                    {p.payment_method && (
                      <span className="capitalize">{p.payment_method.replace(/_/g, " ")}</span>
                    )}
                    <span>
                      {formatDate(p.period_start, "short")} →{" "}
                      {formatDate(p.period_end, "short")}
                    </span>
                  </div>
                  {p.paid_at && (
                    <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] mt-1">
                      Dibayar {formatDate(p.paid_at, "short")}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Cancel Confirmation */}
      {showCancel && (
        <ConfirmDialog
          isOpen={showCancel}
          title="Batalkan Langganan?"
          description={`Premium tetap aktif hingga ${
            subscription?.premium_end
              ? formatDate(subscription.premium_end, "short")
              : "berakhir"
          }. Setelah itu fitur premium akan terkunci.`}
          confirmLabel="Ya, Batalkan"
          confirmVariant="danger"
          loading={cancelSub.isPending}
          onConfirm={handleCancel}
          onClose={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}

// ── Price Card ──
function PriceCard({
  type,
  price,
  label,
  badge,
  recommended,
  onSelect,
  loading,
}: {
  type: "monthly" | "yearly";
  price: number;
  label: string;
  badge: string | null;
  recommended?: boolean;
  onSelect: () => void;
  loading: boolean;
}) {
  return (
    <div
      className={[
        "relative bg-white dark:bg-[#1C1D1A] rounded-[14px] border p-3.5",
        recommended
          ? "border-accent-500 dark:border-accent-dark border-2"
          : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]",
      ].join(" ")}
    >
      {badge && (
        <span className="absolute -top-2.5 right-4 bg-[#E87340] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      {recommended && (
        <span className="absolute -top-2.5 left-4 bg-accent-500 dark:bg-accent-dark text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
          Rekomendasi
        </span>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
            {type === "monthly" ? "Premium Bulanan" : "Premium Tahunan"}
          </p>
          <p className="font-mono text-[20px] font-extrabold text-[#1A1917] dark:text-[#F0EEE9]">
            {formatRupiah(price)}
            <span className="text-[11px] font-normal text-[#9E9B98] dark:text-[#4A4948] ml-1">
              {label}
            </span>
          </p>
          {type === "yearly" && (
            <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">
              = {formatRupiah(Math.round(price / 12))}/bulan
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onSelect}
          disabled={loading}
          className="px-4 py-2 rounded-[10px] bg-accent-500 dark:bg-accent-dark text-white text-[11px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "..." : "Pilih"}
        </button>
      </div>
    </div>
  );
}

// ── Payment Status Badge ──
function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-[#1E8A5A]/10 text-[#1E8A5A] dark:bg-[#4CAF7A]/10 dark:text-[#4CAF7A]",
    pending: "bg-[#D4570B]/10 text-[#D4570B] dark:bg-[#E87340]/10 dark:text-[#E87340]",
    failed: "bg-[#C94A1C]/10 text-[#C94A1C] dark:bg-[#E87340]/10 dark:text-[#E87340]",
    expired: "bg-[#78716C]/10 text-[#78716C]",
    refunded: "bg-[#1A56DB]/10 text-[#1A56DB]",
  };

  const labels: Record<string, string> = {
    paid: "Berhasil",
    pending: "Menunggu",
    failed: "Gagal",
    expired: "Kedaluwarsa",
    refunded: "Refund",
  };

  return (
    <span
      className={[
        "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
        styles[status] ?? "bg-gray-100 text-gray-600",
      ].join(" ")}
    >
      {labels[status] ?? status}
    </span>
  );
}
