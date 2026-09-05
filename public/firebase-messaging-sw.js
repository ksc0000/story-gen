/* eslint-disable no-undef */
// FCM バックグラウンド通知 & PWA オフラインキャッシュ兼用 Service Worker。
// Firebase 設定はリポジトリにコミットせず、登録時の URL クエリパラメータで注入する
// （src/lib/push.ts / src/lib/offline-book-storage.ts が ?apiKey=... 付きで register する）。
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const DATA_CACHE_NAME = "ehoria-offline-data-v1";
const IMAGE_CACHE_NAME = "ehoria-offline-images-v1";
const APP_SHELL_CACHE_PREFIX = "ehoria-app-shell-v";

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

// -----------------------------------------------------------------------------
// App Shell 事前キャッシュ (Precache)
// -----------------------------------------------------------------------------
async function precacheAppShell() {
  try {
    const res = await fetch("/app-shell-manifest.json", { cache: "no-store" });
    if (!res.ok) return;
    const manifest = await res.json();
    if (!manifest || !manifest.version || !Array.isArray(manifest.urls)) return;

    const targetCacheName = `${APP_SHELL_CACHE_PREFIX}${manifest.version}`;
    const cache = await caches.open(targetCacheName);

    // キャッシュをバッチで取得・保管
    await cache.addAll(manifest.urls);
  } catch (err) {
    console.warn("SW precacheAppShell failed:", err);
  }
}

async function getActiveAppShellCache() {
  const names = await caches.keys();
  const shellCaches = names.filter((n) => n.startsWith(APP_SHELL_CACHE_PREFIX));
  if (shellCaches.length === 0) return null;
  // アルファベット順（または最新）の App Shell キャッシュを返す
  shellCaches.sort().reverse();
  return shellCaches[0];
}

async function matchAppShellHtml(targetHtml) {
  // 1. 完全一致（Cache Storage 全体から検索）
  let cachedRes = await caches.match(targetHtml);
  if (cachedRes) return cachedRes;

  // 2. 絵本閲覧ページ (/book/...) のフォールバック -> /book/index.html
  if (targetHtml.startsWith("/book/")) {
    cachedRes = await caches.match("/book/index.html");
    if (cachedRes) return cachedRes;
  }

  // 3. 全体フォールバック -> /index.html
  cachedRes = await caches.match("/index.html");
  if (cachedRes) return cachedRes;

  return null;
}

// Service Worker ライフサイクル管理
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await precacheAppShell();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 最新の App Shell キャッシュ以外の旧世代App Shellキャッシュを削除
      const activeShellCache = await getActiveAppShellCache();
      const keep = new Set([DATA_CACHE_NAME, IMAGE_CACHE_NAME]);
      if (activeShellCache) {
        keep.add(activeShellCache);
      }
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => (n.startsWith("ehoria-offline-") || n.startsWith(APP_SHELL_CACHE_PREFIX)) && !keep.has(n))
          .map((n) => caches.delete(n))
      );
      await clients.claim();
    })()
  );
});

// Cache Storage からのオフライン応答（画像 & オフラインブックメタデータ & App Shell）
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
  //    傍受もこのホストに限定する。
  const isBookImage = url.hostname === "firebasestorage.googleapis.com";

  if (isBookImage) {
    event.respondWith(
      caches.match(request, { cacheName: IMAGE_CACHE_NAME }).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).catch((err) => {
          // ページ側の明示的な fetch(mode:"cors") は失敗を「例外」として受け取り、
          // no-cors へフォールバックする設計（offline-book-storage.ts）。ここで 404 に
          // 変換すると CORS 失敗が隠れてフォールバックが働かないため、そのまま伝播させる。
          if (request.mode === "cors") throw err;
          // <img> 等の no-cors リクエストは、オフライン時に壊れたまま待たせず 404 で即応答する。
          return new Response("", { status: 404, statusText: "Offline Image Not Found" });
        });
      })
    );
    return;
  }

  // 2. Next.js ビルド静的アセット (/_next/static/**)
  //    Cache-First (アセットハッシュが付与されるため不変)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then(async (networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const activeShellCache = await getActiveAppShellCache();
            if (activeShellCache) {
              const copy = networkResponse.clone();
              const cache = await caches.open(activeShellCache);
              await cache.put(request, copy);
            }
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. HTML / ページ遷移ナビゲーション。
  //    Network-first 戦略: オンライン時は最新のネットワークレスポンスを返しつつ、失敗時（オフラインコールドスタート）は
  //    事前キャッシュされた該当ルートの HTML (/book/index.html, /bookshelf/index.html, /index.html) を返す。
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const activeShellCache = await getActiveAppShellCache();
            if (activeShellCache) {
              const copy = networkResponse.clone();
              const cache = await caches.open(activeShellCache);
              await cache.put(request, copy);
            }
          }
          return networkResponse;
        })
        .catch(async () => {
          let path = url.pathname;
          if (!path.endsWith("/") && !path.endsWith(".html")) {
            path += "/";
          }
          const targetHtml = path.endsWith("/") ? `${path}index.html` : path;

          const cachedRes = await matchAppShellHtml(targetHtml);
          if (cachedRes) {
            return cachedRes;
          }

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
