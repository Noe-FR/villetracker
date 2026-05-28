import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatsNav } from "@/src/components/stats/StatsNav";
import { Footer } from "@/src/components/Footer";

export const metadata: Metadata = {
  title: "Statistiques nationales — VilleTracker",
};

export default function StatistiquesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-sm"
          >
            <ArrowLeft size={14} />
            Carte
          </Link>
          <div className="w-px h-4 bg-slate-700" />
          <span className="text-sm font-semibold text-slate-200">Statistiques nationales</span>
          <div className="w-px h-4 bg-slate-700 hidden sm:block" />
          <StatsNav />
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      <Footer dark />
    </div>
  );
}
