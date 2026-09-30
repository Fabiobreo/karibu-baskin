# UX-44 · Header fra 900 e 1.200 px: la barra non ci sta

**Ondata:** 4 · **Stima:** S · **Dipende da:** nessuno · **Stato:** fatto (su `develop`)

Nato il 01/10/2026 dalla revisione estetica di fine UX-32/UX-37.

## Problema

L'header è a tutta larghezza (scelta del committente del 30/09: "mi piaceva di più largo"). Da `md` (900 px) mostra il menu completo: logo con il nome del club, nove voci (Home come icona, Allenamenti, Calendario, Eventi, News, Partite, Squadre, Il Baskin, Contatti), ricerca, tema, lingua, campanella e avatar. Sotto circa 1.100 px non ci stanno:

| Larghezza        | Sforamento (misurato, admin collegato)                         |
| ---------------- | -------------------------------------------------------------- |
| 900 px           | circa 340 px                                                   |
| 1.024 px         | circa 200 px: lingua, campanella e avatar escono dallo schermo |
| 1.200 px e oltre | nessuno                                                        |

Le misure sono state prese con Playwright durante UX-37 (`scrollWidth - clientWidth` del `Toolbar`). A queste larghezze ci sono tablet in orizzontale e finestre ridotte di un portatile. Il difetto c'era già prima di UX-37.

## Cosa fare

Senza cambiare l'aspetto da desktop largo, che piace al committente:

1. Le voci del menu non vanno mai a capo (`whiteSpace: nowrap`) e non hanno la larghezza minima di MUI (64 px), che lascia spazio vuoto attorno a "News" ed "Eventi".
2. Fra 900 e 1.200 px il nome del club accanto al logo si nasconde (resta il logo).
3. Se non basta: la voce "Home" esce dal menu (ci porta già il logo), oppure il menu compatto (hamburger) arriva fino a 1.200 px. Il menu compatto va verificato con la barra in basso di mobile, che oggi compare solo sotto `md`: fra 900 e 1.200 px le voci principali devono restare raggiungibili.

Durante UX-37 i punti 1-3 (con la voce Home tolta) portavano lo sforamento a zero da 1.024 px in su e a 26-108 px fra 900 e 1.000. Quella versione è stata annullata insieme all'header nella griglia: si può ripartire da lì (`git show b35c24b -- src/components/layout/SiteHeader.tsx`).

## Criteri di accettazione

- Nessuno sforamento del `Toolbar` a 900, 960, 1.024, 1.199, 1.200, 1.280 e 1.440 px, con e senza accesso.
- A 1.440 px l'header è identico a oggi.
- `npm run a11y` verde.

## Esito

Fatti i punti 1-3, con il menu compatto nella forma che non tocca il desktop largo:

- voci senza larghezza minima e mai a capo; voce "Home" tolta (ci porta il logo);
- **menu compatto sotto 1.024 px** (non fino a 1.200): fra 900 e 1.024 le voci passano nel drawer, che le ha già tutte; ricerca, tema, lingua, campanella e avatar restano nella barra, quindi profilo e notifiche sono raggiungibili anche senza la barra in basso;
- nome del club nascosto solo fra 1.024 e 1.200 px; nel menu compatto c'è spazio e resta.

Sforamento del `Toolbar` misurato con Playwright (anonimo e admin, italiano e inglese): zero a 600, 899, 900, 960, 1.000, 1.023, 1.024, 1.100, 1.199, 1.200, 1.280 e 1.440 px. Spazio libero nella barra nel caso peggiore (admin, italiano): 35 px a 1.024 e a 1.200, abbastanza per le voci ma non per l'icona Home (40 px). Prima, fra 900 e 960 px, lo sforamento allargava tutta la pagina.

A 1.440 px l'header cambia solo per la Home tolta e per le voci un po' più strette (niente larghezza minima).
