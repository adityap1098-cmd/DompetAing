import { useEffect, useSyncExternalStore } from "react";
import {
  useNetworkStore,
  initNetworkListeners,
  updatePendingCount,
} from "@/lib/offline";

/**
 * Hook to get online/offline state, syncing status, and pending count.
 * Initializes network listeners on first mount.
 */
export function useOffline() {
  useEffect(() => {
    initNetworkListeners();
  }, []);

  const isOnline = useNetworkStore((s) => s.isOnline);
  const isSyncing = useNetworkStore((s) => s.isSyncing);
  const syncProgress = useNetworkStore((s) => s.syncProgress);
  const pendingCount = useNetworkStore((s) => s.pendingCount);
  const lastSyncResult = useNetworkStore((s) => s.lastSyncResult);

  // Refresh pending count on mount and when coming back online
  useEffect(() => {
    updatePendingCount();
  }, [isOnline]);

  return {
    isOnline,
    isSyncing,
    syncProgress,
    pendingCount,
    lastSyncResult,
  };
}
