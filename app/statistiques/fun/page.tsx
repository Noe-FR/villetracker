import { serverApi } from "@/src/api/server";
import { FunClient } from "./FunClient";
import type { Metadata } from "next";

// Rendu à la requête, pas au build : pendant `docker build` l'hôte `api`
// ne résout pas (le build ne tourne pas sur le réseau compose), donc toute
// donnée récupérée ici serait vide et figée dans l'image. Le coût est faible,
// l'API met déjà ces réponses en cache côté serveur.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anecdotes — Statistiques nationales",
};

export default async function FunPage() {
  let data: any = null;
  try {
    data = await serverApi.getNationalFun();
  } catch {}

  return <FunClient data={data} />;
}
