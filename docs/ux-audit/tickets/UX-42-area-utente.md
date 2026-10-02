# UX-42 · Area utente: notifiche, profilo, selettore "per chi"

**Ondata:** 4 · **Stima:** S · **Dipende da:** UX-32 · **Stato:** fatto (su `develop`, 02/10/2026), con il perimetro rivisto il giorno stesso (vedi "Com'è andata")

## Problema

**`/notifiche`** (`src/components/notifications/NotificheClient.tsx`):

- il titolo di ogni riga è il tipo generico ("Nuovo allenamento", "Nuovo sondaggio") in arancione, e il contenuto utile ("Allenamento a luglio, mercoledì 15 luglio, 18:00-20:00") sta sotto in grigio: gerarchia rovesciata;
- gruppo "PRIMA (20)": non si capisce "prima di cosa";
- "Segna tutte come lette" è grigio chiaro e sembra disattivato;
- righe da circa 90 px con la data su una riga a sé.

**`/profilo`:**

- in "Dati atleta" l'etichetta "Ruolo Baskin" sta a sinistra e il valore (badge "5") a 800 px di distanza, a destra;
- sotto un avatar vuoto compare "Foto da Google";
- il ruolo utente "Atleta" è un chip arancione pieno, ma non è toccabile (contro la regola di UX-07);
- in "Presenze agli allenamenti" la stagione corrente è un chip arancione pieno e le altre un chip contornato, senza spiegazione.

**"Per chi ti iscrivi?"** nel form d'iscrizione del genitore: compaiono due "Marco Cenci", uno per l'account e uno per la scheda figlio della stessa persona, distinti solo dall'icona.

## Cosa fare

1. **Notifiche:**
   - contenuto come titolo (nero, 600), tipo come occhiello con icona (neutro), tempo relativo sulla stessa riga del tipo;
   - gruppi "Oggi", "Questa settimana", "Prima";
   - "Segna tutte come lette" come bottone di testo con contrasto pieno;
   - righe da circa 64 px.
2. **Profilo:**
   - coppie etichetta-valore vicine (griglia a due colonne da 160 px, oppure valore sotto l'etichetta);
   - "Foto da Google" solo se la foto c'è;
   - chip del ruolo utente neutro (UX-29);
   - presenze come elenco "2026-27: 1 allenamento", senza chip.
3. **Per chi ti iscrivi?:** se account e scheda figlio sono la stessa persona (`Child.userId`), mostrare **una** voce; altrimenti aggiungere una seconda riga che distingue ("il tuo account" / "scheda gestita da …").

## Criteri di accettazione

- In `/notifiche` il contenuto di ogni notifica è la prima cosa letta nella riga.
- Nessun chip arancione non toccabile in `/profilo`.
- Nessun nome ripetuto e indistinguibile nel selettore "per chi".
- Testi in `it.json` ed `en.json`; `npm run a11y` verde.

## Com'è andata (02/10/2026)

Prima di lavorarlo il ticket è stato ricontrollato sul codice: due punti erano già chiusi da altri ticket (gruppi temporali; chip del ruolo utente, tonale da UX-29 e non "neutro" come scritto sopra), uno aveva la diagnosi sbagliata, il selettore era sottodimensionato. Due decisioni del committente: **l'auto-lettura resta e il bottone sparisce**; il ticket si allarga al **selettore "per chi" completo**.

**Notifiche**

- Il ruolo di `title` e `body` nel DB non è fisso: per allenamenti, news, sondaggi, eventi, squadre pronte e traguardi il titolo è generico e il contenuto sta nel corpo; per risultati, collegamenti, compleanni e avvisi il titolo è già il contenuto. La regola sta in `notificationDisplay` (`@/lib/notifications/notificationDisplay`, con test), per tipo e senza toccare i dati: vale anche per le notifiche vecchie. Le emoji in testa ai titoli (servono alle push) non si mostrano nella lista.
- Riga: contenuto in nero a 600, sotto "tipo · tempo" in grigio; il dettaglio solo dove il titolo è già il contenuto. 58 px su desktop (76 con il dettaglio). Icona per ogni tipo, sempre neutra.
- **"Segna tutte come lette" non c'è più**, né nella pagina né nella tendina della campanella: non era "grigio chiaro", era spento, perché la pagina segna tutto come letto da sola dopo un secondo e mezzo.
- Gruppi senza contatore (era il numero di righe caricate, non il totale) e "Prima" rinominato "Più vecchie", che si capisce anche quando è l'unico gruppo.
- La tendina della campanella usa la stessa riga; i suoi testi ora passano dai dizionari.

**Profilo**

- `ProfileRow` è una riga di `<dl>`: su telefono etichetta a sinistra e valore a destra (resta com'era), da `sm` il valore sta in una colonna a 160 px dall'etichetta.
- Presenze come testo ("Stagione 2026-27 · 1 allenamento"), senza chip.
- "Foto da Google": il codice la mostrava già solo con una foto a DB; ora sparisce anche quando la foto c'è ma non si carica (`onImageError` di `ImageUploader`).

**Per chi ti iscrivi?**

- Radio veri (`RadioGroup` in un `fieldset` con la domanda come `legend`): frecce e stato letto dallo screen reader, tessere da 48 px.
- Una persona, una voce: la scheda figlio collegata all'account di chi guarda (`Child.userId` o `linkedChildId`) non compare, il filtro è in `useRegistrationForm` (`subjectChildren`). La propria voce dice **"Io"** con il nome sotto, così un figlio omonimo non si confonde. Senza figli fra cui scegliere il selettore non compare.
- Via l'icona del neonato (`ChildCare`): i "figli" sono spesso ragazzi o adulti.
- Chi è già iscritto resta in elenco, non selezionabile, con "Già tra gli iscritti".
- Testi nei dizionari (prima erano scritti a mano in italiano).

**Verifiche:** `tsc`, `npm test`, `npm run a11y` verdi; `/notifiche` e `/profilo` guardati nel browser (desktop e 375 px), il selettore nelle storie di `RegistrationForm` (nuova storia "Genitore, con la propria scheda figlio").

**Contro-revisione (02/10, avvocato del diavolo) e correzioni:**

- **Allenamenti:** "Iscrizioni chiuse" e "Allenamento aggiornato" non sono etichette, dicono cosa è cambiato: con la prima regola finivano nell'occhiello grigio e tre notifiche dello stesso allenamento avevano lo stesso titolo. Ora restano titolo, con l'allenamento come dettaglio; solo "Nuovo allenamento" va nell'occhiello (`NEW_TRAINING_TITLE`, condiviso con `sessionNotify`).
- **Tipi classificati per forza:** la regola è un `Record` sull'enum di Prisma, un tipo nuovo non compila finché non è classificato.
- **Emoji:** si tolgono anche le sequenze (toni della pelle, unioni, bandiere), con test.
- **Scheda figlio propria:** la regola "è la stessa persona" sta in `splitOwnChild` (`@/lib/registrationSubjects`, con test) e la usa anche la card "prossima cosa da fare", che altrimenti continuava a proporre di iscrivere la propria scheda. Per sé vale il ruolo dell'account o, se manca, quello confermato sulla scheda.
- **Soggetto predefinito:** se tutti i figli sono già iscritti parte da "Io", non da una voce spenta.
- **Icona del neonato:** tolta anche dall'intestazione del figlio scelto nel form.
- **"Foto da Google":** la prova di caricamento la fa un'immagine a parte in `ProfileAvatarEditor`; l'errore dell'`<img>` reso dal server poteva scattare prima dell'idratazione. `ImageUploader` è tornato com'era.
- **`markAllRead`:** non lascia più un errore non gestito senza rete, e azzera il contatore solo se il server ha risposto bene.

- **Lettura automatica rivista:** non c'è più il timer. La pagina segna tutto come letto appena si apre e il segno "non letta" resta a schermo per tutta la visita (prima spariva dopo un secondo e mezzo). La tendina della campanella segna lette, subito, **solo le notifiche che mostra**: chi dà un'occhiata veloce le segna comunque, e quelle oltre la sesta restano non lette e nel contatore.

**Rimasto fuori:** I testi delle notifiche sono scritti dal server in italiano e restano tali anche con la lingua inglese; in inglese si traducono solo le etichette di tipo generate dall'interfaccia.
