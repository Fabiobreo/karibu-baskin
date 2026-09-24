# UX-05 · Messaggi che restano

**Ondata:** 0 · **Stima:** M · **Dipende da:** nessuno · **Stato:** fatto (commit su `develop`): errori che restano finche' non si chiudono, avvisi almeno 6 s, errore di salvataggio sotto la partita con "Riprova", annullamento della disiscrizione per 10 s, blocco d'iscrizione con motivo leggibile e "Chiedi allo staff"

## Problema

Molti riscontri spariscono prima che una persona con difficoltà di lettura o di attenzione riesca a leggerli (linee guida W3C COGA: niente limiti di tempo sulle informazioni importanti).

| Dove                                                        | Oggi                                                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/context/ToastContext.tsx:54`                           | tutti gli avvisi, **errori compresi**, si chiudono dopo 3,5 s (`autoHideDuration={toast.duration ?? 3500}`)                       |
| `src/components/training/RosterByRole.tsx:363-384`          | dopo la disiscrizione "Annulla" resta 3 s, con una barra che si svuota; testi in italiano scritti nel codice                      |
| `src/components/matches/MieDisponibilitaClient.tsx:101-131` | se il salvataggio della disponibilità fallisce l'interruttore torna indietro e l'errore sparisce: l'utente crede di aver risposto |
| `src/components/training/RegistrationForm.tsx:316-326`      | "Non puoi iscriverti a questo allenamento": il motivo è piccolo e grigio e non c'è un passo successivo                            |

## Cosa fare

1. `ToastContext`: gli errori non si chiudono da soli (restano finché l'utente li chiude); i messaggi di successo restano almeno 6 s.
2. Gli errori che riguardano un elemento preciso vanno scritti **accanto all'elemento**, non solo nell'avviso. Esempio: sotto la partita in `/profilo/disponibilita`, "Non salvato. Riprova", con il pulsante per riprovare.
3. Disiscrizione: annullamento disponibile almeno 10 s, oppure un dialog di conferma prima dell'azione. Spostare i testi in `it.json`/`en.json`.
4. Iscrizione non consentita: motivo in testo normale (`text.primary` o `text.secondary`, non in grigio chiaro) e una via d'uscita, per esempio "Chiedi allo staff" con il link ai contatti.

## Criteri di accettazione

- Un errore di rete durante il salvataggio della disponibilità lascia un messaggio visibile vicino alla partita fino al nuovo tentativo.
- Nessun messaggio d'errore si chiude da solo.
- Nessuna stringa italiana scritta nel codice di `RosterByRole`.

## Esito

- **Scelta del punto 3:** annullamento per 10 s (decisione del committente, settembre 2026), niente dialog di conferma.
- `ToastContext`: `toastAutoHideMs` (con test): errori senza chiusura automatica, e un tocco altrove non li chiude; tutti gli altri avvisi almeno 6 s, anche quelli che chiedevano meno (es. "Link copiato" in `ShareSection`, prima 2 s).
- `MieDisponibilitaClient`: se il salvataggio fallisce, sotto la partita resta un `Alert` "Risposta non salvata." con il motivo e "Riprova", che ripete la risposta scelta. Niente piu' avviso che sparisce. Un errore di rete mostra il testo tradotto invece di "Failed to fetch".
- `RosterByRole`: annullamento per 10 s (`UNDO_MS`), messaggi, "Annulla" ed errori delle presenze in `it.json`/`en.json`. Il messaggio per figli e iscritti rimossi dallo staff ora e' neutro ("Iscrizione di {name} annullata"), senza "disiscritto/a".
- `RegistrationForm`: nuovo `RegistrationBlocked`, usato nei due punti in cui l'iscrizione e' bloccata (prima nel secondo il motivo mancava del tutto): motivo in `body2` `text.primary`, frase d'aiuto e "Chiedi allo staff" verso `/contatti`.
- Verifica con Playwright su desktop e mobile, prima e dopo: errore di rete simulato sulla disponibilita' (dopo 5 s prima non restava nulla, ora c'e' l'avviso sotto la partita), blocco di un allenamento riservato al ruolo 1, "Annulla" ancora visibile dopo 5 s e iscrizione conservata dopo l'annullamento. `npm run a11y` senza nuove violazioni.

**Rimasto fuori**

- Gli altri ~270 punti che chiamano `showToast` con un errore riferito a un elemento preciso (per esempio le presenze in `RosterByRole`, il form partita in admin) mostrano ancora l'errore solo nell'avviso, che pero' ora non sparisce da solo. Portarli accanto all'elemento va fatto caso per caso.
- Il pulsante per togliere un'iscrizione ha l'etichetta generica "Rimuovi iscrizione", senza il nome: con piu' pulsanti nella lista uno screen reader non li distingue. Da valutare in un ticket di accessibilita'.
- `/contatti` e' il passo successivo di "Chiedi allo staff": se UX-06 cambia il modulo contatti, controllare che il link resti sensato.
