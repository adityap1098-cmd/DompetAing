import { offlineDb, type OfflineQueueItem, type OfflineQueueAction } from "./db";
import { api } from "@/lib/api";

// ── Queue a mutation for later sync ──
export async function enqueueOfflineMutation(params: {
  entity: OfflineQueueItem["entity"];
  action: OfflineQueueAction;
  endpoint: string;
  method: OfflineQueueItem["method"];
  payload?: Record<string, unknown>;
  tempId?: string;
  entityId?: string;
}): Promise<number> {
  const id = await offlineDb.offlineQueue.add({
    ...params,
    createdAt: Date.now(),
    retryCount: 0,
  });
  return id as number;
}

// ── Get pending queue count ──
export async function getQueueCount(): Promise<number> {
  return offlineDb.offlineQueue.count();
}

// ── Get all pending items ──
export async function getQueueItems(): Promise<OfflineQueueItem[]> {
  return offlineDb.offlineQueue.orderBy("createdAt").toArray();
}

// ── Process the offline queue (FIFO, one by one) ──
export type SyncProgressCallback = (synced: number, total: number) => void;

export async function processOfflineQueue(
  onProgress?: SyncProgressCallback
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const items = await offlineDb.offlineQueue.orderBy("createdAt").toArray();
  if (!items.length) return { synced: 0, failed: 0, errors: [] };

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const total = items.length;

  for (const item of items) {
    try {
      await executeQueueItem(item);
      // Remove from queue on success
      if (item.id !== undefined) {
        await offlineDb.offlineQueue.delete(item.id);
      }
      synced++;
      onProgress?.(synced, total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed++;
      errors.push(`${item.entity}/${item.action}: ${msg}`);

      // Update retry count, remove after 3 failures
      if (item.id !== undefined) {
        const retryCount = (item.retryCount || 0) + 1;
        if (retryCount >= 3) {
          await offlineDb.offlineQueue.delete(item.id);
        } else {
          await offlineDb.offlineQueue.update(item.id, {
            retryCount,
            lastError: msg,
          });
        }
      }
    }
  }

  return { synced, failed, errors };
}

// ── Execute a single queue item against the API ──
async function executeQueueItem(item: OfflineQueueItem): Promise<void> {
  switch (item.method) {
    case "POST":
      await api.post(item.endpoint, item.payload);
      break;
    case "PUT":
      await api.put(item.endpoint, item.payload);
      break;
    case "PATCH":
      await api.patch(item.endpoint, item.payload);
      break;
    case "DELETE":
      await api.delete(item.endpoint);
      break;
  }
}

// ── Clear the entire queue ──
export async function clearOfflineQueue(): Promise<void> {
  await offlineDb.offlineQueue.clear();
}
