# UX-34 · Form d'iscrizione: testo unico, scelta accesso o ospite, form in prima colonna

**Ondata:** 4 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

## Problema

Pagina `/allenamento/[id]` da anonimo, cioè la conversione principale del sito.

1. **Testo doppio.** Uno dopo l'altro compaiono `registration.questionnairePromptSelf` ("Rispondi a qualche domanda sul tuo modo di muoverti.", `it.json:1339`) e `questionnaire.intro` ("Rispondi a qualche domanda, serve a trovare il ruolo Baskin giusto…", `it.json:1244`). Probabilmente succede anche per il figlio (`questionnairePromptChild`).
2. **Accedere o no è nascosto.** La scelta sta in un testo d'aiuto piccolo sotto l'email facoltativa ("Hai un account Google? Accedi: iscriversi è più veloce.").
3. **Due inviti ad accedere.** Oltre a quello nel form c'è la card "Iscritti" bloccata con il suo bottone "Accedi". UX-06 ne aveva lasciato uno solo; il secondo è rientrato dal form.
4. **Il compito principale sta nella colonna secondaria.** Su desktop (`SessionPageClient`) il form è a destra e la card "Iscritti" bloccata a sinistra; su mobile l'ordine è già corretto.

## Cosa fare

1. Tenere **un solo** testo introduttivo al questionario: `questionnaire.intro` dentro `SportRoleQuestionnaire` oppure il prompt nel form, non entrambi. Verificare anche il ramo figlio e `/profilo/ruolo`.
2. In cima al form, per chi non ha fatto l'accesso, due scelte esplicite di pari peso:
   - "Accedi (più veloce, ti riconosciamo la prossima volta)" → login con ritorno alla pagina;
   - "Continua senza account" → mostra nome, email facoltativa e questionario.
3. Card "Iscritti" per chi non è tesserato ridotta a una riga informativa ("1 iscritto · i nomi li vedono i tesserati"), senza un secondo bottone "Accedi".
4. Su desktop il form va nella prima colonna (o in colonna unica sopra la lista), come su mobile.

## Criteri di accettazione

- Nessun testo ripetuto nel form, per sé e per un figlio.
- Da anonimo un solo invito ad accedere nella pagina.
- A 1440 px il form è il primo blocco dopo l'hero nell'ordine di lettura e di Tab.
- Testi in `it.json` ed `en.json`; test del form aggiornati; `npm run a11y` verde.
