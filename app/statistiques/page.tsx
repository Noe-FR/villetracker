import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vue d'ensemble — Statistiques nationales — VilleTracker",
};

// TODO: retirer notFound() quand la feature est prête
export default async function StatistiquesPage() {
  notFound();
}
