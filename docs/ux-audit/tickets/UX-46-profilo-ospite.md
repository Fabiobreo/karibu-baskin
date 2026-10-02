# UX-46 · Profilo dell'ospite senza card contraddittorie

**Ondata:** 5 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

Nato dal [riaudit del 02/10/2026](../RIAUDIT-2026-10-02.md), problema 2.

## Problema

In `/profilo`, per un account in attesa (GUEST), con un allenamento in programma:

- la card "I tuoi primi passi" (`GuestOnboardingCard`) dice "Vieni al primo allenamento · Il prossimo è lun 5 ott, 18:00" con il bottone "Iscriviti";
- poco sotto, la card "Prossimo allenamento" dice "Nessun allenamento in programma. Appena lo staff ne pubblica uno lo trovi qui e sulla home".

Le due card parlano dello stesso allenamento e dicono cose opposte. Il ramo è in `src/app/profilo/page.tsx:394-423`: chi non ha la card "prossima cosa da fare" (`showsNextAction`) ricade su `NextTrainingCard`, e per l'ospite `nextTraining` resta `null` anche quando l'allenamento c'è. La causa esatta va trovata (query alla riga 174, costruzione di `nextTraining` dalla riga 239).

Nella stessa pagina l'ospite ha il bottone "Le mie disponibilità", che porta a una pagina per lui sempre vuota: non è in nessuna squadra.

## Cosa fare

1. Per l'ospite la card "Prossimo allenamento" non serve: l'allenamento è già nei primi passi. Toglierla per `appRole === "GUEST"`.
2. Capire comunque perché `nextTraining` è `null`: lo stesso ramo vale per lo staff che non gioca, che non deve leggere un falso "nessun allenamento".
3. Togliere "Le mie disponibilità" a chi non è tesserato (`isMemberRole`).

## Criteri di accettazione

- Da ospite, con un allenamento futuro: in `/profilo` l'allenamento compare una volta sola, nei primi passi, e la frase "Nessun allenamento in programma" non c'è.
- Da allenatore che non gioca, con un allenamento futuro: la card "Prossimo allenamento" lo mostra.
- Da ospite nessun bottone "Le mie disponibilità".
- `npm test` e `npm run a11y` verdi.
