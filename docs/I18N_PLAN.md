# Piano i18n — Karibu Baskin

> **Scope:** solo **UI / chrome** (label, pulsanti, menu, toast, messaggi d'errore, email, testi statici).
> I contenuti creati dagli utenti (news/`Post`, nomi squadre, note iscrizioni, MVP, ecc.) **restano nella lingua in cui sono stati scritti** — nessuna colonna `*_it`/`*_en`, nessuna traduzione dinamica.
> Lingue iniziali: **`it`** (default) + **`en`**.

---

## 1. Decisione architetturale: `next-intl` SENZA i18n routing

### Libreria

**`next-intl`** — è lo standard de-facto per App Router, supporta Server e Client Components, formattazione numeri/date/plurali (ICU MessageFormat), e si integra con `date-fns`.

### Strategia di routing: **cookie-based, NIENTE prefisso URL**

`next-intl` offre due modalità:

| Modalità                        | URL                                  | Costo                                                                                                                                                      |
| ------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Con i18n routing**            | `/en/allenamenti`, `/it/allenamenti` | ⚠️ richiede di spostare **tutto** `src/app/*` dentro `src/app/[locale]/*` — refactor invasivo su 47 pagine, rompe ogni path assoluto, link, redirect, slug |
| **Senza i18n routing** (cookie) | `/allenamenti` (lingua da cookie)    | ✅ nessun cambio di struttura cartelle, locale gestito come fa già `ThemeContext`                                                                          |

**Scegliamo cookie-based** perché:

1. **Specchia il pattern esistente** del tema (Context + persistenza) → coerenza col progetto.
2. **Zero refactor di `src/app/`** — non spostiamo niente sotto `[locale]`.
3. **Nessun impatto su slug/redirect/link interni** (`la-squadra` → `/squadre`, `?edit=[id]`, ecc.).
4. I contenuti dinamici sono monolingua → l'argomento SEO per-lingua (vantaggio del prefisso URL) **non si applica**: non avremmo pagine realmente bilingui da indicizzare separatamente.

**Trade-off accettato:** niente URL `/en/...` indicizzabili e niente `hreflang`. Per un'app di una squadra locale è irrilevante.

---

## 2. Struttura file da creare

```
src/
├── i18n/
│   ├── request.ts          # config next-intl: legge il cookie, carica i messaggi
│   ├── locales.ts          # const LOCALES = ["it","en"], DEFAULT_LOCALE, type Locale
│   └── messages/
│       ├── it.json         # sorgente di verità (italiano)
│       └── en.json         # traduzioni inglesi
├── context/
│   └── LocaleContext.tsx   # client: locale corrente + setLocale (scrive cookie + router.refresh)
└── components/
    └── LanguageSwitcher.tsx # selettore lingua (accanto al toggle tema)
```

File da modificare:

- `next.config.ts` → wrappare con `createNextIntlPlugin("./src/i18n/request.ts")`
- `src/app/layout.tsx` → `NextIntlClientProvider` + `<html lang={locale}>` dinamico + locale `date-fns`
- `src/components/Providers.tsx` → montare `LocaleContext` accanto a `ThemeContextProvider`
- header/drawer (`SiteHeader.tsx`, `BottomNav.tsx`) → inserire `LanguageSwitcher` dove c'è il toggle tema

---

## 3. Convenzione delle chiavi di traduzione

Namespace **per dominio/pagina**, non per componente (così le stringhe condivise non si duplicano):

```jsonc
{
  "common": {                 // riusato ovunque: bottoni, stati, parole-chiave
    "save": "Salva",
    "cancel": "Annulla",
    "delete": "Elimina",
    "loading": "Caricamento…",
    "back": "Indietro"
  },
  "nav": { "trainings": "Allenamenti", "matches": "Partite", "teams": "Squadre" },
  "trainings": { "title": "Allenamenti", "register": "Iscriviti", ... },
  "matches": { ... },
  "admin": { ... },
  "validation": { "required": "Campo obbligatorio", ... },  // messaggi Zod
  "emails": { ... }
}
```

Regole:

- **`it.json` è la sorgente**: si scrive prima lì, `en.json` ne è la copia tradotta con le stesse chiavi.
- Interpolazione ICU: `"greeting": "Ciao {name}"` → `t("greeting", { name })`.
- Plurali ICU: `"count": "{n, plural, =0 {Nessun iscritto} one {# iscritto} other {# iscritti}}"`.
- **No concatenazione di stringhe** in JSX: una frase = una chiave (anche se contiene markup → usare `t.rich`).

---

## 4. Pattern di utilizzo (Server vs Client)

Il progetto ha **112 file `"use client"`** e ~47 pagine Server Component → servono entrambi i pattern.

**Server Component / route handler / metadata:**

```tsx
import { getTranslations } from "next-intl/server";
export default async function Page() {
  const t = await getTranslations("trainings");
  return <h1>{t("title")}</h1>;
}
```

**Client Component:**

```tsx
"use client";
import { useTranslations } from "next-intl";
export default function RegistrationForm() {
  const t = useTranslations("trainings");
  return <Button>{t("register")}</Button>;
}
```

**Toast/errori** (`useToast`): la stringa si traduce nel componente chiamante, non dentro il context.

---

## 5. Casi speciali (non sono JSX semplice)

| Area                                                                                   | Come si traduce                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Date** (`date-fns`)                                                                  | passare `locale: it \| enUS` dinamico in base al locale corrente; centralizzare in `dateUtils.ts`                                                                                                            |
| **Messaggi Zod** (`src/lib/schemas/`)                                                  | gli schemi restano con messaggi-chiave (es. `"validation.required"`); la **traduzione avviene lato UI** quando si mostra l'errore, non nello schema (lo schema gira anche server-side senza request context) |
| **Email Resend** (`src/emails/`, 2 template)                                           | passare il `locale` come prop al template e usare `getTranslations({ locale, namespace: "emails" })` prima del render                                                                                        |
| **Push notifications** (`webpush.ts`, cron)                                            | i payload sono generati server-side fuori da una request HTTP utente → tradurre con `getTranslations({ locale: DEFAULT_LOCALE })` o per-utente se in futuro salviamo la lingua su `User` (vedi §8)           |
| **`<html lang>`**                                                                      | da `lang={locale}` in `layout.tsx` (oggi hardcoded `"it"`)                                                                                                                                                   |
| **Metadata / OpenGraph**                                                               | `generateMetadata` con `getTranslations`; `locale` OG da `it_IT`/`en_US`                                                                                                                                     |
| **Contenuti statici in TS** (`faqs.ts`, `loSapevi.ts`, `constants.ts` → `ROLE_LABELS`) | spostare i testi in `messages/*.json` oppure renderli funzioni che ricevono `t`. `ROLE_LABELS` è il caso più diffuso da gestire con cura                                                                     |

---

## 6. Esecuzione incrementale (per cartella, NON tutta insieme)

L'estrazione è il 70% del lavoro. Si procede a fette verticali testabili:

- [ ] **Fase 0 — Scaffold** _(½ giornata)_
  - `next-intl` installato, `next.config.ts`, `src/i18n/*`, `LocaleContext`, `LanguageSwitcher`, provider in `layout.tsx`.
  - `it.json`/`en.json` con solo `common` + `nav`.
  - **Pagina pilota: home `/`** completamente tradotta come modello di riferimento.
  - Switcher funzionante: cambio lingua → cookie → `router.refresh()` → testi cambiano.
- [ ] **Fase 1 — Chrome globale** _(1 g)_ — `SiteHeader`, `BottomNav`, `Footer`, menu utente, `CookieBanner`, `OfflineBanner`, 404/500/offline.
- [ ] **Fase 2 — Dominio allenamenti** _(1–1,5 g)_ — `/allenamenti`, `/allenamento/[session]`, `RegistrationForm`, `RosterByRole`, `TeamDisplay`.
- [ ] **Fase 3 — Dominio partite/squadre** _(1,5–2 g)_ — `/partite`, `/risultati`, `/squadre`, `/classifiche`, `/marcatori`, profili pubblici.
- [ ] **Fase 4 — Pagine statiche** _(1 g)_ — `il-baskin`, `faq` (+ `faqs.ts`), `contatti`, `sponsor`, `privacy`, `gallery`, `news` (chrome, non i post).
- [ ] ~~**Fase 5 — Area admin**~~ — **FUORI SCOPE** (deciso: admin resta solo in italiano).
- [ ] **Fase 6 — Email + push + date + Zod** _(1 g)_ — §5.
- [ ] **Fase 7 — Rifinitura** — script che verifica parità di chiavi `it.json` ↔ `en.json`; QA visivo in entrambe le lingue.

**Stima totale (scope confermato, admin escluso):** ~5–7 giornate-uomo concentrate.

---

## 7. Guard-rail di qualità

- **Test parità chiavi:** un `*.test.ts` (Vitest) che fallisce se `it.json` e `en.json` non hanno lo stesso set di chiavi → impedisce traduzioni mancanti.
- **No stringhe orfane:** durante ogni fase, grep di controllo sul testo italiano residuo nei file toccati prima di chiudere la fase.
- **`tsc --noEmit` + `npm test`** ad ogni fase (regola ferrea del progetto).
- **Default robusto:** se manca una chiave in `en.json`, `next-intl` può fare fallback su `it` (configurare `getMessageFallback`) → l'app non mostra mai la chiave grezza.

---

## 8. Estensioni future (fuori scope ora)

- **Persistenza lingua sull'utente:** colonna `locale String?` su `User` → email/push nella lingua scelta dall'iscritto (oggi: cookie anonimo, default `it`).
- **Terza lingua:** aggiungere `fr`/altro = solo nuovo `messages/xx.json` + entry in `locales.ts`, nessun codice nuovo.
- **Passaggio a i18n routing** (URL `/en/...`) se in futuro servisse SEO multilingua: comporterebbe il refactor sotto `[locale]` rimandato qui.

---

## 9. Decisioni confermate

1. **Area admin → SOLO ITALIANO.** La **Fase 5 è esclusa** dallo scope: si traduce solo l'area pubblica. Stima rivista: **~5–7 giornate**. Nota implementativa: l'`admin/(dashboard)/*` non riceve estrazione; basta che il `LanguageSwitcher` non compaia nell'header admin (o sia ininfluente lì).
2. **Default lingua → AUTO-DETECT da `Accept-Language`.** In `src/i18n/request.ts`: se nessun cookie `locale` è presente, leggere l'header `Accept-Language`; se inizia per `en` → `en`, altrimenti fallback `it`. Una volta che l'utente sceglie con lo switcher, vince il cookie. _(Attenzione: l'auto-detect introduce contenuto request-dipendente → le pagine pubbliche cache-abili vanno marcate `dynamic` o si legge il locale solo via cookie dopo il primo set. Da gestire in Fase 0.)_
3. **Switcher → accanto al toggle tema** nel menu utente dell'header + drawer mobile (`SiteHeader.tsx`, `BottomNav.tsx`).
