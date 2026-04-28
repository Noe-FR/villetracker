import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VilleTracker",
  description: "Explorez les données financières, fiscales et territoriales des communes françaises.",
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
