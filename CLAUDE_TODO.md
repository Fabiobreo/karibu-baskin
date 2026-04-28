# CLAUDE_TODO.md — Karibu Baskin

Analisi codebase con priorità d'intervento. Aggiornato automaticamente.

---

## 🔴 CRITICO — Fixare subito

*(nessun item critico aperto)*

---

## 🟡 HIGH PRIORITY — Test coverage

### 3. **Route API senza test (~30+ route non coperte)**

**Alta priorità (logica complessa):**
- `POST /api/registrations/claim` — claim iscrizioni anonime
- `GET/POST /api/link-requests`, `/respond` — collegamento genitore-figlio (stati, multi-ruolo)
- `POST /api/push/subscribe` — ha rate limiting, validazione VAPID
- `GET/PATCH /api/users/me`, `GET/POST /api/users/me/children` — profilo utente
- `GET /api/users/lookup` — ricerca per email

**Media priorità (CRUD admin):**
- `competitive-teams` cluster (5 route: GET/POST, PATCH/DELETE, members, seasons/current)
- `matches` cluster (5 route: GET/POST, PATCH/DELETE, stats, callups)
- `events` cluster (3 route)
- `groups` cluster (7 route) — **nota:** non documentate in CLAUDE.md
- `opposing-teams` cluster (2 route)

**Bassa priorità:**
- `calendar`, `admin/export`, `cron/cleanup-notifications`
- UI components (richiederebbe @testing-library/react)

---

## 🟡 MEDIA PRIORITÀ

### 4. **Centralizzare logica stagione duplicata**
**File:** `src/app/api/admin/export/route.ts:94`, `src/components/AdminPartiteClient.tsx:102`, +2 altri

Il calcolo `month >= 8 ? year : year - 1` è ripetuto in 4+ posti. Cambiarà quando la stagione non parte ad agosto.

**Fix:** Creare `src/lib/seasonUtils.ts`:
```typescript
export function getCurrentSeason(date = new Date()): string {
  const y = date.getFullYear();
  const s = date.getMonth() >= 7 ? y : y - 1; // agosto = mese 7
  return `${s}-${String(s + 1).slice(-2)}`;
}
```
Rimpiazzare le 4 occorrenze.

---

### 5. **Rate limiter in-memory non coordinato tra repliche Vercel**
**File:** `src/lib/rateLimit.ts`

Il `Map` è per-processo. Su più istanze, un bot aggira il limite facendo richieste su repliche diverse.

**Opzioni:**
- **Accettare:** documentare come "best-effort per replica" (ok per app piccola)
- **Migrare:** Redis/Upstash se spam diventa critico

---

### 6. **Componenti troppo grandi — refactor incrementale**

- `AdminPartiteClient.tsx` — ~1130 righe
- `CalendarClient.tsx` — ~1097 righe
- `AdminUserList.tsx` — ~1055 righe

Estrarre sub-componenti e custom hooks quando si toccano per altre ragioni. Non fare refactor standalone.

---

### 7. **Caching admin disabilitato su tutte le pagine**
**File:** `src/app/admin/(dashboard)/*/page.tsx`

Tutte hanno `export const revalidate = 0` → DB hit per ogni richiesta.

**Fix:** Impostare `revalidate = 30–60` per pagine a bassa volatilità (utenti, squadre).

---

## 🟢 BASSA PRIORITÀ — QoL

### 8. **Ottimistic updates nelle iscrizioni**
**File:** `src/components/RegistrationForm.tsx`

Aggiornare UI subito, rollback su errore. Migliora perceived performance su connessioni lente.

---

### 9. **Paginazione server-side per lista utenti**
**File:** `src/app/api/users/route.ts`

Attualmente carica tutti gli utenti. Con 500+ utenti, payload JSON è enorme.

**Fix:** Aggiungere `skip`/`take` (cursor o offset) nell'API.

---

### 10. **Error monitoring in produzione**
**File:** `src/app/error.tsx`, `src/app/global-error.tsx`

Integrare Sentry o Vercel Log Drains per ricevere notifiche sugli errori senza controllare i log manualmente.

---

## 📋 FEATURES PIANIFICATE

### 999. **Sistema ELO giocatori** *(futuro — già in memory)*

ELO nascosto su User/Child per bilanciare squadre in allenamento. Visibile solo COACH/ADMIN.

---

## Note operative

- **Critico (1–2):** fixare prima del prossimo push
- **Test (3):** continuare in piccoli batch quando si tocca il file comunque
- **Media (4–7):** boy-scout rule — refactor quando è conveniente con altro cambio
- **QoL (8–10):** quando il progetto ha risorse
- **999:** per dopo
