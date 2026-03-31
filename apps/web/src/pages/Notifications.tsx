import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useClearAllNotifications,
} from "@/hooks/useNotifications";
import { showToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/format";

const TYPE_ICON: Record<string, string> = {
  budget_alert: "💰",
  debt_reminder: "⏰",
  weekly_report: "📊",
  transaction: "💳",
};

export function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead();
  const { mutate: clearAll, isPending: clearing } = useClearAllNotifications();

  const items = data?.items ?? [];
  const unreadCount = data?.unread_count ?? 0;

  function handleMarkAllRead() {
    markAllRead(undefined, {
      onSuccess: () => showToast("Semua notifikasi sudah dibaca", "success"),
    });
  }

  function handleClearAll() {
    if (!confirm("Hapus semua notifikasi?")) return;
    clearAll(undefined, {
      onSuccess: () => showToast("Notifikasi dihapus", "success"),
    });
  }

  return (
    <div>
      <Header
        title="Notifikasi"
        right={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="text-[11px] text-accent-500 dark:text-accent-dark font-semibold"
            >
              Baca semua
            </button>
          ) : undefined
        }
      />

      <div className="px-[17px] pt-3 pb-24 space-y-3">
        {/* Stats bar */}
        {items.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96]">
              {unreadCount > 0 ? (
                <span className="font-semibold text-accent-500 dark:text-accent-dark">{unreadCount} belum dibaca</span>
              ) : (
                "Semua sudah dibaca"
              )}
            </p>
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="text-[10px] text-[#C94A1C] dark:text-[#E87340] font-medium"
            >
              Hapus semua
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden divide-y divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-[9px] bg-[#F0EEE9] dark:bg-[#242522] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-32 bg-[#F0EEE9] dark:bg-[#242522] rounded animate-pulse" />
                  <div className="h-2 w-full bg-[#F0EEE9] dark:bg-[#242522] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="Tidak ada notifikasi"
            description="Notifikasi budget, hutang, dan laporan mingguan akan muncul di sini"
          />
        ) : (
          <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
            {items.map((item, idx) => (
              <button
                type="button"
                key={item.id}
                onClick={() => !item.is_read && markRead(item.id)}
                className={[
                  "w-full flex gap-3 px-4 py-3 text-left transition-colors",
                  idx < items.length - 1 ? "border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]" : "",
                  !item.is_read ? "bg-accent-500/[0.04] dark:bg-accent-dark/[0.06]" : "hover:bg-[#F0EEE9] dark:hover:bg-[#242522]",
                ].join(" ")}
              >
                <div className={[
                  "w-8 h-8 rounded-[9px] flex items-center justify-center text-base shrink-0",
                  !item.is_read ? "bg-accent-500/10 dark:bg-accent-dark/10" : "bg-[#F0EEE9] dark:bg-[#242522]",
                ].join(" ")}>
                  {TYPE_ICON[item.type] ?? "🔔"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[12px] font-semibold leading-tight ${
                      item.is_read ? "text-[#6B6864] dark:text-[#9E9B96]" : "text-[#1A1917] dark:text-[#F0EEE9]"
                    }`}>
                      {item.title}
                    </p>
                    {!item.is_read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-500 dark:bg-accent-dark shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-[10px] text-[#6B6864] dark:text-[#9E9B96] mt-0.5 line-clamp-2">
                    {item.body}
                  </p>
                  <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948] mt-1">
                    {formatDate(item.created_at, "relative")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Link to notification settings */}
        <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] text-center">
          Kelola preferensi notifikasi di{" "}
          <a href="/settings" className="text-accent-500 dark:text-accent-dark font-semibold">
            Pengaturan
          </a>
        </p>
      </div>
    </div>
  );
}
