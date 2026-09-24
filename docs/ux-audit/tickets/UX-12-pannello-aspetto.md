# UX-12 · Pannello "Aspetto" nell'header

**Ondata:** 1 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

## Problema

L'header desktop (`src/components/layout/SiteHeader.tsx`) mostra tre bottoni per il tema (chiaro, sistema, scuro) e due per la lingua (IT, EN): con la tastiera sono 5 delle 17 fermate prima del contenuto, e occupano più spazio di Allenamenti e Calendario insieme. Il tema è una preferenza rara (default "sistema").

## Decisione

- La **lingua resta visibile** nell'header anche per chi non ha fatto l'accesso (le famiglie straniere non registrate non hanno un menu utente). Può diventare un singolo controllo compatto con testo (per esempio "IT ▾" oppure un interruttore IT/EN), sempre con testo visibile, non solo bandierina o icona.
- Il **tema** passa in un solo pulsante "Aspetto" (icona + testo, o icona con etichetta accessibile e tooltip) che apre un piccolo pannello con le tre opzioni.
- Il pannello può ospitare in futuro altre preferenze di lettura (testo più grande, testo facile): lasciare spazio, non implementarle ora.

## Cosa fare

1. Sostituire il gruppo di tre bottoni del tema con il pulsante "Aspetto" + pannello (desktop) e mantenere le opzioni nel drawer mobile.
2. Compattare il selettore di lingua mantenendolo visibile.
3. Testi in `it.json` ed `en.json`.

## Criteri di accettazione

- Fermate di Tab prima del contenuto ridotte di almeno 3.
- Lingua cambiabile senza accesso, su desktop e mobile, con al massimo un tocco in più di oggi.
