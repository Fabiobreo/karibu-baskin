import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Test del service worker (`public/sw.js`).
 *
 * Il worker è l'unico componente che, sbagliando, sopravvive al rilascio
 * successivo: resta installato sul dispositivo e continua a servire ciò che ha
 * in cache. È anche l'unico che finora poteva rompersi senza che nulla in CI se
 * ne accorgesse, perché non gira mai durante i test dell'applicazione.
 *
 * Il file non è un modulo ES: viene letto come sorgente ed eseguito dentro uno
 * scope worker finto, così i listener registrati diventano ispezionabili e le
 * decisioni di routing verificabili senza un browser.
 */

const ORIGIN = "https://karibubaskin.it";
const SW_PATH = path.join(process.cwd(), "public", "sw.js");

// ── Doppi di prova ────────────────────────────────────────────────────────────

interface FakeResponse {
  ok: boolean;
  status: number;
  type: string;
  redirected: boolean;
  body: string;
  clone: () => FakeResponse;
}

function makeResponse(
  body: string,
  { ok = true, status = 200, type = "basic", redirected = false } = {}
): FakeResponse {
  const res: FakeResponse = {
    ok,
    status,
    type,
    redirected,
    body,
    clone: () => ({ ...res, clone: res.clone }),
  };
  return res;
}

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
  destination: string;
}

function makeRequest(
  url: string,
  { method = "GET", mode = "no-cors", destination = "" } = {}
): FakeRequest {
  return { url: url.startsWith("http") ? url : `${ORIGIN}${url}`, method, mode, destination };
}

function navigation(url: string): FakeRequest {
  return makeRequest(url, { mode: "navigate", destination: "document" });
}

/** CacheStorage minima: abbastanza per open/put/match/keys/delete. */
function createCacheStorage() {
  const store = new Map<string, Map<string, FakeResponse>>();
  const keyOf = (req: FakeRequest | string) =>
    typeof req === "string" ? `${ORIGIN}${req}` : req.url;

  function openSync(name: string) {
    if (!store.has(name)) store.set(name, new Map());
    const bucket = store.get(name)!;
    return {
      put: vi.fn(async (req: FakeRequest | string, res: FakeResponse) => {
        bucket.set(keyOf(req), res);
      }),
      match: async (req: FakeRequest | string) => bucket.get(keyOf(req)),
    };
  }

  return {
    open: vi.fn(async (name: string) => openSync(name)),
    keys: vi.fn(async () => [...store.keys()]),
    delete: vi.fn(async (name: string) => store.delete(name)),
    match: vi.fn(async (req: FakeRequest | string, opts?: { cacheName?: string }) => {
      if (opts?.cacheName) return store.get(opts.cacheName)?.get(keyOf(req));
      for (const bucket of store.values()) {
        const hit = bucket.get(keyOf(req));
        if (hit) return hit;
      }
      return undefined;
    }),
    _seed(cacheName: string, url: string, res: FakeResponse) {
      openSync(cacheName);
      store.get(cacheName)!.set(`${ORIGIN}${url}`, res);
    },
    _names: () => [...store.keys()],
    _size: (name: string) => store.get(name)?.size ?? 0,
  };
}

type Listener = (event: unknown) => void;

function loadServiceWorker() {
  const source = readFileSync(SW_PATH, "utf8");
  const listeners = new Map<string, Listener[]>();
  const caches = createCacheStorage();
  const fetchMock = vi.fn();

  const clients = {
    claim: vi.fn().mockResolvedValue(undefined),
    matchAll: vi.fn().mockResolvedValue([]),
    openWindow: vi.fn().mockResolvedValue(undefined),
  };

  const self = {
    addEventListener(type: string, fn: Listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type)!.push(fn);
    },
    location: { origin: ORIGIN },
    skipWaiting: vi.fn(),
    clients,
    registration: {
      showNotification: vi.fn(),
      pushManager: { subscribe: vi.fn() },
    },
  };
  const run = new Function("self", "caches", "fetch", "clients", source);
  run(self, caches, fetchMock, clients);

  function dispatch(type: string, event: unknown) {
    for (const fn of listeners.get(type) ?? []) fn(event);
  }

  return { self, caches, fetchMock, dispatch, listeners };
}

/** Simula un FetchEvent e restituisce ciò che il worker ha deciso di fare. */
function fireFetch(sw: ReturnType<typeof loadServiceWorker>, request: FakeRequest) {
  const waits: Promise<unknown>[] = [];
  const event = {
    request,
    responsePromise: undefined as Promise<FakeResponse> | undefined,
    respondWith(p: Promise<FakeResponse>) {
      this.responsePromise = p;
    },
    waitUntil(p: Promise<unknown>) {
      waits.push(p);
    },
  };
  sw.dispatch("fetch", event);
  return {
    handled: event.responsePromise !== undefined,
    response: event.responsePromise,
    settleWrites: () => Promise.allSettled(waits),
  };
}

// ── Routing ───────────────────────────────────────────────────────────────────

describe("service worker · routing", () => {
  let sw: ReturnType<typeof loadServiceWorker>;

  beforeEach(() => {
    sw = loadServiceWorker();
    sw.fetchMock.mockResolvedValue(makeResponse("ok"));
  });

  it("non intercetta le richieste non-GET", () => {
    expect(fireFetch(sw, makeRequest("/api/sessions", { method: "POST" })).handled).toBe(false);
  });

  it("non intercetta le richieste cross-origin", () => {
    expect(fireFetch(sw, makeRequest("https://esempio.test/x")).handled).toBe(false);
  });

  it.each(["/admin", "/admin/utenti", "/profilo", "/profilo/disponibilita", "/notifiche"])(
    "lascia passare %s senza toccarlo",
    (pathname) => {
      // Le aree riservate non devono nemmeno sfiorare la cache: l'HTML contiene
      // email e ruoli dei tesserati.
      expect(fireFetch(sw, navigation(pathname)).handled).toBe(false);
    }
  );

  it("intercetta /amministrazione, che non è un'area riservata", () => {
    // Il controllo è per segmento: un prefisso nudo farebbe passare per privata
    // qualunque rotta che inizia per "/admin".
    expect(fireFetch(sw, navigation("/amministrazione")).handled).toBe(true);
  });

  it("non intercetta le API non elencate", () => {
    expect(fireFetch(sw, makeRequest("/api/users/me")).handled).toBe(false);
    expect(fireFetch(sw, makeRequest("/api/registrations?sessionId=x")).handled).toBe(false);
  });

  it("intercetta le API elencate per l'offline", () => {
    expect(fireFetch(sw, makeRequest("/api/sessions")).handled).toBe(true);
    expect(fireFetch(sw, makeRequest("/api/calendar")).handled).toBe(true);
  });
});

// ── Comportamento in errore ───────────────────────────────────────────────────

describe("service worker · rete assente", () => {
  let sw: ReturnType<typeof loadServiceWorker>;

  beforeEach(() => {
    sw = loadServiceWorker();
    sw.fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  });

  it("serve la pagina offline a una navigazione senza cache", async () => {
    sw.caches._seed("karibu-v11-static", "/offline.html", makeResponse("OFFLINE"));
    const res = await fireFetch(sw, navigation("/classifiche")).response;
    expect(res?.body).toBe("OFFLINE");
  });

  it("preferisce la pagina in cache alla pagina offline", async () => {
    sw.caches._seed("karibu-v11-static", "/offline.html", makeResponse("OFFLINE"));
    sw.caches._seed("karibu-v11-pages", "/squadre", makeResponse("SQUADRE"));
    const res = await fireFetch(sw, navigation("/squadre")).response;
    expect(res?.body).toBe("SQUADRE");
  });

  it.each([
    ["script", "/_next/chunk.js"],
    ["style", "/_next/app.css"],
    ["font", "/fonts/inter.woff2"],
    ["image", "/_next/image?url=%2Fhero.jpg"],
  ])("non serve mai offline.html a una richiesta di tipo %s", async (destination, url) => {
    // È il difetto che produceva ChunkLoadError e schermata 500: un documento
    // HTML consegnato dove è atteso JavaScript non è eseguibile.
    sw.caches._seed("karibu-v11-static", "/offline.html", makeResponse("<!doctype html>"));
    const { response } = fireFetch(sw, makeRequest(url, { destination }));
    await expect(response).rejects.toThrow();
  });

  it("propaga l'errore di rete sulle API invece di inventare un 503", async () => {
    // Una risposta sintetica dall'aria plausibile è peggio di un errore: il
    // client la scambia per valida e rende uno stato vuoto al posto di uno di
    // errore. È così che "0 iscritti" finiva a schermo con la rete a posto.
    const { response } = fireFetch(sw, makeRequest("/api/sessions"));
    await expect(response).rejects.toThrow();
  });

  it("usa la cache delle API quando c'è", async () => {
    sw.caches._seed("karibu-v11-api", "/api/sessions", makeResponse("[]"));
    const res = await fireFetch(sw, makeRequest("/api/sessions")).response;
    expect(res?.body).toBe("[]");
  });
});

// ── Scrittura in cache ────────────────────────────────────────────────────────

describe("service worker · scrittura in cache", () => {
  let sw: ReturnType<typeof loadServiceWorker>;

  beforeEach(() => {
    sw = loadServiceWorker();
  });

  it("un fallimento di scrittura non altera la risposta", async () => {
    // Quota esaurita, storage negato, Vary inatteso: restano problemi di cache.
    sw.fetchMock.mockResolvedValue(makeResponse("CONTENUTO"));
    sw.caches.open.mockRejectedValue(new Error("QuotaExceededError"));

    const call = fireFetch(sw, navigation("/squadre"));
    const res = await call.response;
    expect(res?.body).toBe("CONTENUTO");
    await call.settleWrites();
  });

  it("non mette in cache le risposte di errore", async () => {
    sw.fetchMock.mockResolvedValue(makeResponse("boom", { ok: false, status: 500 }));
    const call = fireFetch(sw, navigation("/squadre"));
    await call.response;
    await call.settleWrites();
    expect(sw.caches._size("karibu-v11-pages")).toBe(0);
  });

  it("non mette in cache le risposte redirette", async () => {
    // Una risposta "redirected" salvata in cache non combacia più in lettura e
    // l'ingresso resta inutilizzabile.
    sw.fetchMock.mockResolvedValue(makeResponse("redirect", { redirected: true }));
    const call = fireFetch(sw, navigation("/la-squadra"));
    await call.response;
    await call.settleWrites();
    expect(sw.caches._size("karibu-v11-pages")).toBe(0);
  });

  it("non mette in cache le risposte opache", async () => {
    sw.fetchMock.mockResolvedValue(makeResponse("opaca", { type: "opaque" }));
    const call = fireFetch(sw, navigation("/squadre"));
    await call.response;
    await call.settleWrites();
    expect(sw.caches._size("karibu-v11-pages")).toBe(0);
  });

  it("salva le pagine valide per l'offline", async () => {
    sw.fetchMock.mockResolvedValue(makeResponse("SQUADRE"));
    const call = fireFetch(sw, navigation("/squadre"));
    await call.response;
    await call.settleWrites();
    expect(sw.caches._size("karibu-v11-pages")).toBe(1);
  });

  it("serve gli asset con hash dalla cache senza toccare la rete", async () => {
    sw.caches._seed("karibu-v11-static", "/_next/static/chunks/abc.js", makeResponse("JS"));
    const res = await fireFetch(
      sw,
      makeRequest("/_next/static/chunks/abc.js", { destination: "script" })
    ).response;
    expect(res?.body).toBe("JS");
    expect(sw.fetchMock).not.toHaveBeenCalled();
  });
});

// ── Messaggi ─────────────────────────────────────────────────────────────────

describe("service worker · messaggi dal client", () => {
  it("PURGE_SESSION_CACHES svuota pagine e API ma non gli asset statici", async () => {
    const sw = loadServiceWorker();
    sw.caches._seed("karibu-v11-pages", "/profilo", makeResponse("privato"));
    sw.caches._seed("karibu-v11-api", "/api/sessions", makeResponse("[]"));
    sw.caches._seed("karibu-v11-static", "/logo.png", makeResponse("png"));

    const waits: Promise<unknown>[] = [];
    const port = { postMessage: vi.fn() };
    sw.dispatch("message", {
      data: { type: "PURGE_SESSION_CACHES" },
      ports: [port],
      waitUntil: (p: Promise<unknown>) => waits.push(p),
    });
    await Promise.allSettled(waits);

    expect(sw.caches._names()).toEqual(["karibu-v11-static"]);
    expect(port.postMessage).toHaveBeenCalledWith({ ok: true });
  });

  it("SKIP_WAITING attiva la nuova versione solo su richiesta", () => {
    const sw = loadServiceWorker();
    // L'installazione non deve prendere il controllo da sola: servirebbe i
    // chunk di una build a una pagina renderizzata da un'altra.
    sw.dispatch("install", { waitUntil: () => {} });
    expect(sw.self.skipWaiting).not.toHaveBeenCalled();

    sw.dispatch("message", { data: { type: "SKIP_WAITING" }, waitUntil: () => {} });
    expect(sw.self.skipWaiting).toHaveBeenCalled();
  });
});

// ── Attivazione ──────────────────────────────────────────────────────────────

describe("service worker · attivazione", () => {
  it("cancella le cache delle versioni precedenti", async () => {
    const sw = loadServiceWorker();
    sw.caches._seed("karibu-v9-pages", "/admin/utenti", makeResponse("dati personali"));
    sw.caches._seed("karibu-v10-pages", "/squadre", makeResponse("vecchio"));
    sw.caches._seed("karibu-v11-pages", "/squadre", makeResponse("nuovo"));

    const waits: Promise<unknown>[] = [];
    sw.dispatch("activate", { waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.allSettled(waits);

    // È così che l'HTML dell'area admin già salvato sui dispositivi sparisce al
    // primo aggiornamento, invece di restare lì per sempre.
    expect(sw.caches._names()).toEqual(["karibu-v11-pages"]);
  });
});
