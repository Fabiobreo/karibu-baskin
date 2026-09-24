# UX-16 · Card "prossima azione" per i tesserati

**Ondata:** 2 · **Stima:** M · **Dipende da:** nessuno · **Stato:** da fare

## Problema

Un atleta o un genitore che entra nel sito vede la stessa home di chi non conosce il club: foto a tutta altezza, "Sport inclusivo per tutti", inviti a venire a provare (anche in tema scuro compare "Vieni a provare" a un tesserato). La sua prossima cosa da fare (iscriversi, confermare una disponibilità) arriva sotto la piega.

## Decisione

**Stessa struttura della home per tutti** (prevedibilità, e genitore e figlio usano spesso lo stesso telefono). Per i tesserati si **aggiunge** in cima una card con la prossima azione. Niente home diverse per ruolo.

Il modello esiste già per gli ospiti: `GuestOnboardingCard` + `loadGuestOnboarding` (`@/lib/guestOnboarding`), il pattern meglio riuscito del sito.

## Cosa fare

1. Card "La tua prossima cosa da fare" per ATHLETE e PARENT, sopra le sezioni della home, con **una** azione principale scelta in ordine di urgenza:
   - disponibilità da dare per una partita (oggi `PendingAvailabilityBanner`);
   - allenamento con iscrizioni aperte a cui non si è iscritti (per sé o per un figlio);
   - prossimo allenamento a cui si è iscritti, con data, ora e luogo (UX-15);
   - niente in sospeso: messaggio di conferma ("Sei a posto").
2. Per i genitori la card indica per chi è l'azione ("Iscrivi Giulia").
3. Per i tesserati, niente inviti a "venire a provare" in home.
4. `/profilo`: identità (avatar, nome, ruolo) in cima; la stessa card subito sotto; il box "Ti riconosco!" dopo.
5. Date formattate con `timeZone: "Europe/Rome"` (render anche sul server), come nella card degli ospiti.

## Criteri di accettazione

- Atleta con una disponibilità da dare: la card la mostra come prima cosa, raggiungibile in 1 tocco.
- La struttura delle sezioni sotto la card è identica per tutti.
- Nessun "Vieni a provare" visibile ai tesserati.
