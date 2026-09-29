# UX-35 · Tabellino della partita simmetrico

**Ondata:** 4 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

## Problema

`/partite/[slug]` (`src/app/partite/[slug]/page.tsx`) è la pagina più condivisa su WhatsApp, e l'hero di una partita giocata è asimmetrico:

- il punteggio della nostra squadra ("67") non ha il nome sopra; quello avversario sì ("ORSI BASSANO 52");
- la nostra squadra compare solo come chip verde in alto a sinistra, accanto a girone e tipo di partita;
- al centro, dove l'occhio cerca il separatore, c'è il chip "Vittoria";
- su mobile la riga dei chip tocca il breadcrumb e il bottone di condivisione, e il nome avversario va su due righe mentre il nostro non c'è.

## Cosa fare

1. Tabellino a tre colonne, simmetrico:
   - `[Nostra squadra · punteggio] – [punteggio · Avversaria]`;
   - nomi sopra i punteggi, stessa taglia e peso;
   - nostra squadra sempre a sinistra (come `PlayedMatchRow`, UX-18).
2. Esito e competizione in una riga sotto il tabellino: "Vittoria · Campionato · Girone B Ovest, Silver". L'esito resta anche nel colore di sfondo dell'hero (già presente); niente chip al centro.
3. Riga meta unica: data e ora, casa/trasferta, luogo.
4. Partita non ancora giocata: stessa struttura, con "–" o l'orario al posto dei punteggi.
5. Su mobile breadcrumb e condividi su una riga propria, sopra il tabellino, senza sovrapposizioni.
6. Allineare l'immagine OG della partita (`opengraph-image.tsx`) alla stessa composizione, se il costo è basso (è anche nei parcheggiati).

## Criteri di accettazione

- A 1440 e a 360 px i due lati del tabellino hanno la stessa struttura (nome sopra, punteggio sotto).
- Nessuna sovrapposizione fra breadcrumb, chip e condividi a 360 px.
- `npm run a11y` verde; schermate di partita vinta, persa, pareggiata e futura.
