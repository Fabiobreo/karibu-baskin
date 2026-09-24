# UX-18 · Righe risultato leggibili su mobile

**Ondata:** 2 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

## Problema

In `/risultati` (`src/app/risultati/page.tsx`) su schermi da 390 px i nomi delle squadre vengono troncati ("Orsi Ba…", "Lupi Be…", "Monte…"): proprio il dato che conta. Inoltre la squadra del Karibu sta a sinistra o a destra a seconda di casa/trasferta, e la lettura verticale della lista si spezza.

## Cosa fare

1. Su schermi stretti, riga su due livelli: sopra le squadre per intero, sotto punteggio ed esito.
2. La nostra squadra **sempre a sinistra**, con casa/trasferta indicata dall'icona e dal testo già presenti.
3. Stessa regola nelle liste di partite in home e nel profilo giocatore ("Statistiche per partita"), se usano la stessa impaginazione.

## Criteri di accettazione

- A 360 px nessun nome di squadra troncato con i nomi attuali più lunghi del girone.
- Karibu sempre nella stessa posizione in tutte le righe.
