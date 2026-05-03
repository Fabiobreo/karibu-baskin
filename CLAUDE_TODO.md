# CLAUDE_TODO.md — Karibu Baskin

Analisi codebase con priorità d'intervento. Aggiornato automaticamente.

---

## 🔴 CRITICO — Fixare subito

*(nessun item critico aperto)*

---

## 🟡 HIGH PRIORITY — Test coverage

*(nessun item aperto — tutte le 45 route API sono coperte, 65 file test, 925 test passano)*

---

## 🟡 MEDIA PRIORITÀ

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
- **Media (5–6):** boy-scout rule — refactor quando è conveniente con altro cambio
- **QoL (8–10):** quando il progetto ha risorse
- **999:** per dopo

---

## ✅ COMPLETATI

- **#4** `getCurrentSeason()` centralizzata in `src/lib/seasonUtils.ts` — 4 occorrenze duplicate rimosse
- **#7** `revalidate` admin pages: utenti/squadre → 60s, partite/eventi/dashboard → 30s
- **#3** Test coverage: tutte le 45 route API coperte (65 file test, 925 test); ultimo gap era `test-login/route.ts`
