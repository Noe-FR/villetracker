import Link from "next/link";
import { HomeShell } from "./HomeShell";
import { JsonLd } from "@/src/components/JsonLd";
import { SITE_URL } from "@/src/constants";

// La carte d'accueil dépend entièrement de Leaflet, donc du navigateur : elle
// reste en client-only. Ce composant serveur ajoute autour d'elle des liens
// réellement présents dans le HTML, seul chemin de crawl depuis la racine.
export default function Page() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}#website`,
              url: SITE_URL,
              name: "VilleTracker",
              inLanguage: "fr-FR",
              publisher: { "@id": `${SITE_URL}#org` },
            },
            {
              "@type": "Organization",
              "@id": `${SITE_URL}#org`,
              name: "VilleTracker",
              url: SITE_URL,
              logo: `${SITE_URL}/square_blue.png`,
              founder: { "@type": "Person", name: "Noé FRAISSE" },
            },
          ],
        }}
      />
      <HomeShell />
      <nav aria-label="Navigation principale" className="sr-only">
        <Link href="/departements">Départements et communes de France</Link>
        <Link href="/statistiques/graphiques">Graphiques nationaux</Link>
        <Link href="/statistiques/politique">Données politiques</Link>
        <Link href="/statistiques/cartes">Cartes nationales</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
      </nav>
    </>
  );
}
