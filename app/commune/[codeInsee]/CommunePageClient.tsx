'use client';
import { CommuneDetailClient } from "@/src/views/CommuneDetail";

// Plus de dynamic(ssr:false) ici : les seuls composants qui touchent `window`
// (les cartes Leaflet) sont isolés dans CommuneMaps et chargés dynamiquement
// depuis CommuneDetail. Le reste de la page est donc rendu côté serveur, ce
// qui est indispensable au référencement des ~35 000 pages commune.
export function CommunePageClient({
  codeInsee,
  initialFinTab,
}: {
  codeInsee: string;
  initialFinTab?: unknown;
}) {
  return <CommuneDetailClient codeInsee={codeInsee} initialFinTab={initialFinTab} />;
}
