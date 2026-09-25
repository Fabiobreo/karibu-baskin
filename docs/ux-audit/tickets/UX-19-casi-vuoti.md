# UX-19 · Copertine di fallback e news in evidenza senza "documento finto"

**Ondata:** 2 · **Stima:** S · **Dipende da:** UX-08 (colori degli hero) · **Stato:** fatto (commit su `develop`): componente `CoverFallback` (fondo degli hero, cerchio di centrocampo arancio leggero, data in grande) nella lista eventi e come fondo della news in evidenza senza foto; tolta l'icona da 240-320 px

## Problema

- **Eventi senza immagine:** la lista eventi mostra un riquadro grigio con un'icona calendario (`src/app/eventi/(lista)/page.tsx:72`, `EventIcon` in `text.disabled`). Una griglia con più eventi senza copertina sembra rotta. Con dati reali capiterà comunque.
- **News in evidenza:** `src/components/news/FeaturedCard.tsx:91` disegna un'icona `ArticleIcon` da 240-320 px dentro la card scura quando manca l'immagine. Si legge come uno skeleton che non ha finito di caricare.

## Cosa fare

1. Componente `CoverFallback` per le card senza immagine: fondo nero/grafite con un motivo del club (per esempio un dettaglio del logo o un pattern arancio leggero), **data in grande** e titolo. Stessa proporzione delle copertine vere.
2. Usarlo in lista e dettaglio eventi e in `FeaturedCard`.
3. `FeaturedCard` senza immagine: impaginazione solo testo (titolo grande, estratto, data), senza icona gigante.

## Criteri di accettazione

- Una griglia di eventi tutti senza immagine sembra intenzionale, non rotta.
- Nessuna icona decorativa più grande di 64 px usata come segnaposto.
- Tema chiaro e scuro verificati.

## Esito

- `src/components/common/CoverFallback.tsx`: fondo grafite di `heroGradient.dark` (lo stesso degli hero, scuro in entrambi i temi), meta' campo disegnata con linee arancio al 28%, giorno della settimana, giorno in grande e mese. Riempie il contenitore, quindi prende la proporzione della copertina vera (16:9 negli eventi). Senza hook: vale per Server e Client Component.
- Lista eventi: `CoverFallback` al posto dell'icona calendario grigia (che era anche in `text.disabled`). Lo stato vuoto della lista usa ora `text.secondary`.
- `FeaturedCard` senza immagine: niente `ArticleIcon` gigante; impaginazione solo testo sul fondo di `CoverFallback` (senza data, gia' scritta sotto il titolo), con l'estratto visibile anche su mobile e su tre righe.
- Nessuna icona segnaposto oltre i 64 px nel sito pubblico (restano solo testi grandi nelle immagini OG). Verificato in tema chiaro e scuro, desktop e 360 px.

## Rimasto fuori

- **Dettaglio evento:** senza immagine la colonna della locandina non c'e' e l'hero mostra gia' titolo e data; una copertina di ripiego li' ripeterebbe l'hero, quindi non l'ho aggiunta.
- Le miniature quadrate delle news laterali (`SideCard`, 90 px) tengono l'icona articolo/sondaggio da 32 px: e' un'icona di tipo, non un finto contenuto.
