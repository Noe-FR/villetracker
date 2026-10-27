import type { MetadataRoute } from "next";
import { serverApi } from "@/src/api/server";
import { SITE_URL } from "@/src/constants";

// Un sitemap est plafonné à 50 000 URL par le protocole. Avec ~35 000 communes
// plus les index départementaux on reste dessous ; si le seuil approche, passer
// à generateSitemaps() pour découper en plusieurs fichiers.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const statiques: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/departements`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/statistiques/graphiques`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/statistiques/politique`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/statistiques/cartes`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/statistiques/fun`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.1 },
  ];
  // NB : /statistiques (vue d'ensemble) est volontairement absent, la page
  // appelle encore notFound().

  let communes: MetadataRoute.Sitemap = [];
  let departements: MetadataRoute.Sitemap = [];
  try {
    const index = await serverApi.getCommunesIndex();

    communes = index.communes.map((c) => ({
      url: `${SITE_URL}/commune/${c.code_insee}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      // Les communes peuplées sont les plus recherchées : on hiérarchise
      // légèrement pour orienter le budget de crawl.
      priority: (c.population ?? 0) >= 20000 ? 0.8 : 0.5,
    }));

    departements = [...new Set(index.communes.map((c) => c.departement_code))]
      .filter(Boolean)
      .map((code) => ({
        url: `${SITE_URL}/departement/${code}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
  } catch {
    // API indisponible : on publie au moins les pages statiques plutôt que
    // de renvoyer une erreur, qui ferait échouer tout le sitemap.
  }

  return [...statiques, ...departements, ...communes];
}
