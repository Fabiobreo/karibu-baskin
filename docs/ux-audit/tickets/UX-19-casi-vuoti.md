# UX-19 · Copertine di fallback e news in evidenza senza "documento finto"

**Ondata:** 2 · **Stima:** S · **Dipende da:** UX-08 (colori degli hero) · **Stato:** da fare

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
