# UX-59 · Traguardi di costanza agli allenamenti e card da condividere

**Ondata:** 7 (engagement) · **Stima:** M · **Dipende da:** UX-56 (helper di condivisione) · **Stato:** da fare · **In attesa di:** conferma del committente sulle soglie (punto 1)

Richiesta del committente del 06/11/2026 (piano di engagement).

## Problema

1. **I traguardi parlano solo di partite.** Tutti i badge in `src/lib/rating/badges.ts` (`BADGE_DEFS`) si calcolano su `matchStats`: partite giocate, punti, precisione, vittorie, MVP. Chi gioca poco in campionato, o in un ruolo che segna poco, ne sblocca pochi o nessuno. In uno sport inclusivo è il contrario di quello che serve: la cosa che il club vuole premiare è **esserci**, e gli allenamenti sono la parte più grande della vita della squadra. Le presenze ci sono già (`Registration.attended`, segnate con la chiusura dell'allenamento, UX-13).
2. **L'orgoglio non esce dal sito.** Un genitore che riceve "Marco ha raggiunto 10 partite" non ha niente da mandare ai nonni o al gruppo WhatsApp della classe. È il contenuto che più di ogni altro verrebbe condiviso.

## Cosa fare

### 1. Nuova categoria "Allenamenti"

Proposta di soglie (da confermare con il committente prima di implementare, poi scriverle qui):

| id                  | Etichetta         | Regola                                                                      | Emoji | Livello |
| ------------------- | ----------------- | --------------------------------------------------------------------------- | ----- | ------- |
| `primo_allenamento` | Primo allenamento | 1 presenza segnata                                                          | 👟    | bronze  |
| `dieci_allenamenti` | 10 allenamenti    | 10 presenze                                                                 | 💪    | bronze  |
| `venticinque_all`   | 25 allenamenti    | 25 presenze                                                                 | 🔥    | silver  |
| `cinquanta_all`     | 50 allenamenti    | 50 presenze                                                                 | 🏅    | gold    |
| `mese_pieno`        | Mese pieno        | presente a tutti gli allenamenti di un mese solare con almeno 4 allenamenti | 📅    | silver  |
| `stagione_fedele`   | Stagione fedele   | presente ad almeno l'80% degli allenamenti di una stagione conclusa         | 🌟    | gold    |

- Si contano solo le presenze con `attended = true`; quelle non segnate (`NULL`) non contano, perché non si sa. Lo dice la descrizione del badge ("Presenze segnate dagli allenatori").
- "Mese pieno" e "Stagione fedele" contano solo gli allenamenti **a cui la persona poteva iscriversi** (`checkRegistrationAllowed` con i suoi dati: un allenamento riservato a un'altra squadra non deve rompere la serie).
- Persona unica (`@/lib/person`): le presenze della scheda figlio e dell'account collegato si sommano, come il resto dei dati sportivi.
- Nuova categoria `allenamenti` in `BadgeCategory`, `BADGE_CATEGORY_ORDER` (dopo `presenza`) e `BADGE_CATEGORY_LABELS`; etichette e descrizioni tradotte come quelle esistenti (decisione "Traguardi": le emoji restano).
- `StatsInput` riceve `trainingAttendance: { sessionId, date, eligible: boolean }[]`; `loadBadgeInput` in `badgeService.ts` la carica. Test in `badges.test.ts` per ogni soglia, per i `NULL` e per il mese con un allenamento riservato.

### 2. Quando si ricalcola

- Al salvataggio delle presenze: `PUT /api/sessions/[sessionId]/attendance` e "Salva e concludi" di `TrainingCloseForm` chiamano `reconcilePlayerBadges` per i presenti, con `inBackground`.
- Per allenamenti di oltre un mese fa (inserimento di storico con `ManageParticipantsDialog`) **nessuna notifica**, come per le partite storiche.
- **Backfill obbligatorio al deploy:** prima che qualcuno salvi delle presenze, eseguire `POST /api/admin/badges/backfill` (esiste già, senza notifiche), altrimenti alla prima chiusura di allenamento ogni atleta riceve in blocco i badge storici. Scriverlo nel paragrafo dei badge di `CLAUDE.md`, accanto all'avvertenza che c'è già.

### 3. Card del traguardo da condividere

- Componente `BadgeShareCard` (`@/components/rating/`), disegnato con stili inline e colori da `@/lib/palette` (html2canvas non legge il tema): formato verticale 1080 × 1350, emoji grande, nome del traguardo, nome del giocatore (**solo il nome, senza cognome**), data, logo del club, in fondo "karibubaskin.it" e il medaglione del livello (`medal`, metallo con forma: regola UX-29).
- Bottone "Condividi" su ogni badge sbloccato in `BadgeShowcase`, **solo** nel proprio profilo (`/profilo`, anche per i figli dal genitore) e mai nel profilo pubblico di altri. Usa `shareElementAsImage` con testo e link (UX-56): link al profilo pubblico se la persona ne ha uno (`@/lib/publicProfile`), altrimenti alla home, sempre con `withUtm(..., { campaign: "traguardo" })`.
- **Minori:** l'immagine si genera nel browser del genitore e non passa mai da una rotta con cache pubblica. Per un minore il link punta alla home e non al profilo (che risponde 404). È il genitore a decidere se e dove condividerla, e una riga sotto il bottone lo ricorda: "Stai condividendo il nome di Marco. Mandala solo a chi conosci."
- Anche dalla notifica: l'avviso `BADGE_UNLOCKED` porta al profilo con l'ancora sul badge (`/profilo#traguardo-<id>`), dove il bottone è subito visibile.

### 4. Profilo

- In `BadgeShowcase`, nei "prossimi traguardi" compaiono anche quelli degli allenamenti con la barra x/y ("7 allenamenti su 10"). È il motivo per cui un ragazzo chiede di andare all'allenamento successivo.

## Criteri di accettazione

- Un atleta con 10 presenze segnate e nessuna partita ha i badge "Primo allenamento" e "10 allenamenti" in `/profilo` e nel profilo pubblico.
- Un mese con 4 allenamenti, di cui uno riservato a un'altra squadra, e 3 presenze: "Mese pieno" sbloccato.
- Presenze `NULL` non contano; test dedicati.
- Dopo il backfill, chiudere un allenamento notifica solo i badge sbloccati da quella chiusura.
- "Condividi" su un badge produce un PNG con il solo nome di battesimo, l'emoji e il traguardo; nel testo del messaggio c'è il link con `utm_campaign=traguardo`. Per un minore il link è la home.
- Il bottone non compare sui profili pubblici di altri né per lo staff che guarda il profilo di qualcun altro.
- Testi in `it.json` ed `en.json`; `npx tsc --noEmit`, `npm test`, `npm run a11y` verdi.
