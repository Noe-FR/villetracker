'use client';
import dynamic from "next/dynamic";

const CommuneDetailClient = dynamic(
  () => import("@/src/views/CommuneDetail").then((m) => m.CommuneDetailClient),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-500 text-sm">Chargement…</div>
      </div>
    ),
  }
);

export function CommunePageClient({ codeInsee }: { codeInsee: string }) {
  return <CommuneDetailClient codeInsee={codeInsee} />;
}
