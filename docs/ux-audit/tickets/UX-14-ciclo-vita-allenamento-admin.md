# UX-14 · Ciclo di vita dell'allenamento tutto in admin

**Ondata:** 2 · **Stima:** L · **Dipende da:** UX-13 · **Stato:** fatto (commit su `develop`): `/admin/allenamenti` con Prossimi / Da completare / Conclusi e Nuovo allenamento; la pagina pubblica ha per lo staff solo "Gestisci"; bottone "Nuovo" nel calendario

## Problema

La gestione di un allenamento è divisa fra sito pubblico e admin, e lo staff deve ricordare dove sta ogni passo:

| Passo                                            | Dove si fa oggi                                                                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Creare                                           | pagina **pubblica** `/allenamenti` ("Nuovo allenamento", `AdminSessionForm` dentro `src/components/training/AllenamentiClient.tsx`), oppure cliccando un giorno del calendario (`CalendarClient`, nessun segnale visivo) |
| Aprire/chiudere le iscrizioni, creare le squadre | pagina pubblica `/allenamenti` (16 controlli staff in `AllenamentiClient`, 1.497 righe)                                                                                                                                  |
| Iscrivere chi non ci è riuscito                  | admin (`AdminUpcomingSessions`, `ManageParticipantsDialog`)                                                                                                                                                              |
| Presenze, risultati, chiusura                    | admin (`AdminAllenamentiClient`)                                                                                                                                                                                         |

Il box informativo dell'admin dice di usare il Calendario o la pagina Allenamenti per creare: l'admin rimanda fuori da sé.

## Cosa fare

1. In `/admin/allenamenti` una sola vista con tre sezioni: **Prossimi**, **Da completare**, **Conclusi**.
2. "Nuovo allenamento" in cima alla vista admin (riusa `AdminSessionForm`).
3. Nella scheda di un allenamento, gli stessi passi in ordine: iscritti → iscrizioni aperte/chiuse → squadre → presenze e risultati (UX-13) → concluso.
4. Rinominare la voce di menu "Allenamenti da completare" in "Allenamenti".
5. Il calendario resta una via rapida per lo staff, ma con un bottone "Nuovo" visibile (oltre al clic sul giorno).
6. Pagina pubblica `/allenamenti`: i controlli staff si riducono a un link "Gestisci" verso l'admin. **Non** ridisegnare i controlli staff di `AllenamentiClient` prima di questo ticket: verrebbero tolti.

## Criteri di accettazione

- Tutti i passi del ciclo di vita si fanno da `/admin/allenamenti` senza passare dal sito pubblico.
- Le API restano invariate o compatibili; `npm test` verde.
- Le funzioni oggi disponibili dal calendario e da `/allenamenti` restano raggiungibili.

## Esito

- **Una vista, tre schede** (`AdminTrainingsView`): **Prossimi**, **Da completare** (predefinita se c'e' qualcosa da chiudere), **Conclusi** (gli ultimi 20). La scheda e' nell'URL (`?sezione=`). "Nuovo allenamento" in cima riusa `AdminSessionForm`.
- **Prossimi** (`AdminUpcomingList`): una riga per allenamento con lo stato delle iscrizioni e delle squadre. Dentro, i passi in ordine:
  1. iscritti, con "Gestisci iscritti";
  2. iscrizioni aperte/chiuse, con conferma perche' parte una notifica;
  3. squadre (`AdminSessionTeams`).
- **Da completare / Conclusi:** `AdminAllenamentiClient` con `TrainingCloseForm` (UX-13). Sui conclusi un solo "Salva modifiche", per correggere presenze e punteggi.
- **Su ogni allenamento** (`SessionActions`): Modifica (`SessionEditDialog`, estratto da `AllenamentiClient`, stessa PATCH), Elimina con conferma, link alla pagina pubblica.
- **Link diretti:** `?apri=<id>` apre la riga nella sezione giusta, `?modifica=<id>` apre anche la modifica. Il calendario (`EventDetailDialog`) e la home puntano li'; il vecchio `/allenamenti?edit=<id>` reindirizza.
- **Menu:** "Allenamenti da completare" diventa "Allenamenti". La card della dashboard porta a `?sezione=da-completare`. Tolto `AdminUpcomingSessions`, sostituito da `AdminUpcomingList`.
- **Pagina pubblica `/allenamenti`:** per lo staff solo "Gestisci allenamenti" in cima e un'icona "Gestisci" su ogni card o riga verso l'admin. Tolti nuovo, modifica, elimina, apri/chiudi iscrizioni, crea/rimuovi squadre e i loro dialog: `AllenamentiClient` da 1.500 a 875 righe. Stessa pulizia in `SessionCard` e `HomeSessionsSection` (home).
- **Calendario:** bottone "Nuovo" per lo staff nell'intestazione del mese, apre lo stesso dialog del clic sul giorno (oggi, o il primo del mese mostrato). Testi in `it.json`/`en.json`.
- **API invariate.**
- **Verifica** con Playwright, desktop e mobile, senza salvare nulla: schede e sezione iniziale, passi del prossimo in ordine, dialog "Nuovo allenamento" e "Modifica" (anche da `?modifica=`), controlli staff su `/allenamenti` ridotti a "Gestisci", "Nuovo" del calendario. Nessun controllo nuovo sotto 44px. `npm test` verde (1761), `npm run a11y` senza nuove violazioni.

**Rimasto fuori**

- Non ho provato **nel browser** creazione, apertura iscrizioni e squadre di un allenamento futuro: mandano notifiche push e in-app agli utenti del database di sviluppo. Usano le stesse API di prima, gia' coperte dai test.
- La pagina di un singolo allenamento (`/allenamento/[id]`) ha ancora, per lo staff, la matita di modifica nell'hero (`AllenamentoHero`) e i controlli delle squadre: il ticket chiedeva di ridurre solo `/allenamenti`. Si possono portare a "Gestisci" allo stesso modo.
- `AllenamentoHero` ha una sua copia del dialog di modifica: potrebbe usare `SessionEditDialog`.
