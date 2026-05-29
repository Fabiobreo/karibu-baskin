# Idee future — Karibu Baskin

Funzionalità non prioritarie o che richiedono prerequisiti non ancora disponibili.

---

## Chemistry score (TrueSkill Fase 5)

Stimare quali coppie/trii di giocatori sovraperformano la somma dei μ individuali — cioè il "residuo di coppia" non catturato dal rating singolo.

**Prerequisito bloccante:** dati per-possesso o per-frazione. Oggi il sistema registra solo il risultato finale di ogni partitella, non chi era _in campo_ in un dato momento. Senza questa granularità il segnale è troppo rumoroso.

**Approccio minimo quando si decide di procedere:**

Schema: aggiungere `TrainingMatchSegment` (FK su `TrainingMatchResult`, `order`, `onCourtSnapshot Json`, `scoreA`/`scoreB` parziale). Additivo, sicuro con `prisma db push`.

Motore: nuovo modulo `chemistry.ts` separato da `ratingEngine.ts`. Per ogni segmento, calcola la performance osservata vs. attesa dai μ. Accumulato su coppie/trii → "residuo chemistry". È matematica nuova, non un'estensione del TrueSkill esistente.

**Ha senso solo dopo almeno una stagione di dati TrueSkill base.** Senza storico sufficiente il residuo è rumore.

---

## Modalità referto a bordocampo

Per raccogliere i dati per-frazione della chemistry serve qualcuno che referti ogni allenamento. Non serve un'app separata — la PWA esistente (già installabile, fullscreen, Web Push) è sufficiente se si aggiunge:

- **Route dedicata** `/admin/partite/[id]/referto` (o analoga per partitelle) — UI pensata per uso con una mano, pulsanti grandi, niente fronzoli.
- **Coda di scritture offline**: gli eventi (sostituzioni, parziali) salvati in IndexedDB e sincronizzati quando torna la connessione (Background Sync API o coda manuale). Il service worker attuale fa solo offline _read_ — questo è l'unico pezzo infrastrutturale nuovo.
- **Web Wake Lock API** per tenere lo schermo acceso durante la partita.

Il vero costo non è tecnico ma operativo: serve una persona disposta a farlo a ogni allenamento con costanza.

---

## Add-on LLM — RAG regolamento baskin

Chatbot sul regolamento ufficiale baskin accessibile a giocatori, allenatori, arbitri, genitori.

- Embedding una tantum del PDF del regolamento (es. con OpenAI Embeddings o Gemini).
- Inferenza su query con Gemini Flash / GPT-4o-mini — costo marginale quasi zero.
- Potenziale utilità per tutta la comunità baskin italiana, non solo Montecchio.

Nessun prerequisito tecnico bloccante. È una feature standalone che non dipende da nessun altro sviluppo.

---

## Out of scope (confermato)

- **Gestione rotazioni in tempo reale durante la partita** — richiede operatore dedicato e latenza quasi-zero; troppo complesso per il valore.
- **Ruoli tattici** — nel baskin la categoria IS il ruolo, non ha senso un layer tattico separato.
- **Simulazione Monte Carlo stagione** — dati avversari ancora insufficienti per essere affidabile.
