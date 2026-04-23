import { useState, useRef, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { api, type SearchResult } from "../../api/client";
import { formatNumber } from "../../utils/format";

interface Props {
  onSelect: (code: string, nom: string) => void;
}

export function SearchBar({ onSelect }: Props) {
  const [query, setQuery]   = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
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
    }, 300);
  };

  return (
    <div ref={containerRef} className="relative w-72">
      <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 gap-2 shadow-sm">
        {loading
          ? <Loader2 size={15} className="text-slate-400 shrink-0 animate-spin" />
          : <Search  size={15} className="text-slate-400 shrink-0" />
        }
        <input
          type="text"
          placeholder="Rechercher une commune..."
          className="bg-transparent text-slate-800 text-sm py-2.5 outline-none flex-1 placeholder-slate-400"
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
          {results.map((r) => (
            <button
              key={r.code_insee}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left group"
              onClick={() => {
                onSelect(r.code_insee, r.nom);
                setQuery(r.nom);
                setOpen(false);
              }}
            >
              <div>
                <span className="text-sm text-slate-800 font-medium">{r.nom}</span>
                {r.departement_nom && (
                  <span className="text-xs text-slate-500 ml-2">
                    {r.departement_nom} ({r.departement_code})
                  </span>
                )}
              </div>
              {r.population && (
                <span className="text-xs text-slate-500 group-hover:text-slate-400">
                  {formatNumber(r.population)} hab.
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
