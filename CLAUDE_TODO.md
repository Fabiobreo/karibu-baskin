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

### F5. **Sistema TrueSkill per-ruolo** *(futuro — già in memory)*

Rating nascosto su User/Child per bilanciare squadre in allenamento. Visibile solo COACH/ADMIN.

**Decisione di design (maggio 2026):** usare **TrueSkill** (non ELO) perché:
- ELO converge troppo lentamente con pochi dati per giocatore
- TrueSkill modella l'incertezza (μ + σ) e converge più velocemente
- Progettato nativamente per sport di squadra

**Rating per-ruolo:** un rating separato per ogni ruolo sportivo (1-5) — i ruoli Baskin non sono comparabili tra loro.

**Bilanciamento in due livelli:**
1. Strutturale: distribuzione equa dei ruoli tra le squadre
2. Skill: a parità di ruoli, bilanciare per rating TrueSkill

**Prerequisito:** aggiungere UI semplice per registrare vincitori/perdenti di ogni partitella a fine allenamento — senza questo dato TrueSkill non si aggiorna.

---

## Note operative

| Categoria | Quando fare |
|---|---|
| 🔴 Critico (S1–S3) | Prima del prossimo push in produzione |
| 🟡 Alta (A1–A5) | Prossimo sprint — nessun prerequisito bloccante |
| 🟡 Media (M1–M5) | Boy-scout rule: quando si tocca il file per altro |
| 📋 Feature (F1–F5) | In ordine: F1 → F2 → F3 → F4 → F5 |