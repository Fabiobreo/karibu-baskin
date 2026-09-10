# Service worker — funzionamento e procedura di emergenza

Il worker vive in `public/sw.js` ed è registrato da `ServiceWorkerRegistrar`
**solo in produzione**. Per provarlo in locale: `NEXT_PUBLIC_ENABLE_SW_IN_DEV=true`.

In sviluppo resta spento di proposito: intercetta i chunk di Turbopack e l'hot
reload, e un errore nella sua logica di cache si manifesta come un bug
dell'applicazione che non esiste.

## Strategie

| Richiesta                          | Strategia          | Fallback offline              |
| ---------------------------------- | ------------------ | ----------------------------- |
| `/admin`, `/profilo`, `/notifiche` | nessuna: rete pura | nessuno                       |
| `/_next/static/*` (hash nel nome)  | cache-first        | cache                         |
| Immagini, font, icone              | cache-first        | cache                         |
| `/api/` in `API_CACHE_PATTERNS`    | network-first      | cache, poi errore             |
| Altre `/api/`                      | nessuna: rete pura | nessuno                       |
| Navigazioni                        | network-first      | cache, poi `offline.html`     |
| Script, stili, media               | network-first      | cache, **mai** `offline.html` |

Tre regole da non violare quando si tocca il file.

1. **Il worker non inventa risposte.** Se la rete fallisce e non c'è nulla in
   cache, l'errore si propaga. Un 503 sintetico dall'aria plausibile viene
   scambiato dal client per una risposta valida: è così che la pagina di un
   allenamento mostrava "0 iscritti" con la rete a posto.
2. **Scrivere in cache non può influenzare la risposta.** Ogni `cache.put` sta
   dentro `event.waitUntil` e in un try/catch suo.
3. **`offline.html` solo alle navigazioni.** Un documento HTML consegnato dove è
   atteso JavaScript produce un ChunkLoadError e una schermata di errore.

I test in `src/lib/serviceWorker.test.ts` verificano queste regole caricando il
sorgente in uno scope worker finto. Girano in CI.

## Aggiornamento di versione

Alzare `VERSION` in cima al file. `activate` cancella tutte le cache che non
appartengono alla versione corrente, quindi il bump è anche il modo per
rimuovere dai dispositivi degli utenti cache scritte da versioni precedenti.

Il worker **non** chiama `skipWaiting()` da solo: la nuova versione resta in
attesa e `SwUpdateToast` propone l'aggiornamento. Prendere il controllo a metà
sessione significherebbe servire i chunk di una build a una pagina renderizzata
da un'altra.

`/sw.js` è servito con `Cache-Control: no-store` (vedi `next.config.ts`): senza,
il browser può tenerne una copia fino a 24 ore e continuare a reinstallare una
versione difettosa anche dopo il deploy del fix.

## Procedura di emergenza: disinstallare il worker da tutti i dispositivi

Serve se una versione in produzione si rivela difettosa. Un worker installato
sopravvive alla chiusura del browser e continua a servire dalla cache: non basta
correggere l'applicazione, bisogna raggiungere i client.

1. Sostituire **il contenuto** di `public/sw.js` con quanto segue, mantenendo il
   percorso invariato: i browser cercano l'aggiornamento a quell'URL.

```js
// KILL SWITCH — disinstalla il worker e svuota tutto ciò che ha in cache.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clientList = await self.clients.matchAll({ type: "window" });
      for (const client of clientList) client.navigate(client.url);
    })()
  );
});

// Nessun listener `fetch`: ogni richiesta va in rete senza intermediari.
```

2. Deployare. I client prendono la nuova versione al primo caricamento, si
   disinstallano e ricaricano una volta sola.
3. Verificare su un dispositivo che aveva la versione difettosa: DevTools →
   Application → Service Workers deve risultare vuoto, e Cache Storage anche.
4. Quando il worker corretto è pronto, ripristinare `public/sw.js` **alzando
   `VERSION`** e rideployare.

> Il kill switch non va tenuto in `main`. Si applica sul momento, si deploya, si
> revoca con il commit successivo.
