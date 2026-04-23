import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Karibu Baskin — Montecchio Maggiore";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(230,81,0,0.15)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -100, left: -100, width: 500, height: 500, borderRadius: "50%", background: "rgba(230,81,0,0.08)", display: "flex" }} />

        {/* Badge */}
        <div style={{ background: "#E65100", color: "#fff", fontSize: 22, fontWeight: 700, padding: "8px 24px", borderRadius: 32, marginBottom: 32, display: "flex" }}>
          BASKIN
        </div>

        {/* Title */}
        <div style={{ fontSize: 80, fontWeight: 900, color: "#fff", marginBottom: 16, letterSpacing: -2, display: "flex" }}>
          Karibu Baskin
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 32, color: "rgba(255,255,255,0.6)", fontWeight: 400, display: "flex" }}>
          Montecchio Maggiore (VI)
        </div>
      </div>
    ),
    { ...size }
  );
}
