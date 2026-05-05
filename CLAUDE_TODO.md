# CLAUDE_TODO.md — Karibu Baskin

Analisi codebase con priorità d'intervento. Aggiornato automaticamente.

---

## 🔴 CRITICO — Sicurezza

*(nessun item critico aperto)*

---

## 🟡 ALTA PRIORITÀ — Correttezza e struttura

*(nessun item aperto)*

---

## 🟡 MEDIA PRIORITÀ — Performance e QoL tecnico

### M3. **Componenti troppo grandi — refactor incrementale**

- `AdminPartiteClient.tsx` — ~1130 righe
- `CalendarClient.tsx` — ~1097 righe
- `AdminUserList.tsx` — ~1055 righe

**Non fare refactor standalone.** Estrarre sub-componenti e custom hooks quando si toccano per altre ragioni.

---

## 📋 FEATURES PIANIFICATE

### F1. **Storico presenze giocatore**

Non c'è pagina che mostra la frequenza agli allenamenti nel tempo. Utile per lo staff per monitorare la regolarità.

**Scope:**
- Sezione "Presenze" nel pannello admin utente (`/admin/utenti/[id]`)
- Eventualmente su profilo pubblico giocatore (visibile solo allo staff)

---

### F5. **Sistema ELO giocatori** *(futuro — già in memory)*

ELO nascosto su User/Child per bilanciare squadre in allenamento. Visibile solo COACH/ADMIN. Da implementare dopo F2 (dati di presenza reale necessari per calibrare).

---

## Note operative

| Categoria | Quando fare |
|---|---|
| 🔴 Critico (S1–S3) | Prima del prossimo push in produzione |
| 🟡 Alta (A1–A5) | Prossimo sprint — nessun prerequisito bloccante |
| 🟡 Media (M1–M5) | Boy-scout rule: quando si tocca il file per altro |
| 📋 Feature (F1–F5) | In ordine: F1 → F2 → F3 → F4 → F5 |