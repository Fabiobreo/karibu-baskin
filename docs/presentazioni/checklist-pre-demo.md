# Checklist pre-demo — Karibu Baskin

> Obiettivo: arrivare ai meeting con un sito che sembra **vivo e reale**, non una bozza.
> Regola d'oro: una demo su dati veri convince 10× più di una su dati finti.

---

## 1. Popolare con dati VERI (la cosa più importante)

- [ ] **Pulire i mock user** del seed (`prisma/seed.ts`) — nessun "Mario Rossi test" visibile in demo
- [ ] Creare **1 squadra agonistica reale** della stagione corrente (2025-26) con rosa vera
- [ ] Inserire **2-3 allenamenti** (uno passato con squadre generate, uno futuro con iscrizioni aperte)
- [ ] Generare le **squadre bilanciate** su un allenamento → è l'effetto "wow", deve essere pronto
- [ ] Caricare **foto vere** (avatar di qualche giocatore, logo squadra, copertina)
- [ ] Inserire **1-2 news** in bacheca + 1 sondaggio attivo
- [ ] **Gallery**: far girare almeno una sync Instagram così la pagina non è vuota
- [ ] **1 partita ufficiale** con risultato + qualche statistica/MVP (per mostrare marcatori e profili)
- [ ] **Calendario** popolato (deve vedersi pieno: allenamenti + partita + 1 evento)

## 2. Account e contenuti da chiedere PRIMA alla società

- [ ] Account **Instagram Business** collegato (per la gallery automatica) → serve `IG_ACCESS_TOKEN`
- [ ] **ID canale YouTube** ufficiale (sezione video gallery)
- [ ] Logo ufficiale in alta risoluzione
- [ ] Loghi/elenco **sponsor**
- [ ] Decisione sul **dominio** (es. karibubaskin.it) — anche solo "lo vogliamo sì/no"

## 3. Verifiche tecniche (fai girare prima del meeting)

- [ ] `npx tsc --noEmit` verde (dopo aver cancellato `.next/`)
- [ ] `npm test` verde
- [ ] **Deploy Vercel aggiornato** e raggiungibile dal dominio che userai in demo
- [ ] Login con Google funziona **in produzione** (non solo in locale)
- [ ] Provare il sito **da telefono vero**: login, iscrizione, installazione PWA
- [ ] **Notifiche push**: iscriversi e ricevere almeno una notifica di prova
- [ ] Controllare **dark mode** su 2-3 pagine chiave (niente colori rotti)
- [ ] Provare una pagina da **offline** (PWA / offline.html)

## 4. Materiale da avere in sala (rete di sicurezza)

- [ ] **Screenshot di backup** delle schermate chiave (se il wifi non va o cade il deploy)
- [ ] **QR code** che punta al sito → per genitori/atleti che provano lì sul momento
- [ ] Slide caricate **in locale** (non solo in cloud)
- [ ] Telefono carico + cavo/adattatore per proiettore
- [ ] Hotspot dal telefono come backup wifi

## 5. Account di prova per la demo

- [ ] Un account **ADMIN/COACH** pronto e loggato (pannello admin)
- [ ] Un account **ATLETA** normale (per mostrare la vista utente)
- [ ] Un account **GENITORE** con un figlio collegato (per mostrare gestione figli)
- [ ] Sapere come **passare velocemente** tra le viste (logout/login o due browser/finestre)

## 6. Sequenza demo consigliata (prova a voce prima)

**Direzione + Coach** (~15 min demo):

1. Home → calendario pieno
2. Pannello admin: crea allenamento → apri iscrizioni
3. Allenamento con iscritti → **genera squadre bilanciate** (TrueSkill)
4. Convocazioni partita + copertura ruoli
5. Bacheca/news + gallery
6. Gestione utenti + ruoli/permessi (privacy minori)

**Genitori + Atleti** (~8 min):

1. Login con Google (un tap)
2. Iscrizione a un allenamento
3. "La tua squadra"
4. Calendario + notifiche
5. Installa come app (PWA) + QR code

---

## Promemoria d'oro

- Demo **live**, slide come backup — mai il contrario.
- Parla di **benefici**, non di tecnologia (loro non vogliono "Next.js", vogliono "le iscrizioni non si perdono più").
- Chiudi ogni meeting con **una richiesta chiara** (Direzione: ok + contenuti; Genitori: installate l'app stasera).
