/* HappyRider — Firebase Cloud Messaging service worker
 * Public Firebase config inlined (not secrets; identifies the project).
 */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDDC7pyZCnq1UvZ-vVSIjTgb0_XeEmp-PI",
  authDomain: "happyeat-5ae8b.firebaseapp.com",
  projectId: "happyeat-5ae8b",
  storageBucket: "happyeat-5ae8b.firebasestorage.app",
  messagingSenderId: "873933375315",
  appId: "1:873933375315:web:30b5411f026de9626e43a6",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "HappyRider";
  const body = payload.notification?.body || payload.data?.body || "มีงานใหม่!";
  self.registration.showNotification(title, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.data?.tag || "happyrider-job",
    requireInteraction: true,
    data: payload.data || {},
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/rider-dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const hadWindow = clientsArr.find((c) => c.url.includes(url));
      if (hadWindow) return hadWindow.focus();
      return self.clients.openWindow(url);
    }),
  );
});
