import { Github, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="shrink-0 z-[1001] flex items-center justify-between px-5 py-1.5 bg-white border-t border-slate-200 text-xs text-slate-500">
      <div className="flex items-center gap-1">
        <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 rounded px-2 py-0.5 font-medium">
          <span>⚠</span> Pré-version — des bugs peuvent survenir
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span>© 2025 Noé FRAISSE</span>

        <a
          href="https://www.linkedin.com/in/noe-fraisse/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          title="LinkedIn"
        >
          <Linkedin size={13} />
          <span>LinkedIn</span>
        </a>

        <a
          href="https://github.com/noe-fraisse"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-slate-800 transition-colors"
          title="GitHub (bientôt disponible)"
        >
          <Github size={13} />
          <span>GitHub</span>
        </a>

        <a
          href="/support"
          className="flex items-center gap-1 hover:text-amber-600 transition-colors"
          title="Soutenir le projet"
        >
          <span>☕</span>
          <span>Soutenir</span>
        </a>

        <a href="/mentions-legales" className="hover:text-slate-700 transition-colors">
          Mentions légales
        </a>
      </div>
    </footer>
  );
}
