'use client';
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Maximize2 } from "lucide-react";
import L from "leaflet";
import { FranceMap, communeStyle } from "../components/Map/FranceMap";
import { CommunePanel } from "../components/Panel/CommunePanel";
import { SearchBar } from "../components/Map/SearchBar";
import { Footer } from "../components/Footer";
import { api } from "../api/client";
import type { CommuneMapInfo } from "../components/Map/FranceMap";

const _geoCache    = new Map<string, GeoJSON.FeatureCollection>();
const _geoInflight = new Map<string, Promise<GeoJSON.FeatureCollection>>();

function fetchDeptGeo(code: string): Promise<GeoJSON.FeatureCollection> {
  if (_geoCache.has(code)) return Promise.resolve(_geoCache.get(code)!);
  if (_geoInflight.has(code)) return _geoInflight.get(code)!;
  const p = api.getCommunesByDept(code).then((data) => {
    _geoCache.set(code, data);
    _geoInflight.delete(code);
    return data;
  });
  _geoInflight.set(code, p);
  return p;
}

interface DomTomDef {
  id: string;
  codes: string[];
  nom: string;
  center: [number, number];
  zoom: number;
  hasData: boolean; // communes with geometry in DB
}

const INSETS: DomTomDef[] = [
  // DROM — communes en base
  { id: "2AB", codes: ["2A","2B"], nom: "Corse",                 center: [42.05,   9.10],  zoom: 8,  hasData: true  },
  { id: "971", codes: ["971"],     nom: "Guadeloupe",             center: [16.25, -61.56],  zoom: 9,  hasData: true  },
  { id: "972", codes: ["972"],     nom: "Martinique",             center: [14.66, -61.00],  zoom: 10, hasData: true  },
  { id: "973", codes: ["973"],     nom: "Guyane",                 center: [ 4.00, -53.00],  zoom: 6,  hasData: true  },
  { id: "974", codes: ["974"],     nom: "La Réunion",             center: [-21.10,  55.50], zoom: 9,  hasData: true  },
  { id: "976", codes: ["976"],     nom: "Mayotte",                center: [-12.80,  45.10], zoom: 11, hasData: true  },
  // COM — communes importées depuis geo.api.gouv.fr
  { id: "975", codes: ["975"],     nom: "St-Pierre-et-Miquelon", center: [46.80, -56.30],  zoom: 10, hasData: true  },
  { id: "977", codes: ["977"],     nom: "Saint-Barthélemy",      center: [17.90, -62.83],  zoom: 13, hasData: true  },
  { id: "978", codes: ["978"],     nom: "Saint-Martin",          center: [18.07, -63.05],  zoom: 12, hasData: true  },
  { id: "986", codes: ["986"],     nom: "Wallis et Futuna",      center: [-13.30,-176.20], zoom: 10, hasData: true  },
  { id: "987", codes: ["987"],     nom: "Polynésie française",   center: [-17.68,-149.41], zoom: 9,  hasData: true  },
  { id: "988", codes: ["988"],     nom: "Nouvelle-Calédonie",    center: [-21.30, 165.60], zoom: 7,  hasData: true  },
];

export function HomeClient() {
  const [selectedInfo, setSelectedInfo] = useState<CommuneMapInfo | null>(null);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  const selectedCode = selectedInfo?.code ?? null;
  const expandedDef  = INSETS.find((d) => d.id === expandedId) ?? null;

  const handleSelect = (info: CommuneMapInfo) => setSelectedInfo(info);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-[1001] flex items-center justify-between px-5 py-1.5 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden shrink-0">
            <img src="/square_blue.png" alt="" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-slate-900 font-bold text-base leading-tight">VilleTracker</h1>
            <p className="text-slate-500 text-xs">France métropolitaine & DOM-TOM</p>
          </div>
        </div>
        <SearchBar onSelect={(code, nom) => setSelectedInfo({ code, nom })} />
      </header>

      {/* Main — flex-1 so footer stays at bottom */}
      <div className="flex-1 relative min-h-0">
        {expandedDef ? (
          <DomTomExpanded
            def={expandedDef}
            selectedCode={selectedCode}
            onSelect={handleSelect}
          />
        ) : (
          <FranceMap selectedCode={selectedCode} onSelectCommune={handleSelect} />
        )}

        {/* DOM-TOM insets */}
        <div className="absolute bottom-10 left-3 z-[1000]">
          <div className="grid grid-cols-3 gap-1.5">
            {expandedId && <FranceMiniInset onClick={() => setExpandedId(null)} />}
            {INSETS.filter((d) => d.id !== expandedId).map((d) => (
              <DomTomInset
                key={d.id}
                def={d}
                selectedCode={selectedCode}
                onSelect={handleSelect}
                onExpand={() => setExpandedId(d.id)}
              />
            ))}
          </div>
        </div>

        {!selectedCode && !expandedId && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 rounded-xl px-4 py-2 shadow text-sm text-slate-600">
              <MapPin size={13} className="text-blue-500 shrink-0" />
              Zoomez ou cliquez sur un <strong className="mx-0.5">département</strong> pour afficher ses communes
            </div>
          </div>
        )}

        {selectedInfo && (
          <CommunePanel
            codeInsee={selectedInfo.code}
            initialInfo={selectedInfo}
            onClose={() => setSelectedInfo(null)}
          />
        )}
      </div>

      <Footer />
    </div>
  );
}

// ── DOM-TOM inset (mini map) ───────────────────────────────────────────────────

function DomTomInset({
  def,
  onExpand,
}: {
  def: DomTomDef;
  selectedCode: string | null;
  onSelect: (info: CommuneMapInfo) => void;
  onExpand: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false, attributionControl: false,
      dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      touchZoom: false, boxZoom: false, keyboard: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    map.setView(def.center, def.zoom);
    return () => { map.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow overflow-hidden">
      <button
        onClick={onExpand}
        className="w-full flex items-center justify-between px-2 py-0.5 bg-slate-50 border-b border-slate-100 hover:bg-blue-50 transition-colors group"
        title={`Agrandir ${def.nom}`}
      >
        <span className="text-[10px] font-semibold text-slate-500 group-hover:text-blue-700 truncate mr-1">{def.nom}</span>
        <Maximize2 size={9} className="text-slate-300 group-hover:text-blue-500 shrink-0" />
      </button>
      <div className="relative">
        <div ref={containerRef} style={{ width: 130, height: 95 }} />
        {!def.hasData && (
          <div className="absolute inset-0 flex items-end justify-center pb-1 pointer-events-none">
            <span className="text-[9px] text-slate-400 bg-white/80 px-1 rounded">Pas de données communes</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Expanded territory map ─────────────────────────────────────────────────────

function DomTomExpanded({
  def,
  selectedCode,
  onSelect,
}: {
  def: DomTomDef;
  selectedCode: string | null;
  onSelect: (info: CommuneMapInfo) => void;
}) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const layersRef     = useRef<L.GeoJSON[]>([]);
  const selectedRef   = useRef(selectedCode);
  const onSelectRef   = useRef(onSelect);
  const [communesLoaded, setCommunesLoaded] = useState(false);
  const [loading, setLoading]               = useState(false);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    selectedRef.current = selectedCode;
    layersRef.current.forEach((l) =>
      l.setStyle((f) => communeStyle(f?.properties?.code_insee ?? "", selectedCode))
    );
  }, [selectedCode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true, attributionControl: true,
      dragging: true, scrollWheelZoom: true, doubleClickZoom: true, touchZoom: true,
    });
    map.zoomControl.setPosition("bottomright");
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    map.setView(def.center, def.zoom);
    mapRef.current = map;
    setCommunesLoaded(false);
    layersRef.current = [];
    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id]);

  const loadCommunes = useCallback(() => {
    const map = mapRef.current;
    if (!map || loading || communesLoaded) return;
    setLoading(true);

    const renderer = L.canvas({ padding: 0.5, tolerance: 3 });
    const bounds   = L.latLngBounds([]);

    Promise.all(def.codes.map((code) =>
      fetchDeptGeo(code).then((data) => {
        const layer = L.geoJSON(data as GeoJSON.GeoJsonObject, {
          // @ts-ignore
          renderer,
          style: (f) => communeStyle(f?.properties?.code_insee ?? "", selectedRef.current),
          onEachFeature(feature, fl) {
            const fp = feature.properties ?? {};
            const commune: string = fp.code_insee ?? "";
            const nom: string     = fp.nom ?? "";
            const pop: number | undefined = fp.population;
            (fl as L.Path).on({
              mouseover(e) {
                if (commune !== selectedRef.current)
                  (e.target as L.Path).setStyle({ fillOpacity: 0.55, fillColor: "#2563eb", weight: 1.5 });
              },
              mouseout(e) {
                (e.target as L.Path).setStyle(communeStyle(commune, selectedRef.current));
              },
              click() {
                onSelectRef.current({
                  code: commune, nom, population: pop,
                  departement_code: fp.departement_code,
                  departement_nom:  fp.departement_nom,
                  region_nom:       fp.region_nom,
                  rural:            fp.rural,
                  montagne:         fp.montagne,
                  touristique:      fp.touristique,
                });
              },
            });
            fl.bindTooltip(
              pop
                ? `<b>${nom}</b><br/><span style="color:#64748b;font-size:11px">${new Intl.NumberFormat("fr-FR").format(pop)} hab.</span>`
                : nom,
              { sticky: true, className: "map-tooltip", direction: "auto" }
            );
          },
        }).addTo(map);
        layersRef.current.push(layer);
        const b = layer.getBounds();
        if (b.isValid()) bounds.extend(b);
      })
    )).then(() => {
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
      setCommunesLoaded(true);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [def, loading, communesLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {!communesLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
          {def.hasData ? (
            <button
              onClick={loadCommunes}
              disabled={loading}
              className="pointer-events-auto flex items-center gap-2 bg-white border border-slate-200 shadow-md rounded-xl px-5 py-2.5 text-sm text-blue-600 font-medium hover:bg-blue-50 disabled:opacity-60 transition-colors"
            >
              {loading ? "Chargement…" : `Afficher les communes — ${def.nom}`}
            </button>
          ) : (
            <div className="bg-white/90 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-500 shadow">
              Limites communales non disponibles
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── France mini-inset (back button) ───────────────────────────────────────────

function FranceMiniInset({ onClick }: { onClick: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false, attributionControl: false,
      dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      touchZoom: false, boxZoom: false, keyboard: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
    }).addTo(map);
    map.setView([46.5, 2.3], 4);
    return () => { map.remove(); };
  }, []);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border-2 border-blue-400 shadow cursor-pointer hover:border-blue-600 overflow-hidden transition-colors"
      title="Retour à la France métropolitaine"
    >
      <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border-b border-blue-200">
        <span className="text-[10px] text-blue-600 font-semibold">← France Métropolitaine</span>
      </div>
      <div ref={containerRef} style={{ width: 130, height: 95 }} />
    </div>
  );
}
