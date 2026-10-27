'use client';
// Composants carte isolés de CommuneDetail : `import L from "leaflet"` touche
// `window` au chargement du module, ce qui empêchait tout rendu serveur de la
// page commune. Ils sont désormais chargés via dynamic(ssr:false) depuis
// CommuneDetail, qui peut donc être rendu côté serveur.
import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

// ── Mini-map (vanilla Leaflet, no react-leaflet) ──────────────────────────────

export function CommuneMiniMap({ codeInsee }: { codeInsee: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  const { data: geoData } = useApi(
    () => api.getCommuneGeo(codeInsee),
    [codeInsee]
  );

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      attributionControl: false,
      keyboard: false,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    map.setView([46.5, 2.3], 5);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add GeoJSON when data arrives
  useEffect(() => {
    if (!mapRef.current || !geoData) return;
    const geometry = (geoData as any).geometry;
    if (!geometry) return;
    try {
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
      const feature = { type: "Feature", geometry, properties: {} };
      const layer = L.geoJSON(feature as any, {
        style: {
          fillColor: "#3b82f6",
          fillOpacity: 0.45,
          color: "#60a5fa",
          weight: 2.5,
        },
      });
      layer.addTo(mapRef.current);
      layerRef.current = layer;
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [16, 16] });
      }
    } catch {
      // invalid geo data — map stays at France view
    }
  }, [geoData]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "192px" }}
    />
  );
}

// ── Carte des ventes DVF — points individuels ────────────────────────────────

function pointColor(prix_m2: number | null): { fill: string; border: string } {
  if (!prix_m2)       return { fill: "#94a3b8", border: "#64748b" };
  if (prix_m2 < 1500) return { fill: "#22c55e", border: "#16a34a" };
  if (prix_m2 < 2500) return { fill: "#84cc16", border: "#65a30d" };
  if (prix_m2 < 3500) return { fill: "#eab308", border: "#ca8a04" };
  if (prix_m2 < 5000) return { fill: "#f97316", border: "#ea580c" };
  if (prix_m2 < 7000) return { fill: "#ef4444", border: "#dc2626" };
  return { fill: "#a855f7", border: "#9333ea" };
}

export interface DvfSalesMapHandle {
  isolateId: (id: string, popup: string) => void;
  togglePoints: () => boolean;
}

export const DvfSalesMap = forwardRef<DvfSalesMapHandle, { pointsData: { mode: string; total: number; features: any[] } }>(
  function DvfSalesMap({ pointsData }, ref) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const markersRef      = useRef<Map<string, L.CircleMarker>>(new Map());
  const layerGroupRef   = useRef<L.LayerGroup | null>(null);
  const highlightRef    = useRef<L.CircleMarker | null>(null);
  // useMemo plutôt que useRef : l'argument de useRef est réévalué à chaque
  // rendu (un Intl.NumberFormat jeté à chaque fois), et lire .current pendant
  // le rendu est interdit par react-hooks/refs.
  const fmt = useMemo(() => new Intl.NumberFormat("fr-FR"), []);

  const clearHighlight = () => {
    highlightRef.current?.remove();
    highlightRef.current = null;
  };

  useImperativeHandle(ref, () => ({
    isolateId(id: string, popup: string) {
      const marker = markersRef.current.get(id);
      if (!marker || !mapRef.current) return;
      // Hide all points
      layerGroupRef.current?.remove();
      // Remove previous highlight
      clearHighlight();
      // Add a single bright highlight marker
      const latlng = marker.getLatLng();
      const hl = L.circleMarker(latlng, {
        radius: 9,
        fillColor: "#facc15",
        color: "#fff",
        weight: 2.5,
        fillOpacity: 1,
      }).bindPopup(popup).addTo(mapRef.current);
      hl.openPopup();
      highlightRef.current = hl;
      mapRef.current.flyTo(latlng, 17, { animate: true, duration: 0.6 });
    },
    togglePoints() {
      const map = mapRef.current;
      const lg  = layerGroupRef.current;
      if (!map || !lg) return true;
      clearHighlight();
      if (map.hasLayer(lg)) { lg.remove(); return false; }
      else { lg.addTo(map); return true; }
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs',
      maxZoom: 19,
    }).addTo(map);
    map.setView([46.5, 2.3], 5);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !pointsData?.features?.length) return;
    const map = mapRef.current;
    const lg = L.layerGroup().addTo(map);
    layerGroupRef.current = lg;
    const layers: L.CircleMarker[] = [];
    const bounds: [number, number][] = [];
    const isLight = pointsData.mode === "light";
    markersRef.current.clear();

    for (const feat of pointsData.features) {
      const p = feat.properties;
      const [lon, lat] = feat.geometry.coordinates;
      bounds.push([lat, lon]);

      const { fill, border } = pointColor(p.prix_m2);
      const isMaison = p.type?.toLowerCase().includes("maison");
      const emoji = isMaison ? "🏠" : "🏢";

      let popupHtml: string;
      if (!isLight) {
        const prixStr    = p.prix    ? `${fmt.format(p.prix)} €`        : "–";
        const prixM2Str  = p.prix_m2 ? `${fmt.format(p.prix_m2)} €/m²` : "–";
        const surfaceStr = p.surface ? `${fmt.format(p.surface)} m²`    : "–";
        const dateStr    = p.date ?? p.annee ?? "–";
        popupHtml = `
          <div style="font-size:12px;line-height:1.8;min-width:160px">
            <strong style="font-size:13px">${emoji} ${p.type || "Vente"}</strong><br/>
            <span style="color:#888">${dateStr}</span><br/>
            <strong>${prixM2Str}</strong><br/>
            <span style="color:#555">${prixStr}</span> · <span style="color:#555">${surfaceStr}</span>
          </div>`;
      } else {
        const prixM2Str = p.prix_m2 ? `${fmt.format(p.prix_m2)} €/m²` : "–";
        popupHtml = `
          <div style="font-size:12px;line-height:1.8;min-width:160px">
            <strong style="font-size:13px">${emoji} ${p.type || "Vente"}</strong><br/>
            <span style="color:#888">${p.annee ?? "–"}</span><br/>
            <strong>${prixM2Str}</strong><br/>
            <span style="color:#888;font-style:italic">Cliquez pour voir les détails…</span>
          </div>`;
      }

      const layer = L.circleMarker([lat, lon], {
        radius: 5,
        fillColor: fill,
        color: border,
        weight: 1,
        fillOpacity: 0.75,
      }).bindPopup(popupHtml);

      if (isLight) {
        layer.on("popupopen", async (e: any) => {
          if (!p.id) return;
          try {
            const detail = await api.getDvfTransactionDetail(p.id);
            const prixStr    = detail.prix    ? `${fmt.format(detail.prix)} €`        : "–";
            const prixM2Str  = detail.prix_m2 ? `${fmt.format(detail.prix_m2)} €/m²` : "–";
            const surfaceStr = detail.surface ? `${fmt.format(detail.surface)} m²`    : "–";
            const dateStr    = detail.date ?? detail.annee ?? "–";
            const vefaStr    = detail.vefa ? " · VEFA" : "";
            e.popup.setContent(`
              <div style="font-size:12px;line-height:1.8;min-width:160px">
                <strong style="font-size:13px">${emoji} ${detail.type || "Vente"}${vefaStr}</strong><br/>
                <span style="color:#888">${dateStr}</span><br/>
                <strong>${prixM2Str}</strong><br/>
                <span style="color:#555">${prixStr}</span> · <span style="color:#555">${surfaceStr}</span>
              </div>`);
          } catch { /* keep current content */ }
        });
      }

      layer.addTo(lg);
      layers.push(layer);
      if (p.id) markersRef.current.set(p.id, layer);
    }

    if (bounds.length) {
      try { map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24], maxZoom: 17 }); } catch { /* noop */ }
    }
    // capturé maintenant : markersRef.current peut pointer ailleurs au moment
    // où le nettoyage s'exécute (react-hooks/exhaustive-deps).
    const markers = markersRef.current;
    return () => { lg.remove(); layerGroupRef.current = null; markers.clear(); };
  // fmt est stable (useRef) — pas besoin dans les deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsData]);

  const legendItems = [
    { label: "< 1 500 €/m²", color: "#22c55e" },
    { label: "1 500–2 500",  color: "#84cc16" },
    { label: "2 500–3 500",  color: "#eab308" },
    { label: "3 500–5 000",  color: "#f97316" },
    { label: "5 000–7 000",  color: "#ef4444" },
    { label: "> 7 000 €/m²", color: "#a855f7" },
  ];

  return (
    <div className="relative">
      <div ref={containerRef} style={{ width: "100%", height: "400px", borderRadius: "0.75rem", overflow: "hidden" }} />
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow text-[10px] space-y-0.5 z-[1000]">
        <p className="font-semibold text-slate-700 mb-1">Prix (€/m²)</p>
        {legendItems.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-slate-600">{label}</span>
          </div>
        ))}
        {pointsData.mode === "light" && (
          <p className="text-slate-400 mt-1 italic">Cliquer pour les détails</p>
        )}
      </div>
      {pointsData.total > 0 && (
        <p className="text-[10px] text-slate-500 mt-1 text-right">
          {fmt.format(pointsData.total)} ventes géolocalisées
        </p>
      )}
    </div>
  );
});
