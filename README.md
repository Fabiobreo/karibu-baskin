# Karibu Baskin Montecchio Maggiore

Web app per la squadra Karibu Baskin di Montecchio Maggiore (VI). Gestione allenamenti, iscrizioni, squadre agonistiche, calendario, partite e pannello admin.

## Setup locale

### 1. Installa le dipendenze
```bash
npm install
```

### 2. Configura le variabili d'ambiente
```bash
cp .env.example .env.local
# Modifica .env.local con i tuoi valori
```

Vedi [`docs/SETUP.md`](docs/SETUP.md) per le istruzioni dettagliate su ogni servizio esterno (Google OAuth, Neon, Resend, Web Push).

### 3. Esegui le migration
```bash
npm run db:migrate
```

### 4. Avvia il server di sviluppo
```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Deploy su Vercel

1. Push del repo su GitHub (branch `develop` → preview, `main` → produzione)
2. Importa il progetto su [vercel.com](https://vercel.com)
3. Configura le variabili d'ambiente (vedi `.env.example`)
4. Il build command è configurato in `package.json`: `prisma db push && prisma generate && next build`

> Il build include `prisma db push` che sincronizza automaticamente lo schema del DB di produzione ad ogni deploy Vercel.

## Funzionalità

- **Allenamenti**: calendario pubblico, iscrizioni per utenti / figli / anonimi, generazione squadre bilanciate, restrizioni per squadra/ruolo sportivo
- **Squadre agonistiche**: gestione stagioni, roster, partite ufficiali, statistiche giocatore, gironi e classifiche
- **Calendario**: visualizzazione mensile con allenamenti, partite ed eventi; export iCal
- **Notifiche**: push (Web Push API/VAPID) + in-app con preferenze granulari per tipo evento
- **Profilo utente**: dati atleta, gestione figli, collegamento account genitore-figlio
- **PWA**: installabile su mobile, funzionamento offline
- **Admin panel**: gestione utenti, allenamenti, partite, eventi, squadre; export dati

## Stack

- Next.js 16.2.1 (App Router, Turbopack)
- React 19 + TypeScript 5 (strict)
- Material UI v6 + Emotion
- Prisma v6 + PostgreSQL (Neon)
- Auth.js v5 (Google OAuth)
- Vercel (deploy) + Vercel Analytics

Per la documentazione tecnica completa vedi [`CLAUDE.md`](CLAUDE.md) e [`docs/`](docs/).
