import { GraphiquesClient } from "./GraphiquesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Graphiques — Statistiques nationales",
};

export default function GraphiquesPage() {
  return <GraphiquesClient />;
}
