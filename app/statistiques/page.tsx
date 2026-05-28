import { notFound } from "next/navigation";
import { serverApi } from "@/src/api/server";
import { HubClient } from "./HubClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vue d'ensemble — Statistiques nationales — VilleTracker",
};

export default async function StatistiquesPage() {
  notFound(); // TODO: retirer quand la feature est prête
  const [hub, evolutionFinances, notesDistribution] = await Promise.allSettled([
    serverApi.getNationalHub(),
    serverApi.getNationalHubEvolutionFinances(),
    serverApi.getNationalHubNotesDistribution(),
  ]);

  return (
    <HubClient
      hub={hub.status === "fulfilled" ? hub.value : null}
      evolutionFinances={evolutionFinances.status === "fulfilled" ? evolutionFinances.value : null}
      notesDistribution={notesDistribution.status === "fulfilled" ? notesDistribution.value : null}
    />
  );
}
