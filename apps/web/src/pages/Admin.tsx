import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useAdminStats,
  useAdminUsers,
  useGrantPremium,
  useRevokePremium,
  useDeleteUser,
  type AdminUser,
} from "@/hooks/useAdmin";
import { formatRupiah, formatDate } from "@/lib/format";

const PLAN_BADGE: Record<string, { label: string; class: string }> = {
  premium: { label: "Premium", class: "bg-accent-500/10 text-accent-500 dark:bg-accent-dark/10 dark:text-accent-dark" },
  trial: { label: "Trial", class: "bg-[#1A56DB]/10 text-[#1A56DB]" },
  free: { label: "Free", class: "bg-[#78716C]/10 text-[#78716C]" },
};

export function AdminPage() {
  const { user } = useAuth();
  const isAdmin = (user as (typeof user & { is_admin?: boolean }))?.is_admin;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <AdminDashboard />;
}

function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();
  const [tab, setTab] = useState<"overview" | "users">("overview");

  return (
    <div>
      <Header title="Admin Dashboard" />
      <div className="px-[17px] pt-4 pb-24 space-y-4">

        {/* Tabs */}
        <div className="flex gap-1 bg-[#F0EEE9] dark:bg-[#1C1D1A] p-1 rounded-[10px]">
          {(["overview", "users"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={[
              "flex-1 py-2 text-[11px] font-semibold rounded-[8px] transition-all",
              tab === t ? "bg-white dark:bg-[#2A2B28] text-[#1A1917] dark:text-[#F0EEE9] shadow-sm" : "text-[#9E9B98] dark:text-[#4A4948]",
            ].join(" ")}>
              {t === "overview" ? "📊 Overview" : "👥 Users"}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab stats={stats} loading={isLoading} />}
        {tab === "users" && <UsersTab />}
      </div>
    </div>
  );
}

// ── Overview Tab ──
function OverviewTab({ stats, loading }: { stats: ReturnType<typeof useAdminStats>["data"]; loading: boolean }) {
  if (loading || !stats) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-accent-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Total Users", value: stats.total_users, icon: "👥", color: "accent" },
          { label: "Premium", value: stats.premium_users, icon: "✨", color: "green" },
          { label: "Trial", value: stats.trial_users, icon: "⏳", color: "blue" },
          { label: "Free", value: stats.free_users, icon: "🆓", color: "gray" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
            <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">{s.icon} {s.label}</p>
            <p className="font-mono text-[20px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue + Transactions */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-accent-500 dark:bg-accent-dark rounded-[14px] p-3 text-white">
          <p className="text-[10px] opacity-75">💰 Total Revenue</p>
          <p className="font-mono text-[16px] font-bold mt-0.5">{formatRupiah(stats.total_revenue)}</p>
        </div>
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
          <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">📝 Transaksi</p>
          <p className="font-mono text-[16px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mt-0.5">{stats.total_transactions.toLocaleString()}</p>
        </div>
      </div>

      {/* Monthly Signups Chart */}
      <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5">
        <p className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-3">📈 User Growth</p>
        <MonthlyChart data={stats.monthly_signups} />
      </div>

      {/* Recent Signups */}
      <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
        <p className="px-3.5 pt-3 pb-2 text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">🆕 Signup Terbaru</p>
        {stats.recent_signups.map((u) => (
          <UserRow key={u.id} user={u} compact />
        ))}
      </div>
    </div>
  );
}

// ── Monthly Chart (simple bar) ──
function MonthlyChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (!entries.length) return <p className="text-[10px] text-[#9E9B98]">Belum ada data</p>;
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="flex items-end gap-1 h-[80px]">
      {entries.map(([month, count]) => (
        <div key={month} className="flex-1 flex flex-col items-center gap-1">
          <p className="text-[8px] font-mono text-accent-500 dark:text-accent-dark font-bold">{count}</p>
          <div
            className="w-full bg-accent-500/20 dark:bg-accent-dark/20 rounded-t-[4px] min-h-[4px]"
            style={{ height: `${(count / max) * 60}px` }}
          />
          <p className="text-[7px] text-[#9E9B98]">{month.split("-")[1]}</p>
        </div>
      ))}
    </div>
  );
}

// ── Users Tab ──
function UsersTab() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminUsers({ search, status, page, limit: 20 });
  const grantPremium = useGrantPremium();
  const revokePremium = useRevokePremium();
  const deleteUser = useDeleteUser();
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);
  const [grantDuration, setGrantDuration] = useState("monthly");

  return (
    <div className="space-y-3">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Cari email atau nama..."
        className="w-full px-3 py-2 rounded-[10px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1C1D1A] text-[11px] text-[#1A1917] dark:text-[#F0EEE9] focus:outline-none focus:border-accent-500"
      />

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {["all", "trial", "premium", "free"].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={[
            "px-3 py-1.5 rounded-full text-[10px] font-semibold shrink-0 transition-colors",
            status === s ? "bg-accent-500 dark:bg-accent-dark text-white" : "bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96]",
          ].join(" ")}>
            {s === "all" ? "Semua" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* User list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-accent-500 border-t-transparent rounded-full" /></div>
      ) : (
        <>
          <p className="text-[10px] text-[#9E9B98]">{data?.total ?? 0} users</p>
          <div className="space-y-1.5">
            {(data?.users ?? []).map((u) => (
              <UserRow key={u.id} user={u}
                onGrant={() => setGrantTarget(u)}
                onRevoke={() => revokePremium.mutate(u.email, {
                  onSuccess: () => showToast(`${u.email} → Free`, "success"),
                  onError: (e) => showToast(e.message, "error"),
                })}
                onDelete={() => setConfirmDelete(u)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="flex justify-center gap-2 pt-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded text-[10px] bg-[#F0EEE9] dark:bg-[#242522] disabled:opacity-30">← Prev</button>
              <span className="text-[10px] text-[#9E9B98] py-1">Page {page}</span>
              <button disabled={!data.has_next} onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded text-[10px] bg-[#F0EEE9] dark:bg-[#242522] disabled:opacity-30">Next →</button>
            </div>
          )}
        </>
      )}

      {/* Grant Premium Dialog */}
      {grantTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setGrantTarget(null)}>
          <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] p-5 w-[300px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-[13px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-1">Grant Premium</p>
            <p className="text-[11px] text-[#6B6864] dark:text-[#9E9B96] mb-3">{grantTarget.email}</p>
            <select value={grantDuration} onChange={(e) => setGrantDuration(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-[8px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] bg-[#F7F6F3] dark:bg-[#242522] text-[12px] text-[#1A1917] dark:text-[#F0EEE9]">
              <option value="monthly">Bulanan (30 hari)</option>
              <option value="yearly">Tahunan (365 hari)</option>
              <option value="lifetime">Lifetime</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setGrantTarget(null)} className="flex-1 py-2 rounded-[8px] bg-[#F0EEE9] dark:bg-[#242522] text-[11px] font-semibold text-[#6B6864]">Batal</button>
              <button onClick={() => {
                grantPremium.mutate({ email: grantTarget.email, duration: grantDuration }, {
                  onSuccess: () => { showToast(`${grantTarget.email} → Premium`, "success"); setGrantTarget(null); },
                  onError: (e) => showToast(e.message, "error"),
                });
              }} className="flex-1 py-2 rounded-[8px] bg-accent-500 dark:bg-accent-dark text-white text-[11px] font-semibold">
                {grantPremium.isPending ? "..." : "Grant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen
          title="Hapus User?"
          description={`Semua data ${confirmDelete.email} akan dihapus permanen. Tidak bisa di-undo.`}
          confirmLabel="Hapus"
          confirmVariant="danger"
          loading={deleteUser.isPending}
          onConfirm={() => {
            deleteUser.mutate(confirmDelete.id, {
              onSuccess: () => { showToast("User dihapus", "success"); setConfirmDelete(null); },
              onError: (e) => showToast(e.message, "error"),
            });
          }}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── User Row ──
function UserRow({ user, compact, onGrant, onRevoke, onDelete }: {
  user: AdminUser;
  compact?: boolean;
  onGrant?: () => void;
  onRevoke?: () => void;
  onDelete?: () => void;
}) {
  const badge = PLAN_BADGE[user.effective_plan] ?? PLAN_BADGE.free;
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.05)] last:border-0">
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-accent-500/10 flex items-center justify-center text-[11px] font-bold text-accent-500 shrink-0">
          {user.name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] truncate">{user.name}</p>
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.class}`}>{badge.label}</span>
          {user.gmail_connected && <span className="text-[8px]" title="Gmail connected">📧</span>}
        </div>
        <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948] truncate">{user.email}</p>
        {!compact && (
          <p className="text-[8px] text-[#9E9B98] mt-0.5">
            {user.transaction_count} txn · {user.account_count} akun · {formatDate(user.created_at, "short")}
          </p>
        )}
      </div>
      {!compact && onGrant && (
        <div className="relative">
          <button onClick={() => setShowActions(!showActions)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F0EEE9] dark:hover:bg-[#242522] text-[#9E9B98] text-sm">
            ⋯
          </button>
          {showActions && (
            <div className="absolute right-0 top-8 z-10 bg-white dark:bg-[#1C1D1A] rounded-[10px] shadow-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] py-1 min-w-[140px]"
              onMouseLeave={() => setShowActions(false)}>
              <button onClick={() => { onGrant(); setShowActions(false); }}
                className="w-full text-left px-3 py-2 text-[11px] text-[#1A1917] dark:text-[#F0EEE9] hover:bg-[#F0EEE9] dark:hover:bg-[#242522]">
                ✨ Grant Premium
              </button>
              {user.effective_plan === "premium" && (
                <button onClick={() => { onRevoke?.(); setShowActions(false); }}
                  className="w-full text-left px-3 py-2 text-[11px] text-[#C94A1C] hover:bg-[#F0EEE9] dark:hover:bg-[#242522]">
                  ⬇️ Revoke Premium
                </button>
              )}
              <button onClick={() => { onDelete?.(); setShowActions(false); }}
                className="w-full text-left px-3 py-2 text-[11px] text-[#C94A1C] hover:bg-[#F0EEE9] dark:hover:bg-[#242522]">
                🗑️ Delete User
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
