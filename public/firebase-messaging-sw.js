/* eslint-disable no-undef */
// FCM バックグラウンド通知用 Service Worker。
// Firebase 設定はリポジトリにコミットせず、登録時の URL クエリパラメータで注入する
// （src/lib/push.ts が ?apiKey=...&projectId=... 付きで register する）。
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
};

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // data メッセージ（バックグラウンド）→ OS 通知として表示
  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || "Ehoria";
    const options = {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "ehoria-book",
      data: { link: data.link || "/home" },
    };
    self.registration.showNotification(title, options);
  });
}

// 通知タップ → 該当ページを開く（既存タブがあればフォーカス）
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/home";
  const url = new URL(link, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
