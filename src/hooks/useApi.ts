import { useState, useEffect } from "react";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Module-level in-memory cache — survives tab switches, cleared on page reload
const _cache = new Map<string, unknown>();

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  cacheKey?: string,
  // Donnée fournie par le serveur pour le premier rendu. Permet au HTML servi
  // de contenir le contenu réel plutôt qu'un squelette, et évite un aller-retour
  // réseau au montage.
  initialData?: T
): State<T> {
  // Amorce le cache module avec la donnée serveur : sans ça, un changement
  // d'onglet puis un retour relancerait un appel pour une donnée déjà connue.
  if (cacheKey && initialData !== undefined && !_cache.has(cacheKey)) {
    _cache.set(cacheKey, initialData);
  }

  const [state, setState] = useState<State<T>>(() => {
    const cached = cacheKey ? (_cache.get(cacheKey) as T | undefined) : undefined;
    const seed = cached ?? initialData;
    return { data: seed ?? null, loading: seed === undefined, error: null };
  });

  useEffect(() => {
    if (deps.some((d) => d === null || d === undefined)) {
      // Remise à zéro quand une dépendance est nulle : un rendu supplémentaire assumé.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ data: null, loading: false, error: null });
      return;
    }

    // Cache hit — serve immediately, skip network request
    if (cacheKey && _cache.has(cacheKey)) {
      setState({ data: _cache.get(cacheKey) as T, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetcher()
      .then((data) => {
        if (cancelled) return;
        if (data != null) {
          if (cacheKey) _cache.set(cacheKey, data);
          setState({ data, loading: false, error: null });
        } else if (cacheKey && _cache.has(cacheKey)) {
          // Fetcher returned null (off-tab guard) but we have cached data — keep it
          setState({ data: _cache.get(cacheKey) as T, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled && err.name !== "AbortError") {
          setState({ data: null, loading: false, error: err.message });
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
