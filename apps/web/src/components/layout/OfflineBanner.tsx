import { useOffline } from "@/hooks/useOffline";

export function OfflineBanner() {
  const { isOnline, isSyncing, syncProgress, pendingCount } = useOffline();

  // Online & not syncing → no banner
  if (isOnline && !isSyncing) return null;

  return (
    <div className="sticky top-0 z-50 w-full">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500 dark:bg-amber-600 px-4 py-2 flex items-center gap-2 text-white text-[12px] font-medium">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>
            Kamu sedang offline
            {pendingCount > 0 && (
              <span className="ml-1 opacity-90">
                · {pendingCount} perubahan menunggu sinkronisasi
              </span>
            )}
          </span>
        </div>
      )}

      {/* Syncing banner */}
      {isOnline && isSyncing && (
        <div className="bg-accent-500 dark:bg-accent-600 px-4 py-2 flex items-center gap-2 text-white text-[12px] font-medium"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span>
            {syncProgress
              ? `Menyinkronkan ${syncProgress.synced}/${syncProgress.total} perubahan...`
              : "Menyinkronkan data..."}
          </span>
        </div>
      )}
    </div>
  );
}
