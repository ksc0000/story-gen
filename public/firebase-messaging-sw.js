/* eslint-disable no-undef */
// FCM バックグラウンド通知 & PWA オフラインキャッシュ兼用 Service Worker。
// Firebase 設定はリポジトリにコミットせず、登録時の URL クエリパラメータで注入する
// （src/lib/push.ts / src/lib/offline-book-storage.ts が ?apiKey=... 付きで register する）。
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const DATA_CACHE_NAME = "ehoria-offline-data-v1";
const IMAGE_CACHE_NAME = "ehoria-offline-images-v1";

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
  try {
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
  } catch (err) {
    console.warn("FCM init skipped or failed in SW:", err);
  }
}

// Service Worker ライフサイクル管理
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Cache Storage からのオフライン応答（画像 & オフラインブックメタデータ）
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // POST/PUT などの非 GET リクエストはキャッシュ対象外
  if (request.method !== "GET") return;

  // Firebase Firestore / Auth / Cloud Functions などの API リクエストは直接ネットワークへ
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("cloudfunctions.net")
  ) {
    return;
  }

  // 1. オフラインデータ JSON リクエスト (/offline-books/*.json)
  if (url.pathname.startsWith("/offline-books/")) {
    event.respondWith(
      caches.match(request, { cacheName: DATA_CACHE_NAME }).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request);
      })
    );
    return;
  }

  // 2. 画像ファイル (Storage URL または拡張子が jpg/png/webp)
  const isImage =
    request.destination === "image" ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i) ||
    url.hostname.includes("firebasestorage.googleapis.com");

  if (isImage) {
    // キャッシュへの書き込みはここでは行わない。
    // 「明示的にオフライン保存した絵本のみ」をキャッシュする方針(#739)のため、
    // 書き込みは offline-book-storage.ts の downloadBookForOffline() だけが行う。
    // ここは読み取り専用: キャッシュにあれば返し、無ければネットワークへ。
    event.respondWith(
      caches.match(request, { cacheName: IMAGE_CACHE_NAME }).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).catch(
          () => new Response("", { status: 404, statusText: "Offline Image Not Found" })
        );
      })
    );
    return;
  }

  // 3. HTML / App Shell ページ遷移ナビゲーションのリクエスト
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        // オフライン時: キャッシュ済みHTMLがあれば返す。無ければ簡易オフライン応答
        // （再fetchはオフラインでは必ず失敗し respondWith が reject するため行わない）
        const cache = await caches.open(DATA_CACHE_NAME);
        const cachedHtml = await cache.match(request);
        if (cachedHtml) return cachedHtml;
        return new Response(
          "<!doctype html><meta charset=utf-8><title>オフライン</title><p style='font-family:sans-serif;padding:2rem'>オフラインです。接続を確認してください。</p>",
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      })
    );
  }
});

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
