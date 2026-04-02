import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Toggle } from "@/components/ui/Toggle";
import { CategoryPicker } from "@/components/ui/CategoryPicker";
import { AccountPicker } from "@/components/ui/AccountPicker";
import { showToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/format";
import { useSubscription } from "@/hooks/useSubscription";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import {
  useGmailStatus,
  usePendingReviews,
  useGmailConnect,
  useGmailDisconnect,
  useGmailSync,
  useToggleSource,
  useApproveReview,
  useSkipReview,
  useApproveAll,
  useUpdateGmailSettings,
  type PendingReview,
  type ApprovePayload,
  type MarketplaceSource,
} from "@/hooks/useGmail";

// ── UpgradePrompt ──

function UpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <span className="text-5xl mb-4">📧</span>
      <h2 className="text-[18px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-2">Gmail Sync</h2>
      <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96] mb-6">
        Otomatis import transaksi dari email bank kamu. Fitur ini tersedia untuk
        pengguna Premium.
      </p>
      <Link
        to="/subscription"
        className="px-5 py-2.5 bg-accent-500 dark:bg-accent-dark text-white text-[12px] font-semibold rounded-[12px]"
      >
        ✨ Upgrade ke Premium
      </Link>
    </div>
  );
}

// ── NotConnected ──

const ALL_BANKS = [
  { name: "BCA", color: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  { name: "Mandiri", color: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300" },
  { name: "BRI", color: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
  { name: "BNI", color: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300" },
  { name: "Jago", color: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  { name: "GoPay", color: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
  { name: "OVO", color: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
  { name: "DANA", color: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-300" },
  { name: "ShopeePay", color: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300" },
  { name: "SeaBank", color: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-300" },
];

const BANK_COLORS: Record<string, string> = {
  ...Object.fromEntries(ALL_BANKS.map((b) => [b.name, `${b.color} ${b.text}`])),
  // Marketplace colors
  Shopee: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  Tokopedia: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  Grab: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  Gojek: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  Traveloka: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
};

const SUPPORTED_BANK_LIST = [
  { key: "Jago",      label: "Bank Jago",       colorClass: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
  { key: "BCA",       label: "BCA",             colorClass: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  { key: "Mandiri",   label: "Mandiri / Livin", colorClass: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" },
  { key: "BRI",       label: "BRI / BRImo",     colorClass: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
  { key: "BNI",       label: "BNI",             colorClass: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
  { key: "GoPay",     label: "GoPay",           colorClass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
  { key: "OVO",       label: "OVO",             colorClass: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
  { key: "DANA",      label: "DANA",            colorClass: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300" },
  { key: "ShopeePay", label: "ShopeePay",       colorClass: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
  { key: "SeaBank",   label: "SeaBank",         colorClass: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300" },
];

const SUPPORTED_MARKETPLACE_LIST = [
  { key: "Shopee",     label: "Shopee",          colorClass: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300", icon: "🛒" },
  { key: "Tokopedia",  label: "Tokopedia",       colorClass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300", icon: "🏪" },
  { key: "Grab",       label: "Grab",            colorClass: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300", icon: "🚗" },
  { key: "Gojek",      label: "Gojek",           colorClass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300", icon: "🏍️" },
  { key: "Traveloka",  label: "Traveloka",       colorClass: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300", icon: "✈️" },
];

function NotConnected({ onConnect, isLoading }: { onConnect: () => void; isLoading: boolean }) {
  return (
    <div className="px-[17px] pt-4 pb-24 space-y-3">
      <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-4">
        <div className="flex flex-col items-center text-center py-4 gap-3">
          <span className="text-5xl">📧</span>
          <h3 className="text-[14px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">
            Hubungkan Gmail kamu
          </h3>
          <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96]">
            Scan email notifikasi dari bank & dompet digital secara otomatis — tanpa input manual.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-4">
        <h4 className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-3">
          Bank & dompet digital yang didukung
        </h4>
        <div className="grid grid-cols-5 gap-2">
          {ALL_BANKS.map((b) => (
            <div
              key={b.name}
              className={`rounded-[8px] p-2 text-center text-[9px] font-semibold ${b.color} ${b.text}`}
            >
              {b.name}
            </div>
          ))}
        </div>
        <h4 className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mt-4 mb-3">
          Marketplace & layanan yang didukung
        </h4>
        <div className="grid grid-cols-5 gap-2">
          {SUPPORTED_MARKETPLACE_LIST.map((mp) => (
            <div
              key={mp.key}
              className={`rounded-[8px] p-2 text-center text-[9px] font-semibold ${mp.colorClass}`}
            >
              {mp.icon} {mp.key}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-4">
        <h4 className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-2">
          Cara kerja
        </h4>
        <ol className="text-[12px] text-[#6B6864] dark:text-[#9E9B96] space-y-1.5 list-decimal list-inside">
          <li>Hubungkan akun Gmail (hanya akses baca email)</li>
          <li>DompetAing scan email dari bank selama 6 bulan</li>
          <li>Transaksi terdeteksi masuk ke <strong>Review</strong></li>
          <li>Edit jika perlu, lalu klik Simpan untuk menyimpan</li>
        </ol>
        <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] mt-3">
          🔒 Hanya izin baca email — tidak ada email yang dikirim atau dihapus.
        </p>
      </div>

      <button
        type="button"
        onClick={onConnect}
        disabled={isLoading}
        className="w-full py-3 rounded-[12px] bg-accent-500 dark:bg-accent-dark text-white text-[13px] font-semibold disabled:opacity-50"
      >
        {isLoading ? "Menghubungkan..." : "Hubungkan Gmail"}
      </button>
    </div>
  );
}

// ── PendingItem ──

function PendingItem({
  review,
  onApprove,
  onSkip,
  isApproving,
}: {
  review: PendingReview;
  onApprove: (payload: ApprovePayload) => void;
  onSkip: (id: string) => void;
  isApproving: boolean;
}) {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();

  const [isEditing, setIsEditing] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const [form, setForm] = useState<ApprovePayload & { sub_category_id?: string }>({
    amount: review.parsed_amount ?? 0,
    type: review.parsed_type ?? "expense",
    category_id: review.suggested_category?.id ?? "",
    sub_category_id: "",
    account_id: review.suggested_account?.id ?? "",
    description: review.parsed_merchant
      ? `${review.bank_name ?? ""}: ${review.parsed_merchant}`.trim()
      : review.raw_subject,
    date: review.parsed_date
      ? new Date(review.parsed_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  });

  // Fill account_id from first account when accounts load and no suggestion
  useEffect(() => {
    if (!form.account_id && accounts.length > 0) {
      setForm((prev) => ({ ...prev, account_id: accounts[0].id }));
    }
  }, [accounts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const availableCategories = categories.filter((c) =>
    form.type === "income"
      ? c.type === "income" || c.type === "both"
      : c.type === "expense" || c.type === "both"
  );

  const selectedCategory = availableCategories.find((c) => c.id === form.category_id);
  const selectedAccount = accounts.find((a) => a.id === form.account_id);
  const selectedSubCategory = selectedCategory?.sub_categories?.find(
    (s) => s.id === form.sub_category_id
  );

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const bankColor =
    review.bank_name
      ? (BANK_COLORS[review.bank_name] ?? "bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96]")
      : "bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96]";

  const fieldBtn = [
    "flex items-center gap-3 w-full px-3 py-2.5 rounded-[12px] text-left",
    "bg-[#F0EEE9] dark:bg-[#242522]",
    "border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
    "hover:bg-[#E8E6E0] dark:hover:bg-[#2C2D2A] transition-colors",
  ].join(" ");

  const inputCls = [
    "w-full px-3 py-2.5 rounded-[12px] text-[12px]",
    "bg-[#F0EEE9] dark:bg-[#242522]",
    "border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
    "text-[#1A1917] dark:text-[#F0EEE9]",
    "placeholder:text-[#9E9B98] dark:placeholder:text-[#4A4948]",
    "focus:outline-none focus:border-[var(--accent)]",
  ].join(" ");

  const labelCls = "block text-[9px] font-bold text-[#9E9B98] dark:text-[#4A4948] mb-1 uppercase tracking-[0.06em]";

  return (
    <div className="border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] rounded-[14px] bg-white dark:bg-[#1C1D1A] p-3 space-y-2.5">
      {/* Header: merchant / bank / date / amount */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] truncate">
            {review.parsed_merchant ?? review.raw_subject}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {review.bank_name && (
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${bankColor}`}>
                {review.bank_name}
              </span>
            )}
            <span className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">
              {review.parsed_date
                ? new Date(review.parsed_date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })
                : "—"}
            </span>
            {review.suggested_category && !isEditing && (
              <span className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">
                {review.suggested_category.icon} {review.suggested_category.name}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {review.parsed_amount ? (
            <p
              className={`text-[12px] font-bold font-mono ${
                review.parsed_type === "income"
                  ? "text-[#1E8A5A] dark:text-[#4CAF7A]"
                  : "text-[#C94A1C] dark:text-[#E87340]"
              }`}
            >
              {review.parsed_type === "income" ? "+" : "-"}
              {formatRupiah(review.parsed_amount)}
            </p>
          ) : (
            <p className="text-[12px] text-[#9E9B98] dark:text-[#4A4948]">—</p>
          )}
        </div>
      </div>

      {/* Edit fields — bottom-sheet picker style */}
      {isEditing && (
        <div className="space-y-2.5 pt-2 border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          {/* Type tabs */}
          <div className="flex rounded-[10px] overflow-hidden bg-[#F0EEE9] dark:bg-[#242522] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { set("type", t); set("category_id", ""); set("sub_category_id", ""); }}
                className={[
                  "flex-1 py-2 text-[11px] font-bold transition-all",
                  form.type === t
                    ? t === "expense"
                      ? "bg-[#C94A1C] dark:bg-[#E87340] text-white rounded-[8px] mx-0.5 my-0.5"
                      : "bg-[#1E8A5A] dark:bg-[#4CAF7A] text-white rounded-[8px] mx-0.5 my-0.5"
                    : "text-[#9E9B98] dark:text-[#4A4948]",
                ].join(" ")}
              >
                {t === "expense" ? "Pengeluaran" : "Pemasukan"}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className={labelCls}>Nominal</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.amount ? Number(form.amount).toLocaleString("id-ID") : ""}
              onChange={(e) => set("amount", Number(e.target.value.replace(/\D/g, "")))}
              placeholder="0"
              className={inputCls + " font-mono font-semibold"}
            />
          </div>

          {/* Account picker button */}
          <div>
            <label className={labelCls}>Akun</label>
            <button type="button" onClick={() => setShowAccountPicker(true)} className={fieldBtn}>
              {selectedAccount ? (
                <>
                  <div
                    className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[12px] shrink-0"
                    style={{ backgroundColor: `${selectedAccount.color}1A` }}
                  >
                    {selectedAccount.icon}
                  </div>
                  <span className="flex-1 text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                    {selectedAccount.name}
                  </span>
                </>
              ) : (
                <span className="text-[12px] text-[#9E9B98] dark:text-[#4A4948]">Pilih akun...</span>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9E9B98] shrink-0">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Category picker button */}
          <div>
            <label className={labelCls}>Kategori</label>
            <button type="button" onClick={() => setShowCategoryPicker(true)} className={fieldBtn}>
              {selectedCategory ? (
                <>
                  <div
                    className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[12px] shrink-0"
                    style={{ backgroundColor: `${selectedCategory.color}1A` }}
                  >
                    {selectedCategory.icon}
                  </div>
                  <span className="flex-1 text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                    {selectedCategory.name}
                    {selectedSubCategory ? ` · ${selectedSubCategory.name}` : ""}
                  </span>
                </>
              ) : (
                <span className="text-[12px] text-[#9E9B98] dark:text-[#4A4948]">Pilih kategori...</span>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9E9B98] shrink-0">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Keterangan</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Deskripsi"
              className={inputCls}
            />
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>Tanggal</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Pickers */}
          <CategoryPicker
            isOpen={showCategoryPicker}
            onClose={() => setShowCategoryPicker(false)}
            categories={availableCategories}
            selectedId={form.category_id ?? ""}
            onSelect={(catId, subId) => {
              set("category_id", catId);
              set("sub_category_id", subId ?? "");
            }}
          />
          <AccountPicker
            isOpen={showAccountPicker}
            onClose={() => setShowAccountPicker(false)}
            accounts={accounts}
            selectedId={form.account_id}
            onSelect={(id) => set("account_id", id)}
          />
        </div>
      )}

      {/* Action buttons */}
      {isEditing ? (
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 py-2.5 rounded-[10px] bg-[#F0EEE9] dark:bg-[#242522] text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96]"
          >
            Batal
          </button>
          <button
            onClick={() => {
              const payload: ApprovePayload = { ...form };
              if (form.sub_category_id) {
                (payload as ApprovePayload & { sub_category_id?: string }).sub_category_id = form.sub_category_id;
              }
              onApprove(payload);
              setIsEditing(false);
            }}
            disabled={!form.account_id || !form.amount || isApproving}
            className="flex-[2] py-2.5 rounded-[10px] text-white text-[11px] font-semibold disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Simpan
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 py-2.5 rounded-[10px] bg-[#F0EEE9] dark:bg-[#242522] text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96]"
          >
            Edit
          </button>
          <button
            onClick={() => onSkip(review.id)}
            className="flex-1 py-2.5 rounded-[10px] bg-[#F0EEE9] dark:bg-[#242522] text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96]"
          >
            Lewati
          </button>
          <button
            onClick={() => onApprove(form)}
            disabled={!form.account_id || !form.amount || isApproving}
            className="flex-[2] py-2.5 rounded-[10px] text-white text-[11px] font-semibold disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Simpan
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ──

export function GmailSyncPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"review" | "sources" | "settings">("review");

  const { canUse } = useSubscription();
  const { data: status, isLoading: statusLoading } = useGmailStatus();
  const { data: pending = [], isLoading: pendingLoading } = usePendingReviews();

  const { mutate: connect, isPending: connecting } = useGmailConnect();
  const { mutate: disconnect, isPending: disconnecting } = useGmailDisconnect();
  const { mutate: sync, isPending: syncing } = useGmailSync();
  const { mutate: toggleSource } = useToggleSource();
  const { mutate: approve, isPending: approving } = useApproveReview();
  const { mutate: skip } = useSkipReview();
  const { mutate: approveAll, isPending: approvingAll } = useApproveAll();
  const { mutate: updateSettings } = useUpdateGmailSettings();

  // Handle OAuth redirect result
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "true") {
      showToast("Gmail berhasil terhubung!", "success");
      sync();
    }
    if (error) {
      showToast("Gagal menghubungkan Gmail. Coba lagi.", "error");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!canUse("gmail_sync")) return <UpgradePrompt />;

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div>
        <Header
          title="Gmail Sync"
          left={
            <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-[#6B6864] dark:text-[#9E9B96] text-base font-semibold">
              ‹
            </button>
          }
        />
        <NotConnected onConnect={() => connect()} isLoading={connecting} />
      </div>
    );
  }

  const tabs = [
    { id: "review" as const, label: "Review", badge: status.pending_count },
    { id: "sources" as const, label: "Sumber" },
    { id: "settings" as const, label: "Pengaturan" },
  ];

  return (
    <div>
      <Header
        title="Gmail Sync"
        left={
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-[#9E9B98] dark:text-[#4A4948]">
            ‹
          </button>
        }
      />

      <div className="px-[17px] pt-3 pb-24 space-y-3">
        {/* Status card */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1E8A5A] animate-pulse" />
              <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                Terhubung
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm("Putuskan koneksi Gmail?")) {
                  disconnect();
                }
              }}
              disabled={disconnecting}
              className="text-[11px] text-[#C94A1C] dark:text-[#E87340] font-semibold"
            >
              Putuskan
            </button>
          </div>
          <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mb-3">{status.email}</p>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-[#F7F6F3] dark:bg-[#111210] rounded-[10px] p-2">
              <p className="text-[16px] font-bold font-mono text-[#1A1917] dark:text-[#F0EEE9]">
                {status.transactions_detected}
              </p>
              <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948]">Terdeteksi</p>
            </div>
            <div className="bg-[#F7F6F3] dark:bg-[#111210] rounded-[10px] p-2">
              <p className="text-[16px] font-bold font-mono text-amber-600 dark:text-amber-400">
                {status.pending_count}
              </p>
              <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948]">Pending</p>
            </div>
            <div className="bg-[#F7F6F3] dark:bg-[#111210] rounded-[10px] p-2">
              <p className="text-[16px] font-bold font-mono text-blue-600 dark:text-blue-400">
                {status.enriched_count}
              </p>
              <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948]">Diperkaya</p>
            </div>
            <div className="bg-[#F7F6F3] dark:bg-[#111210] rounded-[10px] p-2">
              <p className="text-[16px] font-bold font-mono text-accent-500 dark:text-accent-dark">
                {status.accuracy}%
              </p>
              <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948]">Akurasi</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
            <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">
              {status.last_sync
                ? `Sync: ${new Date(status.last_sync).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : "Belum pernah sync"}
            </p>
            <button
              onClick={() => {
                sync(undefined, {
                  onSuccess: (result) => {
                    const parts = [`${result.transactions_found} transaksi ditemukan`];
                    if (result.enriched > 0) parts.push(`${result.enriched} diperkaya`);
                    showToast(`Sync selesai — ${parts.join(", ")}`, "success");
                  },
                  onError: () => showToast("Sync gagal", "error"),
                });
              }}
              disabled={syncing}
              className="text-[11px] font-semibold text-accent-500 dark:text-accent-dark disabled:opacity-50"
            >
              {syncing ? "Menyinkronkan..." : "Sync sekarang"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex-1 py-1.5 rounded-[9px] text-[10px] font-semibold transition-colors relative",
                activeTab === tab.id
                  ? "bg-accent-500 dark:bg-accent-dark text-white"
                  : "bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96]",
              ].join(" ")}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C94A1C] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Review */}
        {activeTab === "review" && (
          <div className="space-y-3">
            {pendingLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-accent-500 border-t-transparent rounded-full" />
              </div>
            ) : pending.length === 0 ? (
              <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-6 text-center">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">Semua transaksi sudah ditinjau</p>
                <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-1">Sync ulang untuk mencari transaksi baru</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                    {pending.length} menunggu review
                  </p>
                  <button
                    onClick={() => {
                      approveAll(undefined, {
                        onSuccess: (result) => {
                          showToast(
                            `${result.approved} transaksi disetujui, ${result.skipped} dilewati`,
                            "success"
                          );
                        },
                      });
                    }}
                    disabled={approvingAll}
                    className="text-[11px] font-semibold text-accent-500 dark:text-accent-dark disabled:opacity-50"
                  >
                    {approvingAll ? "Menyetujui..." : "Setujui Semua"}
                  </button>
                </div>

                {pending.map((review) => (
                  <PendingItem
                    key={review.id}
                    review={review}
                    onApprove={(payload) => {
                      approve(
                        { id: review.id, payload },
                        {
                          onSuccess: () => showToast("Transaksi disimpan", "success"),
                          onError: () => showToast("Gagal menyimpan transaksi", "error"),
                        }
                      );
                    }}
                    onSkip={(id) => {
                      skip(id, {
                        onSuccess: () => showToast("Transaksi dilewati", "success"),
                      });
                    }}
                    isApproving={approving}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Tab: Sources */}
        {activeTab === "sources" && (
          <div className="space-y-3">
            {/* Bank sources */}
            <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
              <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948]">
                Bank & Dompet Digital
              </p>
              <div className="divide-y divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
                {SUPPORTED_BANK_LIST.map((bank) => {
                  const source = status.sources.find((s) => s.bank_name === bank.key);
                  return (
                    <div key={bank.key} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className={`w-8 h-8 rounded-[9px] flex items-center justify-center text-[9px] font-bold shrink-0 ${
                          source
                            ? bank.colorClass
                            : "bg-[#F0EEE9] dark:bg-[#242522] text-[#9E9B98] dark:text-[#4A4948]"
                        }`}
                      >
                        {bank.key.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-semibold ${
                          source ? "text-[#1A1917] dark:text-[#F0EEE9]" : "text-[#9E9B98] dark:text-[#4A4948]"
                        }`}>
                          {bank.label}
                        </p>
                        {source ? (
                          <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5 truncate">
                            {source.total_detected} email · {source.sender_email}
                          </p>
                        ) : (
                          <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] mt-0.5">
                            Belum terdeteksi
                          </p>
                        )}
                      </div>
                      {source ? (
                        <Toggle
                          checked={source.is_active}
                          onChange={() => toggleSource(source.id)}
                        />
                      ) : (
                        <div className="w-10 h-5 rounded-full bg-[#F0EEE9] dark:bg-[#242522] opacity-40 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Marketplace sources */}
            <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
              <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948]">
                Marketplace & Layanan
              </p>
              <div className="divide-y divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
                {SUPPORTED_MARKETPLACE_LIST.map((mp) => {
                  const source = status.marketplace_sources.find(
                    (s) => s.marketplace_name === mp.key
                  );
                  return (
                    <div key={mp.key} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className={`w-8 h-8 rounded-[9px] flex items-center justify-center text-[14px] shrink-0 ${
                          source
                            ? mp.colorClass
                            : "bg-[#F0EEE9] dark:bg-[#242522]"
                        }`}
                      >
                        {mp.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-semibold ${
                          source ? "text-[#1A1917] dark:text-[#F0EEE9]" : "text-[#9E9B98] dark:text-[#4A4948]"
                        }`}>
                          {mp.label}
                        </p>
                        {source ? (
                          <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5 truncate">
                            {source.total_detected} email · {source.sender_email}
                          </p>
                        ) : (
                          <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] mt-0.5">
                            Belum terdeteksi
                          </p>
                        )}
                      </div>
                      {source ? (
                        <Toggle
                          checked={source.is_active}
                          onChange={() => toggleSource(source.id)}
                        />
                      ) : (
                        <div className="w-10 h-5 rounded-full bg-[#F0EEE9] dark:bg-[#242522] opacity-40 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Anti-duplikat info card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[14px] border border-blue-200 dark:border-blue-800/40 p-4">
              <div className="flex items-start gap-2">
                <span className="text-[14px] shrink-0">🔗</span>
                <div>
                  <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 mb-1">
                    Anti-duplikat aktif
                  </p>
                  <p className="text-[10px] text-blue-700 dark:text-blue-400">
                    Email dari marketplace otomatis dicocokkan dengan transaksi bank.
                    Jika nominal & tanggal cocok, deskripsi & kategori transaksi yang ada
                    akan diperkaya — bukan dibuat duplikat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Settings */}
        {activeTab === "settings" && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
              <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948]">
                Sinkronisasi
              </p>
              <div className="divide-y divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">Auto-sync</p>
                    <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">Sync otomatis setiap 15 menit</p>
                  </div>
                  <Toggle
                    checked={status.auto_sync}
                    onChange={(v) => updateSettings({ gmail_auto_sync: v })}
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">Auto kategorisasi</p>
                    <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">Saran kategori otomatis</p>
                  </div>
                  <Toggle
                    checked={status.auto_categorize}
                    onChange={(v) => updateSettings({ gmail_auto_categorize: v })}
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">Review sebelum simpan</p>
                    <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">Konfirmasi setiap transaksi</p>
                  </div>
                  <Toggle
                    checked={status.review_before_save}
                    onChange={(v) => updateSettings({ gmail_review_before_save: v })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948] mb-2">Privasi</p>
              <p className="text-[11px] text-[#6B6864] dark:text-[#9E9B96]">
                DompetAing hanya memiliki izin <strong className="text-[#1A1917] dark:text-[#F0EEE9]">baca email</strong>. Tidak ada
                email yang dikirim, dihapus, atau dimodifikasi. Data email tidak
                disimpan — hanya nominal dan deskripsi transaksi yang disimpan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm("Putuskan koneksi Gmail? Sync otomatis akan berhenti.")) {
                  disconnect(undefined, {
                    onSuccess: () => showToast("Gmail diputuskan", "success"),
                  });
                }
              }}
              disabled={disconnecting}
              className="w-full py-3 rounded-[12px] bg-[#C94A1C]/10 dark:bg-[#E87340]/10 text-[#C94A1C] dark:text-[#E87340] text-[13px] font-semibold disabled:opacity-50"
            >
              {disconnecting ? "Memutuskan..." : "Putuskan Gmail"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
