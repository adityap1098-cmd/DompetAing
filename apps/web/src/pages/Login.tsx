import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { initiateGoogleLogin } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F7F6F3] dark:bg-[#111210]">
        <div className="animate-spin h-8 w-8 border-2 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const errorMessages: Record<string, string> = {
    oauth_failed: "Login gagal. Silakan coba lagi.",
    email_not_verified: "Email Google kamu belum terverifikasi.",
    auth_failed: "Autentikasi gagal. Silakan coba lagi.",
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F7F6F3] dark:bg-[#111210] px-6">
      {/* Logo + Branding */}
      <div className="mb-10 text-center">
        <div className="text-6xl mb-4">👛</div>
        <h1 className="text-[28px] font-extrabold text-[#1A1917] dark:text-[#F0EEE9] mb-1">
          DompetAing
        </h1>
        <p className="text-[#6B6864] dark:text-[#9E9B96] text-[13px]">
          Catat keuangan, hidup lebih tenang
        </p>
      </div>

      {/* Features */}
      <div className="w-full max-w-xs mb-8 space-y-3">
        {[
          { icon: "📊", text: "Pantau pemasukan & pengeluaran" },
          { icon: "🎯", text: "Budget per kategori" },
          { icon: "📧", text: "Auto-sync dari email bank (Gmail)" },
          { icon: "🤝", text: "Kelola hutang & piutang" },
        ].map((f) => (
          <div key={f.text} className="flex items-center gap-3">
            <span className="text-lg">{f.icon}</span>
            <span className="text-[12px] text-[#6B6864] dark:text-[#9E9B96]">{f.text}</span>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="w-full max-w-xs mb-4 bg-[#C94A1C]/8 dark:bg-[#E87340]/8 border border-[#C94A1C]/20 dark:border-[#E87340]/20 rounded-[12px] px-4 py-3">
          <p className="text-[#C94A1C] dark:text-[#E87340] text-[12px] text-center">
            {errorMessages[error] ?? "Terjadi kesalahan."}
          </p>
        </div>
      )}

      {/* Login Button */}
      <div className="w-full max-w-xs">
        <button
          type="button"
          onClick={initiateGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.12)] dark:border-[rgba(255,255,255,0.1)] rounded-[14px] px-5 py-3.5 text-[13px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] shadow-sm hover:bg-[#F7F6F3] dark:hover:bg-[#242522] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Lanjutkan dengan Google
        </button>
        <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] text-center mt-4">
          Trial 30 hari gratis. Tidak perlu kartu kredit.
        </p>
        <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] text-center mt-2">
          <a href="/privacy" className="underline hover:text-accent-500 dark:hover:text-accent-dark">
            Kebijakan Privasi
          </a>
        </p>
      </div>
    </div>
  );
}
