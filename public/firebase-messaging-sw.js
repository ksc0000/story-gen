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
  event.waitUntil(
    (async () => {
      // キャッシュ名を更新(v2など)した際に旧世代を確実に回収する
      const keep = new Set([DATA_CACHE_NAME, IMAGE_CACHE_NAME]);
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("ehoria-offline-") && !keep.has(n)).map((n) => caches.delete(n))
      );
      await clients.claim();
    })()
  );
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

  // 1. 絵本画像 (Firebase Storage)。
  //    オフライン保存(downloadBookForOffline)が書き込むのは Storage の画像だけなので、
  //    傍受もこのホストに限定する。アプリ内アイコン等まで SW を経由させると
  //    空キャッシュへの無駄な照会が全画像リクエストに乗るため。
  //    (オフライン絵本の JSON は offline-book-storage.ts が caches API を直接読むため fetch は来ない)
  const isBookImage = url.hostname === "firebasestorage.googleapis.com";

  if (isBookImage) {
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

  // 2. HTML / ページ遷移ナビゲーション。
  //    現状はアプリシェル(HTML/_next/static)をキャッシュしていないため、オフラインの
  //    コールドスタートは成立しない（ダウンロード済み絵本はタブが開いている間のみ読める）。
  //    シェルの事前キャッシュは別issueで扱う。ここでは簡易オフライン応答のみ返す。
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
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
