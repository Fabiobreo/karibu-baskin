const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const FA = require("react-icons/fa");

// ---- Brand palette (da theme.ts) ----
const ORANGE = "E65100";
const ORANGE_LT = "FF8A50";
const DARK = "1A1A1A";
const NIGHT = "121212";
const LIGHT = "FAF7F3";
const CARD = "FFFFFF";
const WHITE = "FFFFFF";
const MUTED = "6B6B6B";
const LINE = "E7E2DB";

const FONT_H = "Trebuchet MS";
const FONT_B = "Calibri";

const W = 13.33,
  H = 7.5; // LAYOUT_WIDE

// fresh shadow each call (pptxgenjs mutates)
const cardShadow = () => ({
  type: "outer",
  color: "1A1A1A",
  blur: 9,
  offset: 3,
  angle: 90,
  opacity: 0.12,
});

// ---- icon cache ----
const iconCache = {};
async function icon(Comp, color = "#" + ORANGE, size = 256) {
  const key = Comp.name + color + size;
  if (iconCache[key]) return iconCache[key];
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Comp, { color, size: String(size) })
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const data = "image/png;base64," + png.toString("base64");
  iconCache[key] = data;
  return data;
}

// ===== shared slide helpers =====
function bgLight(slide) {
  slide.background = { color: LIGHT };
}

// Title slide with darkened team photo
function titleSlide(pres, { kicker, title, subtitle, footer }) {
  const s = pres.addSlide();
  s.background = { path: "assets-hero-dark.jpg" };
  // left orange spine
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.22, h: H, fill: { color: ORANGE } });
  s.addText(kicker.toUpperCase(), {
    x: 0.9,
    y: 1.5,
    w: 11,
    h: 0.5,
    fontFace: FONT_H,
    fontSize: 16,
    color: ORANGE_LT,
    bold: true,
    charSpacing: 4,
    margin: 0,
  });
  s.addText(title, {
    x: 0.85,
    y: 2.0,
    w: 11.6,
    h: 2.4,
    fontFace: FONT_H,
    fontSize: 52,
    color: WHITE,
    bold: true,
    margin: 0,
    lineSpacingMultiple: 0.95,
  });
  if (subtitle)
    s.addText(subtitle, {
      x: 0.9,
      y: 4.5,
      w: 10.5,
      h: 1.0,
      fontFace: FONT_B,
      fontSize: 20,
      color: "E6E0D8",
      margin: 0,
    });
  if (footer)
    s.addText(footer, {
      x: 0.9,
      y: 6.7,
      w: 11.5,
      h: 0.4,
      fontFace: FONT_B,
      fontSize: 13,
      color: "B8B2AA",
      margin: 0,
    });
  return s;
}

// Standard content header (NO underline accent — uses whitespace)
function header(pres, slide, { kicker, title }) {
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 1.55, fill: { color: LIGHT } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.22, h: 1.55, fill: { color: ORANGE } });
  slide.addText((kicker || "").toUpperCase(), {
    x: 0.85,
    y: 0.42,
    w: 11.5,
    h: 0.35,
    fontFace: FONT_H,
    fontSize: 13,
    color: ORANGE,
    bold: true,
    charSpacing: 3,
    margin: 0,
  });
  slide.addText(title, {
    x: 0.83,
    y: 0.72,
    w: 11.7,
    h: 0.7,
    fontFace: FONT_H,
    fontSize: 30,
    color: DARK,
    bold: true,
    margin: 0,
  });
}

// closing / CTA dark slide
function closingSlide(pres, { title, lines, footer, url }) {
  const s = pres.addSlide();
  s.background = { color: NIGHT };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.22, fill: { color: ORANGE } });
  s.addText(title, {
    x: 0.9,
    y: 1.6,
    w: 11.5,
    h: 1.6,
    fontFace: FONT_H,
    fontSize: 46,
    color: WHITE,
    bold: true,
    margin: 0,
    lineSpacingMultiple: 0.98,
  });
  if (lines) {
    s.addText(
      lines.map((t, i) => ({
        text: t,
        options: {
          bullet: { code: "2022", indent: 18 },
          color: "E6E0D8",
          breakLine: true,
          paraSpaceAfter: 10,
        },
      })),
      {
        x: 1.0,
        y: 3.5,
        w: 10.5,
        h: 2.2,
        fontFace: FONT_B,
        fontSize: 19,
        color: "E6E0D8",
        margin: 0,
      }
    );
  }
  if (url)
    s.addText(url, {
      x: 0.9,
      y: 6.35,
      w: 11.5,
      h: 0.5,
      fontFace: FONT_H,
      fontSize: 22,
      color: ORANGE_LT,
      bold: true,
      margin: 0,
    });
  if (footer)
    s.addText(footer, {
      x: 0.9,
      y: 6.9,
      w: 11.5,
      h: 0.4,
      fontFace: FONT_B,
      fontSize: 13,
      color: "9A948C",
      margin: 0,
    });
  return s;
}

// ---- card grid of features (icon + title + desc) ----
async function iconCards(pres, slide, items, { cols = 3, top = 1.95, gapColor = ORANGE } = {}) {
  const marginX = 0.85,
    gap = 0.35;
  const totalW = W - marginX * 2;
  const cardW = (totalW - gap * (cols - 1)) / cols;
  const rows = Math.ceil(items.length / cols);
  const availH = H - top - 0.55;
  const cardH = (availH - gap * (rows - 1)) / rows;
  for (let i = 0; i < items.length; i++) {
    const r = Math.floor(i / cols),
      c = i % cols;
    const x = marginX + c * (cardW + gap);
    const y = top + r * (cardH + gap);
    slide.addShape(pres.shapes.RECTANGLE, {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { color: CARD },
      line: { color: LINE, width: 1 },
      shadow: cardShadow(),
    });
    // icon circle
    const cd = 0.62;
    slide.addShape(pres.shapes.OVAL, {
      x: x + 0.32,
      y: y + 0.3,
      w: cd,
      h: cd,
      fill: { color: "FFF1E6" },
    });
    const ic = await icon(items[i].icon);
    slide.addImage({ data: ic, x: x + 0.32 + 0.16, y: y + 0.3 + 0.16, w: cd - 0.32, h: cd - 0.32 });
    slide.addText(items[i].title, {
      x: x + 0.32,
      y: y + 1.02,
      w: cardW - 0.6,
      h: 0.45,
      fontFace: FONT_H,
      fontSize: 16.5,
      bold: true,
      color: DARK,
      margin: 0,
    });
    slide.addText(items[i].desc, {
      x: x + 0.32,
      y: y + 1.46,
      w: cardW - 0.6,
      h: cardH - 1.6,
      fontFace: FONT_B,
      fontSize: 12.5,
      color: MUTED,
      margin: 0,
      lineSpacingMultiple: 1.02,
      valign: "top",
    });
  }
}

// ---- icon rows (icon circle + bold + desc) on left/right column ----
async function iconRows(pres, slide, items, { x = 0.9, y = 2.0, w = 11.5, rowH = 1.05 } = {}) {
  for (let i = 0; i < items.length; i++) {
    const ry = y + i * rowH;
    const cd = 0.7;
    slide.addShape(pres.shapes.OVAL, {
      x,
      y: ry,
      w: cd,
      h: cd,
      fill: { color: items[i].dark ? ORANGE : "FFF1E6" },
    });
    const ic = await icon(items[i].icon, items[i].dark ? "#FFFFFF" : "#" + ORANGE);
    slide.addImage({ data: ic, x: x + 0.18, y: ry + 0.18, w: cd - 0.36, h: cd - 0.36 });
    slide.addText(items[i].title, {
      x: x + cd + 0.3,
      y: ry - 0.02,
      w: w - cd - 0.4,
      h: 0.4,
      fontFace: FONT_H,
      fontSize: 17,
      bold: true,
      color: DARK,
      margin: 0,
    });
    slide.addText(items[i].desc, {
      x: x + cd + 0.3,
      y: ry + 0.34,
      w: w - cd - 0.4,
      h: rowH - 0.4,
      fontFace: FONT_B,
      fontSize: 13,
      color: MUTED,
      margin: 0,
      valign: "top",
    });
  }
}

function bigStat(slide, { x, y, w, num, label, color = ORANGE }) {
  slide.addText(num, {
    x,
    y,
    w,
    h: 1.0,
    fontFace: FONT_H,
    fontSize: 54,
    bold: true,
    color,
    align: "center",
    margin: 0,
  });
  slide.addText(label, {
    x,
    y: y + 0.95,
    w,
    h: 0.6,
    fontFace: FONT_B,
    fontSize: 13.5,
    color: MUTED,
    align: "center",
    margin: 0,
  });
}

// =========================================================
// DECK 1 — DIREZIONE + COACH
// =========================================================
async function buildDeck1() {
  const pres = new pptxgen();
  pres.defineLayout({ name: "WIDE", width: W, height: H });
  pres.layout = "WIDE";
  pres.author = "Karibu Baskin";
  pres.title = "Karibu Baskin — Presentazione Direzione e Staff";

  // 1. Title
  titleSlide(pres, {
    kicker: "La piattaforma digitale della squadra",
    title: "Karibu Baskin\nonline",
    subtitle:
      "Un unico spazio per allenamenti, squadre, partite e comunicazione.\nPresentazione per Direzione e Staff tecnico.",
    footer: "Baskin Montecchio Maggiore (VI)  ·  Giugno 2026",
  });

  // 2. Il problema oggi
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "Il punto di partenza", title: "Come gestiamo la squadra oggi" });
    await iconCards(
      pres,
      s,
      [
        {
          icon: FA.FaWhatsapp,
          title: "Iscrizioni sparse",
          desc: "Presenze raccolte tra messaggi, gruppi e fogli di carta. Difficile sapere chi viene davvero.",
        },
        {
          icon: FA.FaUsersCog,
          title: "Squadre a mano",
          desc: "Formare squadre equilibrate richiede tempo e dipende dalla memoria del coach.",
        },
        {
          icon: FA.FaBullhorn,
          title: "Comunicazioni disperse",
          desc: "Avvisi su più canali: qualcuno li perde, qualcuno non li riceve mai.",
        },
        {
          icon: FA.FaFolderOpen,
          title: "Dati che si perdono",
          desc: "Storico presenze, statistiche e contatti non sono raccolti in un posto solo.",
        },
        {
          icon: FA.FaClock,
          title: "Tempo dello staff",
          desc: "Ore spese in organizzazione che si potrebbero dedicare al campo.",
        },
        {
          icon: FA.FaQuestionCircle,
          title: "Poca visibilità",
          desc: "Genitori e atleti faticano a sapere date, convocazioni e novità.",
        },
      ],
      { cols: 3 }
    );
  }

  // 3. La soluzione (statement)
  {
    const s = pres.addSlide();
    s.background = { color: DARK };
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.22, h: H, fill: { color: ORANGE } });
    s.addText("LA SOLUZIONE", {
      x: 0.9,
      y: 1.5,
      w: 11,
      h: 0.4,
      fontFace: FONT_H,
      fontSize: 15,
      color: ORANGE_LT,
      bold: true,
      charSpacing: 4,
      margin: 0,
    });
    s.addText("Una sola piattaforma, su misura per il Baskin.", {
      x: 0.85,
      y: 2.0,
      w: 11.6,
      h: 1.8,
      fontFace: FONT_H,
      fontSize: 40,
      color: WHITE,
      bold: true,
      margin: 0,
      lineSpacingMultiple: 1.0,
    });
    s.addText(
      [
        { text: "Web e installabile come app sul telefono (PWA). ", options: {} },
        {
          text: "Accesso con Google in un tap, ruoli e permessi per Direzione, Staff, Atleti e Genitori.",
          options: {},
        },
      ],
      {
        x: 0.9,
        y: 4.0,
        w: 10.8,
        h: 1.2,
        fontFace: FONT_B,
        fontSize: 19,
        color: "E6E0D8",
        margin: 0,
        lineSpacingMultiple: 1.1,
      }
    );
    s.addText(
      "Pensata e costruita attorno alle esigenze reali della nostra squadra — non un gestionale generico.",
      {
        x: 0.9,
        y: 5.6,
        w: 11,
        h: 0.8,
        fontFace: FONT_B,
        fontSize: 16,
        italic: true,
        color: ORANGE_LT,
        margin: 0,
      }
    );
  }

  // 4. Cosa fa — panoramica funzionalità
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "Panoramica", title: "Tutto quello che la piattaforma fa" });
    await iconCards(
      pres,
      s,
      [
        {
          icon: FA.FaClipboardList,
          title: "Allenamenti & iscrizioni",
          desc: "Apertura iscrizioni, presenze in tempo reale, restrizioni per ruolo o squadra.",
        },
        {
          icon: FA.FaBalanceScale,
          title: "Squadre bilanciate",
          desc: "Generazione automatica di squadre equilibrate con sistema di rating dei giocatori.",
        },
        {
          icon: FA.FaBasketballBall,
          title: "Partite & convocazioni",
          desc: "Calendario partite, disponibilità atleti, convocazioni e copertura ruoli.",
        },
        {
          icon: FA.FaChartLine,
          title: "Statistiche & sviluppo",
          desc: "Marcatori, MVP, profili giocatore e tracciamento della crescita nel tempo.",
        },
        {
          icon: FA.FaBell,
          title: "Notifiche & bacheca",
          desc: "Notifiche push, news, sondaggi: tutti informati sullo stesso canale.",
        },
        {
          icon: FA.FaImages,
          title: "Calendario & Gallery",
          desc: "Calendario unico (allenamenti, partite, eventi) e gallery foto/video automatica.",
        },
      ],
      { cols: 3 }
    );
  }

  // 5. Il wow — squadre bilanciate
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "Il valore per lo staff", title: "Squadre equilibrate in un clic" });
    // left explanation
    await iconRows(
      pres,
      s,
      [
        {
          icon: FA.FaBrain,
          title: "Rating intelligente (TrueSkill)",
          desc: "Ogni giocatore ha un livello che si aggiorna con i risultati delle partitelle.",
        },
        {
          icon: FA.FaRandom,
          title: "Bilanciamento automatico",
          desc: "L'app distribuisce i giocatori in 2 o 3 squadre il più equilibrate possibile.",
        },
        {
          icon: FA.FaUserShield,
          title: "Rispetta i ruoli del Baskin",
          desc: "Tiene conto di ruoli e vincoli, non solo dei numeri.",
        },
      ],
      { x: 0.85, y: 2.05, w: 6.6, rowH: 1.45 }
    );
    // right stat card
    s.addShape(pres.shapes.RECTANGLE, {
      x: 7.9,
      y: 2.05,
      w: 4.55,
      h: 4.55,
      fill: { color: DARK },
      shadow: cardShadow(),
    });
    s.addText("Da ore a secondi", {
      x: 8.2,
      y: 2.45,
      w: 4.0,
      h: 0.6,
      fontFace: FONT_H,
      fontSize: 22,
      bold: true,
      color: WHITE,
      margin: 0,
    });
    s.addText("Il tempo per comporre le squadre di un allenamento.", {
      x: 8.2,
      y: 3.05,
      w: 4.0,
      h: 0.8,
      fontFace: FONT_B,
      fontSize: 13.5,
      color: "C9C3BB",
      margin: 0,
    });
    s.addText("100%", {
      x: 8.2,
      y: 3.95,
      w: 4.0,
      h: 1.0,
      fontFace: FONT_H,
      fontSize: 56,
      bold: true,
      color: ORANGE_LT,
      margin: 0,
    });
    s.addText("ripetibile ed equo: stesso criterio per tutti, ogni volta.", {
      x: 8.2,
      y: 5.0,
      w: 4.0,
      h: 1.3,
      fontFace: FONT_B,
      fontSize: 13.5,
      color: "C9C3BB",
      margin: 0,
      valign: "top",
    });
  }

  // 6. Il pannello dello staff
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, {
      kicker: "Per Direzione e Staff",
      title: "Un pannello di controllo completo",
    });
    await iconRows(
      pres,
      s,
      [
        {
          icon: FA.FaCalendarPlus,
          title: "Allenamenti, partite ed eventi",
          desc: "Crea e gestisci tutto il calendario stagionale da un'unica area.",
          dark: true,
        },
        {
          icon: FA.FaUsers,
          title: "Squadre agonistiche e rose",
          desc: "Gestione squadre per stagione, gironi, squadre avversarie e classifiche.",
          dark: true,
        },
        {
          icon: FA.FaUserCog,
          title: "Utenti, ruoli e atleti",
          desc: "Anagrafica giocatori, genitori e figli, con permessi differenziati.",
          dark: true,
        },
        {
          icon: FA.FaNewspaper,
          title: "News, sondaggi e gallery",
          desc: "Comunicazione ufficiale e moderazione contenuti.",
          dark: true,
        },
        {
          icon: FA.FaFileExport,
          title: "Export dati e audit log",
          desc: "Esporta presenze e dati; ogni azione admin è tracciata.",
          dark: true,
        },
      ],
      { x: 0.85, y: 1.95, w: 11.6, rowH: 1.04 }
    );
  }

  // 7. Privacy & sicurezza minori
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "Punto chiave", title: "Privacy e tutela dei minori" });
    await iconCards(
      pres,
      s,
      [
        {
          icon: FA.FaLock,
          title: "Accesso protetto",
          desc: "Login solo con Google. Niente password da gestire o da perdere.",
        },
        {
          icon: FA.FaUserShield,
          title: "Permessi per ruolo",
          desc: "Ogni utente vede solo ciò che gli compete. I dati sensibili sono riservati.",
        },
        {
          icon: FA.FaChild,
          title: "Gestione genitore-figlio",
          desc: "I genitori gestiscono i figli minorenni con richieste di collegamento verificate.",
        },
        {
          icon: FA.FaServer,
          title: "Dati in cloud affidabile",
          desc: "Database e hosting su infrastrutture professionali, con backup.",
        },
        {
          icon: FA.FaCookieBite,
          title: "Consenso e trasparenza",
          desc: "Informativa privacy e consenso cookie già integrati nel sito.",
        },
        {
          icon: FA.FaHistory,
          title: "Tracciabilità",
          desc: "Audit log delle azioni amministrative per piena responsabilità.",
        },
      ],
      { cols: 3 }
    );
  }

  // 8. Costi & sostenibilità
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "Sostenibilità", title: "Costi di gestione contenuti" });
    s.addText(
      "La piattaforma parte sui piani gratuiti dei servizi cloud. I costi crescono solo con l'uso reale.",
      {
        x: 0.85,
        y: 1.7,
        w: 11.6,
        h: 0.5,
        fontFace: FONT_B,
        fontSize: 14.5,
        color: MUTED,
        margin: 0,
      }
    );
    const rows = [
      [
        {
          text: "Voce",
          options: { bold: true, color: WHITE, fill: { color: DARK }, fontFace: FONT_H },
        },
        {
          text: "A cosa serve",
          options: { bold: true, color: WHITE, fill: { color: DARK }, fontFace: FONT_H },
        },
        {
          text: "Costo indicativo",
          options: { bold: true, color: WHITE, fill: { color: DARK }, fontFace: FONT_H },
        },
      ],
      ["Hosting & sito", "Pubblicazione e funzionamento dell'app", "Gratis all'avvio*"],
      ["Database", "Iscrizioni, utenti, statistiche", "Gratis all'avvio*"],
      ["Email & notifiche push", "Conferme e promemoria automatici", "Gratis all'avvio*"],
      ["Archivio foto (Gallery)", "Immagini mirrorate da Instagram", "Gratis all'avvio*"],
      ["Dominio (es. karibubaskin.it)", "Indirizzo web ufficiale", "~10–15 € / anno"],
    ];
    s.addTable(rows, {
      x: 0.85,
      y: 2.35,
      w: 11.6,
      colW: [3.4, 5.6, 2.6],
      rowH: 0.62,
      fontFace: FONT_B,
      fontSize: 13.5,
      color: DARK,
      valign: "middle",
      border: { type: "solid", pt: 1, color: LINE },
      align: "left",
      fill: { color: CARD },
    });
    s.addText(
      "* Piani gratuiti adeguati a una squadra; eventuali costi solo a crescita di traffico/spazio. Cifre da confermare in fase di avvio.",
      {
        x: 0.85,
        y: 6.55,
        w: 11.6,
        h: 0.5,
        fontFace: FONT_B,
        fontSize: 11.5,
        italic: true,
        color: MUTED,
        margin: 0,
      }
    );
  }

  // 9. Cosa serve dalla società
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "Per partire", title: "Cosa serve dalla Società" });
    await iconRows(
      pres,
      s,
      [
        {
          icon: FA.FaCheckCircle,
          title: "Via libera al progetto",
          desc: "Approvazione della Direzione per renderlo lo strumento ufficiale della squadra.",
        },
        {
          icon: FA.FaInstagram,
          title: "Account Instagram Business",
          desc: "Per alimentare automaticamente la gallery foto del sito.",
        },
        {
          icon: FA.FaImage,
          title: "Contenuti ufficiali",
          desc: "Logo in alta risoluzione, sponsor, prime news e foto delle squadre.",
        },
        {
          icon: FA.FaGlobe,
          title: "Decisione sul dominio",
          desc: "Scelta dell'indirizzo web ufficiale (es. karibubaskin.it).",
        },
        {
          icon: FA.FaUserCheck,
          title: "Referenti",
          desc: "Chi nello staff gestirà allenamenti, partite e comunicazioni.",
        },
      ],
      { x: 0.85, y: 1.95, w: 11.6, rowH: 1.04 }
    );
  }

  // 10. Closing
  closingSlide(pres, {
    title: "Pronti a portare la squadra online.",
    lines: [
      "Decisione richiesta: adottare la piattaforma come strumento ufficiale.",
      "Subito dopo: raccolta contenuti e configurazione iniziale.",
      "Poi: presentazione e lancio per genitori e atleti.",
    ],
    footer: "Grazie. — Karibu Baskin · Montecchio Maggiore (VI)",
  });

  await pres.writeFile({ fileName: "Karibu-Baskin_Direzione-Staff.pptx" });
  console.log("Deck 1 (Direzione+Staff) creato.");
}

// =========================================================
// DECK 2 — GENITORI + ATLETI
// =========================================================
async function buildDeck2() {
  const pres = new pptxgen();
  pres.defineLayout({ name: "WIDE", width: W, height: H });
  pres.layout = "WIDE";
  pres.author = "Karibu Baskin";
  pres.title = "Karibu Baskin — La nostra app";

  // 1. Title
  titleSlide(pres, {
    kicker: "La nostra squadra, in un'app",
    title: "Karibu Baskin\nè online!",
    subtitle:
      "Iscriviti agli allenamenti, scopri la tua squadra e resta sempre aggiornato.\nDal telefono, in pochi tap.",
    footer: "Per genitori e atleti  ·  Baskin Montecchio Maggiore (VI)",
  });

  // 2. Cosa puoi fare
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "In pochi tap", title: "Cosa puoi fare con l'app" });
    await iconCards(
      pres,
      s,
      [
        {
          icon: FA.FaClipboardCheck,
          title: "Iscriverti agli allenamenti",
          desc: "Segna la tua presenza quando le iscrizioni sono aperte.",
        },
        {
          icon: FA.FaUsers,
          title: "Vedere la tua squadra",
          desc: "Scopri in quale squadra giochi appena le formazioni sono pronte.",
        },
        {
          icon: FA.FaCalendarAlt,
          title: "Consultare il calendario",
          desc: "Allenamenti, partite ed eventi sempre a portata di mano.",
        },
        {
          icon: FA.FaBell,
          title: "Ricevere le notifiche",
          desc: "Promemoria e avvisi importanti direttamente sul telefono.",
        },
        {
          icon: FA.FaTrophy,
          title: "Seguire partite e classifiche",
          desc: "Risultati, marcatori, MVP e profili dei giocatori.",
        },
        {
          icon: FA.FaImages,
          title: "Rivivere i momenti",
          desc: "Foto e video della squadra nella gallery.",
        },
      ],
      { cols: 3 }
    );
  }

  // 3. Come si accede
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "Primo passo", title: "Accedere è semplicissimo" });
    const steps = [
      {
        n: "1",
        t: "Apri il sito",
        d: "Dal telefono o dal computer, vai all'indirizzo della squadra.",
      },
      { n: "2", t: 'Tocca "Accedi"', d: "Scegli l'accesso con il tuo account Google." },
      { n: "3", t: "Sei dentro!", d: "Nessuna password da ricordare. Il tuo profilo è pronto." },
    ];
    const cw = 3.7,
      gap = 0.45,
      startX = (W - (cw * 3 + gap * 2)) / 2;
    for (let i = 0; i < steps.length; i++) {
      const x = startX + i * (cw + gap),
        y = 2.4;
      s.addShape(pres.shapes.RECTANGLE, {
        x,
        y,
        w: cw,
        h: 3.4,
        fill: { color: CARD },
        line: { color: LINE, width: 1 },
        shadow: cardShadow(),
      });
      s.addShape(pres.shapes.OVAL, {
        x: x + cw / 2 - 0.55,
        y: y + 0.5,
        w: 1.1,
        h: 1.1,
        fill: { color: ORANGE },
      });
      s.addText(steps[i].n, {
        x: x + cw / 2 - 0.55,
        y: y + 0.5,
        w: 1.1,
        h: 1.1,
        fontFace: FONT_H,
        fontSize: 40,
        bold: true,
        color: WHITE,
        align: "center",
        valign: "middle",
        margin: 0,
      });
      s.addText(steps[i].t, {
        x: x + 0.3,
        y: y + 1.85,
        w: cw - 0.6,
        h: 0.5,
        fontFace: FONT_H,
        fontSize: 19,
        bold: true,
        color: DARK,
        align: "center",
        margin: 0,
      });
      s.addText(steps[i].d, {
        x: x + 0.3,
        y: y + 2.35,
        w: cw - 0.6,
        h: 0.9,
        fontFace: FONT_B,
        fontSize: 14,
        color: MUTED,
        align: "center",
        margin: 0,
        valign: "top",
      });
    }
  }

  // 4. Iscriversi a un allenamento
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "La cosa più usata", title: "Iscriverti a un allenamento" });
    await iconRows(
      pres,
      s,
      [
        {
          icon: FA.FaListUl,
          title: "Apri la lista allenamenti",
          desc: "Vedi le date disponibili con le iscrizioni aperte.",
        },
        {
          icon: FA.FaHandPointer,
          title: "Scegli e conferma",
          desc: "Seleziona l'allenamento e conferma la tua presenza.",
        },
        {
          icon: FA.FaUserFriends,
          title: "Iscrivi anche i figli",
          desc: "I genitori possono iscrivere i propri figli dal loro profilo.",
        },
        {
          icon: FA.FaCheckDouble,
          title: "Vedi chi c'è",
          desc: "Controlla l'elenco degli iscritti divisi per ruolo.",
        },
      ],
      { x: 0.85, y: 2.05, w: 11.6, rowH: 1.18 }
    );
  }

  // 5. La tua squadra + notifiche
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "Il bello", title: '"La tua squadra" e gli avvisi' });
    // left card
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.85,
      y: 2.05,
      w: 5.6,
      h: 4.5,
      fill: { color: CARD },
      line: { color: LINE, width: 1 },
      shadow: cardShadow(),
    });
    const ic1 = await icon(FA.FaTshirt);
    s.addShape(pres.shapes.OVAL, { x: 1.2, y: 2.4, w: 0.9, h: 0.9, fill: { color: "FFF1E6" } });
    s.addImage({ data: ic1, x: 1.2 + 0.23, y: 2.4 + 0.23, w: 0.44, h: 0.44 });
    s.addText("La tua squadra", {
      x: 1.2,
      y: 3.45,
      w: 5.0,
      h: 0.5,
      fontFace: FONT_H,
      fontSize: 21,
      bold: true,
      color: DARK,
      margin: 0,
    });
    s.addText(
      "Quando lo staff genera le formazioni, un banner ti mostra subito in quale squadra giochi — Arancioni, Neri o Bianchi.",
      {
        x: 1.2,
        y: 4.0,
        w: 4.9,
        h: 2.2,
        fontFace: FONT_B,
        fontSize: 14.5,
        color: MUTED,
        margin: 0,
        valign: "top",
        lineSpacingMultiple: 1.05,
      }
    );
    // right card
    s.addShape(pres.shapes.RECTANGLE, {
      x: 6.85,
      y: 2.05,
      w: 5.6,
      h: 4.5,
      fill: { color: DARK },
      shadow: cardShadow(),
    });
    const ic2 = await icon(FA.FaBell, "#FFFFFF");
    s.addShape(pres.shapes.OVAL, { x: 7.2, y: 2.4, w: 0.9, h: 0.9, fill: { color: ORANGE } });
    s.addImage({ data: ic2, x: 7.2 + 0.23, y: 2.4 + 0.23, w: 0.44, h: 0.44 });
    s.addText("Notifiche utili", {
      x: 7.2,
      y: 3.45,
      w: 5.0,
      h: 0.5,
      fontFace: FONT_H,
      fontSize: 21,
      bold: true,
      color: WHITE,
      margin: 0,
    });
    s.addText(
      "Ricevi promemoria per le iscrizioni, le convocazioni alle partite e le novità della squadra. Le attivi (o disattivi) dal tuo profilo.",
      {
        x: 7.2,
        y: 4.0,
        w: 4.9,
        h: 2.2,
        fontFace: FONT_B,
        fontSize: 14.5,
        color: "C9C3BB",
        margin: 0,
        valign: "top",
        lineSpacingMultiple: 1.05,
      }
    );
  }

  // 6. Installa come app (PWA) + QR placeholder
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "Comodo", title: "Installala come app sul telefono" });
    await iconRows(
      pres,
      s,
      [
        {
          icon: FA.FaMobileAlt,
          title: "Apri il sito dal telefono",
          desc: "Con Chrome (Android) o Safari (iPhone).",
        },
        {
          icon: FA.FaPlusSquare,
          title: 'Tocca "Aggiungi a schermata Home"',
          desc: "Dal menu del browser. Appare l'icona Karibu Baskin.",
        },
        {
          icon: FA.FaRocket,
          title: "Aprila come una vera app",
          desc: "A schermo intero, veloce, anche con connessione debole.",
        },
      ],
      { x: 0.85, y: 2.05, w: 7.2, rowH: 1.45 }
    );
    // QR placeholder card on the right
    s.addShape(pres.shapes.RECTANGLE, {
      x: 8.6,
      y: 2.05,
      w: 3.85,
      h: 4.5,
      fill: { color: CARD },
      line: { color: LINE, width: 1 },
      shadow: cardShadow(),
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 9.4,
      y: 2.6,
      w: 2.25,
      h: 2.25,
      fill: { color: "F0EBE4" },
      line: { color: LINE, width: 1 },
    });
    const icq = await icon(FA.FaQrcode, "#B8B2AA", 256);
    s.addImage({ data: icq, x: 9.4 + 0.5, y: 2.6 + 0.5, w: 1.25, h: 1.25 });
    s.addText("Inquadra il QR", {
      x: 8.6,
      y: 4.95,
      w: 3.85,
      h: 0.45,
      fontFace: FONT_H,
      fontSize: 17,
      bold: true,
      color: DARK,
      align: "center",
      margin: 0,
    });
    s.addText("[ Inserisci qui il QR code del sito ]", {
      x: 8.6,
      y: 5.4,
      w: 3.85,
      h: 0.8,
      fontFace: FONT_B,
      fontSize: 12,
      italic: true,
      color: MUTED,
      align: "center",
      margin: 0,
      valign: "top",
    });
  }

  // 7. Privacy semplice
  {
    const s = pres.addSlide();
    bgLight(s);
    header(pres, s, { kicker: "Tranquilli", title: "I vostri dati sono al sicuro" });
    await iconCards(
      pres,
      s,
      [
        {
          icon: FA.FaLock,
          title: "Accesso sicuro",
          desc: "Si entra solo con Google: nessuna password della squadra in giro.",
        },
        {
          icon: FA.FaEyeSlash,
          title: "Solo chi serve, vede",
          desc: "Ognuno vede solo le proprie informazioni. I dati non sono pubblici.",
        },
        {
          icon: FA.FaChild,
          title: "Pensata per i minori",
          desc: "I genitori gestiscono i figli; i collegamenti sono verificati dallo staff.",
        },
      ],
      { cols: 3, top: 2.2 }
    );
  }

  // 8. Closing CTA + QR
  {
    const s = closingSlide(pres, {
      title: "Provala stasera.",
      lines: [
        "Accedi con Google e completa il tuo profilo.",
        "Iscriviti al prossimo allenamento.",
        "Aggiungi l'app alla schermata Home del telefono.",
      ],
      url: "[ indirizzo del sito ]",
      footer: "Ci vediamo in palestra! — Karibu Baskin",
    });
    // QR placeholder bottom-right
    s.addShape(pres.shapes.RECTANGLE, {
      x: 10.6,
      y: 1.8,
      w: 2.0,
      h: 2.0,
      fill: { color: "FFFFFF" },
    });
    const icq = await icon(FA.FaQrcode, "#1A1A1A", 256);
    s.addImage({ data: icq, x: 10.6 + 0.45, y: 1.8 + 0.45, w: 1.1, h: 1.1 });
    s.addText("QR del sito", {
      x: 10.6,
      y: 3.82,
      w: 2.0,
      h: 0.35,
      fontFace: FONT_B,
      fontSize: 11,
      color: "9A948C",
      align: "center",
      margin: 0,
    });
  }

  await pres.writeFile({ fileName: "Karibu-Baskin_Genitori-Atleti.pptx" });
  console.log("Deck 2 (Genitori+Atleti) creato.");
}

(async () => {
  await buildDeck1();
  await buildDeck2();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
