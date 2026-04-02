import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { offlineDb } from "./db";

const CACHE_KEY = "tanstack-query-cache";
const MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

/**
 * TanStack Query persister that uses IndexedDB via Dexie.
 * Stores the entire query cache as a single JSON blob in syncMeta table.
 */
export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await offlineDb.syncMeta.put({
          key: CACHE_KEY,
          value: JSON.stringify(client),
        });
      } catch {
        // Quota exceeded or other IDB error — silently fail
      }
    },
    restoreClient: async (): Promise<PersistedClient | undefined> => {
      try {
        const row = await offlineDb.syncMeta.get(CACHE_KEY);
        if (!row) return undefined;

        const client = JSON.parse(row.value) as PersistedClient;

        // Check if cache is too old
        if (Date.now() - client.timestamp > MAX_AGE) {
          await offlineDb.syncMeta.delete(CACHE_KEY);
          return undefined;
        }

        return client;
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await offlineDb.syncMeta.delete(CACHE_KEY);
      } catch {
        // Silently fail
      }
    },
  };
}
