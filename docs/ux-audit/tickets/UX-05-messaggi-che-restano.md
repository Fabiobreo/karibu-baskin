# UX-05 · Messaggi che restano

**Ondata:** 0 · **Stima:** M · **Dipende da:** nessuno · **Stato:** da fare

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
