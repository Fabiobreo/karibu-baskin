# Piano: suggerimenti, notifiche e risposte all'autore

Data: 2026-10-19. Stato: da implementare.

Questo piano è scritto per essere eseguito passo per passo. Leggi prima `CLAUDE.md` alla radice,
`src/components/CLAUDE.md` e `src/app/api/CLAUDE.md`: le regole lì valgono sempre (colori, pesi,
raggi, bottoni, i18n, niente em dash "—" nelle stringhe UI, `inBackground` per le notifiche).
Esegui le fasi nell'ordine. Alla fine di ogni fase: `npx tsc --noEmit` deve essere verde.

## Obiettivo

1. Lo staff (allenatori e admin) riceve push e notifica in-app quando arriva un suggerimento nuovo.
2. Lo staff che ha già scritto su un suggerimento riceve un avviso quando un collega aggiunge una
   nota o una risposta.
3. Lo staff può scrivere due cose diverse: una **nota interna** (la vede solo lo staff, come oggi) o
   una **risposta all'autore**. La risposta arriva all'autore con una notifica e si legge nella
   nuova pagina `/profilo/suggerimenti`.
4. L'anonimato resta: lo staff non vede mai chi ha scritto il suggerimento. `Suggestion.userId` non
   arriva mai al client dello staff; al suo posto c'è solo un booleano `canReply`.
5. La pagina `/admin/suggerimenti` viene riordinata secondo le regole del pannello (UX-40, UX-47).

## Fuori dal piano (non farlo)

- L'autore **non** può rispondere alla risposta (niente conversazione a due vie).
- Niente tracciamento "letto/non letto" per persona, niente nuove preferenze notifiche.
- Niente nuovo cron (sono già 7, il massimo).
- Niente React Query nel componente admin: le altre pagine admin usano `fetch` + stato locale,
  restiamo coerenti con quelle.
- Non cambiare i tre stati esistenti (`NUOVO`, `LETTO`, `ARCHIVIATO`).

## Decisioni già prese

| Tema                               | Decisione                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Tipo di notifica                   | Nuovo valore `SUGGESTION` in `AppNotificationType` (non controllabile dalle preferenze)     |
| Chi riceve "nuovo suggerimento"    | `staffUserIds()` (COACH + ADMIN), escluso l'autore stesso se è staff                        |
| Chi riceve "nuova nota / risposta" | Gli autori delle note precedenti di quel suggerimento, escluso chi scrive ora               |
| Chi riceve "risposta"              | Anche l'autore del suggerimento (`Suggestion.userId`), se esiste e non è chi scrive         |
| Nome dello staff nella risposta    | All'autore la risposta si mostra come "Lo staff", **senza** nome di chi l'ha scritta        |
| Stato automatico                   | Aggiungere una nota o una risposta a un suggerimento `NUOVO` lo porta a `LETTO`             |
| Filtro di partenza in admin        | "Da gestire" (`NUOVO` + `LETTO`)                                                            |
| Ordine in admin                    | Per ultima attività (data dell'ultima nota, o del suggerimento se non ha note), decrescente |
| Lingua delle notifiche             | Italiano, come tutte le altre notifiche salvate nel DB                                      |

---

## Fase 1: database

File: `prisma/schema.prisma`.

1. In `enum AppNotificationType` aggiungi in fondo:
   ```prisma
   SUGGESTION // suggerimento nuovo o nota/risposta su un suggerimento
   ```
2. In `model SuggestionNote` aggiungi, dopo `body`:
   ```prisma
   // true = risposta all'autore del suggerimento (la legge in /profilo/suggerimenti);
   // false = nota interna, solo per lo staff.
   isReply      Boolean    @default(false)
   ```
   Aggiorna anche il commento sopra il modello: non è più solo "interna".
3. Genera la migration contro il DB di **sviluppo** (`.env`, mai `.env.prod.back`):
   ```bash
   npm run db:migrate
   ```
   Nome: `suggestion_replies`. La SQL attesa è circa:
   ```sql
   ALTER TYPE "AppNotificationType" ADD VALUE 'SUGGESTION';
   ALTER TABLE "SuggestionNote" ADD COLUMN "isReply" BOOLEAN NOT NULL DEFAULT false;
   ```
   Se Prisma genera qualcosa di diverso (drop, recreate), fermati e chiedi.
4. `npm run db:generate`.

Dopo la migration `tsc` fallirà in `src/lib/notifications/notificationDisplay.ts` (il `Record`
sull'enum vuole la nuova chiave): è previsto, si sistema nella fase 2.

---

## Fase 2: registrare il tipo `SUGGESTION`

1. `src/lib/notifications/notificationDisplay.ts`, in `CONTENT_FIELD`:
   ```ts
   // "Nuovo suggerimento", "Lo staff ha risposto…": il titolo è il tipo, il contenuto è nel testo.
   SUGGESTION: "body",
   ```
2. `src/components/notifications/NotificationItem.tsx`, in `NotifIcon`: aggiungi un ramo con
   `LightbulbIcon` (`@mui/icons-material/Lightbulb`) e lo stesso `ICON_SX` degli altri.
3. Cerca nel codice altri `Record<AppNotificationType, …>` o `switch` sui tipi
   (`grep -rn "MATCH_AVAILABILITY" src`) e aggiungi `SUGGESTION` dove serve. Se esiste un test di
   `notificationDisplay` con l'elenco dei tipi, aggiornalo.

---

## Fase 3: logica condivisa (`src/lib/suggestions/`)

Crea una cartella `src/lib/suggestions/` con tre file. Sono funzioni piccole e testabili.

### 3a. `src/lib/suggestions/adminSuggestion.ts`

Unico posto che decide cosa vede lo staff. Oggi la stessa `select` è copiata in tre file
(`app/admin/(dashboard)/suggerimenti/page.tsx`, `api/suggestions/route.ts`,
`api/suggestions/[id]/route.ts`): sostituiscile tutte con questo.

```ts
import type { Prisma } from "@prisma/client";

/**
 * Cosa legge il pannello di un suggerimento. `userId` si legge solo per sapere se
 * si può rispondere: `toAdminSuggestion` lo trasforma in `canReply` e lo toglie.
 * Lo staff non deve mai ricevere chi ha scritto il suggerimento.
 */
export const ADMIN_SUGGESTION_SELECT = {
  id: true,
  category: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  notes: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      isReply: true,
      createdAt: true,
      author: { select: { id: true, name: true, image: true, customImage: true } },
    },
  },
} as const satisfies Prisma.SuggestionSelect;

type Row = Prisma.SuggestionGetPayload<{ select: typeof ADMIN_SUGGESTION_SELECT }>;

export interface AdminSuggestionNote {
  id: string;
  body: string;
  isReply: boolean;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null; customImage: string | null };
}

export interface AdminSuggestion {
  id: string;
  category: Row["category"];
  message: string;
  status: Row["status"];
  createdAt: string;
  updatedAt: string;
  /** L'autore ha ancora un account: si può rispondergli. */
  canReply: boolean;
  /** Data dell'ultima nota, o del suggerimento: serve all'ordinamento. */
  lastActivityAt: string;
  notes: AdminSuggestionNote[];
}

export function toAdminSuggestion(row: Row): AdminSuggestion {
  /* … */
}
```

`toAdminSuggestion` costruisce l'oggetto **campo per campo** (niente `...row`, altrimenti `userId`
passa). Le date diventano stringhe ISO. `lastActivityAt` = `createdAt` dell'ultima nota, altrimenti
`createdAt` del suggerimento.

Esporta anche `sortByActivity(items: AdminSuggestion[])`: ordinamento decrescente su
`lastActivityAt` (copia, non muta).

Test `adminSuggestion.test.ts`:

- l'oggetto restituito **non ha** la chiave `userId` (`expect("userId" in out).toBe(false)`);
- `canReply` è `true` con `userId` valorizzato e `false` con `null`;
- `lastActivityAt` è quella dell'ultima nota, o del suggerimento senza note;
- `sortByActivity` mette prima il suggerimento vecchio con una nota recente.

### 3b. `src/lib/suggestions/suggestionNotify.ts`

Costruisce gli avvisi in modo puro (stile di `src/lib/notifications/matchNotify.ts`, riusa il suo
tipo `OutgoingNotice`; se non è esportato, esportalo da lì).

```ts
export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  APP: "App / sito",
  ALLENAMENTI: "Allenamenti",
  PARTITE_EVENTI: "Partite ed eventi",
  ALTRO: "Altro",
};
```

(Usa questa costante anche nel componente admin, al posto della copia locale.)

Funzioni:

- `excerpt(text: string, max = 120): string`: spazi e a capo compressi in uno spazio, `trim`; se è
  più lungo di `max`, taglia all'ultimo spazio prima di `max` e aggiungi `…`.
- `adminSuggestionUrl(id: string)` → `` `/admin/suggerimenti?apri=${id}` ``.
- `newSuggestionNotice(s: { id; category; message; authorId: string | null }, staffIds: string[]): OutgoingNotice | null`
  - destinatari: `staffIds` senza `authorId`; `null` se la lista è vuota;
  - `type: "SUGGESTION"`, `title: "Nuovo suggerimento"`,
    `body: \`${SUGGESTION_CATEGORY_LABELS[category]}: ${excerpt(message)}\``,
`url: adminSuggestionUrl(id)`.
- `noteNotices(input): OutgoingNotice[]` con
  ```ts
  input: {
    suggestionId: string;
    suggestionAuthorId: string | null; // Suggestion.userId
    writerId: string;                  // chi scrive ora
    writerName: string | null;
    previousNoteAuthorIds: string[];   // autori delle note già presenti
    body: string;
    isReply: boolean;
  }
  ```
  Regole:
  - **staff partecipanti** = `previousNoteAuthorIds` senza duplicati, senza `writerId` e senza
    `suggestionAuthorId` (chi ha scritto il suggerimento riceve semmai l'avviso dell'autore, e
    mai due avvisi). Se non è vuota, un avviso: - nota interna: `title: "Nuova nota su un suggerimento"`; - risposta: `title: "Risposta inviata all'autore di un suggerimento"`; - `body: \`${primoNome(writerName) ?? "Lo staff"}: ${excerpt(body)}\``,
`url: adminSuggestionUrl(suggestionId)`.
  - **autore**: solo se `isReply`, `suggestionAuthorId` non è null e diverso da `writerId`:
    `title: "Lo staff ha risposto al tuo suggerimento"`, `body: excerpt(body)`,
    `url: \`/profilo/suggerimenti#s-${suggestionId}\``. Nessun nome dello staff in questo avviso.
  - Le stringhe non devono contenere "—".

Test `suggestionNotify.test.ts` (tutti i casi sopra):

- `excerpt` comprime gli spazi, non taglia sotto il limite, taglia sulla parola con `…`;
- nuovo suggerimento: l'autore staff è escluso; lista vuota → `null`;
- nota interna: l'autore del suggerimento non riceve niente, chi scrive è escluso, duplicati tolti;
- risposta: l'autore riceve l'avviso con l'URL del profilo e senza il nome dello staff;
- risposta scritta dall'autore stesso (è staff): nessun avviso all'autore;
- l'autore che è anche fra i partecipanti riceve **un solo** avviso (quello da autore).

### 3c. `src/lib/suggestions/deliver.ts`

```ts
/** Manda push e in-app per ogni avviso. Da chiamare dentro `inBackground`. */
export async function deliverSuggestionNotices(notices: OutgoingNotice[]): Promise<void>;
```

Per ogni avviso, in parallelo: `sendPushToUsers(ids, { title: "💡 " + title, body, url })`
(`@/lib/notifications/webpush`, con `.catch` che logga `[push suggestion]`) e
`createTargetedAppNotifications(ids, { type, title, body, url })`
(`@/lib/notifications/appNotifications`). Guarda come lo fa `notifyStaffOfNewUser` in
`src/lib/userName.ts` e se `matchNotify.ts` ha già un `deliver…` riusabile: in quel caso usa quello
invece di scriverne uno nuovo.

---

## Fase 4: API

### 4a. Schema Zod (`src/lib/schemas/suggestion.ts`)

```ts
export const SUGGESTION_NOTE_KINDS = ["NOTE", "REPLY"] as const;

export const SuggestionNoteCreateSchema = z.object({
  body: /* com'è oggi */,
  kind: z.enum(SUGGESTION_NOTE_KINDS, { message: "Tipo non valido" }).default("NOTE"),
});
```

Aggiorna `suggestion.test.ts`: senza `kind` vale `NOTE`; `REPLY` accettato; altro valore rifiutato.

### 4b. `POST /api/suggestions` (`src/app/api/suggestions/route.ts`)

- `create` con `select: { id: true, category: true, message: true }`.
- Metti la `create` in `try/catch` (regola del progetto: niente Prisma fuori da try/catch nelle
  scritture); in errore `500` JSON `{ error: "Suggerimento non salvato" }`.
- Dopo la creazione:
  ```ts
  inBackground(
    (async () => {
      const notice = newSuggestionNotice(
        { ...created, authorId: session.user.id },
        await staffUserIds()
      );
      if (notice) await deliverSuggestionNotices([notice]);
    })(),
    "notification new suggestion"
  );
  ```
- La risposta resta `{ ok: true }` (nessuna eco dell'autore).
- La GET usa `ADMIN_SUGGESTION_SELECT` + `toAdminSuggestion` + `sortByActivity`.

### 4c. `PATCH /api/suggestions/[id]`

Usa `ADMIN_SUGGESTION_SELECT` e restituisci `toAdminSuggestion(updated)`. Nient'altro cambia.

### 4d. `POST /api/suggestions/[id]/notes`

Riscrivi così:

1. auth come oggi;
2. parse con lo schema nuovo (`body`, `kind`);
3. leggi il suggerimento:
   ```ts
   const suggestion = await prisma.suggestion.findUnique({
     where: { id },
     select: { id: true, userId: true, status: true, notes: { select: { authorId: true } } },
   });
   ```
   se manca → 404 `{ error: "Suggerimento non trovato" }`;
4. se `kind === "REPLY"` e `suggestion.userId === null` → 409
   `{ error: "Chi ha scritto il suggerimento non ha più un account: puoi solo lasciare una nota interna" }`;
5. in `prisma.$transaction`: crea la nota (`isReply: kind === "REPLY"`, stessa `select` di prima più
   `isReply`) e, se lo stato è `NUOVO`, aggiorna il suggerimento a `LETTO`;
6. risposta 201: `{ note, status }` (`status` = stato dopo l'operazione);
7. dopo: `inBackground(deliverSuggestionNotices(noteNotices({...})), "notification suggestion note")`
   con `previousNoteAuthorIds = suggestion.notes.map(n => n.authorId)`,
   `writerName = session.user.name ?? null`;
8. tieni il `catch` su `P2003` e aggiungi un ricadere su 500 JSON.

**Attenzione:** cambia la forma della risposta (prima era la nota, ora `{ note, status }`):
aggiorna il client nella fase 5.

### 4e. `DELETE /api/suggestions/[id]/notes/[noteId]`

Nessun cambio di logica. Se si cancella una risposta, l'autore non la vede più: va bene, lo dice la
conferma nel client.

### 4f. Test delle rotte

Crea `src/app/api/suggestions/[id]/notes/route.test.ts` (copia l'impostazione dei mock da
`src/app/api/sessions/route.test.ts`). Casi:

- 401 senza staff;
- 404 suggerimento inesistente;
- 409 `REPLY` su suggerimento senza `userId`;
- `NOTE` su un `NUOVO` → nota creata, stato `LETTO` nella risposta;
- la risposta JSON **non contiene** `userId` da nessuna parte (`JSON.stringify(body)` non include la
  stringa dell'id dell'autore).

Nessuna nuova GET: `routeAccess.test.ts` non cambia. Se aggiungi una GET, va classificata lì.

---

## Fase 5: pagina admin `/admin/suggerimenti`

File: `src/app/admin/(dashboard)/suggerimenti/page.tsx` e
`src/components/admin/AdminSuggerimentiClient.tsx`. Il componente supera già le 300 righe: spezzalo
così, nella stessa cartella `src/components/admin/`:

- `AdminSuggerimentiClient.tsx`: stato, filtri, lista, apertura da `?apri=`;
- `SuggestionCard.tsx`: una card;
- `SuggestionThread.tsx`: elenco delle note + modulo per scriverne una.

### 5a. Pagina server

- `findMany({ select: ADMIN_SUGGESTION_SELECT })`, poi `sortByActivity(rows.map(toAdminSuggestion))`.
- Togli `export const revalidate = 0` solo se le altre pagine admin non lo hanno; altrimenti lascialo.
- `isAdmin`: usa `hasRole(session.user.appRole, "ADMIN")` da `@/lib/authRoles` (controlla la firma
  esatta) invece del confronto `=== "ADMIN"`.
- Sottotitolo di `PageHeader`: "Le proposte di chi usa l'app. Non vedi chi le ha scritte, ma puoi
  rispondergli."

### 5b. Filtri

Tre chip (stessa forma di oggi: `filled` + `primary` quello attivo, `outlined` gli altri):
"Da gestire (n)" (`NUOVO` + `LETTO`, **predefinito**), "Archiviati (n)", "Tutti (n)".
Messaggio vuoto per "Da gestire": "Niente da gestire. I suggerimenti nuovi arrivano anche come
notifica."

### 5c. `SuggestionCard`

- `Paper variant="outlined"` con `borderRadius: RADIUS.lg` (niente `elevation`), `p: 2.5`.
- Riga in alto: `StatusPill` (com'è oggi), chip della categoria, data a destra.
- Messaggio: `Typography body1`, `whiteSpace: "pre-wrap"`.
- Riga in basso, a sinistra: bottone `variant="text"` che apre e chiude il thread, con
  `aria-expanded` e `aria-controls`:
  - chiuso: "Note e risposte (n)" se n > 0, "Rispondi o aggiungi una nota" se n = 0;
  - aperto: "Chiudi".
    Il thread sta in un `Collapse` sotto (`unmountOnExit` no: la bozza non si deve perdere).
- Riga in basso, a destra: `RowActions` (`@/components/admin/RowActions`) con
  - `subject`: le prime 40 lettere del messaggio (usa `excerpt` da `suggestionNotify.ts`);
  - `primary`: `{ label: "Archivia", onClick }` se non archiviato, `{ label: "Riapri", onClick }`
    se archiviato (Riapri porta a `LETTO`);
  - `items`: "Segna come letto" solo se `NUOVO`;
  - `onDelete`: elimina, con `deleteLabel: "Elimina suggerimento…"` e `deleteConfirm`
    `{ title: "Eliminare il suggerimento?", message: "Si cancellano anche tutte le note e le risposte. Chi l'ha scritto non vedrà più le risposte." }`.
    Togli il cestino rosso e i bottoni "Segna letto" / "Archivia" di oggi. Leggi `RowActions.tsx`
    per i dettagli di `focusAfterDelete` (passa il ref dell'intestazione della lista).
- Archiviato: niente `opacity`; basta la `StatusPill`.

### 5d. `SuggestionThread`

Elenco delle note (com'è oggi: avatar, nome, data), con in più un'etichetta sopra il testo:

- nota interna: icona `LockIcon` piccola + "Nota interna";
- risposta: icona `ReplyIcon` + "Risposta all'autore", e il riquadro della nota con un bordo
  (`border: 1px solid`, `borderColor: "divider"`) invece del fondo `action.hover`.
  Entrambe in `text.secondary`, `variant="caption"`, peso `FONT_WEIGHT.semibold`. **Niente tinte**
  (UX-29: il tipo si distingue con icona e parola).

Il cestino della nota diventa un `IconButton` con `aria-label="Elimina nota"`, senza
`color="error"`, con `sx={TOUCH_TARGET_ON_PHONE}` (`@/lib/touchTarget`); icona senza `fontSize`
numerico (usa `fontSize="small"`). Conferma:

- nota: "Eliminare la nota?" / "L'azione non può essere annullata.";
- risposta: "Eliminare la risposta?" / "Chi ha scritto il suggerimento non la vedrà più. La notifica che ha già ricevuto resta."

Modulo sotto l'elenco:

1. `ToggleButtonGroup` esclusivo, `size="small"`, due voci: "Nota interna" (predefinita) e
   "Risposta all'autore". Se `canReply` è `false`, la seconda è disabilitata e sotto c'è il testo
   `caption` "Chi l'ha scritto non ha più un account: puoi solo lasciare una nota interna."
2. Testo di aiuto sotto i bottoni, che cambia con la scelta:
   - nota: "La leggono solo allenatori e admin.";
   - risposta: "Arriva a chi ha scritto il suggerimento, con una notifica. Non saprà chi sei, e tu non sai chi è."
3. `TextField` multiline (`minRows={2}`, `maxRows={6}`, `maxLength` 1000), etichetta "Nota" o
   "Risposta" secondo la scelta.
4. Bottone `variant="outlined"` (non `contained`: le card sono tante), etichetta "Salva nota" o
   "Invia risposta"; disabilitato se il testo è vuoto o durante l'invio.
5. Per la risposta, prima dell'invio, conferma con `useConfirmDialog`: titolo
   "Inviare la risposta?", testo "Chi ha scritto il suggerimento la riceve subito come notifica."
6. Dopo l'invio: aggiungi `note` alla lista, aggiorna `status` e `lastActivityAt` della card, svuota
   la bozza, toast "Nota salvata" o "Risposta inviata". Il tipo torna su "Nota interna".

Le bozze restano per card (come oggi `drafts`), così aprire e chiudere non le perde.

### 5e. Apertura da notifica (`?apri=<id>`)

Come `AdminEventiClient` (righe con `useSearchParams` e `router.replace`):

- al mount, se c'è `apri` e l'id esiste: se è archiviato imposta il filtro "Tutti", apri quel
  thread, porta la card in vista (`scrollIntoView({ block: "start" })` su un `ref` o su
  `document.getElementById("s-" + id)`; la card ha `id={"s-" + s.id}` e `scrollMarginTop: 80`);
- poi `router.replace("/admin/suggerimenti", { scroll: false })`.
- Id inesistente (suggerimento eliminato): toast `info` "Questo suggerimento non c'è più."

---

## Fase 6: pagina dell'autore `/profilo/suggerimenti`

UI pubblica: **tutti i testi in `it.json` e `en.json`**, mai stringhe nel codice.

### 6a. Dati: `src/lib/suggestions/mySuggestions.ts`

```ts
export async function loadMySuggestions(userId: string) {
  return prisma.suggestion.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      message: true,
      createdAt: true,
      notes: {
        where: { isReply: true }, // MAI le note interne
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true }, // MAI l'autore della nota
      },
    },
  });
}
```

Test (con Prisma mockato): la query filtra `isReply: true` e non seleziona `author`.

### 6b. Pagina `src/app/profilo/suggerimenti/page.tsx`

Copia la struttura di `src/app/profilo/disponibilita/page.tsx`: `buildMetadata` con `noindex: true`,
`redirect(loginHref("/profilo/suggerimenti"))` senza sessione, `Container` + `columnSx("main")`,
`PageHeader` con breadcrumb Profilo → I miei suggerimenti. Server Component, Prisma diretto.

Contenuto (può restare Server Component: niente interattività):

- per ogni suggerimento una card contornata (`Paper variant="outlined"`, `RADIUS.lg`,
  `id={"s-" + id}`, `scrollMarginTop: 80`): data e categoria in `caption`, il messaggio, poi
  - se ci sono risposte: per ognuna "Lo staff" in `semibold`, la data, il testo;
  - se non ce ne sono: "Nessuna risposta per ora." in `text.secondary`.
- vuoto: "Non hai ancora mandato suggerimenti." + bottone `variant="outlined"`
  `href="/contatti#suggerimenti"` "Manda un suggerimento".
- in fondo una riga `caption`: "Lo staff non vede chi ha scritto i suggerimenti."
- Non mostrare lo stato (`NUOVO`/`LETTO`/`ARCHIVIATO`): è interno allo staff.
- Date: `format` di date-fns con `getDateFnsLocale(locale)` da `@/lib/dateLocale`.
- Categoria: riusa le chiavi `suggestion.catApp`, `catTrainings`, `catMatches`, `catOther`.

### 6c. Link dalla pagina profilo

In `src/app/profilo/page.tsx`, accanto al bottone "Le mie disponibilità" (righe ~450-465), un
bottone uguale (`size="small"`, `variant="outlined"`, icona `LightbulbIcon`) verso
`/profilo/suggerimenti`, **solo se** l'utente ha almeno un suggerimento. Il conteggio
(`prisma.suggestion.count({ where: { userId } })`) va nel `Promise.all` già presente nella pagina,
non in un'attesa a parte. Niente `fontSize` letterali nuovi: se il bottone vicino ne ha uno, copia
quello che c'è.

### 6d. Form del suggerimento (`src/components/common/SuggestionForm.tsx`)

- Dopo l'invio, sotto "Grazie", un bottone `variant="text"` `href="/profilo/suggerimenti"` con la
  chiave `suggestion.seeMine`.
- Aggiorna i testi (it e en):
  - `suggestion.anonymous`: "Il tuo suggerimento è anonimo: lo staff non vedrà chi l'ha inviato. Se ti risponde, trovi la risposta in «I miei suggerimenti» del profilo."
  - `suggestion.thankYouDesc`: "Lo staff lo leggerà al più presto. Se ti risponde, ricevi una notifica."
  - `suggestion.seeMine`: "I miei suggerimenti" / "My suggestions".

### 6e. Chiavi i18n nuove (it / en)

Mettile nel namespace già usato da `/profilo/disponibilita` (`profile`), con il prefisso
`mySuggestions…`:

| Chiave                   | it                                                 | en                                             |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------- |
| `mySuggestions`          | I miei suggerimenti                                | My suggestions                                 |
| `mySuggestionsSubtitle`  | Quello che hai proposto e le risposte dello staff. | What you suggested and the staff's replies.    |
| `mySuggestionsStaff`     | Lo staff                                           | The staff                                      |
| `mySuggestionsNoReply`   | Nessuna risposta per ora.                          | No reply yet.                                  |
| `mySuggestionsEmpty`     | Non hai ancora mandato suggerimenti.               | You haven't sent any suggestions yet.          |
| `mySuggestionsSend`      | Manda un suggerimento                              | Send a suggestion                              |
| `mySuggestionsAnonymous` | Lo staff non vede chi ha scritto i suggerimenti.   | The staff can't see who wrote the suggestions. |

Niente "—" nei testi.

---

## Fase 7: guida e documentazione

1. `src/lib/content/guide.ts`, capitolo con il suggerimento (it ~riga 303, en ~riga 560): aggiungi
   una frase, nelle due lingue, tipo "Se lo staff ti risponde ricevi una notifica, e trovi la
   risposta in «I miei suggerimenti» del profilo." e, se il capitolo ha i link, uno verso
   `/profilo/suggerimenti` con etichetta "I miei suggerimenti" / "My suggestions".
   `guide.test.ts` controlla che le etichette fra «» esistano nei dizionari e che i link portino a
   pagine esistenti: deve restare verde.
2. `CLAUDE.md` alla radice:
   - nel punto **Suggerimenti** di "Sottosistemi recenti": note interne e risposte (`isReply`),
     `/profilo/suggerimenti`, regole in `@/lib/suggestions/`, `canReply` al posto di `userId`;
   - nell'elenco **Trigger automatici** delle push: nuovo suggerimento (allenatori e admin), nuova
     nota (staff che ha già scritto lì), risposta (l'autore).
   - nella tabella dei modelli niente da cambiare.
3. `docs/workflows/05-notifiche.md` e `docs/workflows/08-admin.md`: una riga ciascuno con le stesse
   informazioni.

---

## Fase 8: verifica

```bash
npx tsc --noEmit
npm run lint
npm test
```

Tutti verdi. Poi a mano, con `npm run dev`, `ENABLE_TEST_LOGIN=true` e senza
`DISABLE_NOTIFICATIONS` (oppure con, controllando nei log i messaggi "notifica saltata"):

1. Da atleta: `/contatti#suggerimenti`, manda un suggerimento. Il testo dopo l'invio ha il link
   "I miei suggerimenti".
2. Da allenatore: la campanella mostra "Nuovo suggerimento" con categoria e inizio del testo; il clic
   apre `/admin/suggerimenti` con quella card aperta e in vista.
3. Aggiungi una nota interna: lo stato passa a "Letto"; l'atleta non riceve niente.
4. Da un secondo account staff aggiungi una nota: il primo allenatore riceve "Nuova nota su un
   suggerimento".
5. Invia una risposta: conferma, toast, l'atleta riceve "Lo staff ha risposto al tuo suggerimento";
   in `/profilo/suggerimenti` vede la risposta firmata "Lo staff" e **non** vede la nota interna.
6. Nel browser, con gli strumenti di rete, controlla che nessuna risposta di `/api/suggestions*` né
   l'HTML di `/admin/suggerimenti` contengano l'id dell'atleta.
7. Telefono (375 px): card, `RowActions` e modulo senza scorrimento orizzontale; tema scuro leggibile.
8. `/profilo/suggerimenti` in inglese (cookie lingua `en`): nessun testo italiano.
9. Facoltativo: `npm run a11y -- --only=admin`.

## Checklist finale

- [ ] Migration committata insieme a `schema.prisma`
- [ ] `userId` del suggerimento non esce mai verso lo staff (test in 3a e 4f)
- [ ] Note interne mai visibili all'autore (test in 6a)
- [ ] Notifiche inviate con `inBackground`, mai promesse lasciate a sé
- [ ] Nessun colore, `fontSize`, `fontWeight` o raggio numerico nuovo
- [ ] Un solo bottone `contained` per schermata (nella pagina admin nessuno)
- [ ] Testi pubblici in `it.json` e `en.json`, nessun "—"
- [ ] Guida e `CLAUDE.md` aggiornati
- [ ] `tsc`, `lint`, `test` verdi
