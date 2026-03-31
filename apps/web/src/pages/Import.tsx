import { useState, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { showToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { formatRupiah } from "@/lib/format";

interface ImportPreview {
  valid: number;
  invalid: number;
  rows: Array<{
    date: string;
    description: string;
    amount: number;
    type: "expense" | "income";
    category?: string;
    account?: string;
    error?: string;
  }>;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

const CSV_TEMPLATE = `date,description,amount,type,category,account
2026-03-01,Gaji Bulanan,8000000,income,Pemasukan,BCA Utama
2026-03-02,Makan Siang,50000,expense,Makanan & Minuman,BCA Utama
2026-03-03,Transfer ke Mandiri,500000,transfer,,BCA Utama`;

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".csv")) {
      showToast("Hanya file CSV yang didukung", "error");
      return;
    }
    setFile(f);
    setPreview(null);
    setResult(null);
  }

  async function handlePreview() {
    if (!file) return;
    setIsPreviewing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "/v1"}/import/preview`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const json = await res.json() as { success: boolean; data: ImportPreview; error: string | null };
      if (!json.success) throw new Error(json.error ?? "Preview gagal");
      setPreview(json.data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Preview gagal", "error");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "/v1"}/import/csv`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const json = await res.json() as { success: boolean; data: ImportResult; error: string | null };
      if (!json.success) throw new Error(json.error ?? "Import gagal");
      setResult(json.data);
      setFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      showToast(`${json.data.imported} transaksi berhasil diimport`, "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Import gagal", "error");
    } finally {
      setIsImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dompetaing-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Header title="Import CSV" />

      <div className="px-[17px] pt-4 pb-24 space-y-3">
        {/* Template download */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-4">
          <h3 className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-2">
            Format CSV
          </h3>
          <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mb-3">
            File CSV harus memiliki kolom: <code className="bg-[#F0EEE9] dark:bg-[#242522] px-1.5 py-0.5 rounded text-[9px] font-mono">date, description, amount, type, category, account</code>
          </p>
          <div className="bg-[#F7F6F3] dark:bg-[#111210] rounded-[10px] p-3 mb-3 overflow-x-auto">
            <pre className="text-[9px] font-mono text-[#6B6864] dark:text-[#9E9B96] whitespace-pre">
              {CSV_TEMPLATE}
            </pre>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="text-[11px] font-semibold text-accent-500 dark:text-accent-dark"
          >
            📥 Download Template
          </button>
        </div>

        {/* File upload */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-4">
          <h3 className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-3">
            Upload File
          </h3>

          <label className="block w-full cursor-pointer">
            <div className={[
              "border-2 border-dashed rounded-[12px] p-6 text-center transition-colors",
              file
                ? "border-accent-500 dark:border-accent-dark bg-accent-500/5 dark:bg-accent-dark/5"
                : "border-[rgba(0,0,0,0.12)] dark:border-[rgba(255,255,255,0.1)] hover:border-accent-500/50 dark:hover:border-accent-dark/50",
            ].join(" ")}>
              {file ? (
                <>
                  <p className="text-2xl mb-1">📄</p>
                  <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">{file.name}</p>
                  <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl mb-2">📤</p>
                  <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96]">
                    Pilih file CSV
                  </p>
                  <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] mt-1">
                    Maksimal 5MB
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {file && !preview && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="flex-1 py-2.5 rounded-[10px] bg-[#F0EEE9] dark:bg-[#242522] text-[12px] font-semibold text-[#6B6864] dark:text-[#9E9B96]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={isPreviewing}
                className="flex-1 py-2.5 rounded-[10px] bg-accent-500 dark:bg-accent-dark text-white text-[12px] font-semibold disabled:opacity-50"
              >
                {isPreviewing ? "Memuat..." : "Preview Data"}
              </button>
            </div>
          )}
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">
                Preview <span className="font-mono text-[#6B6864] dark:text-[#9E9B96]">({preview.valid} valid, {preview.invalid} error)</span>
              </h3>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto mb-3">
              {preview.rows.slice(0, 50).map((row, i) => (
                <div
                  key={i}
                  className={[
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[10px]",
                    row.error
                      ? "bg-[#C94A1C]/8 dark:bg-[#E87340]/8 text-[#C94A1C] dark:text-[#E87340]"
                      : "bg-[#F7F6F3] dark:bg-[#111210] text-[#6B6864] dark:text-[#9E9B96]",
                  ].join(" ")}
                >
                  {row.error ? (
                    <>
                      <span>❌</span>
                      <span className="flex-1 truncate">{row.error}</span>
                    </>
                  ) : (
                    <>
                      <span>{row.type === "income" ? "📈" : "📉"}</span>
                      <span className="flex-1 truncate text-[#1A1917] dark:text-[#F0EEE9]">
                        {row.description}
                      </span>
                      <span className={`font-mono font-semibold ${row.type === "income" ? "text-[#1E8A5A] dark:text-[#4CAF7A]" : "text-[#C94A1C] dark:text-[#E87340]"}`}>
                        {row.type === "income" ? "+" : "-"}{formatRupiah(row.amount)}
                      </span>
                      <span className="text-[#9E9B98] dark:text-[#4A4948]">{row.date}</span>
                    </>
                  )}
                </div>
              ))}
              {preview.rows.length > 50 && (
                <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948] text-center pt-1">
                  dan {preview.rows.length - 50} baris lainnya...
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPreview(null); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="flex-1 py-2.5 rounded-[10px] bg-[#F0EEE9] dark:bg-[#242522] text-[12px] font-semibold text-[#6B6864] dark:text-[#9E9B96]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || preview.valid === 0}
                className="flex-1 py-2.5 rounded-[10px] bg-accent-500 dark:bg-accent-dark text-white text-[12px] font-semibold disabled:opacity-50"
              >
                {isImporting ? "Mengimport..." : `Import ${preview.valid} Transaksi`}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-[#1E8A5A]/8 dark:bg-[#4CAF7A]/8 rounded-[14px] border border-[#1E8A5A]/20 dark:border-[#4CAF7A]/20 p-4 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-[13px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">
              Import Selesai!
            </p>
            <p className="text-[11px] text-[#6B6864] dark:text-[#9E9B96] mt-1">
              {result.imported} transaksi berhasil diimport
              {result.skipped > 0 && `, ${result.skipped} dilewati`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
