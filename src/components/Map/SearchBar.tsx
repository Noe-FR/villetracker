'use client';
import { useState, useRef, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { api, type SearchResult } from "../../api/client";
import { formatNumber } from "../../utils/format";

interface Props {
  onSelect: (code: string, nom: string) => void;
}

export function SearchBar({ onSelect }: Props) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = (q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchCommunes(q, 8);
        setResults(data.results);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
  };

  const isNumeric = (s: string) => /^\d+$/.test(s.trim());

  return (
    <div ref={containerRef} className="relative w-72">
      <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 gap-2 shadow-sm">
        {loading
          ? <Loader2 size={15} className="text-slate-400 shrink-0 animate-spin" />
          : <Search  size={15} className="text-slate-400 shrink-0" />
        }
        <input
          type="text"
          placeholder="Nom, code INSEE ou code postal…"
          className="bg-transparent text-slate-800 text-sm py-2.5 outline-none flex-1 placeholder-slate-400"
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
          {results.map((r) => {
            const matchedCp = isNumeric(query) && r.codes_postaux?.find(cp => cp.startsWith(query));
            return (
              <button
                key={r.code_insee}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left group"
                onClick={() => {
                  onSelect(r.code_insee, r.nom);
                  setQuery(r.nom);
                  setOpen(false);
                }}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-slate-800 font-medium">{r.nom}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.departement_nom && (
                      <span className="text-xs text-slate-500">
                        {r.departement_nom}{r.departement_code ? ` (${r.departement_code})` : ""}
                      </span>
                    )}
                    {matchedCp && (
                      <span className="text-xs text-blue-500 font-mono">{matchedCp}</span>
                    )}
                    {isNumeric(query) && query.length === 5 && r.code_insee === query && (
                      <span className="text-xs text-emerald-600 font-mono">INSEE {r.code_insee}</span>
                    )}
                  </div>
                </div>
                {r.population && (
                  <span className="text-xs text-slate-400 shrink-0 ml-2">
                    {formatNumber(r.population)} hab.
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
