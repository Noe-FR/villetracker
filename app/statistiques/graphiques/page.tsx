import { GraphiquesClient } from "./GraphiquesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Graphiques — Statistiques nationales — VilleTracker",
};

export default function GraphiquesPage() {
  return <GraphiquesClient />;
}
