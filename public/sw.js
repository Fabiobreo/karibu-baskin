// Service Worker — Karibu Baskin
//
// Tre principi, da cui discende tutto il resto.
//
// 1. Il worker non inventa risposte. Se la rete fallisce e non c'è nulla in
//    cache, l'errore si propaga com'è: un 503 sintetico dall'aria plausibile è
//    peggio di un errore, perché il client lo scambia per una risposta valida.
//    L'unica eccezione è la pagina offline sulle navigazioni, che è una
//    risposta deliberata e riconoscibile.
//
// 2. Scrivere in cache non può influenzare la risposta. Ogni `cache.put` vive
//    dentro `event.waitUntil` e in un try/catch suo: quota piena, storage
//    negato o `Vary` inatteso restano problemi di cache, non diventano guasti
//    dell'applicazione.
//
// 3. Ogni tipo di richiesta ha la sua strategia. Servire `offline.html` a una
//    richiesta di JavaScript produce un ChunkLoadError e una schermata di
//    errore al posto della pagina offline: il contrario di quello che una PWA
//    deve fare. Il routing è deciso su `request.destination`, non per esclusione.

const VERSION = "karibu-v11";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const API_CACHE = `${VERSION}-api`;

const CURRENT_CACHES = [STATIC_CACHE, PAGE_CACHE, API_CACHE];

// Asset statici: cache-first, non cambiano spesso
const PRECACHE_STATIC = [
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.json",
  "/offline.html",
];

// Pagine pubbliche precaricate all'installazione. Mai un redirect: `cache.add`
// su una rotta che redirige salva una risposta "redirected" che poi non
// combacia più in lettura (per questo `/la-squadra` non è in elenco).
// Nota: l'HTML della home è personalizzato per gli utenti loggati. Resta nella
// cache del solo profilo browser che l'ha scaricato, e il logout la svuota
// (vedi PURGE_SESSION_CACHES).
const PRECACHE_PAGES = ["/", "/il-baskin", "/squadre", "/contatti", "/sponsor"];

// Aree riservate: mai in cache, nemmeno per l'offline. L'HTML di queste pagine
// contiene dati personali (email e ruoli di tutti i tesserati su /admin/utenti,
// dati dell'atleta e dei figli su /profilo) e resterebbe leggibile sul disco del
// browser anche dopo il logout, su dispositivi condivisi.
const PRIVATE_PATH_PREFIXES = ["/admin", "/profilo", "/notifiche"];

// API GET da tenere in cache offline (network-first, cache come fallback)
const API_CACHE_PATTERNS = [
  /\/api\/sessions/,
  /\/api\/teams\//,
  /\/api\/matches/,
  /\/api\/competitive-teams/,
  /\/api\/events/,
  /\/api\/calendar/,
];

// Sottorisorse: possono ricadere sulla cache, mai su offline.html.
const SUBRESOURCE_DESTINATIONS = ["script", "style", "font", "image", "audio", "video", "track"];

// ── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", (e) => {
  e.waitUntil(
    Promise.all([
      precacheAll(STATIC_CACHE, PRECACHE_STATIC),
      precacheAll(PAGE_CACHE, PRECACHE_PAGES),
    ])
  );
  // Nessuno `skipWaiting()` automatico: il nuovo worker resta in attesa finché
  // l'utente non accetta l'aggiornamento (vedi SwUpdateToast). Prendere il
  // controllo a metà sessione significa servire chunk di una build a una pagina
  // renderizzata da un'altra.
});

/** Precarica senza mai far fallire l'installazione e senza salvare redirect. */
async function precacheAll(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(url, { cache: "reload" });
      if (!isCacheable(response)) return;
      await cache.put(url, response);
    })
  );
}

// ── Activate ───────────────────────────────────────────────────────────────

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Solo same-origin, solo GET
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Aree riservate → rete pura. Vale anche per le richieste RSC
  // (`/admin/utenti?_rsc=…`), perché il controllo è sul pathname.
  if (isPrivatePath(url.pathname)) return;

  // Build immutabile: i nomi contengono l'hash del contenuto, quindi una voce in
  // cache non può essere stale. È anche ciò che rende affidabile l'offline: i
  // chunk della pagina che stai guardando ci sono già.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(cacheFirst(e, STATIC_CACHE));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    e.respondWith(cacheFirst(e, STATIC_CACHE));
    return;
  }

  if (isApiCacheable(url.pathname)) {
    e.respondWith(networkFirst(e, API_CACHE, { offlineFallback: false }));
    return;
  }

  // Altre API → rete pura (non cacheare POST, auth, dati personali)
  if (url.pathname.startsWith("/api/")) return;

  // Navigazioni → network-first, poi cache, poi la pagina offline.
  if (request.mode === "navigate" || request.destination === "document") {
    e.respondWith(networkFirst(e, PAGE_CACHE, { offlineFallback: true }));
    return;
  }

  // Sottorisorse (script, stili, font, immagini): possono ricadere sulla cache,
  // mai su offline.html. Un documento HTML consegnato dove è atteso JavaScript
  // fa fallire l'esecuzione e manda l'applicazione in errore.
  if (SUBRESOURCE_DESTINATIONS.includes(request.destination)) {
    e.respondWith(networkFirst(e, STATIC_CACHE, { offlineFallback: false }));
    return;
  }

  // Tutto il resto (payload RSC, prefetch, richieste senza destination nota):
  // rete, senza che il worker si metta in mezzo.
});

// ── Strategie ─────────────────────────────────────────────────────────────

/**
 * Cache-first per contenuto immutabile. Se non c'è in cache va in rete e la
 * scrittura avviene in background: un errore di storage non deve trasformarsi
 * in un asset mancante.
 */
async function cacheFirst(event, cacheName) {
  const cached = await caches.match(event.request);
  if (cached) return cached;

  const response = await fetch(event.request);
  cacheInBackground(event, cacheName, response);
  return response;
}

/**
 * Network-first con la cache come rete di salvataggio.
 *
 * Se la rete fallisce e non c'è nulla in cache, l'errore viene rilanciato: per
 * il chiamante è indistinguibile da un'assenza di service worker, che è
 * esattamente ciò che deve essere. Solo le navigazioni ricadono su
 * `offline.html`, perché lì una pagina di cortesia è meglio dell'errore del
 * browser.
 */
async function networkFirst(event, cacheName, { offlineFallback }) {
  try {
    const response = await fetch(event.request);
    cacheInBackground(event, cacheName, response);
    return response;
  } catch (err) {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    if (offlineFallback) {
      const offline = await caches.match("/offline.html", { cacheName: STATIC_CACHE });
      if (offline) return offline;
    }
    throw err;
  }
}

// ── Scrittura in cache ────────────────────────────────────────────────────

/**
 * Solo risposte complete, same-origin e non redirette.
 *
 * - `ok` esclude 4xx e 5xx, che non vanno serviti offline come se fossero validi;
 * - `type === "basic"` esclude opache e CORS, che non sappiamo interpretare;
 * - `redirected` va escluso perché una risposta "redirected" salvata in cache
 *   non combacia più in lettura e l'ingresso resta inutilizzabile;
 * - lo status 206 (parziale) non è memorizzabile e farebbe rifiutare `put`.
 */
function isCacheable(response) {
  return !!response && response.ok && response.type === "basic" && !response.redirected;
}

/**
 * Scrive in cache fuori dal percorso della risposta.
 *
 * `event.waitUntil` tiene vivo il worker fino a fine scrittura, ma la risposta
 * è già stata restituita: se `put` fallisce — quota esaurita, storage negato,
 * `Vary` inatteso — il fallimento resta confinato qui. È la ragione per cui la
 * scrittura non sta più dentro il `try` che decide cosa servire.
 */
function cacheInBackground(event, cacheName, response) {
  if (!isCacheable(response)) return;
  const copy = response.clone();
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(event.request, copy);
      } catch {
        // Cache non disponibile: l'utente ha comunque la sua risposta.
      }
    })()
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return (
    pathname === "/logo.png" ||
    pathname === "/manifest.json" ||
    pathname === "/offline.html" ||
    /\.(ico|png|jpg|jpeg|svg|webp|avif|woff2?|ttf)$/.test(pathname)
  );
}

function isApiCacheable(pathname) {
  return API_CACHE_PATTERNS.some((p) => p.test(pathname));
}

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// ── Messaggi dal client ────────────────────────────────────────────────────

/**
 * Svuota le cache che possono contenere dati di sessione. Chiamata dal client
 * subito prima di `signOut` (vedi `purgeServiceWorkerCaches` in
 * @/lib/swCachePurge): il logout deve lasciare il dispositivo pulito, non solo
 * invalidare il cookie.
 */
async function purgeSessionCaches() {
  await Promise.all([caches.delete(PAGE_CACHE), caches.delete(API_CACHE)]);
}

self.addEventListener("message", (e) => {
  const type = e.data && e.data.type;

  if (type === "PURGE_SESSION_CACHES") {
    const port = e.ports && e.ports[0];
    e.waitUntil(
      purgeSessionCaches()
        .then(() => port && port.postMessage({ ok: true }))
        .catch(() => port && port.postMessage({ ok: false }))
    );
    return;
  }

  // Attivazione richiesta dall'utente dal toast di aggiornamento.
  if (type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Push notifications ─────────────────────────────────────────────────────

const MUTABLE_TYPES = ["NEW_TRAINING", "TEAMS_READY", "MATCH_RESULT"];

self.addEventListener("push", (e) => {
  if (!e.data) return;
  let data = { title: "Karibu Baskin", body: "", url: "/", icon: "/logo.png", type: "" };
  try {
    data = { ...data, ...e.data.json() };
  } catch {}

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
      badge: "/badge.png",
      tag: isLinkNotif ? "link-request" : undefined,
      data: { url: data.url, type: data.type },
      vibrate,
      actions,
    })
  );
});

// Rinnovo automatico subscription quando il browser la ruota
self.addEventListener("pushsubscriptionchange", (e) => {
  const options = e.oldSubscription?.options ?? { userVisibleOnly: true };
  e.waitUntil(
    self.registration.pushManager
      .subscribe(options)
      .then((newSub) =>
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSub.toJSON()),
        })
      )
      .catch(() => {})
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
