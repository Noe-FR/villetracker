import Link from "next/link";
import type { Metadata } from "next";
import { serverApi } from "@/src/api/server";
import { SITE_URL } from "@/src/constants";
import { Footer } from "@/src/components/Footer";
import { JsonLd } from "@/src/components/JsonLd";

// Page d'index : sans elle, aucun crawler ne peut atteindre les pages commune,
// qui n'étaient reliées au site par aucun lien.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Départements français",
  description:
    "Parcourez les 101 départements français et accédez aux données financières, fiscales et territoriales de chacune de leurs communes.",
  alternates: { canonical: `${SITE_URL}/departements` },
};

interface Dept {
  code: string;
  nom: string;
  region: string;
  nbCommunes: number;
}

export default async function DepartementsPage() {
  let depts: Dept[] = [];
  try {
    const index = await serverApi.getCommunesIndex();
    const map = new Map<string, Dept>();
    for (const c of index.communes) {
      if (!c.departement_code) continue;
      const d = map.get(c.departement_code);
      if (d) d.nbCommunes += 1;
      else
        map.set(c.departement_code, {
          code: c.departement_code,
          nom: c.departement_nom,
          region: c.region_nom,
          nbCommunes: 1,
        });
    }
    depts = [...map.values()].sort((a, b) => a.code.localeCompare(b.code, "fr"));
  } catch {
    // API indisponible — la page se rend vide plutôt que d'échouer
  }

  // Regroupement par région pour une page lisible plutôt qu'une liste de 101 liens
  const parRegion = new Map<string, Dept[]>();
  for (const d of depts) {
    const list = parRegion.get(d.region) ?? [];
    list.push(d);
    parRegion.set(d.region, list);
  }
  const regions = [...parRegion.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Départements", item: `${SITE_URL}/departements` },
          ],
        }}
      />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full">
        <nav className="text-sm text-slate-400 mb-6">
          <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-300">Départements</span>
        </nav>

        <h1 className="text-3xl font-bold mb-3">Départements français</h1>
        <p className="text-slate-400 mb-10 max-w-3xl">
          Chaque département donne accès aux communes qu&apos;il regroupe, avec leurs
          finances locales, leur fiscalité, leur démographie et leurs données
          territoriales.
        </p>

        {regions.length === 0 && (
          <p className="text-slate-500">Données temporairement indisponibles.</p>
        )}

        {regions.map(([region, list]) => (
          <section key={region} className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-800 pb-2">
              {region}
            </h2>
            <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((d) => (
                <li key={d.code}>
                  <Link
                    href={`/departement/${d.code}`}
                    className="flex items-baseline justify-between gap-3 py-1 text-slate-300 hover:text-white transition-colors"
                  >
                    <span>
                      <span className="text-slate-500 tabular-nums mr-2">{d.code}</span>
                      {d.nom}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums shrink-0">
                      {d.nbCommunes}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
