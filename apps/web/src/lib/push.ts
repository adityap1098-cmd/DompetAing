// Firebase Cloud Messaging — push notification client
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { api } from "@/lib/api";

// Firebase config from env vars
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "dompetaing"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "dompetaing"}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance;
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

// ── Check if push is supported in this browser ──
export async function isPushSupported(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  return await isSupported();
}

// ── Get current permission state ──
export function getPushPermission(): NotificationPermission {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

// ── Request permission + get FCM token + register with backend ──
export async function requestPushPermission(): Promise<
  { success: true; token: string } | { success: false; reason: string }
> {
  try {
    const supported = await isPushSupported();
    if (!supported) {
      return { success: false, reason: "Browser tidak mendukung push notification" };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, reason: "blocked" };
    }

    // Register the Firebase messaging SW
    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const messaging = getFirebaseMessaging();
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "";

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      return { success: false, reason: "Gagal mendapatkan token notifikasi" };
    }

    // Register token with backend
    await api.post("/push/register", {
      fcm_token: token,
      device: "web",
    });

    return { success: true, token };
  } catch (err) {
    console.error("[Push] requestPermission error:", err);
    return { success: false, reason: "Terjadi kesalahan saat mengaktifkan notifikasi" };
  }
}

// ── Unregister FCM token ──
export async function unregisterPush(token: string): Promise<void> {
  try {
    await api.post("/push/unregister", { fcm_token: token });
  } catch {
    // Ignore — best effort
  }
}

// ── Listen for foreground messages (when app tab is open) ──
export function onForegroundMessage(
  callback: (payload: { title: string; body: string; data?: Record<string, string> }) => void
): (() => void) | null {
  try {
    const messaging = getFirebaseMessaging();
    const unsubscribe = onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? "";
      const body = payload.notification?.body ?? "";
      const data = payload.data as Record<string, string> | undefined;
      callback({ title, body, data });
    });
    return unsubscribe;
  } catch {
    return null;
  }
}
