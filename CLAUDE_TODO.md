# CLAUDE_TODO.md — Karibu Baskin

Analisi codebase con priorità d'intervento. Aggiornato automaticamente.

---

## 🔴 CRITICO — Sicurezza

*(nessun item critico aperto)*

---

## ⚖️ GDPR — Compliance (priorità decrescente)

> Audit effettuato il 2026-05-20. Già implementati: pagina `/privacy`, link nel footer, consenso genitoriale obbligatorio per `Child`, nota privacy nel form contatti.

### G1. **Rimuovere iframe Google Maps** 🔴 (da fare prima del prossimo deploy pubblico)

L'iframe di Google Maps in `src/app/contatti/page.tsx` installa cookie di profilazione Google **senza consenso preventivo** — violazione diretta del provv. Garante 10/06/2021.

**Fix:** sostituire l'iframe con uno screenshot statico del luogo + un link `<a>` "Apri in Google Maps" che rimanda all'URL esterno. In questo modo nessun cookie viene scritto finché l'utente non clicca volontariamente.

```
// RIMUOVERE:
<iframe src="https://maps.google.com/maps?q=...&output=embed" ... />

// SOSTITUIRE CON:
<Box component="img" src="/map-preview.jpg" alt="Polisportivo Gino Cosaro" ... />
<Button href="https://maps.google.com/maps?q=..." target="_blank">Apri in Google Maps</Button>
```

Scattare uno screenshot statico della mappa e salvarlo in `public/map-preview.jpg`.

---

### G2. **Self-service "Elimina account"** 🟡

Diritto di cancellazione GDPR (art. 17): oggi solo l'admin può cancellare un account via `DELETE /api/users/[userId]`.

**Fix minimo (consigliato):** aggiungere un pulsante "Richiedi eliminazione account" in fondo a `src/app/profilo/page.tsx` che invia una email a `asdkaribubaskin@gmail.com` con la richiesta. Non serve automazione — basta che l'utente abbia un canale ufficiale documentato.

**Fix completo (opzionale):** esporre `DELETE /api/users/me` che cancella l'utente loggato in autonomia (con dialog di conferma).

---

### G3. **Liberatoria minori per pubblicazione nominativi online** 🟡

`/giocatori/[slug]` e `/squadre/[season]/[slug]` pubblicano nome + statistiche di giocatori che potrebbero essere minori. Serve liberatoria firmata dai genitori.

**Azione manuale** (non implementabile nel codice): chiedere all'associazione se ENSI ETS fornisce un modulo standard, oppure predisporre un modulo di liberatoria da far firmare a tutti i genitori degli atleti minori presenti nel sistema.

---

### G4. **Informativa breve prima del prompt push notifications** 🟡

Attualmente il `PushNotificationToggle` in `/profilo` attiva direttamente il prompt browser. Aggiungere un testo di una riga sopra il toggle: *"Riceverai notifiche su nuovi allenamenti e partite. Puoi disattivare in qualsiasi momento."* con link alla privacy policy.

---

### G5. **Registro dei trattamenti interno** 🟡 (azione manuale)

Obbligatorio per il titolare ai sensi dell'art. 30 GDPR. Non va sul sito — è un documento interno (Excel/Notion/PDF) che elenca:

- categorie di dati trattati
- finalità
- base giuridica
- responsabili esterni (Vercel, Neon, Google, Resend)
- periodo di conservazione

Usare come base l'Informativa Privacy già pubblicata su `/privacy`.

---

### G6. **DPA (Data Processing Agreement) con i fornitori** 🟡 (azione manuale)

Verificare di aver accettato i DPA di:
- **Vercel**: [vercel.com/legal/dpa](https://vercel.com/legal/dpa) — accettazione in dashboard Vercel → Settings → Legal
- **Neon**: incluso nei ToS, verificare in dashboard
- **Resend**: disponibile su richiesta (support@resend.com)
- **Google** (OAuth/Maps): coperto dai Google Cloud ToS standard

---

## ✨ UX — Miglioramenti interfaccia

### U1. **Spostare il toggle tema nel dropdown del profilo utente**

Il toggle luce/buio/sistema è attualmente un `IconButton` standalone nell'header (desktop) e in fondo al drawer mobile. Deve essere spostato nel menu dropdown dell'avatar utente (`SiteHeader.tsx`), dove già appaiono "Il mio profilo" e "Esci".

- Nel menu desktop (`<Menu anchorEl={menuAnchor}>`): aggiungere voce con icona `ThemeModeIcon` e label `MODE_LABELS[colorMode]`, `onClick={cycleColorMode}`
- Nel drawer mobile: la voce esiste già in fondo ma può essere spostata nel menu avatar se si aggiunge uno
- Rimuovere l'`IconButton` standalone dall'header desktop e dal footer del drawer mobile (o mantenerlo solo mobile per accessibilità rapida — valutare)

---

## 🟡 MEDIA PRIORITÀ — Performance e QoL tecnico

### M1. **Componenti troppo grandi — refactor incrementale**

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

### F2. **Gestione immagini con Vercel Blob**

Upload immagini da parte di admin/coach (es. foto profilo squadra, foto giocatore, ecc.).

**Stack:** Vercel Blob SDK (`@vercel/blob`) — `put()` per upload, `del()` per cancellazione.

**⚠️ NB — Storage limitato su piano Hobby:**
- Il piano gratuito Vercel include **5 GB** di Blob storage.
- Vercel **non invia notifiche** al raggiungimento del limite — gli upload falliscono silenziosamente.
- Monitorare manualmente: dashboard Vercel → Storage → Usage.
- Per upgrade: piano Pro (~$20/mese) include spending limits configurabili con alert email.

**Regola implementativa obbligatoria — nessun file orfano:**
Quando un'immagine viene sostituita, eliminare sempre la vecchia prima di salvare la nuova URL:
1. Leggi URL attuale dal DB
2. `put()` nuova immagine → ottieni nuovo URL
3. Salva nuovo URL nel DB
4. `del(vecchioUrl)` — **non saltare questo step**

Senza il passo 4, lo storage si riempie di file orfani non referenziati.

---

### F3. **Gallery foto integrata con Instagram/Facebook**

Sezione gallery nel sito che mostra le foto pubblicate sui social della squadra, senza dover caricare nulla manualmente.

**Opzioni da valutare:**

- **Instagram Basic Display API / Graph API** — richiede app Meta approvata e token di accesso a lunga scadenza (60 giorni, rinnovabile). Mostra post pubblici del profilo. Gratuita ma con review process.
- **Facebook Page API** — simile, richiede Page Access Token. Utile se la pagina FB è più attiva di IG.
- **Soluzione ibrida (consigliata):** fetch lato server (route API) con cache aggressiva (es. revalidate ogni ora) — non espone token al client, riduce chiamate API.

**Alternativa senza API:**
Usare un widget embed di terze parti (es. Elfsight, Behold.so) — zero codice ma dipendenza esterna e possibile costo mensile.

**Prerequisiti:**
- Decidere quale social è più aggiornato (IG o FB)
- Creare app Meta su developers.facebook.com
- Ottenere token con permesso `instagram_basic` o `pages_read_engagement`

---

### F4. **Sistema TrueSkill per-ruolo** *(futuro — già in memory)*

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
| 🔴 Critico | Prima del prossimo push in produzione |
| 🟡 Media (M1) | Boy-scout rule: quando si tocca il file per altro |
| 📋 Feature (F1–F4) | In ordine: F1 → F2 → F3 → F4 |
| 🛠 DX / ✨ UX / 🏗 INF | Raccogliere in sprint dedicati |
