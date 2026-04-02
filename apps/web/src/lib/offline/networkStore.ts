import { create } from "zustand";
import { processOfflineQueue, getQueueCount } from "./queue";
import { syncAllData } from "./sync";

export interface NetworkState {
  isOnline: boolean;
  isSyncing: boolean;
  syncProgress: { synced: number; total: number } | null;
  pendingCount: number;
  lastSyncResult: { synced: number; failed: number } | null;
  // Actions
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncProgress: (progress: { synced: number; total: number } | null) => void;
  setPendingCount: (count: number) => void;
  setLastSyncResult: (result: { synced: number; failed: number } | null) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  syncProgress: null,
  pendingCount: 0,
  lastSyncResult: null,
  setOnline: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setSyncProgress: (progress) => set({ syncProgress: progress }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncResult: (result) => set({ lastSyncResult: result }),
}));

// ── Initialize network listeners ──
let initialized = false;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export function initNetworkListeners() {
  if (initialized) return;
  initialized = true;

  const store = useNetworkStore.getState();

  // Set initial state
  store.setOnline(navigator.onLine);

  // Listen for online/offline events
  window.addEventListener("online", () => {
    useNetworkStore.getState().setOnline(true);
    // Auto-sync when coming back online
    scheduleSync();
  });

  window.addEventListener("offline", () => {
    useNetworkStore.getState().setOnline(false);
  });

  // Update pending count periodically
  updatePendingCount();

  // Initial sync if online
  if (navigator.onLine) {
    // Delay initial sync slightly to let app render first
    setTimeout(() => {
      scheduleSync();
    }, 2000);
  }
}

async function updatePendingCount() {
  try {
    const count = await getQueueCount();
    useNetworkStore.getState().setPendingCount(count);
  } catch {
    // IndexedDB might not be available
  }
}

function scheduleSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    await performSync();
  }, 500);
}

async function performSync() {
  const state = useNetworkStore.getState();
  if (!state.isOnline || state.isSyncing) return;

  state.setSyncing(true);
  state.setSyncProgress(null);

  try {
    // Step 1: Process offline queue (push local changes to server)
    const pendingCount = await getQueueCount();
    if (pendingCount > 0) {
      const result = await processOfflineQueue((synced, total) => {
        useNetworkStore.getState().setSyncProgress({ synced, total });
      });
      useNetworkStore.getState().setLastSyncResult({
        synced: result.synced,
        failed: result.failed,
      });
    }

    // Step 2: Pull fresh data from server → IndexedDB
    await syncAllData();

    // Update pending count
    await updatePendingCount();
  } catch {
    // Sync failed silently
  } finally {
    useNetworkStore.getState().setSyncing(false);
    useNetworkStore.getState().setSyncProgress(null);
  }
}

// Export for manual triggering
export { performSync, updatePendingCount };
