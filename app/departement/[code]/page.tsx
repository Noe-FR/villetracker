import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverApi } from "@/src/api/server";
import { OG_IMAGE, SITE_URL } from "@/src/constants";
import { Footer } from "@/src/components/Footer";
import { JsonLd } from "@/src/components/JsonLd";

// Chemin de crawl vers chaque commune : c'est cette page qui rend les ~35 000
// pages commune atteignables par un lien, en plus du sitemap.
export const revalidate = 86400;

interface Props {
  params: Promise<{ code: string }>;
}

async function getDept(code: string) {
  const index = await serverApi.getCommunesIndex(code);
  if (!index.communes.length) return null;
  const first = index.communes[0];
  return {
    code,
    nom: first.departement_nom,
    region: first.region_nom,
    communes: [...index.communes].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  try {
    const d = await getDept(code);
    if (!d) return { title: "Département — VilleTracker" };
    return {
      title: `${d.nom} (${d.code}) — ${d.communes.length} communes — VilleTracker`,
      description: `Les ${d.communes.length} communes du département ${d.nom} (${d.code}, ${d.region}) : finances locales, fiscalité, démographie et données territoriales.`,
      alternates: { canonical: `${SITE_URL}/departement/${d.code}` },
      openGraph: {
        title: `${d.nom} (${d.code}) — VilleTracker`,
        description: `Les ${d.communes.length} communes du département ${d.nom}.`,
        url: `${SITE_URL}/departement/${d.code}`,
        type: "website",
        images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: `${d.nom} — VilleTracker` }],
      },
      twitter: { card: "summary_large_image", images: [OG_IMAGE] },
    };
  } catch {
    return { title: "Département — VilleTracker" };
  }
}

export default async function DepartementPage({ params }: Props) {
  const { code } = await params;

  let d: Awaited<ReturnType<typeof getDept>> = null;
  try {
    d = await getDept(code);
  } catch {
    // API indisponible — traité comme introuvable plutôt qu'en erreur 500
  }
  if (!d) notFound();

  const fmt = new Intl.NumberFormat("fr-FR");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Départements", item: `${SITE_URL}/departements` },
            { "@type": "ListItem", position: 3, name: d.nom, item: `${SITE_URL}/departement/${d.code}` },
          ],
        }}
      />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full">
        <nav className="text-sm text-slate-400 mb-6">
          <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
          <span className="mx-2">›</span>
          <Link href="/departements" className="hover:text-white transition-colors">Départements</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-300">{d.nom}</span>
        </nav>

        <h1 className="text-3xl font-bold mb-3">
          Communes du département {d.nom} ({d.code})
        </h1>
        <p className="text-slate-400 mb-10 max-w-3xl">
          {d.communes.length} communes en {d.region}. Chaque fiche détaille les
          finances locales, la fiscalité, la démographie, le logement et les
          données territoriales issues des sources publiques.
        </p>

        <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-800 pb-2">
          Toutes les communes
        </h2>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {d.communes.map((c) => (
            <li key={c.code_insee}>
              <Link
                href={`/commune/${c.code_insee}`}
                className="flex items-baseline justify-between gap-3 py-1 text-slate-300 hover:text-white transition-colors"
              >
                <span className="truncate">{c.nom}</span>
                {c.population != null && (
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    {fmt.format(c.population)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
