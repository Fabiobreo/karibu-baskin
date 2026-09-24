# UX-14 · Ciclo di vita dell'allenamento tutto in admin

**Ondata:** 2 · **Stima:** L · **Dipende da:** UX-13 · **Stato:** da fare

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
