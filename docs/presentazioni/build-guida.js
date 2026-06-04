const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const FA = require("react-icons/fa");

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

// A4 portrait in inches
const PW = 8.27,
  PH = 11.69;
const cardShadow = () => ({
  type: "outer",
  color: "1A1A1A",
  blur: 7,
  offset: 2,
  angle: 90,
  opacity: 0.1,
});

async function icon(Comp, color = "#" + ORANGE, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Comp, { color, size: String(size) })
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.defineLayout({ name: "A4P", width: PW, height: PH });
  pres.layout = "A4P";
  pres.author = "Karibu Baskin";
  pres.title = "Karibu Baskin — Guida rapida per genitori e atleti";

  const s = pres.addSlide();
  s.background = { color: LIGHT };

  // ---- Header band (dark) ----
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: PW, h: 1.85, fill: { color: NIGHT } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 1.85, w: PW, h: 0.08, fill: { color: ORANGE } });
  // logo
  s.addImage({ path: "../../public/logo.png", x: 0.5, y: 0.33, w: 1.2, h: 1.2, rounding: true });
  s.addText("Karibu Baskin è online!", {
    x: 1.95,
    y: 0.45,
    w: 6.0,
    h: 0.6,
    fontFace: FONT_H,
    fontSize: 26,
    bold: true,
    color: WHITE,
    margin: 0,
  });
  s.addText("Guida rapida per genitori e atleti", {
    x: 1.95,
    y: 1.05,
    w: 6.0,
    h: 0.4,
    fontFace: FONT_B,
    fontSize: 14,
    color: ORANGE_LT,
    margin: 0,
  });
  s.addText("La nostra squadra, in un'app: iscrizioni, squadre, calendario e avvisi.", {
    x: 1.97,
    y: 1.42,
    w: 6.1,
    h: 0.35,
    fontFace: FONT_B,
    fontSize: 11.5,
    color: "C9C3BB",
    margin: 0,
  });

  // ---- Section: Cosa puoi fare ----
  let y = 2.2;
  s.addText("COSA PUOI FARE", {
    x: 0.5,
    y,
    w: 7.3,
    h: 0.3,
    fontFace: FONT_H,
    fontSize: 13,
    bold: true,
    color: ORANGE,
    charSpacing: 2,
    margin: 0,
  });
  y += 0.42;
  const features = [
    {
      icon: FA.FaClipboardCheck,
      t: "Iscriverti agli allenamenti",
      d: "quando le iscrizioni sono aperte",
    },
    { icon: FA.FaUsers, t: "Vedere la tua squadra", d: "appena le formazioni sono pronte" },
    { icon: FA.FaCalendarAlt, t: "Consultare il calendario", d: "allenamenti, partite ed eventi" },
    { icon: FA.FaBell, t: "Ricevere le notifiche", d: "promemoria e avvisi sul telefono" },
  ];
  const fcW = (PW - 1.0 - 0.3) / 2,
    fcH = 0.95;
  for (let i = 0; i < features.length; i++) {
    const c = i % 2,
      r = Math.floor(i / 2);
    const x = 0.5 + c * (fcW + 0.3),
      fy = y + r * (fcH + 0.25);
    s.addShape(pres.shapes.RECTANGLE, {
      x,
      y: fy,
      w: fcW,
      h: fcH,
      fill: { color: CARD },
      line: { color: LINE, width: 1 },
      shadow: cardShadow(),
    });
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.22,
      y: fy + 0.24,
      w: 0.48,
      h: 0.48,
      fill: { color: "FFF1E6" },
    });
    const ic = await icon(features[i].icon);
    s.addImage({ data: ic, x: x + 0.22 + 0.12, y: fy + 0.24 + 0.12, w: 0.24, h: 0.24 });
    s.addText(features[i].t, {
      x: x + 0.85,
      y: fy + 0.16,
      w: fcW - 1.0,
      h: 0.35,
      fontFace: FONT_H,
      fontSize: 12.5,
      bold: true,
      color: DARK,
      margin: 0,
    });
    s.addText(features[i].d, {
      x: x + 0.85,
      y: fy + 0.5,
      w: fcW - 1.0,
      h: 0.35,
      fontFace: FONT_B,
      fontSize: 10.5,
      color: MUTED,
      margin: 0,
    });
  }
  y += 2 * fcH + 0.25 + 0.45;

  // ---- Section: Come iniziare (3 steps) ----
  s.addText("COME INIZIARE IN 3 PASSI", {
    x: 0.5,
    y,
    w: 7.3,
    h: 0.3,
    fontFace: FONT_H,
    fontSize: 13,
    bold: true,
    color: ORANGE,
    charSpacing: 2,
    margin: 0,
  });
  y += 0.45;
  const steps = [
    { n: "1", t: "Apri il sito", d: "Vai all'indirizzo della squadra dal telefono o dal PC." },
    { n: "2", t: "Accedi con Google", d: "Un tap, nessuna password da ricordare." },
    { n: "3", t: "Installa l'app", d: 'Menu browser → "Aggiungi a schermata Home".' },
  ];
  const scW = (PW - 1.0 - 0.6) / 3,
    scH = 1.7;
  for (let i = 0; i < steps.length; i++) {
    const x = 0.5 + i * (scW + 0.3);
    s.addShape(pres.shapes.RECTANGLE, {
      x,
      y,
      w: scW,
      h: scH,
      fill: { color: CARD },
      line: { color: LINE, width: 1 },
      shadow: cardShadow(),
    });
    s.addShape(pres.shapes.OVAL, {
      x: x + scW / 2 - 0.32,
      y: y + 0.22,
      w: 0.64,
      h: 0.64,
      fill: { color: ORANGE },
    });
    s.addText(steps[i].n, {
      x: x + scW / 2 - 0.32,
      y: y + 0.22,
      w: 0.64,
      h: 0.64,
      fontFace: FONT_H,
      fontSize: 24,
      bold: true,
      color: WHITE,
      align: "center",
      valign: "middle",
      margin: 0,
    });
    s.addText(steps[i].t, {
      x: x + 0.12,
      y: y + 0.95,
      w: scW - 0.24,
      h: 0.3,
      fontFace: FONT_H,
      fontSize: 12.5,
      bold: true,
      color: DARK,
      align: "center",
      margin: 0,
    });
    s.addText(steps[i].d, {
      x: x + 0.14,
      y: y + 1.25,
      w: scW - 0.28,
      h: 0.42,
      fontFace: FONT_B,
      fontSize: 9.5,
      color: MUTED,
      align: "center",
      margin: 0,
      valign: "top",
    });
  }
  y += scH + 0.45;

  // ---- Section: Privacy reassurance (dark band) ----
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5,
    y,
    w: PW - 1.0,
    h: 1.35,
    fill: { color: DARK },
    shadow: cardShadow(),
  });
  const icl = await icon(FA.FaShieldAlt, "#FF8A50");
  s.addShape(pres.shapes.OVAL, { x: 0.85, y: y + 0.42, w: 0.55, h: 0.55, fill: { color: NIGHT } });
  s.addImage({ data: icl, x: 0.85 + 0.14, y: y + 0.42 + 0.14, w: 0.27, h: 0.27 });
  s.addText("I vostri dati sono al sicuro", {
    x: 1.6,
    y: y + 0.25,
    w: PW - 2.2,
    h: 0.4,
    fontFace: FONT_H,
    fontSize: 15,
    bold: true,
    color: WHITE,
    margin: 0,
  });
  s.addText(
    "Si entra solo con Google. Ognuno vede solo le proprie informazioni. I genitori gestiscono i figli minorenni con collegamenti verificati dallo staff.",
    {
      x: 1.6,
      y: y + 0.65,
      w: PW - 2.2,
      h: 0.6,
      fontFace: FONT_B,
      fontSize: 11,
      color: "C9C3BB",
      margin: 0,
      valign: "top",
      lineSpacingMultiple: 1.05,
    }
  );
  y += 1.35 + 0.4;

  // ---- Footer: CTA + QR ----
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5,
    y,
    w: PW - 1.0,
    h: 1.5,
    fill: { color: "FFF1E6" },
    line: { color: ORANGE_LT, width: 1 },
  });
  // QR placeholder
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.8,
    y: y + 0.28,
    w: 0.95,
    h: 0.95,
    fill: { color: WHITE },
    line: { color: LINE, width: 1 },
  });
  const icq = await icon(FA.FaQrcode, "#B8B2AA", 256);
  s.addImage({ data: icq, x: 0.8 + 0.22, y: y + 0.28 + 0.22, w: 0.5, h: 0.5 });
  s.addText("Provala stasera!", {
    x: 2.0,
    y: y + 0.28,
    w: PW - 2.7,
    h: 0.4,
    fontFace: FONT_H,
    fontSize: 16,
    bold: true,
    color: DARK,
    margin: 0,
  });
  s.addText(
    [
      { text: "Inquadra il QR o vai su: ", options: { color: MUTED } },
      { text: "[ indirizzo del sito ]", options: { color: ORANGE, bold: true } },
    ],
    { x: 2.0, y: y + 0.72, w: PW - 2.7, h: 0.35, fontFace: FONT_B, fontSize: 12, margin: 0 }
  );
  s.addText("Domande? Scrivi allo staff. Ci vediamo in palestra! — Karibu Baskin", {
    x: 2.0,
    y: y + 1.05,
    w: PW - 2.7,
    h: 0.3,
    fontFace: FONT_B,
    fontSize: 9.5,
    italic: true,
    color: MUTED,
    margin: 0,
  });

  await pres.writeFile({ fileName: "Karibu-Baskin_Guida-Genitori-A4.pptx" });
  console.log("Guida A4 creata.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
