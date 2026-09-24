# UX-12 · Pannello "Aspetto" nell'header

**Ondata:** 1 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): pulsante "Aspetto" con menu del tema, lingua in un solo bottone "IT · EN"; fermate di Tab prima del contenuto da 18 a 15

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

## Esito

- **Tema:** `ThemeSwitcher` e' ora un solo `IconButton` con l'icona del tema corrente, tooltip "Aspetto" ed etichetta accessibile "Aspetto: Segui sistema". Apre un `Menu` con l'intestazione "Tema" e le tre opzioni (`menuitemradio`, spunta sulla scelta attiva). Sotto l'intestazione c'e' posto per altre preferenze di lettura.
- **Lingua:** `LanguageSwitcher` e' un solo bottone "IT · EN". La lingua corrente e' in arancio e sottolineata, non solo colorata; un tocco passa all'altra. Etichetta bilingue "Lingua / Language: IT. Passa a EN" nei dizionari. Resta visibile a tutti nell'header desktop e nel drawer mobile.
- **Drawer mobile:** tema invariato (bottone che scorre le tre opzioni), lingua con il nuovo bottone.
- **Verifica** con Playwright su `/news`, desktop:
  - fermate di Tab prima del contenuto da **18 a 15** (anonimo) e da **19 a 16** (admin);
  - cambio lingua con un tocco e ritorno;
  - menu del tema aperto e chiuso con Esc;
  - `npm run a11y` senza nuove violazioni.

**Rimasto fuori**

- Con piu' di due lingue il bottone andrebbe trasformato in un menu (oggi scorre alla successiva).
