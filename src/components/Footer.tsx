'use client';

interface FooterProps { dark?: boolean; }

export function Footer({ dark = false }: FooterProps) {
  const wrap  = dark
    ? "shrink-0 border-t border-slate-800 bg-slate-900/60 text-xs text-slate-500"
    : "shrink-0 z-[1001] border-t border-slate-200 bg-white text-xs text-slate-500";
  const badge = dark
    ? "inline-flex items-center gap-1 bg-amber-900/30 border border-amber-700/50 text-amber-400 rounded px-2 py-0.5 font-medium"
    : "inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 rounded px-2 py-0.5 font-medium";
  const hoverLi = dark ? "hover:text-blue-400" : "hover:text-blue-600";
  const hoverGh = dark ? "hover:text-white"    : "hover:text-slate-800";
  const hoverCf = dark ? "hover:text-amber-400" : "hover:text-amber-600";
  const hoverMl = dark ? "hover:text-slate-300" : "hover:text-slate-700";

  return (
    <footer className={wrap}>
      <div className="max-w-7xl mx-auto px-5 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={badge}>
            <span>⚠</span> Pré-version — des bugs peuvent survenir
          </span>
          {dark && (
            <span className="text-slate-600">
              Sources : OFGL · DGFiP · Agence ORE · Ecolab · geo.api.gouv.fr · data.gouv.fr · Licence Etalab 2.0
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span>© 2026 Noé FRAISSE</span>

          <a
            href="https://www.linkedin.com/in/noe-fraisse/"
            target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-1 transition-colors ${hoverLi}`}
            title="LinkedIn"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            <span>LinkedIn</span>
          </a>

          <a
            href="https://github.com/Noe-FR/villetracker"
            target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-1 transition-colors ${hoverGh}`}
            title="GitHub"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
            <span>GitHub</span>
          </a>

          <a
            href="/support"
            className={`flex items-center gap-1 transition-colors ${hoverCf}`}
            title="Soutenir le projet"
          >
            <span>☕</span>
            <span>Soutenir</span>
          </a>

          <a href="/mentions-legales" className={`transition-colors ${hoverMl}`}>
            Mentions légales
          </a>
        </div>
      </div>
    </footer>
  );
}
