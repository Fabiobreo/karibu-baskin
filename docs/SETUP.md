# Setup & cose da ricordare

Questo file raccoglie tutto ciò che va fatto manualmente (account esterni, variabili d'ambiente, DNS) per far funzionare l'app in produzione.

---

## 1. Resend — email transazionali

### Creare l'account
1. Vai su [resend.com](https://resend.com) e registrati (gratuito, no carta di credito)
2. Crea una **API Key** da *Settings → API Keys → Create API Key*
3. Salva la chiave: la vedi solo al momento della creazione

### Variabili d'ambiente da aggiungere

| Variabile | Valore | Dove |
|---|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxxxx` | `.env.local` + Vercel |
| `CONTACT_EMAIL` | `asdkaribubaskin@gmail.com` | `.env.local` + Vercel (opzionale, è il default) |

### Verificare il dominio mittente
Senza questa operazione le email arrivano solo agli indirizzi verificati manualmente su Resend (utile solo per test).

1. Da Resend vai su *Domains → Add Domain* e inserisci `karibubaskin.it`
2. Resend ti mostra 3 record DNS da aggiungere al tuo provider di dominio:
   - 1 record **TXT** (verifica proprietà)
   - 2 record **CNAME** (DKIM per autenticazione)
3. Aggiungi i record dal pannello del tuo registrar (es. Aruba, Cloudflare...)
4. Torna su Resend e clicca *Verify* — può richiedere fino a 48h (di solito pochi minuti)

Dopo la verifica puoi mandare da `noreply@karibubaskin.it`, `info@karibubaskin.it`, ecc.

### Piano gratuito
- 3.000 email/mese
- 100 email/giorno
- Sufficiente per una piccola associazione sportiva

---

## 2. Google OAuth — autenticazione utenti

### Creare il progetto
1. Vai su [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un nuovo progetto (o usa uno esistente)
3. Vai su *APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID*
4. Tipo applicazione: **Web application**
5. Aggiungi gli URI di reindirizzamento autorizzati:
   - `http://localhost:3000/api/auth/callback/google` (sviluppo)
   - `https://karibu-baskin.vercel.app/api/auth/callback/google` (produzione)

### Variabili d'ambiente

| Variabile | Dove trovare il valore |
|---|---|
| `GOOGLE_CLIENT_ID` | Pannello Google Cloud → Credentials |
| `GOOGLE_CLIENT_SECRET` | Pannello Google Cloud → Credentials |

---

## 3. Database — Neon (PostgreSQL)

1. Vai su [neon.tech](https://neon.tech) e crea un progetto
2. Crea **due branch**: uno per sviluppo, uno per produzione
3. Copia le stringhe di connessione dai branch corrispondenti

### Variabili d'ambiente

| Variabile | Descrizione |
|---|---|
| `DATABASE_URL` | Connection pooling URL (usato dall'app) |
| `DIRECT_URL` | Direct URL (usato da Prisma per le migration) |

> Le variabili Vercel devono puntare al branch **production** di Neon, quelle in `.env.local` al branch di sviluppo.

---

## 4. Auth.js — sessioni

```bash
# Genera una chiave sicura
openssl rand -base64 32
```

| Variabile | Valore |
|---|---|
| `AUTH_SECRET` | Stringa generata con il comando sopra |
| `NEXTAUTH_URL` | `https://karibu-baskin.vercel.app` (prod) / `http://localhost:3000` (dev) |

---

## 5. Web Push — notifiche push

```bash
# Genera le chiavi VAPID (esegui una volta sola, salva i valori)
node -e "const wp = require('web-push'); const keys = wp.generateVAPIDKeys(); console.log(keys);"
```

| Variabile | Descrizione |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Chiave pubblica (visibile lato client) |
| `VAPID_PRIVATE_KEY` | Chiave privata (solo server) |
| `VAPID_EMAIL` | Es. `admin@karibubaskin.it` |

> Le chiavi VAPID vanno generate **una volta sola** e non cambiate — cambiarle invalida tutte le subscription degli utenti.

---

## 6. Test login (solo sviluppo/preview)

| Variabile | Valore |
|---|---|
| `ENABLE_TEST_LOGIN` | `true` (non mettere mai in produzione su Vercel) |
| `TEST_PASSWORD` | Password a scelta (default: `karibu-test`) |

---

## 7. Vercel Cron Job — cleanup automatico

Il cron job in `vercel.json` (`/api/cron/cleanup-notifications`) richiede:

| Variabile | Valore |
|---|---|
| `CRON_SECRET` | Stringa random sicura (`openssl rand -base64 32`) |

---

## 8. `.env.local` completo (sviluppo)

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Auth.js
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=admin@karibubaskin.it

# Email (Resend)
RESEND_API_KEY=re_...
CONTACT_EMAIL=asdkaribubaskin@gmail.com

# Test login
ENABLE_TEST_LOGIN=true
TEST_PASSWORD=karibu-test

# Cron
CRON_SECRET=...
```

---

## 9. Anteprima template email (locale)

```bash
npm run email:dev
```

Apri [http://localhost:3333](http://localhost:3333) — vedrai tutti i template in `src/emails/` renderizzati in tempo reale. Nessuna email viene inviata, è solo un'anteprima visiva.

