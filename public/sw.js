// Service Worker — Karibu Baskin
const VERSION = "karibu-v6";
const STATIC_CACHE  = `${VERSION}-static`;
const PAGE_CACHE    = `${VERSION}-pages`;
const API_CACHE     = `${VERSION}-api`;

// Asset statici: cache-first, non cambiano spesso
const PRECACHE_STATIC = [
  "/logo.png",
  "/manifest.json",
  "/offline.html",
];

// Pagine pubbliche: precache al primo avvio
const PRECACHE_PAGES = [
  "/",
  "/il-baskin",
  "/la-squadra",
  "/contatti",
  "/sponsor",
];

// API GET da tenere in cache offline (network-first, cache come fallback)
const API_CACHE_PATTERNS = [
  /\/api\/sessions/,
  /\/api\/teams\//,
  /\/api\/matches/,
  /\/api\/competitive-teams/,
  /\/api\/events/,
  /\/api\/calendar/,
];

// ── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", (e) => {
  e.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE_STATIC)),
      caches.open(PAGE_CACHE).then((c) =>
        Promise.allSettled(PRECACHE_PAGES.map((url) => c.add(url)))
      ),
    ]).then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────────────

self.addEventListener("activate", (e) => {
  const currentCaches = [STATIC_CACHE, PAGE_CACHE, API_CACHE];
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => !currentCaches.includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Solo same-origin, solo GET
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // 1. Asset statici → cache-first
  if (isStaticAsset(url.pathname)) {
    e.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 2. API GET → network-first, cache come fallback offline
  if (isApiCacheable(url.pathname)) {
    e.respondWith(networkFirstApi(request, API_CACHE));
    return;
  }

  // 3. Altre API → rete pura (non cacheare POST, auth, ecc.)
  if (url.pathname.startsWith("/api/")) return;

  // 4. Pagine HTML → network-first con fallback cache, poi offline.html
  e.respondWith(networkFirstPage(request));
});

// ── Strategie ─────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Asset non disponibile offline", { status: 503 });
  }
}

async function networkFirstApi(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Aggiorna la cache per uso offline
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline: restituisce l'ultima versione cached se disponibile
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Nessuna cache: mostra pagina offline
    const offline = await caches.match("/offline.html", { cacheName: STATIC_CACHE });
    return offline ?? new Response("Offline", { status: 503 });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return (
    pathname === "/logo.png" ||
    pathname === "/manifest.json" ||
    pathname === "/offline.html" ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?|ttf)$/)
  );
}

function isApiCacheable(pathname) {
  return API_CACHE_PATTERNS.some((p) => p.test(pathname));
}

// ── Push notifications ─────────────────────────────────────────────────────

const MUTABLE_TYPES = ["NEW_TRAINING", "TEAMS_READY", "MATCH_RESULT"];

self.addEventListener("push", (e) => {
  if (!e.data) return;
  let data = { title: "Karibu Baskin", body: "", url: "/", icon: "/logo.png", type: "" };
  try { data = { ...data, ...e.data.json() }; } catch {}

  // Vibrazione e badge differenziati per tipo
  const isLinkNotif = data.type === "LINK_REQUEST" || data.type === "LINK_RESPONSE";
  const vibrate = isLinkNotif ? [200, 100, 200, 100, 200] : [100, 50, 100];

  // Azione "Silenzia" solo per i tipi controllabili dall'utente
  const actions = MUTABLE_TYPES.includes(data.type)
    ? [{ action: "mute", title: "Non più queste" }]
    : [];

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: "/logo.png",
      tag: isLinkNotif ? "link-request" : undefined,
      data: { url: data.url, type: data.type },
      vibrate,
      actions,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  // Azione "Silenzia questo tipo di notifica"
  if (e.action === "mute") {
    const type = e.notification.data?.type;
    if (type && MUTABLE_TYPES.includes(type)) {
      e.waitUntil(
        fetch("/api/users/me/notif-prefs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ push: { [type]: false } }),
        }).catch(() => {})
      );
    }
    return;
  }

  const url = e.notification.data?.url ?? "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus().then((c) => c.navigate(url));
      return clients.openWindow(url);
    })
  );
});
