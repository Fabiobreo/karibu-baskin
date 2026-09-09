import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { loadInterFonts } from "@/lib/og/fonts";

export const alt = "Karibu Baskin, sport inclusivo a Montecchio Maggiore (VI)";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ORANGE = "#E65100";
const ORANGE_LIGHT = "#FF9E4D";

/** Il logo sorgente è 1600x1600: lo riduco alla dimensione di resa per non
 *  inlinare 576 KB di base64 nell'immagine generata. */
async function logoDataUri() {
  const source = await readFile(join(process.cwd(), "public", "logo.png"));
  const resized = await sharp(source).resize(340, 340).png({ quality: 90 }).toBuffer();
  return `data:image/png;base64,${resized.toString("base64")}`;
}

export default async function OgImage() {
  const [fonts, logo] = await Promise.all([loadInterFonts([400, 700, 800]), logoDataUri()]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 64,
        padding: "0 80px",
        // Alone caldo dietro al logo che degrada a nero dietro al testo: dà
        // profondità alla card e alza il contrasto del titolo.
        background: "linear-gradient(115deg, #4A1F06 0%, #241610 34%, #131313 68%)",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Satori renderizza solo <img>: next/image non esiste in questo contesto. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} width={340} height={340} alt="" style={{ flexShrink: 0 }} />

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 4,
            color: ORANGE_LIGHT,
          }}
        >
          MONTECCHIO MAGGIORE (VI)
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 98,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.05,
            marginTop: 14,
          }}
        >
          Karibu Baskin
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 34,
            fontWeight: 400,
            color: "rgba(255,255,255,0.74)",
            lineHeight: 1.35,
            marginTop: 20,
          }}
        >
          <div style={{ display: "flex" }}>Sport inclusivo per tutti.</div>
          <div style={{ display: "flex" }}>Alleniamoci insieme, senza distinzioni.</div>
        </div>
      </div>

      {/* Barra a piede pagina: chiude la composizione e resta leggibile in miniatura */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: 12,
          background: ORANGE,
          display: "flex",
        }}
      />
    </div>,
    { ...size, fonts }
  );
}
