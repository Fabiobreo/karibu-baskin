# Guida traduzioni (i18n) — Karibu Baskin

Manuale operativo per tradurre le stringhe rimaste (it/en). Segue il pattern usato in tutto il progetto: **next-intl**, cookie-based (nessun prefisso `/en` nell'URL).

---

## 1. Dove stanno le traduzioni

Due file gemelli con la **stessa identica struttura** a chiavi annidate:

- `src/i18n/messages/it.json` — italiano (la sorgente)
- `src/i18n/messages/en.json` — inglese

> **Regola d'oro:** ogni chiave aggiunta in un file **deve esistere anche nell'altro**, con lo stesso percorso. Se manca, l'app crasha a runtime con `MISSING_MESSAGE: Could not resolve 'x.y' in messages for locale 'en'`.

---

## 2. Il flusso in 3 passi

### Passo A — aggiungi la chiave nei due JSON

Scegli un namespace esistente coerente (`common`, `trainings`, `matches`, `teams`, `profile`, `scorers`, `standings`, `pages.contatti`, …):

```jsonc
// it.json
"matches": { "...": "...", "myNewKey": "Testo italiano" }

// en.json
"matches": { "...": "...", "myNewKey": "English text" }
```

### Passo B — usa la chiave nel componente

Dipende se il componente è **Server** o **Client**. Si capisce dalla **prima riga** del file:

- `"use client"` in cima → **Client Component**
- niente `"use client"` (e funzione `export default async function`) → **Server Component**

```tsx
// CLIENT COMPONENT
import { useTranslations } from "next-intl";

export default function MioComponente() {
  const t = useTranslations("matches"); // dentro la funzione
  return <span>{t("myNewKey")}</span>;
}
```

```tsx
// SERVER COMPONENT (async)
import { getTranslations } from "next-intl/server";

export default async function MiaPagina() {
  const t = await getTranslations("matches"); // dentro la funzione async
  return <span>{t("myNewKey")}</span>;
}
```

### Passo C — verifica (sempre, prima di chiudere)

```bash
# 1) parità chiavi it ↔ en
node -e "const it=require('./src/i18n/messages/it.json'),en=require('./src/i18n/messages/en.json');const gk=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v=='object'&&!Array.isArray(v)?gk(v,p?p+'.'+k:k):[p?p+'.'+k:k]);const a=new Set(gk(it)),b=new Set(gk(en));const oi=[...a].filter(k=>!b.has(k)),oe=[...b].filter(k=>!a.has(k));console.log(oi.length||oe.length?('SOLO it: '+oi+'\nSOLO en: '+oe):'OK — chiavi allineate')"

# 2) type check
npx tsc --noEmit
```

Se il primo stampa `OK` e `tsc` non dà errori → fatto.

---

## 3. La regola per decidere SE tradurre

Chiediti: **"un atleta / genitore / visitatore normale vede questa scritta?"**

- **Sì** → traduci (profilo, iscrizioni, partite, classifiche, marcatori, news, contatti, sondaggi, condivisione…)
- **No, la vede solo coach/admin** → **lasciala in italiano** (form di creazione/modifica allenamento o partita, statistiche, convocazioni, audit log, apri/chiudi iscrizioni, editor news, e tutto sotto `/admin/`)

Questa è la scelta di scope concordata: **area pubblica = bilingue, area staff/admin = solo italiano.**

---

## 4. Come trovare cosa manca

Cerca testo italiano hardcoded **escludendo i file staff/admin**:

```bash
grep -rnE '>[A-ZÀ-Ù][a-zà-ù]{3,}|label="[A-ZÀ-Ù]|placeholder="[A-ZÀ-Ù]|title="[A-ZÀ-Ù]' src/components src/app --include="*.tsx" \
  | grep -iv 'Admin\|/admin/\|AuditLog\|Convocazioni\|MatchStats\|MatchForm\|MatchEdit\|MatchResult\|PostEditor\|GroupMatch\|OpposingTeamEdit\|OpponentProfile\|TrainingMatchResults\|OpenRegistrations\|CloseRegistrations\|GroupCsv' \
  | grep -vE 't\(|tm\(|tNav\(|tCommon\(|roleLabel|genderLabel|matchResult'
```

Quello che resta dopo questo filtro è (quasi sempre) davvero da tradurre. Verifica comunque a occhio che non sia un dialog staff.

---

## 5. Casi speciali frequenti

### Valori dinamici (numeri, nomi)

```jsonc
"registered": "{count} iscritti"     // it
"registered": "{count} registered"   // en
```

```tsx
{
  t("registered", { count: 5 });
}
{
  t("greeting", { name: "Mario" });
}
```

### Plurali (singolare ≠ plurale)

```jsonc
"matchCount": "{count, plural, one {# partita} other {# partite}}"   // it
"matchCount": "{count, plural, one {# match} other {# matches}}"     // en
```

### Liste / array di testo (es. FAQ, vantaggi) → `t.raw()`

```jsonc
"perks": [
  { "title": "Logo sul sito", "desc": "..." },
  { "title": "Visibilità",    "desc": "..." }
]
```

```tsx
const perks = t.raw("perks") as { title: string; desc: string }[];
```

### Date (`date-fns`)

```tsx
// CLIENT
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
const dateLocale = useActiveDateLocale();
format(d, "d MMMM yyyy", { locale: dateLocale });

// SERVER
import { getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
const dateLocale = getDateFnsLocale(await getLocale());
```

### Ruolo sportivo / genere / risultato partita → usa i helper, NON tradurre a mano

```tsx
// CLIENT
import { useEntityLabels } from "@/hooks/useEntityLabels";
const { roleLabel, sportRoleLabel, genderLabel, matchResultLabel, matchResultShort } =
  useEntityLabels();

// SERVER
import { getEntityLabels } from "@/lib/entityLabels";
const { roleLabel, sportRoleLabel, genderLabel, matchResultLabel, matchResultShort } =
  await getEntityLabels();
```

| Prima (hardcoded)                     | Dopo                                |
| ------------------------------------- | ----------------------------------- |
| `ROLE_LABELS[n]`                      | `roleLabel(n)`                      |
| `sportRoleLabel(n, v)` (da constants) | `sportRoleLabel(n, v)` (dal helper) |
| `GENDER_LABELS[g]`                    | `genderLabel(g)`                    |
| `MATCH_RESULT_META[r].label`          | `matchResultLabel(r)`               |
| `MATCH_RESULT_META[r].short`          | `matchResultShort(r)`               |

> `MATCH_RESULT_META[r].color` / `.bg` **restano** (sono token colore, non testo).

### Contenuti statici lunghi (paragrafi, prosa)

Pattern dei file dati locale-keyed (`getX(locale)` → array `it`/`en`):

- `src/lib/faqs.ts` → `getFaqs(locale)`
- `src/lib/loSapevi.ts` → `getLoSapevi(locale)`
- `src/lib/baskinInfo.ts` → `getRolesInfo(locale)` / `getBaskinRules(locale)`

Per aggiungere/modificare un contenuto lungo, edita questi file (sezione `_IT` e `_EN`), non i JSON.

---

## 6. Lo switcher di lingua

- Componente: `src/components/LanguageSwitcher.tsx` (toggle `IT | EN`, prop `onDark` per superfici scure).
- Default lingua: auto-detect da `Accept-Language` del browser, fallback `it`; una volta scelta manualmente vince il cookie `karibu-locale`.
- Logica: `src/context/LocaleContext.tsx` + `src/i18n/request.ts`.

---

## 7. Errori comuni (e come riconoscerli)

| Sintomo                                    | Causa                                                         | Fix                                                     |
| ------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------- |
| `MISSING_MESSAGE` a runtime                | chiave usata ma assente in un json (di solito `en`)           | aggiungila + rilancia lo script di parità               |
| Testo mostra letteralmente `matches.myKey` | namespace sbagliato in `useTranslations("...")`               | controlla che il namespace passato combaci col percorso |
| `t is not a function` in Server Component  | hai usato `useTranslations` invece di `await getTranslations` | usa la versione server                                  |
| Data sempre in italiano                    | hai lasciato `{ locale: it }`                                 | sostituisci con `dateLocale` (vedi §5)                  |

---

## 8. TL;DR

1. Aggiungi la chiave in **entrambi** `it.json` e `en.json`.
2. Nel componente: client → `useTranslations`, server → `await getTranslations`.
3. Usa `t("chiave")` (con `{count}` / plural / `t.raw()` se serve).
4. Per ruolo/genere/risultato/date usa i **helper pronti**, non tradurre a mano.
5. Verifica: script di parità chiavi **+** `npx tsc --noEmit`. Entrambi verdi = fatto.
