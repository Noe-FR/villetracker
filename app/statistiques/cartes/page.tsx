import { CartesClient } from "./CartesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cartes — Statistiques nationales — VilleTracker",
};

export default function CartesPage() {
  return <CartesClient />;
}
