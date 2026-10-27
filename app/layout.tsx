import type { Metadata } from "next";
import { SITE_URL } from "@/src/constants";
import "./globals.css";

const DESCRIPTION =
  "Explorez les données financières, fiscales et territoriales des 35 000 communes françaises : budgets, fiscalité locale, démographie, immobilier et élus.";

export const metadata: Metadata = {
  // Indispensable : sans metadataBase, les URL canoniques et les images
  // OpenGraph restent relatives et sont ignorées par les crawlers.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VilleTracker — Données des communes françaises",
    template: "%s — VilleTracker",
  },
  description: DESCRIPTION,
  applicationName: "VilleTracker",
  authors: [{ name: "Noé FRAISSE" }],
  keywords: [
    "commune", "finances locales", "budget municipal", "fiscalité locale",
    "DGFiP", "OFGL", "INSEE", "données publiques", "open data",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "VilleTracker",
    title: "VilleTracker — Données des communes françaises",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "VilleTracker — Données des communes françaises",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: {
    icon: "/square_blue.png",
    apple: "/square_blue.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
