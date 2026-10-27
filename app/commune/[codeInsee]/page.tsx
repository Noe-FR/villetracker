import { serverApi } from "@/src/api/server";
import { buildFinancesTab } from "@/app/api/commune/[codeInsee]/financesTab";
import { INITIAL_YEAR, OG_IMAGE, SITE_URL } from "@/src/constants";
import { CommunePageClient } from "./CommunePageClient";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/src/components/JsonLd";

// Arrondissements → commune mère
const PARENT: Record<string, string> = {
  ...Object.fromEntries(Array.from({length: 20}, (_, i) => [`751${String(i+1).padStart(2,"0")}`, "75056"])),
  ...Object.fromEntries(Array.from({length: 9},  (_, i) => [`6938${i+1}`, "69123"])),
  ...Object.fromEntries(Array.from({length: 16}, (_, i) => [`132${String(i+1).padStart(2,"0")}`, "13055"])),
};

// ISR : les données évoluent au rythme des collectes, pas à chaque visite.
// Sans ça chaque page commune est recalculée à chaque requête — coûteux dès
// qu'un crawler parcourt les ~35 000 URL du sitemap.
export const revalidate = 3600;

interface Props {
  params: Promise<{ codeInsee: string }>;
}

const fmtNb = new Intl.NumberFormat("fr-FR");

/** Phrase de description affichée sous le lien dans les résultats de recherche. */
function descriptionCommune(info: {
  nom: string; population?: number;
  departement_nom?: string; departement_code?: string; region_nom?: string;
}): string {
  const lieu = [info.departement_nom && `${info.departement_nom}`, info.region_nom]
    .filter(Boolean)
    .join(", ");
  const hab = info.population != null ? `${fmtNb.format(info.population)} habitants` : null;
  const situe = lieu ? `${info.nom} (${lieu})` : info.nom;
  return [
    hab ? `${situe} compte ${hab}.` : `${situe}.`,
    "Budget municipal, fiscalité locale, santé financière, démographie,",
    "logement, immobilier et élus — données publiques OFGL, DGFiP et INSEE.",
  ].join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codeInsee } = await params;
  const resolved = PARENT[codeInsee] ?? codeInsee;
  const url = `${SITE_URL}/commune/${resolved}`;
  try {
    const info = await serverApi.getCommuneInfo(resolved);
    const titre = info.departement_code
      ? `${info.nom} (${info.departement_code})`
      : info.nom;
    const description = descriptionCommune(info);
    return {
      title: titre,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        title: `${titre} — VilleTracker`,
        description,
        url,
        siteName: "VilleTracker",
        locale: "fr_FR",
        images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: `${titre} — VilleTracker` }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${titre} — VilleTracker`,
        description,
        images: [OG_IMAGE],
      },
    };
  } catch {
    // Commune inconnue de l'API : titre neutre, et on évite de déclarer une
    // canonique vers une page qui n'existe peut-être pas.
    return { title: "Commune" };
  }
}

export default async function Page({ params }: Props) {
  const { codeInsee } = await params;
  const parent = PARENT[codeInsee];
  if (parent) redirect(`/commune/${parent}`);

  // Payload préchargé ici pour que le HTML envoyé contienne déjà le contenu :
  // sans ça la page ne sert qu'un squelette, illisible pour tout crawler qui
  // n'exécute pas le JavaScript. En cas d'échec le client reprendra la main.
  let initialFinTab = null;
  try {
    initialFinTab = await buildFinancesTab(codeInsee, INITIAL_YEAR);
  } catch {
    // source indisponible — la page se charge côté client comme avant
  }

  // Données structurées : décrivent la commune et sa position dans la
  // hiérarchie administrative, pour les résultats enrichis.
  let jsonLd: Record<string, unknown> | null = null;
  try {
    const info = await serverApi.getCommuneInfo(codeInsee);
    const url = `${SITE_URL}/commune/${codeInsee}`;
    jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Place",
          "@id": `${url}#place`,
          name: info.nom,
          url,
          identifier: { "@type": "PropertyValue", propertyID: "INSEE", value: info.code_insee },
          ...(info.population != null ? { additionalProperty: {
            "@type": "PropertyValue", name: "Population", value: info.population,
          } } : {}),
          address: {
            "@type": "PostalAddress",
            addressLocality: info.nom,
            ...(info.departement_nom ? { addressRegion: info.departement_nom } : {}),
            addressCountry: "FR",
            ...(info.codes_postaux?.length ? { postalCode: info.codes_postaux[0] } : {}),
          },
          ...(info.departement_code ? {
            containedInPlace: {
              "@type": "AdministrativeArea",
              name: info.departement_nom,
              url: `${SITE_URL}/departement/${info.departement_code}`,
            },
          } : {}),
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Départements", item: `${SITE_URL}/departements` },
            ...(info.departement_code ? [{
              "@type": "ListItem", position: 3,
              name: info.departement_nom,
              item: `${SITE_URL}/departement/${info.departement_code}`,
            }] : []),
            { "@type": "ListItem", position: info.departement_code ? 4 : 3, name: info.nom, item: url },
          ],
        },
      ],
    };
  } catch {
    // sans métadonnées commune, on sert la page sans données structurées
  }

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <CommunePageClient codeInsee={codeInsee} initialFinTab={initialFinTab} />
    </>
  );
}
