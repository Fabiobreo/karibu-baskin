# UX-62 · Farsi trovare: SEO locale e scheda Google

**Ondata:** 7 (engagement) · **Stima:** M (di cui S di codice) · **Dipende da:** UX-55 (UTM) · **Stato:** codice fatto (12/11/2026) · **In attesa di:** approvazione dei testi del committente; il club completa la scheda Google che esiste già (punto 1)

Richiesta del committente del 06/11/2026 (piano di engagement).

## Problema

Le famiglie che cercano uno sport per un figlio con disabilità, o un'attività inclusiva, non cercano "Karibu Baskin": cercano "basket inclusivo Vicenza", "sport ragazzi disabili Montecchio", "baskin vicino a me". Su queste ricerche oggi il sito compete con pagine generiche, e in Google Maps il club si trova solo se esiste ed è curata la scheda Google dell'attività.

Il sito ha già una buona base tecnica (metadati con `buildMetadata()`, sitemap, JSON-LD `SportsOrganization` in home, `Event` e `SportsEvent`, pagina `/il-baskin`, FAQ, contatti con la sede). Mancano i pezzi che dicono a Google **dove** si trova il club e **per chi** è.

## Cosa fare

### 1. Scheda Google dell'attività (lavoro del club, non di codice)

Guida passo passo in `docs/workflows/scheda-google.md`, da seguire con chi gestisce i social:

- rivendicare o creare la scheda "Karibu Baskin" come **associazione sportiva**, all'indirizzo della palestra (lo stesso di `CLUB_VENUE` in `@/lib/clubVenue`, scritto in modo identico: Google confronta nome, indirizzo e telefono del sito e della scheda);
- orari = orari degli allenamenti abituali; categoria principale "Associazione sportiva", secondarie "Società di pallacanestro" e "Centro per attività per persone con disabilità" se disponibile;
- sito web: `withUtm("/", { source: "google", medium: "maps" })` (aggiungere `google` e `maps` ai valori ammessi di UX-55), così le visite dalla scheda si distinguono;
- 10 foto vere (palestra, squadra, partita) prese dagli album con il permesso del fotografo, senza minori riconoscibili senza liberatoria;
- **recensioni:** dopo un evento riuscito, lo staff manda ai genitori un messaggio con il link diretto per lasciare una recensione. Il testo pronto è nella guida. Rispondere sempre alle recensioni, anche in due righe;
- un post sulla scheda per ogni evento aperto (open day, torneo in casa).

### 2. Dati strutturati più precisi (`@/lib/structuredData`)

- `SportsOrganization` in home: aggiungere `address` completo (`PostalAddress`), `geo` (coordinate della palestra), `areaServed` (Montecchio Maggiore, provincia di Vicenza), `sport: "Baskin"`, `sameAs` con i profili social ufficiali (Instagram, YouTube, Facebook se c'è) e la scheda Google quando esiste, `logo`, `email` e `telephone` da `@/lib/clubContacts`.
- Nella pagina `/contatti` lo stesso oggetto (oggi c'è solo in home), così la pagina che Google associa alla sede ha l'indirizzo strutturato.
- `/faq`: `FAQPage` con le domande di `@/lib/content/faqs.ts` (solo le domande pubbliche), nella lingua della pagina.
- Test in `structuredData.test.ts`: l'output è JSON valido, non contiene `</script>`, e non contiene mai markup `Person` (regola di CLAUDE.md).

### 3. Testi delle pagine che rispondono alle ricerche

Nessuna pagina nuova "per i motori": si migliorano quelle che esistono, in italiano e in inglese, con il committente.

- `/il-baskin`: il primo paragrafo deve dire in parole semplici che cos'è e **per chi è** ("uno sport di squadra dove giocano insieme ragazzi e adulti con e senza disabilità"), e nominare il luogo ("a Montecchio Maggiore, in provincia di Vicenza"). Titolo della pagina (`<title>`) e descrizione rivisti per contenere "baskin", "basket inclusivo" e "Vicenza" senza diventare un elenco di parole.
- `/contatti#vieni-a-provare`: titolo e descrizione orientati a chi vuole provare ("Vieni a provare il baskin a Montecchio Maggiore: allenamenti, sede, cosa portare").
- Home: la riga "Basket inclusivo a Montecchio Maggiore" sotto il nome c'è già (UX-33): verificare che la descrizione dei metadati la riprenda.
- Ogni modifica a un testo citato nella guida va riportata in `/guida` (regola di `guide.test.ts`).

### 4. Link da altri siti

Lista in `docs/workflows/scheda-google.md` dei siti a cui chiedere un link (con `withUtm(..., { medium: "referral", source: "partner" })` quando possibile): Comune di Montecchio Maggiore (elenco associazioni), federazione/ente di promozione del baskin, scuole del territorio, cooperative e servizi sociali con cui il club collabora, sponsor (chiedere un link "Sosteniamo Karibu Baskin" dal loro sito: è anche visibilità per loro). Chi se ne occupa e quando, lo decide il club.

### 5. Verifica

- Google Search Console sul dominio (se non c'è già): sitemap inviata, controllo che le pagine principali siano indicizzate, nessun errore sui dati strutturati. Annotare qui le ricerche da cui arriva il sito oggi, per confrontarle fra tre mesi.

## Criteri di accettazione

- Il Rich Results Test di Google sulla home, su `/contatti` e su `/faq` non dà errori e riconosce l'organizzazione con indirizzo e l'elenco di FAQ.
- Nome, indirizzo e telefono sono scritti in modo identico in footer, `/contatti`, JSON-LD e scheda Google.
- I nuovi testi sono approvati dal committente e presenti in `it.json` ed `en.json`.
- La guida `docs/workflows/scheda-google.md` esiste e un volontario non tecnico può seguirla da solo.
- `npx tsc --noEmit`, `npm test`, `npm run a11y` verdi.

## Fuori da questo ticket

- URL localizzati o pagine in inglese indicizzate separatamente: la lingua è a cookie e gli URL restano uguali (scelta di CLAUDE.md).
- Pubblicità a pagamento (Google Ads, sponsorizzate sui social): se il club la vuole, si fa fuori dal sito, con i link UTM di UX-55.

## Esito (12/11/2026)

Decisioni del committente (12/11/2026), sulle raccomandazioni proposte:

- **Telefono pubblico:** uno solo, quello di Elisa (il primo del footer), `CLUB_PHONE` in `@/lib/clubContacts`. Lo stesso nel JSON-LD e sulla scheda Google.
- **La scheda Google esiste già** (controllato il 12/11/2026): [Asd Karibu Baskin Montecchio Maggiore](https://maps.google.com/?cid=10043041815261947815), categoria "Associazione", indirizzo identico al sito, sito `karibubaskin.it` senza UTM, orari, 2 foto; mancano telefono, descrizione e recensioni. Non si sa chi la gestisce: la guida parte da lì. **Il nome resta quello della scheda** (cambiarlo fa ripartire la verifica), ed è già uguale a `CLUB_LEGAL_NAME`.
- **Coordinate e link:** quelli del segnaposto della scheda, in `CLUB_VENUE_GEO` (`@/lib/clubVenue`) e `CLUB_GOOGLE_PROFILE_URL` (`@/lib/clubContacts`, link per `cid`), già nel JSON-LD.
- **Tipo:** `["SportsOrganization", "SportsClub"]`, così i validatori leggono un'attività con una sede. **Niente orari nel JSON-LD:** gli allenamenti cambiano, gli orari stanno solo sulla scheda Google.
- **Titoli e descrizioni restano in italiano** (come tutti i metadati del sito): Google arriva senza cookie e vede sempre l'italiano. In it e en vanno i testi delle pagine.
- **Visite dalla scheda:** non si contano in `/admin/metriche`; bastano "Arrivato da: google, maps" nell'email dei contatti e Search Console.

Fatto:

1. **Guida** [`docs/workflows/scheda-google.md`](../../workflows/scheda-google.md): che cos'è la scheda, come controllare se esiste già (prima di crearne una), creare o rivendicare con l'account del club, dati da copiare identici, descrizione pronta, foto (permesso del fotografo, niente minori riconoscibili senza liberatoria), recensioni con il messaggio per i genitori e le risposte, post per gli eventi, link da altri siti con il messaggio pronto, Search Console (proprietà Dominio con record DNS, nessuna modifica al codice). UTM: fonte `google` e mezzo `maps` in `@/lib/utm`, link pronti anche in `link-con-utm.md`.
2. **Dati strutturati:** l'associazione ha descrizione, immagine, telefono, `areaServed` (Montecchio Maggiore, Provincia di Vicenza), e `geo` e scheda Google nei `sameAs` appena ci sono (`CLUB_VENUE_GEO`, `CLUB_GOOGLE_PROFILE_URL`). Lo stesso blocco è in home e in `/contatti` (nel `layout.tsx`, perché la pagina è client). `/faq` ha `FAQPage` con tutte le domande, nella lingua della pagina (`faqPageJsonLd`). Test in `structuredData.test.ts`: indirizzo, telefono uguale al footer, FAQ in it e en, JSON valido senza `</script>` e senza `Person`.
3. **Testi:** `/il-baskin` apre con un paragrafo (`pages.ilbaskin.lead`, it e en) che dice per chi è e dove si gioca, con il link "Vieni a provare"; titolo "Il Baskin, basket inclusivo a Vicenza". Descrizioni nuove per home (riprende "Basket inclusivo a Montecchio Maggiore"), `/il-baskin`, `/contatti` (titolo "Contatti e vieni a provare") e `/faq`. Nessuna etichetta citata dalla guida è cambiata.
4. **Nome, indirizzo e telefono uguali ovunque:** `/contatti` prende telefoni ed email da `@/lib/clubContacts` (prima erano scritti a mano, "(+39) 349 297 2703").

Verificato: `tsc`, `npm test`, `npm run lint`, `npm run a11y -- --only=anon` verdi; nel browser il JSON-LD di `/contatti` e `/faq` (9 domande) e i titoli delle pagine.

**Da fare dopo:**

- Il club scopre chi gestisce la scheda, aggiunge l'account del club come proprietario e la completa seguendo la guida (telefono, descrizione, link con UTM, foto, recensioni).
- Il Rich Results Test di Google si può lanciare solo sull'indirizzo pubblico: dopo il deploy, su home, `/contatti` e `/faq`.
- Search Console: dopo un mese annotare qui le ricerche da cui arriva il sito, per il confronto a tre mesi.
