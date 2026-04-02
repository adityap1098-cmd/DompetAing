import { offlineDb } from "./offline/db";
import { enqueueOfflineMutation, updatePendingCount } from "./offline";

const API_BASE = import.meta.env.VITE_API_URL ?? "/v1";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const json = await res.json() as { success: boolean; data: T; error: string | null };

  if (!res.ok) {
    throw new ApiError(res.status, json.error ?? "Request failed", json);
  }

  return json.data as T;
}

// ── Offline-aware read: try API first, fall back to IndexedDB ──
async function offlineGet<T>(
  path: string,
  fallback?: () => Promise<T>
): Promise<T> {
  try {
    return await request<T>(path);
  } catch (err) {
    // If offline or network error, try fallback
    if (!navigator.onLine && fallback) {
      return fallback();
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  // Offline-aware read
  offlineGet,
};

/**
 * Queue a mutation for offline sync and optionally apply it locally.
 * Returns a temporary response so the UI can update optimistically.
 */
export async function offlineMutate<T>(params: {
  endpoint: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  payload?: Record<string, unknown>;
  entity: "transaction" | "account" | "category" | "budget" | "debt" | "recurring";
  action: "create" | "update" | "delete";
  tempId?: string;
  entityId?: string;
  localApply?: () => Promise<void>;
}): Promise<void> {
  await enqueueOfflineMutation({
    entity: params.entity,
    action: params.action,
    endpoint: params.endpoint,
    method: params.method,
    payload: params.payload,
    tempId: params.tempId,
    entityId: params.entityId,
  });

  // Apply the change locally in IndexedDB
  if (params.localApply) {
    await params.localApply();
  }

  // Update the pending count in the store
  await updatePendingCount();
}

export { ApiError };
