// Hook for managing push notification state
import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getPushPermission,
  requestPushPermission,
  onForegroundMessage,
} from "@/lib/push";
import { showToast } from "@/components/ui/Toast";

const FCM_TOKEN_KEY = "da_fcm_token";

export function usePush() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isPushSupported().then(setSupported);
    setPermission(getPushPermission());
  }, []);

  // Listen for foreground messages and show toast
  useEffect(() => {
    if (!supported || permission !== "granted") return;
    const unsub = onForegroundMessage(({ title, body }) => {
      showToast(`${title}: ${body}`, "success");
    });
    return () => {
      unsub?.();
    };
  }, [supported, permission]);

  const requestPermission = useCallback(async () => {
    setLoading(true);
    try {
      const result = await requestPushPermission();
      if (result.success) {
        setPermission("granted");
        localStorage.setItem(FCM_TOKEN_KEY, result.token);
        showToast("Notifikasi push diaktifkan", "success");
      } else if (result.reason === "blocked") {
        setPermission("denied");
        showToast("Notifikasi diblokir. Aktifkan di pengaturan browser.", "error");
      } else {
        showToast(result.reason, "error");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const isEnabled = permission === "granted";
  const isBlocked = permission === "denied";

  return {
    supported,
    isEnabled,
    isBlocked,
    permission,
    loading,
    requestPermission,
  };
}
