import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/useSubscription";

export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const { plan, subscription } = useSubscription();

  const orderId = params.get("order_id");
  const transactionStatus = params.get("transaction_status");

  // Force refetch subscription status
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
    queryClient.invalidateQueries({ queryKey: ["subscription", "payments"] });
  }, [queryClient]);

  const isSuccess =
    transactionStatus === "settlement" ||
    transactionStatus === "capture" ||
    plan === "premium";

  const isPending = transactionStatus === "pending";

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 bg-[#F7F6F3] dark:bg-[#111210]">
      <div className="text-center max-w-sm">
        {isSuccess ? (
          <>
            <span className="text-6xl block mb-6">🎉</span>
            <h1 className="text-[22px] font-extrabold text-[#1A1917] dark:text-[#F0EEE9] mb-2">
              Pembayaran Berhasil!
            </h1>
            <p className="text-[13px] text-[#6B6864] dark:text-[#9E9B96] mb-1">
              Selamat! Kamu sekarang pengguna <strong className="text-accent-500 dark:text-accent-dark">Premium</strong> ✨
            </p>
            {subscription?.premium_end && (
              <p className="text-[11px] text-[#9E9B98] dark:text-[#4A4948] mb-8">
                Aktif hingga {new Date(subscription.premium_end).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            <div className="space-y-3">
              <p className="text-[11px] text-[#6B6864] dark:text-[#9E9B96] font-medium">
                Fitur yang sekarang bisa kamu pakai:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["📧 Gmail Sync", "📤 Export Data", "📊 Laporan Lengkap", "🏦 Akun Unlimited", "📋 Budget Unlimited"].map(
                  (f) => (
                    <span
                      key={f}
                      className="text-[10px] bg-accent-500/10 dark:bg-accent-dark/10 text-accent-500 dark:text-accent-dark px-2.5 py-1 rounded-full font-medium"
                    >
                      {f}
                    </span>
                  )
                )}
              </div>
            </div>
          </>
        ) : isPending ? (
          <>
            <span className="text-6xl block mb-6">⏳</span>
            <h1 className="text-[22px] font-extrabold text-[#1A1917] dark:text-[#F0EEE9] mb-2">
              Menunggu Pembayaran
            </h1>
            <p className="text-[13px] text-[#6B6864] dark:text-[#9E9B96] mb-1">
              Pembayaran kamu sedang diproses. Premium akan aktif setelah pembayaran dikonfirmasi.
            </p>
            {orderId && (
              <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] font-mono mb-8">
                Order: {orderId}
              </p>
            )}
          </>
        ) : (
          <>
            <span className="text-6xl block mb-6">😔</span>
            <h1 className="text-[22px] font-extrabold text-[#1A1917] dark:text-[#F0EEE9] mb-2">
              Pembayaran Gagal
            </h1>
            <p className="text-[13px] text-[#6B6864] dark:text-[#9E9B96] mb-8">
              Terjadi masalah dengan pembayaran kamu. Silakan coba lagi.
            </p>
          </>
        )}

        <div className="mt-8 space-y-3">
          <Link
            to="/dashboard"
            className="block w-full py-3 bg-accent-500 dark:bg-accent-dark text-white rounded-[12px] text-[13px] font-semibold text-center hover:opacity-90 transition-opacity"
          >
            Ke Dashboard
          </Link>
          {!isSuccess && (
            <Link
              to="/subscription"
              className="block w-full py-3 bg-white dark:bg-[#1C1D1A] text-[#1A1917] dark:text-[#F0EEE9] rounded-[12px] text-[13px] font-semibold text-center border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]"
            >
              Coba Lagi
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
