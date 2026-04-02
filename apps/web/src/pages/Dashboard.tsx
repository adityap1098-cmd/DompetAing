import { useState } from "react";
import { TrialBanner } from "@/components/subscription/TrialBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useHideBalance } from "@/hooks/useHideBalance";
import { useNotifications, useMarkRead } from "@/hooks/useNotifications";
import { Link, useNavigate } from "react-router-dom";
import { formatRupiah } from "@/lib/format";
import { useAccounts } from "@/hooks/useAccounts";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { TransactionItem } from "@/components/transaction/TransactionItem";
import { useTransactions } from "@/hooks/useTransactions";
import { useBudgets } from "@/hooks/useBudgets";
import { useDebts } from "@/hooks/useDebts";

// ── Notification Banner (dismissable, budget_alert + debt_reminder only) ──
function NotifBanner() {
  const { data } = useNotifications();
  const { mutate: markRead } = useMarkRead();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const urgent = (data?.items ?? []).filter(
    (n) => !n.is_read && !dismissed.has(n.id) && (n.type === "budget_alert" || n.type === "debt_reminder")
  );

  if (urgent.length === 0) return null;
  const notif = urgent[0];

  function dismiss() {
    markRead(notif.id);
    setDismissed((prev) => new Set([...prev, notif.id]));
  }

  return (
    <div className="mx-[17px] mt-2 rounded-xl border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] px-3 py-2.5 flex gap-2 items-start bg-white dark:bg-[#1C1D1A]">
      <span className="text-base shrink-0 mt-0.5">
        {notif.type === "debt_reminder" ? "⏰" : "💰"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">{notif.title}</p>
        <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5 line-clamp-2">{notif.body}</p>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 text-[#9E9B98] dark:text-[#4A4948] text-sm leading-none mt-0.5"
        aria-label="Tutup"
      >
        ✕
      </button>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { isTrialActive, trialDaysLeft, plan } = useSubscription();
  const { formatAmount } = useHideBalance();
  const { data: notifData } = useNotifications();
  const unreadCount = notifData?.unread_count ?? 0;

  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const navigate = useNavigate();

  const netWorth = (accounts ?? []).reduce((sum, a) => sum + a.balance, 0);
  const accountCount = (accounts ?? []).length;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: incomeData } = useTransactions({ type: "income", date_from: monthStart, date_to: monthEnd, limit: 100 });
  const { data: expenseData } = useTransactions({ type: "expense", date_from: monthStart, date_to: monthEnd, limit: 100 });
  const { data: recentData } = useTransactions({ limit: 5 });

  const totalIncome = (incomeData?.items ?? []).reduce((s, t) => s + t.amount, 0);
  const totalExpense = (expenseData?.items ?? []).reduce((s, t) => s + t.amount, 0);

  const { data: budgetData, isLoading: budgetLoading } = useBudgets(month, year);
  const budgets = budgetData?.budgets ?? [];

  const { data: debtData, isLoading: debtLoading } = useDebts({ status: "active" });
  const debtSummary = debtData?.summary;
  const nearestDue = (debtData?.debts ?? [])
    .filter((d) => d.due_date !== null)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0] ?? null;

  return (
    <div className="flex flex-col">
      <TrialBanner />

      {/* ── Greeting Row ── */}
      <div className="flex items-center justify-between px-[17px] pt-4 pb-3.5">
        <div>
          <p className="text-[17px] font-extrabold text-[#1A1917] dark:text-[#F0EEE9]">
            Halo, {user?.name?.split(" ")[0] ?? ""}! 👋
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <Link to="/notifications" className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#6B6864] dark:text-[#9E9B96]">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          {/* Avatar */}
          <Link to="/settings">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-[34px] h-[34px] rounded-full object-cover" />
            ) : (
              <div className="w-[34px] h-[34px] rounded-full bg-accent-500 dark:bg-accent-dark flex items-center justify-center text-white text-[13px] font-extrabold">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Important notification banner */}
      <NotifBanner />

      <div className="pb-4">
        {/* ── Hero Card (Net Worth + Income/Expense) ── */}
        <div className="mx-[17px] mb-3 bg-accent-500 dark:bg-accent-dark rounded-[18px] p-4 text-white relative overflow-hidden">
          {/* Decorative circle */}
          <div className="absolute -top-6 -right-6 w-[100px] h-[100px] rounded-full bg-white/[0.07]" />

          <p className="text-[9px] font-semibold opacity-75 tracking-[0.04em] uppercase mb-1">
            Kekayaan Bersih
          </p>
          <div className="flex items-center gap-2 mb-1">
            {accountsLoading ? (
              <div className="h-8 w-36 rounded bg-white/20 animate-pulse" />
            ) : (
              <p className="font-mono text-[24px] font-semibold tracking-[-0.02em]">
                {formatAmount(netWorth)}
              </p>
            )}
            <Link to="/settings" className="opacity-60 text-sm">👁️</Link>
          </div>
          {!accountsLoading && accountCount === 0 && (
            <p className="text-[9px] opacity-60 mb-2">Belum ada aset — tambah aset untuk mulai</p>
          )}
          {(accountsLoading || accountCount > 0) && <div className="mb-2.5" />}

          {/* Income / Expense chips — compact, match mockup */}
          <div className="flex gap-2">
            <div className="flex-1 bg-white/[0.11] rounded-[10px] px-2.5 py-2">
              <p className="text-[8px] opacity-70 mb-0.5">Pemasukan</p>
              <p className="font-mono text-[12px] font-semibold">
                {formatAmount(totalIncome, { compact: true })}
              </p>
            </div>
            <div className="flex-1 bg-white/[0.11] rounded-[10px] px-2.5 py-2">
              <p className="text-[8px] opacity-70 mb-0.5">Pengeluaran</p>
              <p className="font-mono text-[12px] font-semibold">
                {formatAmount(totalExpense, { compact: true })}
              </p>
            </div>
          </div>
        </div>

        {/* ── Aset Saya ── */}
        <>
          <div className="flex items-center justify-between px-[17px] pt-1 pb-2">
            <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">Aset Saya</p>
            {accountCount > 0 && (
              <Link to="/accounts" className="text-[10px] font-semibold text-accent-500 dark:text-accent-dark">
                Lihat semua →
              </Link>
            )}
          </div>
          {accountsLoading ? (
            <div className="flex gap-2 px-[17px] pb-3 overflow-x-auto no-scrollbar">
              {[1, 2].map((i) => <Skeleton key={i} className="h-[52px] w-[130px] rounded-[12px] shrink-0" />)}
            </div>
          ) : accountCount === 0 ? (
            <div className="mx-[17px] mb-3 bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] rounded-[14px] p-5 flex flex-col items-center text-center">
              <span className="text-3xl mb-2">🏦</span>
              <p className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">Belum ada aset</p>
              <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5 mb-3">
                Tambah rekening bank atau e-wallet untuk mulai catat keuangan
              </p>
              <Link
                to="/accounts?add=true"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-[10px] border border-accent-500 dark:border-accent-dark text-accent-500 dark:text-accent-dark text-[11px] font-semibold hover:bg-accent-500/5 transition-colors"
              >
                + Tambah Aset
              </Link>
            </div>
          ) : (
            <div className="flex gap-2 px-[17px] pb-3 overflow-x-auto no-scrollbar">
              {(accounts ?? []).map((account) => (
                <Link
                  key={account.id}
                  to={`/accounts/${account.id}`}
                  className="shrink-0 min-w-[120px] bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] rounded-[12px] p-2 flex items-center gap-2"
                >
                  <div
                    className="w-7 h-7 rounded-[8px] flex items-center justify-center text-xs shrink-0"
                    style={{ backgroundColor: account.color ? `${account.color}1F` : "rgba(46,125,90,0.12)" }}
                  >
                    {account.icon ?? "🏦"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#1A1917] dark:text-[#F0EEE9] truncate">
                      {account.name}
                    </p>
                    <p className="font-mono text-[10px] font-medium text-[#6B6864] dark:text-[#9E9B96] truncate mt-0.5">
                      {formatAmount(account.balance, { compact: true })}
                    </p>
                  </div>
                </Link>
              ))}
              {/* Card tambah akun di akhir scroll */}
              <Link
                to="/accounts?add=true"
                className="shrink-0 min-w-[100px] border-2 border-dashed border-[rgba(0,0,0,0.12)] dark:border-[rgba(255,255,255,0.1)] rounded-[12px] p-2 flex flex-col items-center justify-center gap-1 hover:border-accent-500 dark:hover:border-accent-dark transition-colors"
              >
                <span className="text-accent-500 dark:text-accent-dark text-lg">+</span>
                <p className="text-[9px] font-semibold text-[#9E9B98] dark:text-[#4A4948]">Tambah</p>
              </Link>
            </div>
          )}
        </>

        {/* ── Transaksi Terbaru ── */}
        <div className="flex items-center justify-between px-[17px] pt-2 pb-2">
          <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">Transaksi Terbaru</p>
          <Link to="/transactions" className="text-[10px] font-semibold text-accent-500 dark:text-accent-dark">
            Lihat semua →
          </Link>
        </div>
        <div className="mx-[17px] bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden mb-3">
          {(recentData?.items ?? []).length === 0 ? (
            <EmptyState
              icon="📋"
              title="Belum ada transaksi"
              description="Mulai catat pemasukan dan pengeluaran kamu"
            />
          ) : (
            (recentData?.items ?? []).map((txn) => (
              <TransactionItem
                key={txn.id}
                transaction={txn}
                onClick={() => navigate(`/transactions/${txn.id}`)}
              />
            ))
          )}
        </div>

        {/* ── Budget Bulan Ini ── */}
        <div className="flex items-center justify-between px-[17px] pt-2 pb-2">
          <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">Budget Bulan Ini</p>
          <Link to="/budget" className="text-[10px] font-semibold text-accent-500 dark:text-accent-dark">
            Kelola →
          </Link>
        </div>
        <div className="mx-[17px] bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5 mb-3">
          {budgetLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : budgets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">Belum ada budget</p>
              <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] text-center">Set budget per kategori untuk kontrol pengeluaran</p>
              <Link to="/budget" className="mt-1 text-[10px] font-semibold text-accent-500 dark:text-accent-dark">
                + Buat Budget Baru
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {budgets.slice(0, 3).map((b) => {
                const pct = Math.min(b.percentage, 100);
                const barColor =
                  b.percentage >= 100
                    ? "#ef4444"
                    : b.percentage >= 80
                    ? "#f59e0b"
                    : "var(--accent)";
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">{b.category.icon}</span>
                        <span className="text-[11px] font-bold text-[#1A1917] dark:text-[#F0EEE9] truncate max-w-[120px]">
                          {b.category.name}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96]">
                        {formatRupiah(b.spent, { compact: true })} / {formatRupiah(b.amount, { compact: true })}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#F0EEE9] dark:bg-[#242522] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
              {budgets.length > 3 && (
                <p className="text-[10px] text-center text-[#9E9B98] dark:text-[#4A4948] pt-1">
                  +{budgets.length - 3} budget lainnya
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Hutang & Piutang ── */}
        <div className="flex items-center justify-between px-[17px] pt-2 pb-2">
          <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">Hutang & Piutang</p>
          <Link to="/debts" className="text-[10px] font-semibold text-accent-500 dark:text-accent-dark">
            Lihat →
          </Link>
        </div>
        <div className="mx-[17px] bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5 mb-3">
          {debtLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-3/4 rounded-lg" />
            </div>
          ) : !debtSummary || (debtSummary.hutang_active_count === 0 && debtSummary.piutang_active_count === 0) ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">Belum ada hutang/piutang</p>
              <Link to="/debts" className="text-[10px] font-semibold text-accent-500 dark:text-accent-dark">
                + Tambah
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {debtSummary.hutang_active_count > 0 && (
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔴</span>
                    <div>
                      <p className="text-[10px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">Hutang</p>
                      <p className="text-[9px] text-[#6B6864] dark:text-[#9E9B96]">{debtSummary.hutang_active_count} aktif</p>
                    </div>
                  </div>
                  <p className="font-mono text-[12px] font-semibold text-[#C94A1C] dark:text-[#E87340]">
                    {formatAmount(debtSummary.total_hutang, { compact: true })}
                  </p>
                </div>
              )}
              {debtSummary.piutang_active_count > 0 && (
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🟢</span>
                    <div>
                      <p className="text-[10px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">Piutang</p>
                      <p className="text-[9px] text-[#6B6864] dark:text-[#9E9B96]">{debtSummary.piutang_active_count} aktif</p>
                    </div>
                  </div>
                  <p className="font-mono text-[12px] font-semibold text-[#1E8A5A] dark:text-[#4CAF7A]">
                    {formatAmount(debtSummary.total_piutang, { compact: true })}
                  </p>
                </div>
              )}
              {nearestDue && (
                <div className="mt-1 pt-2 border-t border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)]">
                  <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948] mb-1">Terdekat jatuh tempo</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">{nearestDue.person_name}</p>
                    <p className={[
                      "text-[10px] font-semibold",
                      nearestDue.is_overdue ? "text-[#C94A1C] dark:text-[#E87340]" : "text-[#6B6864] dark:text-[#9E9B96]",
                    ].join(" ")}>
                      {nearestDue.is_overdue
                        ? `Lewat ${Math.abs(nearestDue.days_remaining ?? 0)} hari`
                        : nearestDue.days_remaining === 0 ? "Hari ini!"
                        : `${nearestDue.days_remaining} hari lagi`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Trial Banner ── */}
        {isTrialActive && plan === "trial" && (
          <div className="mx-[17px] bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5 mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">✨</span>
              <div>
                <p className="text-[11px] font-bold text-accent-500 dark:text-accent-dark">Trial Premium Aktif</p>
                <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">
                  Sisa <strong>{trialDaysLeft} hari</strong> — semua fitur unlocked
                </p>
              </div>
              <Link to="/subscription" className="ml-auto text-[10px] font-semibold text-accent-500 dark:text-accent-dark whitespace-nowrap">
                Upgrade →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
