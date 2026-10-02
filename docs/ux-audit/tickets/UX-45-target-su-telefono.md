# UX-45 · Target da 44 px su telefono: footer, disponibilità, filtri dei marcatori

**Ondata:** 5 · **Stima:** S · **Dipende da:** nessuno · **Stato:** da fare

Nato dal [riaudit del 02/10/2026](../RIAUDIT-2026-10-02.md), problemi 1, 6 e 5.

## Problema

Su telefono (390 px) tre gruppi di controlli sono più bassi dei 44 px raccomandati. Sono tutti sopra il minimo WCAG di 24 px, quindi `npm run a11y` è verde, ma una parte del pubblico del sito ha difficoltà motorie.

- **Footer** (`src/components/layout/Footer.tsx`), ricaduta di UX-39: 19 link per pagina, larghi 55-136 px e alti 28, uno sotto l'altro. I target sotto 44 px in home sono passati da 6 (29/09) a 26; in `/marcatori` da 43 a 60.
- **Disponibilità** (`src/components/matches/MieDisponibilitaClient.tsx`): i bottoni Sì / No di ogni partita sono alti circa 28 px (stimati dalla schermata, da misurare). È il compito più frequente dell'atleta dopo l'iscrizione.
- **`/marcatori`**: i chip "Tutti / Ruolo 1 … Ruolo 5" sono alti 24 px, quelli della stagione (`SeasonSelector`) 32.

## Cosa fare

1. Footer: su telefono ogni link occupa una riga da 44 px (`TOUCH_TARGET_ON_PHONE` di `@/lib/touchTarget`), compresi email, telefoni e le tre icone social. Da `sm` in su resta com'è.
2. Disponibilità: Sì / No alti 44 px su telefono, come i Sì / No dell'RSVP degli eventi (`EventRsvp`), che sono già giusti.
3. Chip di ruolo in `/marcatori` e chip di stagione di `SeasonSelector`: 44 px di area toccabile su telefono. `SeasonSelector` è condiviso da `/risultati`, `/classifiche` e `/marcatori`: il cambio vale per tutte.

## Criteri di accettazione

- A 390 px, contati come in `rimisura.mjs` (`touchTargets`): nessun link del footer sotto 44 px; home anonima sotto 10 target piccoli; Sì / No della disponibilità a 44 px.
- A 1.440 px footer, disponibilità e marcatori sono identici a oggi.
- `npm run a11y` verde, nessuna pagina più larga dello schermo a 360 px.

## Rimasto fuori

- Il resto di `/marcatori` su telefono (ordine dei blocchi, "in prestito"): [UX-48](UX-48-marcatori-su-telefono.md).
- Link del breadcrumb e frecce della paginazione sotto 44 px: comuni a tutto il sito, già segnati in UX-40.
