// Gli sponsor del club: una sola lista per il nastro del footer, la pagina
// Sponsor e la pagina Contatti (UX-39: stessi sponsor e stesso ordine ovunque).
// Categoria e descrizione stanno nei dizionari, in `pages.sponsor.sponsorsData.<id>`.

export interface Sponsor {
  /** Chiave dei testi in `pages.sponsor.sponsorsData`. */
  id: string;
  name: string;
  url: string;
  /** Percorso in /public. */
  logo: string;
  /** Logo per i riquadri quadrati (pagine Sponsor e Contatti), se diverso da `logo`. */
  squareLogo?: string;
  /**
   * Il logo e' un'immagine con un fondo scuro suo (un biglietto da visita
   * nero): nel nastro riempie la tessera invece di stare in un riquadro bianco.
   */
  ownBackground?: boolean;
}

export const SPONSORS: Sponsor[] = [
  {
    id: "denis",
    name: "Denis M. Photographer",
    url: "https://www.facebook.com/Denis.M.photographer",
    logo: "/sponsors/denis.jpg",
    ownBackground: true,
  },
  {
    id: "villani",
    name: "Villani and Partners",
    url: "https://villaniandpartners.eu/",
    logo: "/sponsors/villani.png",
  },
  { id: "llp", name: "LLP", url: "https://www.llp.it/", logo: "/sponsors/LLP.png" },
  {
    id: "tettitecchio",
    name: "Tetti Tecchio",
    url: "https://www.tettitecchio.it/",
    logo: "/sponsors/tettitecchio.png",
  },
  {
    id: "sabysport",
    name: "Saby Sport",
    url: "https://www.sabysport.com/",
    logo: "/sponsors/sabysport.png",
  },
  { id: "cgrd", name: "CGRD", url: "https://www.cgrd.it/it/", logo: "/sponsors/cgrd.png" },
  {
    id: "fabiobrea",
    name: "Fabio Brea",
    url: "https://www.linkedin.com/in/fabiobrea/",
    logo: "/sponsors/fabiobrea.svg",
    squareLogo: "/sponsors/fabiobrea-quadrato.svg",
  },
];

/** I loghi SVG non passano dall'ottimizzazione delle immagini di Next. */
export const isVectorLogo = (src: string) => src.endsWith(".svg");
