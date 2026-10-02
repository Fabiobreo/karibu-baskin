# UX-48 · `/marcatori` su telefono: prima i nomi, poi i filtri

**Ondata:** 5 · **Stima:** S · **Dipende da:** UX-45 · **Stato:** da fare

Nato dal [riaudit del 02/10/2026](../RIAUDIT-2026-10-02.md), problema 5.

## Problema

A 390 × 844 il primo giocatore di `/marcatori` comincia a circa 590 px: quasi tutta la prima schermata è cornice. In ordine: fascia con le tab di sezione, selettore di stagione, avviso di stagione, "Filtra per ruolo o tocca un'intestazione per ordinare", ricerca, sei chip di ruolo su due righe, interruttore "Più colonne", nota "I numeri comprendono anche le partite giocate in prestito".

Inoltre "N in prestito" è scritto sotto ogni numero di ogni riga (fino a cinque volte per giocatore), su desktop e su telefono. Era già segnato nel riaudit del 29/09.

## Cosa fare

1. Su telefono ricerca, ruolo e "Più colonne" stanno in una riga sola richiudibile ("Cerca e filtra"), chiusa all'apertura della pagina; se c'è un filtro attivo la riga lo dice ("Ruolo 3").
2. L'istruzione "tocca un'intestazione per ordinare" su telefono non serve (le card non hanno intestazioni): mostrarla solo da `sm`.
3. "In prestito": una sola indicazione per giocatore (accanto al nome, o nella colonna Giocate), e il dettaglio per voce solo con "Più colonne" o nel profilo del giocatore. La nota in cima resta.
4. Punti in inchiostro, non in arancio: vedi [UX-49](UX-49-tinta-squadra-e-azioni.md), che decide il colore; qui solo la disposizione.

## Criteri di accettazione

- A 390 × 844 il nome del primo giocatore è visibile senza scorrere.
- Al massimo una scritta "in prestito" per riga nella vista di base.
- Ricerca e filtro per ruolo funzionano come oggi; a 1.440 px la tabella è quella di oggi, tranne "in prestito".
- Testi nuovi in `it.json` ed `en.json`; `npm run a11y` verde.
