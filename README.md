# Karibu Baskin Montecchio Maggiore — App Iscrizioni

Web app per la gestione delle iscrizioni agli allenamenti della squadra Karibu Baskin.

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

### 3. Configura il database (Neon)
1. Vai su [neon.tech](https://neon.tech) e crea un progetto gratuito
2. Copia `DATABASE_URL` e `DIRECT_URL` dalla dashboard Neon
3. Incollali in `.env.local`

### 4. Esegui le migration
```bash
npm run db:migrate
```

### 5. Avvia il server di sviluppo
```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Deploy su Vercel

1. Push del repo su GitHub
2. Importa il progetto su [vercel.com](https://vercel.com)
3. Aggiungi le variabili d'ambiente nelle impostazioni Vercel:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `ADMIN_PASSWORD`
   - `COOKIE_SECRET`
4. Il build command è già configurato in `package.json`: `prisma migrate deploy && next build`

## Funzionalità

- **Home**: lista degli allenamenti programmati raggruppati per data
- **Pagina allenamento**: iscrizione con nome e ruolo (1-5), lista iscritti per ruolo, generazione squadre bilanciate
- **Admin** (`/admin`): creazione e gestione degli allenamenti, protetto da password

## Stack

- Next.js 15 (App Router)
- React 19
- Material UI v6
- Prisma + Neon (PostgreSQL)
- Vercel
