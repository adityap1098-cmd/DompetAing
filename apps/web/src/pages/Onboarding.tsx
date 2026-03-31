import { useState } from "react";
import { useNavigate } from "react-router-dom";

const slides = [
  {
    emoji: "👛",
    title: "Selamat Datang di DompetAing!",
    description:
      "Catat keuangan pribadi dengan mudah, cepat, dan visual yang nyaman. Gratis 30 hari Trial Premium.",
    color: "bg-[#F7F6F3] dark:bg-[#111210]",
  },
  {
    emoji: "📊",
    title: "Pantau Keuangan Setiap Saat",
    description:
      "Lihat saldo semua akun, total pengeluaran & pemasukan bulan ini, dan perkiraan kekayaan bersih kamu.",
    color: "bg-[#F7F6F3] dark:bg-[#111210]",
  },
  {
    emoji: "📧",
    title: "Auto-Sync dari Email Bank",
    description:
      "Hubungkan Gmail kamu dan DompetAing akan otomatis mendeteksi transaksi dari notifikasi email bank seperti BCA, Mandiri, dan lainnya.",
    color: "bg-[#F7F6F3] dark:bg-[#111210]",
  },
  {
    emoji: "🎯",
    title: "Siap Mulai?",
    description:
      "Tambahkan akun pertama kamu dan mulai mencatat. Ayo kendalikan keuangan kamu sekarang!",
    color: "bg-[#F7F6F3] dark:bg-[#111210]",
  },
];

export function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const isLast = current === slides.length - 1;
  const slide = slides[current];

  function next() {
    if (isLast) {
      navigate("/dashboard", { replace: true });
    } else {
      setCurrent((c) => c + 1);
    }
  }

  function skip() {
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className={`min-h-dvh flex flex-col ${slide.color} transition-colors duration-300`}>
      {/* Skip button */}
      {!isLast && (
        <div className="flex justify-end p-4 safe-pt">
          <button
            onClick={skip}
            className="text-[12px] text-[#9E9B98] dark:text-[#4A4948] font-medium"
          >
            Lewati
          </button>
        </div>
      )}

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <span className="text-8xl mb-8 select-none">{slide.emoji}</span>
        <h2 className="text-[22px] font-extrabold text-[#1A1917] dark:text-[#F0EEE9] mb-3 leading-tight">
          {slide.title}
        </h2>
        <p className="text-[#6B6864] dark:text-[#9E9B96] text-[13px] leading-relaxed max-w-xs">
          {slide.description}
        </p>
      </div>

      {/* Dots + CTA */}
      <div className="px-8 pb-12 safe-pb space-y-6">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={[
                "rounded-full transition-all duration-200",
                i === current
                  ? "w-6 h-2 bg-accent-500 dark:bg-accent-dark"
                  : "w-2 h-2 bg-[#D8D5CF] dark:bg-[#2C2E2A]",
              ].join(" ")}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="w-full py-3.5 rounded-[14px] bg-accent-500 dark:bg-accent-dark text-white text-[14px] font-semibold"
        >
          {isLast ? "Mulai Sekarang 🚀" : "Selanjutnya"}
        </button>
      </div>
    </div>
  );
}
