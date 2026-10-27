// Année sélectionnée au premier rendu d'une page commune.
// Partagée entre le serveur (qui préchauffe le payload finances) et le client
// (qui démarre son état dessus) : si les deux divergent, la clé de cache de
// useApi ne correspond plus et le client refait l'appel au montage.
export const INITIAL_YEAR = 2024;

// URL publique du site, nécessaire pour les URL absolues : canonical,
// OpenGraph, sitemap et robots.txt ne peuvent pas utiliser de chemin relatif.
// Surchargeable par NEXT_PUBLIC_SITE_URL si le domaine change.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://villetracker.fr";

// Image d'aperçu par défaut (app/opengraph-image.tsx). Référencée en absolu :
// une page qui déclare son propre bloc openGraph n'hérite pas de l'image de
// la racine, et Next résout l'URL sur l'hôte courant plutôt que sur
// metadataBase pour les images générées.
export const OG_IMAGE = `${SITE_URL}/opengraph-image`;
