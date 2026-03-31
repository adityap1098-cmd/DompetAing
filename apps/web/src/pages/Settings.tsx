import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useThemeStore } from "@/store/theme";
import { useUpdatePreferences, useUpdateNotifications, useSecurityAction } from "@/hooks/useSettings";
import { applyColorScheme } from "@/hooks/useColorScheme";
import { showToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/format";

// ── Color scheme options ──
const COLOR_SCHEMES = [
  { id: "sage_green",    label: "Sage Green",    color: "#2E7D5A" },
  { id: "ocean_blue",    label: "Ocean Blue",    color: "#1A56DB" },
  { id: "royal_purple",  label: "Royal Purple",  color: "#7B3FA8" },
  { id: "sunset_orange", label: "Sunset Orange", color: "#D65C2E" },
  { id: "teal_green",    label: "Teal Green",    color: "#0E9494" },
  { id: "hot_pink",      label: "Hot Pink",      color: "#C44569" },
  { id: "navy_blue",     label: "Navy Blue",     color: "#1F3A93" },
  { id: "steel_gray",    label: "Steel Gray",    color: "#475569" },
];

// ── PIN Modal ──
function PinModal({
  pinSet,
  onClose,
}: {
  pinSet: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"set" | "remove">(pinSet ? "remove" : "set");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const { mutateAsync, isPending } = useSecurityAction();

  async function handleSubmit() {
    if (mode === "set") {
      if (!/^\d{4,6}$/.test(newPin)) {
        showToast("PIN harus 4-6 digit angka", "error");
        return;
      }
      if (newPin !== confirmPin) {
        showToast("Konfirmasi PIN tidak cocok", "error");
        return;
      }
      try {
        await mutateAsync({
          action: "set_pin",
          pin: newPin,
          ...(pinSet && currentPin ? { current_pin: currentPin } : {}),
        });
        showToast("PIN berhasil " + (pinSet ? "diubah" : "dipasang"), "success");
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal menyimpan PIN";
        showToast(msg, "error");
      }
    } else {
      try {
        await mutateAsync({ action: "remove_pin", current_pin: currentPin });
        showToast("PIN berhasil dihapus", "success");
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal menghapus PIN";
        showToast(msg, "error");
      }
    }
  }

  return (
    <Modal isOpen title={pinSet ? "Kelola PIN" : "Pasang PIN"} onClose={onClose}>
      <div className="space-y-4">
        {pinSet && (
          <div className="flex gap-2 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] pb-3">
            <button
              onClick={() => setMode("set")}
              className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-colors ${
                mode === "set"
                  ? "bg-accent-500 dark:bg-accent-dark text-white"
                  : "text-[#6B6864] dark:text-[#9E9B96]"
              }`}
            >
              Ubah PIN
            </button>
            <button
              onClick={() => setMode("remove")}
              className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-colors ${
                mode === "remove"
                  ? "bg-[#C94A1C] text-white"
                  : "text-[#6B6864] dark:text-[#9E9B96]"
              }`}
            >
              Hapus PIN
            </button>
          </div>
        )}

        {(pinSet && mode === "set") && (
          <div>
            <label className="block text-[10px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1">
              PIN saat ini
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full px-3 py-2 text-sm border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] rounded-[10px] bg-[#F7F6F3] dark:bg-[#1C1D1A] text-[#1A1917] dark:text-[#F0EEE9] text-center tracking-[0.5em]"
            />
          </div>
        )}

        {mode === "remove" && (
          <div>
            <label className="block text-[10px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1">
              Masukkan PIN untuk konfirmasi
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full px-3 py-2 text-sm border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] rounded-[10px] bg-[#F7F6F3] dark:bg-[#1C1D1A] text-[#1A1917] dark:text-[#F0EEE9] text-center tracking-[0.5em]"
            />
          </div>
        )}

        {mode === "set" && (
          <>
            <div>
              <label className="block text-[10px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1">
                PIN baru (4-6 digit)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full px-3 py-2 text-sm border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] rounded-[10px] bg-[#F7F6F3] dark:bg-[#1C1D1A] text-[#1A1917] dark:text-[#F0EEE9] text-center tracking-[0.5em]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#6B6864] dark:text-[#9E9B96] mb-1">
                Konfirmasi PIN baru
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full px-3 py-2 text-sm border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] rounded-[10px] bg-[#F7F6F3] dark:bg-[#1C1D1A] text-[#1A1917] dark:text-[#F0EEE9] text-center tracking-[0.5em]"
              />
            </div>
          </>
        )}

        <Button
          fullWidth
          variant={mode === "remove" ? "danger" : "primary"}
          onClick={handleSubmit}
          loading={isPending}
        >
          {mode === "remove" ? "Hapus PIN" : pinSet ? "Ubah PIN" : "Pasang PIN"}
        </Button>
      </div>
    </Modal>
  );
}

// ── Main Page ──
export function SettingsPage() {
  const { user, logout, isLoggingOut } = useAuth();
  const { plan, isTrialActive, trialDaysLeft } = useSubscription();
  const { theme, setTheme } = useThemeStore();

  const { mutate: updatePrefs, isPending: savingPrefs } = useUpdatePreferences();
  const { mutate: updateNotifs } = useUpdateNotifications();

  const [showPinModal, setShowPinModal] = useState(false);

  function handleThemeChange(dark: boolean) {
    const next = dark ? "dark" : "light";
    setTheme(next);
    updatePrefs({ theme: next });
  }

  function handleHideBalance(val: boolean) {
    updatePrefs({ hide_balance: val }, {
      onSuccess: () => showToast(val ? "Saldo disembunyikan" : "Saldo ditampilkan", "success"),
      onError: () => showToast("Gagal menyimpan", "error"),
    });
  }

  function handleColorScheme(id: string) {
    // Apply immediately to DOM + localStorage for instant feedback
    applyColorScheme(id);
    // Then persist to DB
    updatePrefs({ color_scheme: id }, {
      onSuccess: () => showToast("Tema warna disimpan", "success"),
      onError: () => showToast("Gagal menyimpan", "error"),
    });
  }

  function handleNotifToggle(field: string, val: boolean) {
    updateNotifs({ [field]: val } as Parameters<typeof updateNotifs>[0]);
  }

  function handleBudgetThreshold(val: number) {
    updateNotifs({ notif_budget_threshold: val });
  }

  if (!user) return null;

  return (
    <div>
      <Header title="Pengaturan" />

      <div className="px-[17px] pt-4 space-y-3 pb-24">
        {/* Profile */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] px-4 py-3.5 flex items-center gap-3">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-11 h-11 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-accent-500 dark:bg-accent-dark flex items-center justify-center text-white text-lg font-bold shrink-0">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-[#1A1917] dark:text-[#F0EEE9] truncate">
              {user.name}
            </p>
            <p className="text-[11px] text-[#6B6864] dark:text-[#9E9B96] truncate mt-0.5">
              {user.email}
            </p>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
              {plan === "premium" ? "✨ Premium" : isTrialActive ? "✨ Trial Premium" : "🆓 Free"}
            </p>
            {isTrialActive && (
              <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">
                Berakhir dalam {trialDaysLeft} hari
              </p>
            )}
          </div>
          <Link to="/subscription" className="text-[11px] font-semibold text-accent-500 dark:text-accent-dark">
            {plan === "free" ? "Upgrade →" : "Kelola →"}
          </Link>
        </div>

        {/* Tampilan */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948]">
            Tampilan
          </p>
          <div className="divide-y divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
            {/* Theme */}
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">Mode Gelap</p>
              <Toggle checked={theme === "dark"} onChange={handleThemeChange} />
            </div>

            {/* Hide Balance */}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">Sembunyikan Saldo</p>
                <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">
                  Nominal tampil sebagai ****
                </p>
              </div>
              <Toggle
                checked={user.hide_balance}
                onChange={handleHideBalance}
                disabled={savingPrefs}
              />
            </div>

            {/* Color Scheme */}
            <div className="px-4 py-3">
              <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9] mb-2.5">Tema Warna</p>
              <div className="flex gap-2.5 flex-wrap">
                {COLOR_SCHEMES.map((scheme) => (
                  <button
                    key={scheme.id}
                    onClick={() => handleColorScheme(scheme.id)}
                    title={scheme.label}
                    className={`w-8 h-8 rounded-full border-[2.5px] transition-all ${
                      user.color_scheme === scheme.id
                        ? "border-[#1A1917] dark:border-[#F0EEE9] scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: scheme.color }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-1.5">
                {COLOR_SCHEMES.find((s) => s.id === user.color_scheme)?.label ?? "Sage Green"}
              </p>
            </div>
          </div>
        </div>

        {/* Notifikasi */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948]">
            Notifikasi
          </p>
          <div className="divide-y divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">Laporan Mingguan</p>
                <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">Setiap Senin pagi</p>
              </div>
              <Toggle
                checked={user.notif_weekly_report}
                onChange={(v) => handleNotifToggle("notif_weekly_report", v)}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">Pengingat Hutang</p>
                <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">H-1 sebelum jatuh tempo</p>
              </div>
              <Toggle
                checked={user.notif_debt_reminder}
                onChange={(v) => handleNotifToggle("notif_debt_reminder", v)}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">Peringatan Budget</p>
                <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">
                  Saat pengeluaran mencapai {user.notif_budget_threshold}%
                </p>
              </div>
              <Toggle
                checked={user.notif_budget_threshold > 0}
                onChange={(v) => handleBudgetThreshold(v ? 80 : 0)}
              />
            </div>
            {user.notif_budget_threshold > 0 && (
              <div className="px-4 py-3">
                <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mb-2">
                  Ambang batas: <span className="font-semibold">{user.notif_budget_threshold}%</span>
                </p>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={user.notif_budget_threshold}
                  onChange={(e) => handleBudgetThreshold(Number(e.target.value))}
                  className="w-full accent-accent-500"
                />
                <div className="flex justify-between text-[9px] text-[#9E9B98] dark:text-[#4A4948] mt-0.5">
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">Notifikasi Transaksi</p>
                <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">Setiap transaksi baru</p>
              </div>
              <Toggle
                checked={user.notif_transaction}
                onChange={(v) => handleNotifToggle("notif_transaction", v)}
              />
            </div>
          </div>
        </div>

        {/* Keamanan */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948]">
            Keamanan
          </p>
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors text-left"
            onClick={() => setShowPinModal(true)}
          >
            <div>
              <p className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">PIN Lock</p>
              <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5">
                {(user as typeof user & { pin_set?: boolean }).pin_set
                  ? "PIN sudah dipasang"
                  : "Belum ada PIN"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(user as typeof user & { pin_set?: boolean }).pin_set && (
                <span className="text-[9px] bg-[#1E8A5A]/10 dark:bg-[#4CAF7A]/10 text-[#1E8A5A] dark:text-[#4CAF7A] px-2 py-0.5 rounded-full font-semibold">
                  Aktif
                </span>
              )}
              <span className="text-[#9E9B98] dark:text-[#4A4948] text-base">›</span>
            </div>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
          {[
            { icon: "🏦", label: "Kelola Akun", to: "/accounts" },
            { icon: "🏷️", label: "Kelola Kategori", to: "/categories" },
            { icon: "🔄", label: "Transaksi Berulang", to: "/recurring" },
            { icon: "📊", label: "Laporan & Analitik", to: "/reports" },
            { icon: "📧", label: "Gmail Sync", to: "/gmail-sync" },
            { icon: "📤", label: "Export Data", to: "/export" },
            { icon: "📥", label: "Import CSV", to: "/import" },
          ].map((item, i, arr) => (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "flex items-center gap-3 px-4 py-3 hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors",
                i < arr.length - 1 ? "border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]" : "",
              ].join(" ")}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="text-[12px] text-[#1A1917] dark:text-[#F0EEE9] flex-1">
                {item.label}
              </span>
              <span className="text-[#9E9B98] dark:text-[#4A4948] text-base">›</span>
            </Link>
          ))}
        </div>

        {/* App Info */}
        <div className="px-1">
          <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">DompetAing v1.0.0</p>
          {user.created_at && (
            <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] mt-0.5">Member sejak {formatDate(user.created_at, "short")}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => logout()}
          disabled={isLoggingOut}
          className="w-full py-3 rounded-[12px] bg-[#C94A1C]/10 dark:bg-[#E87340]/10 text-[#C94A1C] dark:text-[#E87340] text-[13px] font-semibold hover:bg-[#C94A1C]/15 dark:hover:bg-[#E87340]/15 transition-colors disabled:opacity-50"
        >
          {isLoggingOut ? "Keluar..." : "Keluar"}
        </button>
      </div>

      {showPinModal && (
        <PinModal
          pinSet={!!(user as typeof user & { pin_set?: boolean }).pin_set}
          onClose={() => setShowPinModal(false)}
        />
      )}
    </div>
  );
}
