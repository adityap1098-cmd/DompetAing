import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { showToast } from "@/components/ui/Toast";
import { downloadExport } from "@/hooks/useReports";
import { useSubscription } from "@/hooks/useSubscription";

type Format = "csv" | "excel" | "pdf";

const FORMAT_OPTIONS: { key: Format; label: string; icon: string; desc: string }[] = [
  { key: "csv", label: "CSV", icon: "📄", desc: "Kompatibel dengan Google Sheets & Excel" },
  { key: "excel", label: "Excel (.xlsx)", icon: "📊", desc: "Format Microsoft Excel dengan 2 sheet" },
  { key: "pdf", label: "PDF / Print", icon: "🖨️", desc: "Laporan siap cetak, buka di browser" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function ExportPage() {
  const { plan } = useSubscription();
  const isLocked = plan === "free";

  const [format, setFormat] = useState<Format>("csv");
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(todayStr());
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (!dateFrom || !dateTo) {
      showToast("Isi tanggal dari dan sampai", "error");
      return;
    }
    if (dateFrom > dateTo) {
      showToast("Tanggal dari tidak boleh setelah tanggal sampai", "error");
      return;
    }
    setLoading(true);
    try {
      await downloadExport(format, { date_from: dateFrom, date_to: dateTo });
      if (format !== "pdf") showToast("Download berhasil", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Export gagal", "error");
    } finally {
      setLoading(false);
    }
  }

  if (isLocked) {
    return (
      <div className="flex flex-col pb-24">
        <Header title="Export" />
        <div className="px-[17px] pt-4">
          <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-6">
            <div className="flex flex-col items-center text-center">
              <span className="text-5xl mb-4">🔒</span>
              <h2 className="text-[14px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-2">Fitur Premium</h2>
              <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96] mb-5">
                Export data (CSV, Excel, PDF) tersedia untuk pengguna <strong>Premium</strong> dan <strong>Trial</strong>.
              </p>
              <Link
                to="/subscription"
                className="px-5 py-2.5 bg-accent-500 dark:bg-accent-dark text-white text-[12px] font-semibold rounded-[12px]"
              >
                Lihat Paket Premium
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24">
      <Header title="Export Data" />

      <div className="px-[17px] pt-4 space-y-3">
        {/* Format selector */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948] mb-3">Format</p>
          <div className="space-y-2">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFormat(f.key)}
                className={[
                  "w-full flex items-center gap-3 p-3 rounded-[12px] border transition-all text-left",
                  format === f.key
                    ? "border-accent-500 dark:border-accent-dark bg-accent-500/5 dark:bg-accent-dark/5"
                    : "border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]",
                ].join(" ")}
              >
                <span className="text-xl shrink-0">{f.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-semibold ${format === f.key ? "text-accent-500 dark:text-accent-dark" : "text-[#1A1917] dark:text-[#F0EEE9]"}`}>
                    {f.label}
                  </p>
                  <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">{f.desc}</p>
                </div>
                <div className={[
                  "w-4 h-4 rounded-full border-2 shrink-0",
                  format === f.key
                    ? "border-accent-500 dark:border-accent-dark bg-accent-500 dark:bg-accent-dark"
                    : "border-[rgba(0,0,0,0.2)] dark:border-[rgba(255,255,255,0.2)]",
                ].join(" ")} />
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948] mb-3">Rentang Tanggal</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#6B6864] dark:text-[#9E9B96] mb-1">Dari</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || todayStr()}
                className="w-full px-3 py-2 rounded-[10px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-[#F7F6F3] dark:bg-[#111210] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#6B6864] dark:text-[#9E9B96] mb-1">Sampai</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom}
                max={todayStr()}
                className="w-full px-3 py-2 rounded-[10px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-[#F7F6F3] dark:bg-[#111210] text-[12px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick range shortcuts */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: "Bulan ini", from: firstDayOfMonth(), to: todayStr() },
            { label: "3 bulan", from: (() => { const d = new Date(); d.setMonth(d.getMonth() - 2); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; })(), to: todayStr() },
            { label: "Tahun ini", from: `${new Date().getFullYear()}-01-01`, to: todayStr() },
          ].map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => { setDateFrom(r.from); setDateTo(r.to); }}
              className="px-3 py-1.5 text-[10px] font-semibold rounded-[9px] bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96] hover:border-accent-500 dark:hover:border-accent-dark hover:text-accent-500 dark:hover:text-accent-dark transition-colors"
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Download button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          className="w-full py-3 rounded-[12px] bg-accent-500 dark:bg-accent-dark text-white text-[13px] font-semibold disabled:opacity-50"
        >
          {loading ? "Memproses..." : format === "pdf" ? "Buka & Cetak sebagai PDF" : `Download ${format.toUpperCase()}`}
        </button>

        {format === "pdf" && (
          <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] text-center">
            Laporan akan terbuka di tab baru. Gunakan Ctrl+P (atau Share → Print) untuk simpan sebagai PDF.
          </p>
        )}
      </div>
    </div>
  );
}
