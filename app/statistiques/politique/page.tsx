import { serverApi } from "@/src/api/server";
import { PolitiqueClient } from "./PolitiqueClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique — Statistiques nationales — VilleTracker",
};

export default async function PolitiquePage() {
  const [resume, statsFamille, evolution, fun, records, elus] = await Promise.allSettled([
    serverApi.getNationalPolitiqueResume(),
    serverApi.getNationalPolitiqueStatsFamille(),
    serverApi.getNationalPolitiqueEvolution(),
    serverApi.getNationalPolitiqueFun(),
    serverApi.getNationalPolitiqueRecords(),
    serverApi.getNationalPolitiqueElus(),
  ]);

  return (
    <PolitiqueClient
      resume={resume.status === "fulfilled" ? resume.value : null}
      statsFamille={statsFamille.status === "fulfilled" ? statsFamille.value : null}
      evolution={evolution.status === "fulfilled" ? evolution.value : null}
      fun={fun.status === "fulfilled" ? fun.value : null}
      records={records.status === "fulfilled" ? records.value : null}
      elus={elus.status === "fulfilled" ? elus.value : null}
    />
  );
}
