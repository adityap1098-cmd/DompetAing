// Firebase Cloud Messaging Service Worker
// This file MUST be in /public so it's served at root /firebase-messaging-sw.js
// It handles background push notifications when the app tab is not focused

/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Firebase config is injected via env vars at build time — but SW can't access import.meta.env
// So we use a minimal config. The messaging sender ID is what matters for receiving.
firebase.initializeApp({
  apiKey: "AIzaSyDompetAing_placeholder",
  projectId: "dompetaing",
  messagingSenderId: "103953800507",
  appId: "1:103953800507:web:placeholder",
});

const messaging = firebase.messaging();

// Handle background messages (when app tab is not focused)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  if (!title) return;

  self.registration.showNotification(title, {
    body: body || "",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    tag: data.type || "general",
    data: { url: data.url || "/notifications" },
  });
});

// Handle notification click — open the app at the right URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus existing tab if open
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Otherwise open new tab
        return self.clients.openWindow(url);
      })
  );
});
