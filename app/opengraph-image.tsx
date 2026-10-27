import { ImageResponse } from "next/og";

// Image d'aperçu par défaut (partages Slack, LinkedIn, Discord…). Générée
// plutôt que livrée en PNG : pas de binaire à maintenir dans le dépôt, et le
// texte reste modifiable. Les pages commune héritent de celle-ci.
export const runtime = "nodejs";
export const alt = "VilleTracker — Données des communes françaises";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #020617 0%, #0f172a 55%, #1e3a8a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, color: "#60a5fa", letterSpacing: 2, display: "flex" }}>
          VILLETRACKER
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.15, marginTop: 20, display: "flex" }}>
          Les données des communes françaises
        </div>
        <div style={{ fontSize: 32, color: "#94a3b8", marginTop: 28, display: "flex" }}>
          Finances · Fiscalité · Démographie · Immobilier · Élus
        </div>
        <div style={{ fontSize: 24, color: "#64748b", marginTop: 44, display: "flex" }}>
          Sources publiques OFGL · DGFiP · INSEE
        </div>
      </div>
    ),
    size,
  );
}
