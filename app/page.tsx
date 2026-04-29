'use client';
import dynamic from "next/dynamic";

// Leaflet utilise window/document — désactiver SSR pour le composant carte
const HomeClient = dynamic(
  () => import("@/src/views/Home").then((m) => m.HomeClient),
  { ssr: false, loading: () => (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-100">
      <div className="text-slate-500 text-sm">Chargement de la carte…</div>
    </div>
  )}
);

export default function Page() {
  return <HomeClient />;
}
