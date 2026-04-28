import { serverApi } from "@/src/api/server";
import { CommunePageClient } from "./CommunePageClient";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

// Arrondissements → commune mère
const PARENT: Record<string, string> = {
  ...Object.fromEntries(Array.from({length: 20}, (_, i) => [`751${String(i+1).padStart(2,"0")}`, "75056"])),
  ...Object.fromEntries(Array.from({length: 9},  (_, i) => [`6938${i+1}`, "69123"])),
  ...Object.fromEntries(Array.from({length: 16}, (_, i) => [`132${String(i+1).padStart(2,"0")}`, "13055"])),
};

interface Props {
  params: Promise<{ codeInsee: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codeInsee } = await params;
  const resolved = PARENT[codeInsee] ?? codeInsee;
  try {
    const info = await serverApi.getCommuneInfo(resolved);
    return { title: `${info.nom} — VilleTracker` };
  } catch {
    return { title: "Commune — VilleTracker" };
  }
}

export default async function Page({ params }: Props) {
  const { codeInsee } = await params;
  const parent = PARENT[codeInsee];
  if (parent) redirect(`/commune/${parent}`);
  return <CommunePageClient codeInsee={codeInsee} />;
}
