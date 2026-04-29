'use client';
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  MapPin,
  TreePine,
  Mountain,
  Waves,
  BarChart2,
  GitCompare,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  Leaf,
  ShoppingCart,
  BookOpen,
  Users2,
  Building2,
  ShieldCheck,
  Info,
  X as XIcon,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  CompteClasse,
  EnergieData,
  TerritoireData,
  FiscaliteProData,
  ElusData,
  HistoriqueElections,
  ImmobilierData,
  EauData, EauMensuelData,
  EconomieData,
} from "../types";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";
import { StatCard } from "../components/Panel/StatCard";
import { higherIsBetter as hib } from "../utils/indicators";
import { EvolutionChart } from "../components/Charts/EvolutionChart";
import { AreaChart, Area, LineChart, Line, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { ComparisonChart } from "../components/Charts/ComparisonChart";
import { Footer } from "../components/Footer";
import { AgregatsChart } from "../components/Charts/AgregatsChart";
import { formatEuro, formatNumber, trancheLabel } from "../utils/format";
import {
  type FinancialNote,
  type FinancialScore,
  type ScoreApiResponse,
  scoreFromApi,
  NOTE_META,
  DIM_ACCENT,
} from "../utils/financialScore";

type Tab = "finances" | "comparaison" | "energie" | "economie" | "comptable" | "conseil" | "immobilier";

// ── YoY helpers ───────────────────────────────────────────────────────────────

function YoYBadge({
  pct,
  higherIsBetter: higher = false,
}: {
  pct: number | null | undefined;
  higherIsBetter?: boolean;
}) {
  if (pct === null || pct === undefined) return null;
  const abs = Math.abs(pct);
  const good = higher ? pct > 0 : pct < 0;
  let color = "text-slate-400";
  if (abs >= 7) color = good ? "text-green-400" : "text-red-400";
  else if (abs >= 3) color = good ? "text-emerald-400" : "text-orange-400";
  else if (abs >= 1) color = good ? "text-teal-400" : "text-yellow-400";
  const sign = pct > 0 ? "+" : "";
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {sign}{pct.toFixed(1)}% N-1
    </span>
  );
}

// ── Mini-map (vanilla Leaflet, no react-leaflet) ──────────────────────────────

function CommuneMiniMap({ codeInsee }: { codeInsee: string }) {
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
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
    ).addTo(map);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geometry = (geoData as any).geometry;
    if (!geometry) return;
    try {
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
      const feature = { type: "Feature", geometry, properties: {} };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

const DvfSalesMap = forwardRef<DvfSalesMapHandle, { pointsData: { mode: string; total: number; features: any[] } }>(
  function DvfSalesMap({ pointsData }, ref) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const markersRef      = useRef<Map<string, L.CircleMarker>>(new Map());
  const layerGroupRef   = useRef<L.LayerGroup | null>(null);
  const highlightRef    = useRef<L.CircleMarker | null>(null);
  const fmtRef = useRef(new Intl.NumberFormat("fr-FR"));
  const fmt = fmtRef.current;

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
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/">OSM</a> © <a href="https://carto.com/">CARTO</a>',
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
    return () => { lg.remove(); layerGroupRef.current = null; markersRef.current.clear(); };
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

// ── Grand livre accordéon ─────────────────────────────────────────────────────

function ClasseAccordion({ classe }: { classe: CompteClasse }) {
  const [open, setOpen] = useState(
    classe.classe === "6" || classe.classe === "7"
  );
  const isCharges = classe.classe === "6";
  const isProduits = classe.classe === "7";
  const montantPrincipal = isCharges
    ? classe.total_debit
    : isProduits
    ? classe.total_credit
    : Math.max(classe.total_debit, classe.total_credit);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown size={16} className="text-slate-400" />
          ) : (
            <ChevronRight size={16} className="text-slate-400" />
          )}
          <span className="font-bold text-white">
            Classe {classe.classe} — {classe.libelle}
          </span>
          <span className="text-xs text-slate-500">
            ({classe.lignes.length} comptes)
          </span>
        </div>
        <div className="text-right">
          <span
            className={`font-bold text-base ${
              isCharges
                ? "text-red-400"
                : isProduits
                ? "text-emerald-400"
                : "text-blue-400"
            }`}
          >
            {formatEuro(montantPrincipal, true)}
          </span>
          <span className="text-xs text-slate-500 ml-1">
            {isCharges ? "dépenses" : isProduits ? "recettes" : "solde"}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-6 py-2 text-left">Compte</th>
                <th className="px-4 py-2 text-left">Libellé</th>
                <th className="px-4 py-2 text-right">Débit (opér.)</th>
                <th className="px-4 py-2 text-right">Crédit (opér.)</th>
                <th className="px-4 py-2 text-right">Solde débiteur</th>
                <th className="px-4 py-2 text-right">Solde créditeur</th>
              </tr>
            </thead>
            <tbody>
              {classe.lignes.map((ligne, idx) => {
                const principal = isCharges
                  ? ligne.debit
                  : isProduits
                  ? ligne.credit
                  : Math.max(ligne.solde_debiteur, ligne.solde_crediteur);
                if (
                  principal === 0 &&
                  ligne.solde_debiteur === 0 &&
                  ligne.solde_crediteur === 0
                )
                  return null;
                return (
                  <tr
                    key={ligne.compte}
                    className={`border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors ${
                      idx % 2 === 0 ? "" : "bg-slate-800/10"
                    }`}
                  >
                    <td className="px-6 py-2 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {ligne.compte}
                    </td>
                    <td className="px-4 py-2 text-slate-200 text-xs">
                      {ligne.libelle}
                    </td>
                    <td className="px-4 py-2 text-right text-xs font-medium text-slate-300 whitespace-nowrap">
                      {ligne.debit > 0 ? formatEuro(ligne.debit, true) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-xs font-medium text-slate-300 whitespace-nowrap">
                      {ligne.credit > 0 ? formatEuro(ligne.credit, true) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-slate-400 whitespace-nowrap">
                      {ligne.solde_debiteur > 0
                        ? formatEuro(ligne.solde_debiteur, true)
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-slate-400 whitespace-nowrap">
                      {ligne.solde_crediteur > 0
                        ? formatEuro(ligne.solde_crediteur, true)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-700">
              <tr className="text-xs font-bold text-white">
                <td className="px-6 py-2" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-2 text-right">
                  {formatEuro(classe.total_debit, true)}
                </td>
                <td className="px-4 py-2 text-right">
                  {formatEuro(classe.total_credit, true)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tableau marchés ───────────────────────────────────────────────────────────

function MarchesTable({
  marches,
  showAcheteur,
}: {
  marches: import("../types").Marche[];
  showAcheteur: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (id: string) => setExpanded((e) => (e === id ? null : id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
            <th className="px-4 py-3 w-6" />
            <th className="px-4 py-3 text-left">Objet</th>
            {showAcheteur && (
              <th className="px-4 py-3 text-left whitespace-nowrap">
                Acheteur
              </th>
            )}
            <th className="px-4 py-3 text-right whitespace-nowrap">
              Montant HT
            </th>
            <th className="px-4 py-3 text-left whitespace-nowrap">Date</th>
            <th className="px-4 py-3 text-left">Titulaire(s)</th>
            <th className="px-4 py-3 text-left">Procédure</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">Durée</th>
          </tr>
        </thead>
        <tbody>
          {marches.map((m, idx) => {
            const rowId = m.id ?? String(idx);
            const isOpen = expanded === rowId;
            return (
              <React.Fragment key={rowId}>
                <tr
                  onClick={() => toggle(rowId)}
                  className={`border-b border-slate-800/40 cursor-pointer transition-colors ${
                    isOpen
                      ? "bg-slate-800/40"
                      : idx % 2 === 0
                      ? "hover:bg-slate-800/30"
                      : "bg-slate-800/10 hover:bg-slate-800/30"
                  }`}
                >
                  <td className="px-4 py-3 text-slate-500">
                    {isOpen ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-200 text-xs max-w-xs">
                    <span className="line-clamp-2">{m.objet ?? "—"}</span>
                    {m.nature && m.nature !== "Marché" && (
                      <span className="text-blue-400 text-[10px] mt-0.5 block">
                        {m.nature}
                      </span>
                    )}
                    {m.cpv && (
                      <span className="text-slate-600 font-mono text-[10px] block">
                        CPV {m.cpv}
                      </span>
                    )}
                  </td>
                  {showAcheteur && (
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap max-w-[140px]">
                      <span className="block truncate">
                        {m.acheteur_nom ?? m.acheteur_id ?? "—"}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right font-semibold text-white whitespace-nowrap">
                    {m.montant != null ? formatEuro(m.montant, true) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {m.date_notification
                      ? new Date(m.date_notification).toLocaleDateString(
                          "fr-FR"
                        )
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {m.titulaires.length > 0 ? (
                      <div className="space-y-0.5">
                        {m.titulaires.map((t) => (
                          <div
                            key={t.siret}
                            className="text-slate-300 truncate max-w-[160px]"
                          >
                            {t.nom !== t.siret ? (
                              t.nom
                            ) : (
                              <span className="font-mono text-slate-500">
                                {t.siret}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {m.procedure ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 text-xs whitespace-nowrap">
                    {m.duree_mois != null ? `${m.duree_mois} mois` : "—"}
                  </td>
                </tr>

                {isOpen && (
                  <tr
                    key={rowId + "_detail"}
                    className="border-b border-slate-700 bg-slate-800/20"
                  >
                    <td
                      colSpan={showAcheteur ? 8 : 7}
                      className="px-6 py-4"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-2 text-xs">
                        {(
                          [
                            ["Identifiant", m.id],
                            ["Nature", m.nature],
                            ["Forme du prix", m.forme_prix],
                            ["Types de prix", m.types_prix],
                            ["CCAG", m.ccag],
                            ["Modalités d'exécution", m.modalites_execution],
                            ["Techniques d'achat", m.techniques],
                            ["Offres reçues", m.offres_recues],
                            ["Sous-traitance", m.sous_traitance],
                            ["Groupement opérateurs", m.groupement],
                            ["Marché innovant", m.marche_innovant],
                            [
                              "Avance",
                              m.avance === "oui"
                                ? `Oui (${m.taux_avance ?? "?"}%)`
                                : m.avance,
                            ],
                            [
                              "Considérations sociales",
                              m.considerations_sociales &&
                              m.considerations_sociales !==
                                "Pas de considération sociale"
                                ? m.considerations_sociales
                                : null,
                            ],
                            [
                              "Considérations environnementales",
                              m.considerations_env &&
                              m.considerations_env !==
                                "Pas de considération environnementale"
                                ? m.considerations_env
                                : null,
                            ],
                            ["Acheteur (SIRET)", m.acheteur_id],
                            [
                              "Publication données",
                              m.date_publication
                                ? new Date(
                                    m.date_publication
                                  ).toLocaleDateString("fr-FR")
                                : null,
                            ],
                            ["Source", m.source],
                          ] as [string, string | null][]
                        )
                          .filter(([, v]) => v != null)
                          .map(([label, value]) => (
                            <div key={label}>
                              <span className="text-slate-500 block">
                                {label}
                              </span>
                              <span className="text-slate-200">{value}</span>
                            </div>
                          ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Énergie ───────────────────────────────────────────────────────────────────

const SECTEUR_LABELS: Record<string, string> = {
  RES: "Résidentiel",
  PRO: "Professionnels",
  ENT: "Entreprises",
  AGR: "Agriculture",
  IND: "Industrie",
  TER: "Tertiaire",
};

function formatMwh(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + " TWh";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + " GWh";
  return v.toFixed(0) + " MWh";
}

function EnergieFiliereCard({
  title,
  icon: Icon,
  accentClass,
  barColor,
  data,
}: {
  title: string;
  icon: React.ElementType;
  accentClass: string;
  barColor: string;
  data: EnergieData["electricite"];
}) {
  const sectors = Object.entries(data.par_secteur).sort(
    ([, a], [, b]) => b.mwh - a.mwh
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className={`flex items-center gap-2 mb-2 ${accentClass}`}>
        <Icon size={15} />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-2xl font-black text-white mb-4">
        {formatMwh(data.total_mwh)}
      </p>
      <div className="space-y-2">
        {sectors.map(([cat, vals]) => {
          const pct =
            data.total_mwh > 0 ? (vals.mwh / data.total_mwh) * 100 : 0;
          return (
            <div key={cat}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">
                  {SECTEUR_LABELS[cat] ?? cat}
                </span>
                <span className="text-slate-300 font-medium">
                  {formatMwh(vals.mwh)}
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── GES ───────────────────────────────────────────────────────────────────────

function GesSection({ ges }: { ges: TerritoireData["ges"] }) {
  if (!ges.disponible) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-emerald-400 mb-2">
          <Leaf size={15} />
          <h3 className="text-sm font-semibold text-white">Émissions GES</h3>
        </div>
        <p className="text-xs text-slate-500">
          {ges.erreur ?? "Données non disponibles"}
        </p>
      </div>
    );
  }
  if (!ges.par_secteur?.length) return null;

  const derniere = ges.derniere_annee;
  const secteurs = ges.par_secteur
    .map((s) => {
      const last =
        s.annees.find((a) => a.annee === derniere) ??
        s.annees[s.annees.length - 1];
      return { secteur: s.secteur, valeur: last?.valeur ?? 0 };
    })
    .sort((a, b) => b.valeur - a.valeur);

  const maxVal = Math.max(...secteurs.map((s) => s.valeur), 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Leaf size={15} />
          <h3 className="text-sm font-semibold text-white">Émissions GES</h3>
        </div>
        <span className="text-xs text-slate-500">Année {derniere}</span>
      </div>
      <div className="space-y-2.5">
        {secteurs.slice(0, 8).map((s) => (
          <div key={s.secteur}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400 truncate max-w-[55%]">
                {s.secteur}
              </span>
              <span className="text-slate-300 font-medium">
                {s.valeur.toFixed(1)} ktCO₂e
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600/70 rounded-full"
                style={{ width: `${(s.valeur / maxVal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mobilité ──────────────────────────────────────────────────────────────────

function MobiliteSection({
  mobilite,
}: {
  mobilite: TerritoireData["mobilite"];
}) {
  if (!mobilite.disponible) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2">
          Mobilité domicile-travail
        </h3>
        <p className="text-xs text-slate-500">
          {mobilite.erreur ?? "Données non disponibles"}
        </p>
      </div>
    );
  }
  if (!mobilite.modes?.length) return null;

  const modeColors: Record<string, string> = {
    Voiture: "#ef4444",
    "Transport en commun": "#3b82f6",
    Vélo: "#10b981",
    "Marche à pied": "#f59e0b",
    "Deux-roues motorisé": "#8b5cf6",
    Autre: "#64748b",
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">
          Mobilité domicile-travail
        </h3>
        <span className="text-xs text-slate-500">
          {formatNumber(mobilite.total ?? 0)} actifs · {mobilite.annee}
        </span>
      </div>
      <div className="space-y-2.5">
        {mobilite.modes.map((m) => {
          const color = modeColors[m.mode] ?? "#64748b";
          return (
            <div key={m.mode}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{m.mode}</span>
                <span className="font-semibold" style={{ color }}>
                  {m.pct}%
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${m.pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Fiscalité pro ─────────────────────────────────────────────────────────────

function FiscaliteProSection({ data }: { data: FiscaliteProData }) {
  if (!data.disponible) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2">
          Fiscalité locale des entreprises
        </h3>
        <p className="text-xs text-slate-500">
          {data.erreur ?? "Données non disponibles"}
        </p>
      </div>
    );
  }

  const taux = data.taux ?? {};
  if (!Object.keys(taux).length) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Fiscalité locale des entreprises {data.annee}
          </h3>
          {data.intercommunalite && (
            <p className="text-xs text-slate-500 mt-0.5">
              EPCI {data.intercommunalite}
            </p>
          )}
        </div>
        <span className="text-xs text-slate-500">DGFiP</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(taux).map(([libelle, valeur]) => (
          <div key={libelle} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 mb-1.5 leading-tight">{libelle}</p>
            <p className="text-xl font-bold text-white">{valeur.toFixed(2)}<span className="text-sm font-normal text-slate-400 ml-0.5">%</span></p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-600 mt-3">
        Source : DGFiP — Fiscalité locale des entreprises · CFE = Cotisation Foncière des Entreprises ·
        TFNB = Taxe Foncière sur les Propriétés Non Bâties · TEOM = Taxe d'Enlèvement des Ordures Ménagères
      </p>
    </div>
  );
}

// ── Chart 1 : Alternance (un bloc par scrutin) ───────────────────────────────

type NuanceElection = import("../types").NuanceElection;
type ElectionAnnee  = import("../types").ElectionAnnee;

function AlternanceTimeline({
  data,
  mairesParElection,
  selectedId,
  onSelect,
}: {
  data: HistoriqueElections;
  mairesParElection: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!data.disponible || data.elections.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Alternance politique</h3>
        <p className="text-xs text-slate-500">Données électorales non disponibles pour cette commune.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-1">
        Alternance politique — Municipales
      </h3>
      <p className="text-xs text-slate-500 mb-5">
        Parti arrivé en tête et maire élu à chaque scrutin. Cliquez pour voir les résultats détaillés.
      </p>

      <div className="space-y-2">
        {[...data.elections].sort((a, b) => b.annee - a.annee || a.id_election.localeCompare(b.id_election)).map((e) => {
          const g = e.nuance_gagnante;
          const maire = mairesParElection[e.id_election] ?? g?.tete_liste ?? null;
          const isSelected = selectedId === e.id_election;
          return (
            <button
              key={e.id_election}
              onClick={() => onSelect(e.id_election)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                isSelected
                  ? "border-blue-600/50 bg-blue-900/15"
                  : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Année / label */}
                <span className={`text-base font-black shrink-0 ${isSelected ? "text-blue-300" : "text-white"}`}
                      style={{ minWidth: "3rem" }}>
                  {e.label}
                </span>

                {/* Bloc couleur parti gagnant */}
                {g ? (
                  <div
                    className="shrink-0 w-1.5 self-stretch rounded-full"
                    style={{ backgroundColor: g.couleur }}
                  />
                ) : null}

                {/* Parti + maire */}
                <div className="flex-1 min-w-0">
                  {g ? (
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: g.couleur }}
                    >
                      {g.libelle}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">—</p>
                  )}
                  {maire ? (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{maire}</p>
                  ) : (
                    <p className="text-xs text-slate-600 mt-0.5">Nom du maire non disponible</p>
                  )}
                </div>

                {/* Mini barre empilée */}
                <div className="hidden sm:flex h-4 w-28 shrink-0 rounded overflow-hidden gap-px">
                  {e.nuances
                    .filter((n) => (n.pct_voix ?? 0) > 0)
                    .map((n) => (
                      <div
                        key={n.nuance}
                        style={{
                          width: `${n.pct_voix ?? 0}%`,
                          backgroundColor: n.couleur,
                          minWidth: (n.pct_voix ?? 0) > 4 ? undefined : "1px",
                        }}
                        title={`${n.libelle} : ${n.pct_voix?.toFixed(1)}%`}
                      />
                    ))}
                </div>

                {/* % gagnant */}
                {g?.pct_voix != null && (
                  <span
                    className="text-sm font-bold w-12 text-right shrink-0"
                    style={{ color: g.couleur }}
                  >
                    {g.pct_voix.toFixed(1)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-600 mt-4">
        Source : Données des élections agrégées — data.gouv.fr ·
        L'appartenance politique est déclarée par la liste lors du dépôt de candidature.
        Le nom du maire n'est disponible que pour la mandature en cours (RNE).
      </p>
    </div>
  );
}

// ── Chart 2 : Résultats par liste avec sélecteur T1/T2 ───────────────────────

function TourStats({ stats }: { stats: import("../types").ElectionTourStats }) {
  if (!stats?.inscrits) return null;
  const pct = (n: number | undefined, d: number | undefined) =>
    n != null && d ? `${((n / d) * 100).toFixed(1)}%` : null;
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {[
        { label: "Inscrits",     val: stats.inscrits,    sub: null },
        { label: "Votants",      val: stats.votants,     sub: pct(stats.votants,     stats.inscrits) },
        { label: "Abstentions",  val: stats.abstentions, sub: pct(stats.abstentions, stats.inscrits) },
        { label: "Exprimés",     val: stats.exprimes,    sub: pct(stats.exprimes,    stats.votants)  },
        { label: "Blancs",       val: stats.blancs,      sub: pct(stats.blancs,      stats.votants)  },
        { label: "Nuls",         val: stats.nuls,        sub: pct(stats.nuls,        stats.votants)  },
      ].map(({ label, val, sub }) => (
        <div key={label} className="bg-slate-800/60 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
          <p className="text-xs font-semibold text-slate-200">
            {val != null ? val.toLocaleString("fr-FR") : "—"}
          </p>
          {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
        </div>
      ))}
    </div>
  );
}

function ResultatsBarChart({
  election,
}: {
  election: ElectionAnnee;
}) {
  const hasT1 = (election.nuances_t1?.length ?? 0) > 0;
  const hasT2 = (election.nuances_t2?.length ?? 0) > 0;
  const [tour, setTour] = useState<"t1" | "t2">(hasT2 ? "t2" : "t1");

  const nuances: NuanceElection[] = tour === "t2"
    ? (election.nuances_t2 ?? [])
    : (election.nuances_t1 ?? []);
  const stats = tour === "t2" ? election.stats_t2 : election.stats_t1;

  const maxVoix = Math.max(...nuances.map((n) => n.nb_voix ?? 0), 1);
  const totalVoix = stats?.exprimes ?? nuances.reduce((s, n) => s + (n.nb_voix ?? 0), 0);
  const hasSieges = nuances.some((n) => (n.sieges_cm ?? 0) > 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      {/* En-tête avec sélecteur */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Résultats {election.label ?? election.annee}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {nuances.length} liste{nuances.length > 1 ? "s" : ""} ·{" "}
            {totalVoix > 0 ? `${totalVoix.toLocaleString("fr-FR")} voix exprimés` : "voix non disponibles"}
          </p>
        </div>
        {hasT1 && hasT2 && (
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setTour("t1")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tour === "t1" ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Tour 1
            </button>
            <button
              onClick={() => setTour("t2")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tour === "t2" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Tour 2
            </button>
          </div>
        )}
        {!hasT2 && hasT1 && (
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
            1 seul tour
          </span>
        )}
      </div>

      {/* Barres horizontales */}
      <div className="space-y-3">
        {nuances.map((n) => {
          const pct = maxVoix > 0 ? ((n.nb_voix ?? 0) / maxVoix) * 100 : 0;
          return (
            <div key={n.nuance}>
              <div className="flex items-baseline justify-between text-xs mb-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: n.couleur }}
                  />
                  <div className="min-w-0">
                    <span className="text-slate-200 font-medium">
                      {n.libelle_liste || n.libelle}
                    </span>
                    {n.tete_liste && (
                      <span className="block text-[10px] text-slate-400 truncate">
                        {n.tete_liste}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 ml-4 text-right">
                  {n.nb_voix != null && n.nb_voix > 0 ? (
                    <span className="font-mono text-slate-300">
                      {n.nb_voix.toLocaleString("fr-FR")}
                      <span className="font-semibold ml-1.5" style={{ color: n.couleur }}>
                        {n.pct_voix?.toFixed(1)}%
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-600">— voix</span>
                  )}
                  {hasSieges && (
                    <p className="text-[10px] text-slate-500">
                      {(n.sieges_cm ?? 0) > 0 ? `${n.sieges_cm} siège${(n.sieges_cm ?? 0) > 1 ? "s" : ""}` : "—"}
                    </p>
                  )}
                </div>
              </div>
              <div className="h-6 bg-slate-800 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg flex items-center pl-2 transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: n.couleur,
                    minWidth: pct > 0 ? "4px" : "0",
                  }}
                >
                  {pct > 25 && (
                    <span className="text-[11px] font-bold text-white/90">
                      {n.pct_voix?.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {stats && <TourStats stats={stats} />}

      <p className="text-[10px] text-slate-600 mt-4">
        Source : Ministère de l'Intérieur — data.gouv.fr · L'appartenance politique est déclarée par la liste lors du dépôt de candidature.
      </p>
    </div>
  );
}

// ── Conseil municipal ─────────────────────────────────────────────────────────

function EluCard({
  elu,
  highlight = false,
}: {
  elu: import("../types").Elu;
  highlight?: boolean;
}) {
  const initials = `${elu.prenom?.[0] ?? ""}${elu.nom?.[0] ?? ""}`.toUpperCase();
  const isFemme = elu.sexe === "F";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-3 border ${
        highlight
          ? "bg-blue-900/20 border-blue-700/40"
          : "bg-slate-800/60 border-slate-700/40"
      }`}
    >
      {/* Avatar initiales */}
      <div
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
          highlight
            ? "bg-blue-600 text-white"
            : "bg-slate-700 text-slate-300"
        }`}
      >
        {initials || "?"}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white text-sm truncate">
          {elu.prenom} {elu.nom}
        </p>
        <p className="text-xs text-slate-400 truncate">{elu.fonction || "Conseiller"}{isFemme ? "e" : ""}</p>
        {elu.csp && (
          <p className="text-[10px] text-slate-500 truncate">{elu.csp}</p>
        )}
      </div>

      {elu.date_mandat && (
        <span className="shrink-0 text-[10px] text-slate-600 font-mono">
          depuis {elu.date_mandat.slice(-4)}
        </span>
      )}
    </div>
  );
}

function ElusSection({ data }: { data: ElusData }) {
  const adjoints = data.conseillers.filter((e) =>
    (e.fonction ?? "").toLowerCase().includes("adjoint")
  );
  const conseillers = data.conseillers.filter(
    (e) => !(e.fonction ?? "").toLowerCase().includes("adjoint") && !(e.fonction ?? "").toLowerCase().includes("maire")
  );

  return (
    <div className="space-y-6">
      {/* Maire */}
      {data.maire ? (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Maire
          </h3>
          <div className="max-w-sm">
            <EluCard elu={data.maire} highlight />
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Maire non trouvé dans le RNE.</p>
      )}

      {/* Adjoints */}
      {adjoints.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Adjoints au maire ({adjoints.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {adjoints.map((e, i) => (
              <EluCard key={i} elu={e} />
            ))}
          </div>
        </div>
      )}

      {/* Conseillers */}
      {conseillers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Conseillers municipaux ({conseillers.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {conseillers.map((e, i) => (
              <EluCard key={i} elu={e} />
            ))}
          </div>
        </div>
      )}

      {/* Source + note parti */}
      <p className="text-[10px] text-slate-600">
        {data.source} · Données mises à jour trimestriellement ·{" "}
        L'appartenance politique n'est pas publiée dans ce répertoire.
        {!data.cm_disponible && " · Liste des conseillers temporairement indisponible."}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

const NOTE_COLOR: Record<string, string> = {
  AAA: "#34d399", AA: "#34d399", A: "#2dd4bf",
  BBB: "#60a5fa", BB: "#fbbf24", B: "#fb923c", CCC: "#f87171",
};

const KEY_STATS = [
  {
    key: "Recettes de fonctionnement",
    label: "Recettes fonct.",
    higherIsBetter: true,
  },
  {
    key: "Dépenses de fonctionnement",
    label: "Dépenses fonct.",
    higherIsBetter: false,
  },
  { key: "Epargne brute", label: "Épargne brute", higherIsBetter: true },
  { key: "Epargne nette", label: "Épargne nette", higherIsBetter: true },
  {
    key: "Encours de dette",
    label: "Encours de dette",
    higherIsBetter: false,
  },
  {
    key: "Dépenses d'équipement",
    label: "Dépenses d'équip.",
    higherIsBetter: true,
  },
  {
    key: "Frais de personnel",
    label: "Frais de personnel",
    higherIsBetter: false,
  },
  { key: "Impôts et taxes", label: "Impôts et taxes", higherIsBetter: true },
  {
    key: "Dotation globale de fonctionnement",
    label: "DGF",
    higherIsBetter: true,
  },
  {
    key: "Achats et charges externes",
    label: "Charges externes",
    higherIsBetter: false,
  },
  {
    key: "Charges financières",
    label: "Charges financières",
    higherIsBetter: false,
  },
  {
    key: "Ventes de biens et services",
    label: "Ventes & services",
    higherIsBetter: true,
  },
];

// Années affichées dans le sélecteur : de l'année courante jusqu'à 2017
const ALL_YEARS = Array.from({ length: 10 }, (_, i) => 2026 - i); // [2026 … 2017]

// Max par dataset (contraintes sources)
const MAX_COMPTABLE  = 2023; // Grand livre / fiscalité locale DGFiP
const MAX_MARCHES    = 2023; // DECP
const MAX_ENERGIE    = 2022; // Agence ORE
const MAX_FISCPRO    = 2022; // Fiscalité pro DGFiP
const MAX_IMMO       = 2024; // DVF tabular

function StaleDataBadge({ selected, effective }: { selected: number; effective: number }) {
  if (selected === effective) return null;
  return (
    <span className="ml-2 text-xs font-medium text-red-400">
      données datant de {effective}
    </span>
  );
}

const TABS: { id: Tab; label: string; icon: React.ElementType; metroOnly?: boolean }[] = [
  { id: "finances",    label: "Finances",            icon: BarChart2,    metroOnly: true },
  { id: "comparaison", label: "Comparaison",         icon: GitCompare,   metroOnly: true },
  { id: "energie",    label: "Énergie & Territoire", icon: Zap,          metroOnly: true },
  { id: "economie",   label: "Économie",             icon: ShoppingCart, metroOnly: true },
  { id: "conseil",    label: "Conseil municipal",    icon: Users2 },
  { id: "immobilier", label: "Immobilier",           icon: Building2,    metroOnly: true },
  { id: "comptable",  label: "Grand livre",          icon: BookOpen,     metroOnly: true },
];

// Collectivités d'outre-mer sans données OFGL (≠ DOM 971-974, 976 qui ont leurs finances)
const isLimitedTerritory = (code: string) => /^(975|977|978|986|987|988)/.test(code);

function FinancialScoreCard({ fs, onInfoClick, staleYear }: { fs: FinancialScore; onInfoClick?: () => void; staleYear?: number }) {
  const c = NOTE_META[fs.note];

  return (
    <div className={`relative bg-gradient-to-br ${c.bg} border ${c.border} rounded-2xl p-5`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className={c.text} />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Santé financière
          </span>
          {staleYear != null && <span className="text-xs font-medium text-red-400">données {staleYear}</span>}
        </div>
        {onInfoClick && (
          <button
            onClick={onInfoClick}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
            title="Voir le détail en bas de page"
          >
            <Info size={13} />
          </button>
        )}
      </div>

      {/* Note + label + score */}
      <div className="flex items-end gap-3">
        <span className={`text-3xl font-black ${c.text}`}>{fs.note}</span>
        <div className="mb-0.5">
          <span className="text-slate-300 text-sm font-medium">{c.label}</span>
          <span className="text-slate-500 text-xs ml-1.5">{fs.score}/100</span>
        </div>
      </div>

      {/* Barre globale */}
      <div className="mt-2 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${fs.score}%` }} />
      </div>

      {/* Mini barres par dimension */}
      <div className="mt-3 grid grid-cols-3 gap-1">
        {fs.dimensions.map((d) => (
          <div key={d.id} title={`${d.label} : ${d.pts}/${d.max}`}>
            <div className="flex justify-between items-center mb-0.5">
              <span className={`text-[9px] font-medium truncate ${DIM_ACCENT[d.id]}`}>{d.label.split(" ")[0]}</span>
              <span className="text-[9px] text-slate-500">{d.pts}/{d.max}</span>
            </div>
            <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${c.bar} opacity-80`}
                style={{ width: `${(d.pts / d.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CommuneDetailClientProps {
  codeInsee: string;
  initialGeo?: unknown;
  initialFinances?: unknown;
}

export function CommuneDetailClient({ codeInsee }: CommuneDetailClientProps) {
  const [year, setYear] = useState(2024);

  // Années effectives par dataset — clamp sur le max disponible de chaque source
  const [finLatest, setFinLatest] = useState(2024);
  const effFin     = Math.min(year, finLatest);
  const effComp    = Math.min(year, MAX_COMPTABLE);
  const effMarches = Math.min(year, MAX_MARCHES);
  const effEnergie = Math.min(year, MAX_ENERGIE);
  const effFiscPro = Math.min(year, MAX_FISCPRO);
  const effImmo    = Math.min(year, MAX_IMMO);
  const [tab, setTab] = useState<Tab>("finances");
  const domTom = isLimitedTerritory(codeInsee ?? "");
  // Rediriger vers conseil si territoire limité et onglet non disponible
  useEffect(() => {
    if (domTom && TABS.find(t => t.id === tab)?.metroOnly) {
      setTab("conseil");
    }
  }, [codeInsee, domTom]);
  const [chartMode, setChartMode] = useState<"eph" | "montant">("eph");
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);
  const scoreDetailRef = useRef<HTMLDivElement>(null);
  const scrollToScoreDetail = () => scoreDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Un seul appel BFF pour finances + comparison + score + années disponibles
  const {
    data: finTab,
    loading: loadingFin,
    error: errorFin,
  } = useApi(
    () => api.getFinancesTab(codeInsee!, effFin),
    [codeInsee, effFin],
    `finances:${codeInsee}:${effFin}`
  );

  const finances      = finTab?.finances   ?? null;
  const comparison    = finTab?.comparison ?? null;
  const scoreRaw      = finTab?.score      ?? null;
  const loadingCmp    = loadingFin;
  const errorCmp      = errorFin;

  // Mettre à jour l'année par défaut et le max connu dès que les années dispo sont chargées
  useEffect(() => {
    if (finTab?.years?.latest) {
      setFinLatest(finTab.years.latest);
      setYear(finTab.years.latest);
    }
  }, [finTab?.years?.latest]);

  const financialScore: FinancialScore | null = scoreRaw
    ? scoreFromApi(scoreRaw as ScoreApiResponse)
    : null;

  const {
    data: comptes,
    loading: loadingComptes,
    error: errorComptes,
  } = useApi(
    () => api.getComptes(codeInsee!, effComp),
    [codeInsee, effComp],
    `comptes:${codeInsee}:${effComp}`
  );

  const { data: fiscalite } = useApi(
    () => api.getFiscalite(codeInsee!, effComp),
    [codeInsee, effComp],
    `fiscalite:${codeInsee}:${effComp}`
  );

  const [marchesPage, setMarchesPage] = useState(1);
  const [marchesLimit, setMarchesLimit] = useState(50);
  const [eauParam, setEauParam] = useState<"th_avg"|"nitrates_avg"|"ph_avg"|"conductivite_avg"|"turbidite_avg"|"calcium_avg"|"sulfates_avg">("th_avg");
  useEffect(() => { setMarchesPage(1); }, [codeInsee, effMarches]);

  const {
    data: economieData,
    loading: loadingMarches,
    error: errorMarches,
  } = useApi(
    () =>
      tab === "economie"
        ? api.getEconomie(codeInsee!, effMarches, effFiscPro, marchesPage, marchesLimit)
        : Promise.resolve(null as unknown as EconomieData),
    [codeInsee, effMarches, effFiscPro, tab, marchesPage, marchesLimit],
    `economie:${codeInsee}:${effMarches}:${effFiscPro}:${marchesPage}:${marchesLimit}`
  );
  const marches = economieData?.marches ?? null;
  const fiscalitePro = economieData?.fiscalitePro ?? null;

  const { data: energie, loading: loadingEnergie } = useApi(
    () =>
      tab === "energie"
        ? api.getEnergie(codeInsee!, effEnergie)
        : Promise.resolve(null as unknown as EnergieData),
    [codeInsee, effEnergie, tab],
    `energie:${codeInsee}`
  );

  const { data: territoire, loading: loadingTerritoire } = useApi(
    () =>
      tab === "energie"
        ? api.getTerritoire(codeInsee!)
        : Promise.resolve(null as unknown as TerritoireData),
    [codeInsee, tab],
    `territoire:${codeInsee}`
  );

  const { data: eau, loading: loadingEau } = useApi(
    () =>
      tab === "energie"
        ? api.getEau(codeInsee!)
        : Promise.resolve(null as unknown as EauData),
    [codeInsee, tab],
    `eau:${codeInsee}`
  );

  const { data: eauMensuel } = useApi(
    () =>
      tab === "energie"
        ? api.getEauMensuel(codeInsee!)
        : Promise.resolve(null as any),
    [codeInsee, tab],
    `eauMensuel:${codeInsee}`
  );

  const { data: elus, loading: loadingElus } = useApi(
    () =>
      tab === "conseil"
        ? api.getElus(codeInsee!)
        : Promise.resolve(null as unknown as ElusData),
    [codeInsee, tab],
    `elus:${codeInsee}`
  );

  const { data: historiqueElections, loading: loadingHist } = useApi(
    () =>
      tab === "conseil"
        ? api.getHistoriqueElections(codeInsee!)
        : Promise.resolve(null as unknown as HistoriqueElections),
    [codeInsee, tab],
    `historique:${codeInsee}`
  );

  const { data: immo, loading: loadingImmo, error: errorImmo } = useApi(
    () =>
      tab === "immobilier"
        ? api.getImmobilier(codeInsee!, effImmo)
        : Promise.resolve(null as unknown as ImmobilierData),
    [codeInsee, tab, effImmo],
    `immo:${codeInsee}:${effImmo}`
  );

  const { data: dvfEvo, loading: loadingDvfEvo } = useApi(
    () =>
      tab === "immobilier"
        ? api.getDvfEvolution(codeInsee!)
        : Promise.resolve(null as unknown as import("../types").DvfEvolutionData),
    [codeInsee, tab],
    `dvfEvo:${codeInsee}`
  );

  const effTx = Math.min(Math.max(year, 2020), 2025);
  const [dvfTxPage, setDvfTxPage]       = useState(1);
  const [dvfTxPageSize, setDvfTxPageSize] = useState(25);
  const [dvfTxSortBy, setDvfTxSortBy]   = useState<"date"|"surface"|"prix"|"prix_m2">("date");
  const [dvfTxSortDir, setDvfTxSortDir] = useState<"asc"|"desc">("desc");
  useEffect(() => { setDvfTxPage(1); }, [codeInsee, effTx]);
  const { data: dvfTx, loading: loadingDvfTx } = useApi(
    () =>
      tab === "immobilier"
        ? api.getDvfTransactions(codeInsee!, effTx, dvfTxPage, dvfTxPageSize, dvfTxSortBy, dvfTxSortDir)
        : Promise.resolve(null as unknown as import("../types").DvfTransactionsData),
    [codeInsee, tab, effTx, dvfTxPage, dvfTxPageSize, dvfTxSortBy, dvfTxSortDir],
    `dvfTx:${codeInsee}:${effTx}:${dvfTxPage}:${dvfTxPageSize}:${dvfTxSortBy}:${dvfTxSortDir}`
  );

  const { data: dvfPoints, loading: loadingDvfPoints } = useApi(
    () =>
      tab === "immobilier"
        ? api.getDvfPoints(codeInsee!)
        : Promise.resolve(null as unknown as any),
    [codeInsee, tab],
    `dvfPoints:${codeInsee}`
  );
  const dvfMapRef = useRef<DvfSalesMapHandle>(null);
  const [dvfPointsVisible, setDvfPointsVisible] = useState(true);

  // Auto-select most recent election when historique loads
  useEffect(() => {
    if (historiqueElections?.elections?.length && selectedElectionId === null) {
      const mostRecent = [...historiqueElections.elections].sort((a, b) => b.annee - a.annee)[0];
      setSelectedElectionId(mostRecent.id_election);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historiqueElections]);

  const meta = finances?.meta;
  const yoy = finances?.evolution_yoy ?? {};

  const agregatsChartData = finances
    ? Object.entries(finances.agregats)
        .filter(([, v]) => v.euros_par_habitant !== null && v.euros_par_habitant! > 0)
        .map(([name, v]) => ({
          name,
          eph: v.euros_par_habitant ?? 0,
          montant: v.montant ?? 0,
        }))
        .sort((a, b) => b.eph - a.eph)
        .slice(0, 12)
    : [];

  const evolutionSeries = finances?.evolution
    ? Object.entries(finances.evolution).map(([key, data], idx) => ({
        key,
        label: key,
        color: CHART_COLORS[idx % CHART_COLORS.length],
        data,
      }))
    : [];

  const maxEvolutionYear = evolutionSeries
    .flatMap((s) => s.data.map((d) => d.annee))
    .reduce((m, a) => Math.max(m, a), 2017);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm shrink-0"
              >
                <ArrowLeft size={15} />
                <span className="hidden sm:inline">Carte</span>
              </Link>
              <div className="w-px h-5 bg-slate-700 hidden sm:block shrink-0" />
              {meta ? (
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-white truncate">
                    {meta.nom}
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={10} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400 truncate">
                      {meta.departement} · {meta.region}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-8 w-40 bg-slate-700 rounded animate-pulse" />
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {meta && (
                <div className="hidden md:flex items-center gap-1.5">
                  {meta.rural === "Oui" && (
                    <span className="flex items-center gap-1 text-xs bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800/40">
                      <TreePine size={10} /> Rural
                    </span>
                  )}
                  {meta.montagne === "Oui" && (
                    <span className="flex items-center gap-1 text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded-full border border-blue-800/40">
                      <Mountain size={10} /> Montagne
                    </span>
                  )}
                  {meta.touristique === "Oui" && (
                    <span className="flex items-center gap-1 text-xs bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded-full border border-amber-800/40">
                      <Waves size={10} /> Touristique
                    </span>
                  )}
                </div>
              )}
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer"
              >
                {ALL_YEARS.map((y) => (
                  <option key={y} value={y} className="bg-slate-800">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loadingFin && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3" />
            Chargement…
          </div>
        )}
        {errorFin && (
          <div className="flex items-center gap-3 text-red-400 bg-red-900/20 border border-red-800 rounded-xl p-4">
            <AlertCircle size={20} />
            <span>{errorFin}</span>
          </div>
        )}

        {meta && finances && (
          <>
            {/* ── Hero ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Mini-map */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative">
                <CommuneMiniMap codeInsee={codeInsee!} />
                <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 z-[500] pointer-events-none">
                  {meta.rural === "Oui" && (
                    <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-1.5 py-0.5 rounded backdrop-blur">
                      Rural
                    </span>
                  )}
                  {meta.montagne === "Oui" && (
                    <span className="text-[10px] bg-blue-900/80 text-blue-300 px-1.5 py-0.5 rounded backdrop-blur">
                      Montagne
                    </span>
                  )}
                  {meta.touristique === "Oui" && (
                    <span className="text-[10px] bg-amber-900/80 text-amber-300 px-1.5 py-0.5 rounded backdrop-blur">
                      Touristique
                    </span>
                  )}
                </div>
              </div>

              {/* Population + 2 key stats + score */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-800 border border-blue-800/40 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Users size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Population
                    </span>
                  </div>
                  <p className="text-3xl font-black text-white">
                    {formatNumber(meta.population)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {trancheLabel(meta.tranche_population)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    INSEE {meta.code_insee}
                  </p>
                </div>

                {[
                  {
                    key: "Recettes de fonctionnement",
                    label: "Recettes fonct.",
                    hib: true,
                  },
                  {
                    key: "Dépenses de fonctionnement",
                    label: "Dépenses fonct.",
                    hib: false,
                  },
                ].map(({ key, label, hib: h }) => {
                  const val = finances.agregats[key];
                  const yoyVal = yoy[key];
                  if (!val?.euros_par_habitant) return null;
                  return (
                    <div
                      key={key}
                      className="bg-slate-800 border border-slate-700 rounded-2xl p-5"
                    >
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        {label}
                        <StaleDataBadge selected={year} effective={effFin} />
                      </p>
                      <p className="text-2xl font-black text-white">
                        {formatEuro(val.euros_par_habitant)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        /hab · {formatEuro(val.montant, true)} total
                      </p>
                      {yoyVal && (
                        <div className="mt-2">
                          <YoYBadge
                            pct={yoyVal.eph_pct}
                            higherIsBetter={h}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Score santé financière */}
                {financialScore ? <FinancialScoreCard fs={financialScore} onInfoClick={scrollToScoreDetail} staleYear={year !== effFin ? effFin : undefined} /> : null}
              </div>
            </div>

            {/* ── Bannière DOM-TOM ──────────────────────────────────────── */}
            {domTom && (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-900/20 border-b border-amber-800/40 text-amber-400 text-xs">
                <AlertCircle size={13} className="shrink-0" />
                Données limitées pour ce territoire — seul l'onglet Conseil municipal est disponible.
              </div>
            )}

            {/* ── Tabs ─────────────────────────────────────────────────── */}
            <div className="border-b border-slate-800">
              <nav className="flex gap-0.5 overflow-x-auto">
                {TABS.map(({ id, label, icon: Icon, metroOnly }) => {
                  const disabled = domTom && metroOnly;
                  return (
                    <button
                      key={id}
                      onClick={() => !disabled && setTab(id)}
                      disabled={disabled}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        disabled
                          ? "border-transparent text-slate-600 cursor-not-allowed"
                          : tab === id
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* ── Tab: Finances ─────────────────────────────────────────── */}
            {tab === "finances" && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                    Variation vs année précédente ({effFin - 1} → {effFin})
                    <StaleDataBadge selected={year} effective={effFin} />
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {KEY_STATS.map(({ key, label, higherIsBetter: h }) => {
                      const val = finances.agregats[key];
                      const yoyVal = yoy[key];
                      if (!val?.euros_par_habitant) return null;
                      return (
                        <StatCard
                          key={key}
                          label={label}
                          value={formatEuro(val.euros_par_habitant)}
                          unit="/hab"
                          subValue={formatEuro(val.montant, true)}
                          diff={yoyVal?.eph_pct ?? null}
                          higherIsBetter={h}
                          size="sm"
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold text-white flex items-center">
                      Répartition {effFin}
                      <StaleDataBadge selected={year} effective={effFin} />
                    </h2>
                    <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                      {(["eph", "montant"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setChartMode(m)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${
                            chartMode === m
                              ? "bg-blue-600 text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {m === "eph" ? "€/hab" : "Total"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <AgregatsChart data={agregatsChartData} mode={chartMode} />
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold text-white">
                      Évolution 2017–{maxEvolutionYear}
                    </h2>
                    <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                      {(["eph", "montant"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setChartMode(m)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${
                            chartMode === m
                              ? "bg-blue-600 text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {m === "eph" ? "€/hab" : "Total"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {evolutionSeries.length > 0 ? (
                    <EvolutionChart series={evolutionSeries} mode={chartMode} />
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-12">
                      Données d'évolution non disponibles
                    </p>
                  )}
                </div>

              {/* ── Détail score santé financière ────────────────────────── */}
              {(() => {
                const fs = financialScore;
                if (!fs) return null;
                const c = NOTE_META[fs.note];
                return (
                  <div ref={scoreDetailRef} className="scroll-mt-6">
                    {/* En-tête */}
                    <div className={`rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} p-6 mb-4`}>
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <ShieldCheck size={28} className={c.text} />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5 flex items-center gap-2">
                              Score de santé financière
                              <StaleDataBadge selected={year} effective={effFin} />
                            </p>
                            <div className="flex items-baseline gap-3">
                              <span className={`text-5xl font-black ${c.text}`}>{fs.note}</span>
                              <span className="text-slate-300 text-xl font-semibold">{c.label}</span>
                              <span className="text-slate-500 text-sm">{fs.score} / 100 pts</span>
                            </div>
                          </div>
                        </div>
                        {/* Barre globale */}
                        <div className="flex-1 min-w-40 max-w-xs">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Score global</span>
                            <span>{fs.score}/100</span>
                          </div>
                          <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
                            <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${fs.score}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-600 mt-1">
                            6 dimensions · 12 ratios · sources OFGL / DGCL / Cour des comptes
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Grille des 6 dimensions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {fs.dimensions.map((d) => {
                        const accent = DIM_ACCENT[d.id];
                        const fillPct = Math.round((d.pts / d.max) * 100);
                        return (
                          <div key={d.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                            {/* Header dimension */}
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-sm font-bold ${accent}`}>{d.label}</span>
                              <span className="text-xs text-slate-400 font-mono">{d.pts}/{d.max} pts</span>
                            </div>
                            {/* Barre dimension */}
                            <div className="h-2 rounded-full bg-slate-700 overflow-hidden mb-4">
                              <div
                                className={`h-full rounded-full ${c.bar}`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                            {/* Ratios */}
                            <div className="space-y-4">
                              {d.ratios.map((r) => (
                                <div key={r.id}>
                                  <div className="flex items-baseline justify-between mb-0.5">
                                    <span className="text-sm font-semibold text-slate-200">{r.label}</span>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className={`text-lg font-black ${accent}`}>{r.value}</span>
                                      <span className="text-xs text-slate-500">{r.pts}/{r.max}</span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-500 font-mono">{r.formula}</p>
                                  <p className="text-[11px] text-slate-600 italic mt-0.5">{r.source}</p>
                                  {/* Mini barre ratio */}
                                  <div className="mt-1.5 h-1 rounded-full bg-slate-700 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${c.bar} opacity-60`}
                                      style={{ width: `${Math.round((r.pts / r.max) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Légende échelle */}
                    <div className="mt-4 flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-slate-500">Échelle :</span>
                      {(["AAA","AA","A","BBB","BB","B","CCC"] as FinancialNote[]).map((n) => (
                        <span
                          key={n}
                          className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                            n === fs.note
                              ? `${NOTE_META[n].text} ${NOTE_META[n].border} bg-slate-800`
                              : "text-slate-600 border-slate-700"
                          }`}
                        >
                          {n}
                        </span>
                      ))}
                      <span className="text-[11px] text-slate-600 ml-1">
                        · Malus −10 si dépenses fonct. &gt; recettes fonct.
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* ── Évolution du score de santé financière ── */}
              {(() => {
                const hist = finTab?.scoreHistorique?.historique;
                if (!hist || hist.length < 2) return null;
                const NOTE_BANDS: { note: string; min: number; label: string }[] = [
                  { note: "AAA", min: 85, label: "AAA" },
                  { note: "AA",  min: 75, label: "AA"  },
                  { note: "A",   min: 65, label: "A"   },
                  { note: "BBB", min: 55, label: "BBB" },
                  { note: "BB",  min: 45, label: "BB"  },
                  { note: "B",   min: 30, label: "B"   },
                  { note: "CCC", min: 0,  label: "CCC" },
                ];
                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-blue-400" />
                      Évolution du score de santé financière
                    </h2>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={hist} margin={{ top: 12, right: 20, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          width={36}
                          ticks={[0, 30, 45, 55, 65, 75, 85, 100]}
                          tickFormatter={(v: number) => {
                            const band = NOTE_BANDS.find(b => b.min === v);
                            return band ? band.label : String(v);
                          }}
                        />
                        <Tooltip
                          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: "#cbd5e1" }}
                          formatter={(value: unknown, _: string, props: any) => {
                            const row = props.payload;
                            const color = NOTE_COLOR[row.note] ?? "#94a3b8";
                            return [
                              <span key="v">
                                <span style={{ color }} className="font-bold">{row.note}</span>
                                <span className="text-slate-400 ml-1">· {String(value)} pts</span>
                              </span>,
                              "Score",
                            ];
                          }}
                        />
                        {/* Note threshold lines */}
                        {NOTE_BANDS.slice(0, -1).map(b => (
                          <ReferenceLine
                            key={b.note}
                            y={b.min}
                            stroke={NOTE_COLOR[b.note]}
                            strokeOpacity={0.25}
                            strokeDasharray="4 3"
                          />
                        ))}
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#475569"
                          strokeWidth={2}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            const color = NOTE_COLOR[payload.note] ?? "#64748b";
                            const isCurrent = payload.annee === effFin;
                            const r = isCurrent ? 7 : 5;
                            return (
                              <g key={`dot-${payload.annee}`}>
                                <circle
                                  cx={cx} cy={cy}
                                  r={r}
                                  fill={color}
                                  stroke={isCurrent ? "#fff" : "transparent"}
                                  strokeWidth={isCurrent ? 2 : 0}
                                />
                                <text
                                  x={cx}
                                  y={cy - r - 4}
                                  textAnchor="middle"
                                  fontSize={10}
                                  fontWeight={700}
                                  fill={color}
                                >
                                  {payload.note}
                                </text>
                              </g>
                            );
                          }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
            )}

            {/* ── Tab: Comparaison ──────────────────────────────────────── */}
            {tab === "comparaison" && (
              <div className="space-y-6">
                {loadingCmp && (
                  <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                    <Loader2 size={20} className="animate-spin" />
                    Calcul des comparaisons…
                  </div>
                )}
                {errorCmp && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-900/20 border border-red-800 rounded-xl p-4">
                    <AlertCircle size={16} />
                    {errorCmp}
                  </div>
                )}
                {comparison && (
                  <>
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center">
                        {comparison.tranche_nom}
                        <StaleDataBadge selected={year} effective={effFin} />
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {comparison.tranche_label} ·{" "}
                        {comparison.comparison[0]?.nb_communes ?? "?"} communes
                        · rang 1 = valeur la plus haute
                      </p>
                    </div>

                    {/* ── Score de santé financière ── */}
                    {financialScore && scoreRaw && (() => {
                      const sr = scoreRaw as ScoreApiResponse;
                      const c  = NOTE_META[financialScore.note];
                      const rang = sr.rang_score;
                      const nb   = sr.nb_communes_tranche;
                      const pct  = rang && nb ? Math.round((1 - (rang - 1) / nb) * 100) : null;
                      return (
                        <div className={`rounded-2xl border p-5 bg-gradient-to-br ${c.bg} ${c.border}`}>
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className={`text-4xl font-black ${c.text}`}>{financialScore.note}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{NOTE_META[financialScore.note].label}</div>
                              </div>
                              <div>
                                <div className="text-sm text-slate-300 font-medium">Score de santé financière</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${financialScore.score}%` }} />
                                  </div>
                                  <span className="text-white font-bold text-sm">{financialScore.score}<span className="text-slate-400 font-normal text-xs">/100</span></span>
                                </div>
                              </div>
                            </div>
                            {rang && nb && (
                              <div className="text-center bg-slate-900/50 rounded-xl px-5 py-3 border border-slate-700/50">
                                <div className={`text-3xl font-black ${c.text}`}>
                                  {rang}<span className="text-slate-400 text-lg font-normal">/{nb}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">Classement dans sa tranche</div>
                                {pct !== null && (
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    Top <span className={`font-semibold ${pct >= 75 ? "text-emerald-400" : pct >= 50 ? "text-blue-400" : pct >= 25 ? "text-amber-400" : "text-red-400"}`}>{100 - pct}%</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {comparison.comparison.slice(0, 8).map((c) => (
                        <StatCard
                          key={c.agregat}
                          label={c.agregat}
                          value={formatEuro(c.commune_eph)}
                          unit="/hab"
                          subValue={`Moy. : ${formatEuro(c.moyenne_tranche)}/hab`}
                          diff={c.diff_pct}
                          higherIsBetter={hib(c.agregat)}
                          rang={c.rang}
                          nbCommunes={c.nb_communes}
                          size="sm"
                        />
                      ))}
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                      <h2 className="text-sm font-bold text-white mb-2">
                        Écart vs communes de même taille (€/hab)
                      </h2>
                      <ComparisonChart
                        data={comparison.comparison}
                        trancheLabel={comparison.tranche_label}
                      />
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-800">
                        <h2 className="text-sm font-bold text-white">
                          Détail comparatif — {comparison.tranche_nom}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {comparison.tranche_label}
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wide">
                              <th className="px-6 py-3 text-left">Agrégat</th>
                              <th className="px-4 py-3 text-right">
                                Cette commune
                              </th>
                              <th className="px-4 py-3 text-right">Moyenne</th>
                              <th className="px-4 py-3 text-right">P10</th>
                              <th className="px-4 py-3 text-right">P90</th>
                              <th className="px-4 py-3 text-right">Écart</th>
                              <th className="px-4 py-3 text-right whitespace-nowrap">
                                Classement
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparison.comparison.map((c, idx) => {
                              const diff = c.diff_pct;
                              const good = hib(c.agregat)
                                ? diff !== null && diff > 5
                                : diff !== null && diff < -5;
                              const bad = hib(c.agregat)
                                ? diff !== null && diff < -5
                                : diff !== null && diff > 5;
                              return (
                                <tr
                                  key={c.agregat}
                                  className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                                    idx % 2 === 0 ? "" : "bg-slate-800/10"
                                  }`}
                                >
                                  <td className="px-6 py-3 font-medium text-slate-200">
                                    {c.agregat}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-white">
                                    {formatEuro(c.commune_eph)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-300">
                                    {formatEuro(c.moyenne_tranche)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400 text-xs">
                                    {c.p10_tranche != null ? formatEuro(c.p10_tranche) : "—"}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400 text-xs">
                                    {c.p90_tranche != null ? formatEuro(c.p90_tranche) : "—"}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {diff !== null ? (
                                      <span
                                        className={`font-semibold ${
                                          good
                                            ? "text-emerald-400"
                                            : bad
                                            ? "text-red-400"
                                            : "text-slate-400"
                                        }`}
                                      >
                                        {diff > 0 ? "+" : ""}
                                        {diff.toFixed(1)}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">
                                    {c.rang > 0 && c.nb_communes > 0 ? (
                                      <span className="font-mono text-xs">
                                        <span className="text-white font-bold">
                                          {c.rang}
                                        </span>
                                        <span className="text-slate-500">
                                          {" "}
                                          / {c.nb_communes}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Tab: Énergie & Territoire ─────────────────────────────── */}
            {tab === "energie" && (
              <div className="space-y-6">
                {(loadingEnergie || loadingTerritoire) && (
                  <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                    <Loader2 size={20} className="animate-spin" />
                    Chargement des données…
                  </div>
                )}

                {energie && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="text-sm font-bold text-white flex items-center">
                          Consommation énergétique {energie.annee}
                          <StaleDataBadge selected={year} effective={effEnergie} />
                        </h2>
                        <span className="text-xs text-slate-500">
                          Source : Agence ORE
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Quantité totale d'énergie consommée sur le territoire de la commune, répartie par filière
                        (électricité et gaz naturel) et par secteur d'activité — résidentiel (logements), professionnel
                        (commerces, services), entreprises (industrie). Exprimée en MWh/an.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <EnergieFiliereCard
                        title="Électricité"
                        icon={Zap}
                        accentClass="text-yellow-400"
                        barColor="bg-yellow-500/70"
                        data={energie.electricite}
                      />
                      <EnergieFiliereCard
                        title="Gaz naturel"
                        icon={Leaf}
                        accentClass="text-blue-400"
                        barColor="bg-blue-500/70"
                        data={energie.gaz}
                      />
                    </div>
                  </>
                )}

                {territoire && (
                  <>
                    <div>
                      <h2 className="text-sm font-bold text-white mb-1">
                        Territoire & environnement
                      </h2>
                      <p className="text-xs text-slate-500">
                        <span className="font-medium text-slate-400">Émissions GES</span> — émissions annuelles de gaz à effet de serre
                        (en ktCO₂ équivalent) par secteur d'activité, issues du bilan Ecolab / ADEME.
                        {" "}<span className="font-medium text-slate-400">Mobilité domicile-travail</span> — part modale des
                        actifs selon leur mode de transport principal pour aller travailler (recensement INSEE via Ecolab).
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <GesSection ges={territoire.ges} />
                      <MobiliteSection mobilite={territoire.mobilite} />
                    </div>
                  </>
                )}

                {!loadingEnergie &&
                  !loadingTerritoire &&
                  !energie &&
                  !territoire && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                      <p>
                        Données énergie non disponibles pour cette commune.
                      </p>
                    </div>
                  )}

                {/* ── Eau potable ── */}
                {loadingEau && (
                  <div className="flex items-center gap-2 text-slate-400 justify-center py-4">
                    <Loader2 size={16} className="animate-spin" /> Qualité de l'eau…
                  </div>
                )}
                {eau && (() => {
                  // Dureté : classification
                  const thClass = (th: number | null) => {
                    if (th === null) return null;
                    if (th < 7)  return { label: "Très douce",       color: "text-sky-300",    bg: "bg-sky-900/30",    border: "border-sky-700/40" };
                    if (th < 15) return { label: "Douce",            color: "text-cyan-400",   bg: "bg-cyan-900/30",   border: "border-cyan-700/40" };
                    if (th < 25) return { label: "Modérément dure",  color: "text-teal-400",   bg: "bg-teal-900/30",   border: "border-teal-700/40" };
                    if (th < 42) return { label: "Dure",             color: "text-amber-400",  bg: "bg-amber-900/30",  border: "border-amber-700/40" };
                    return              { label: "Très dure",         color: "text-orange-400", bg: "bg-orange-900/30", border: "border-orange-700/40" };
                  };
                  const th = thClass(eau.th_avg);
                  const conformBadge = (v: number | null) =>
                    v === null ? null : v >= 99 ? "text-emerald-400" : v >= 95 ? "text-yellow-400" : "text-red-400";
                  const conformBar = (v: number | null) =>
                    v === null ? "" : v >= 99 ? "bg-emerald-400" : v >= 95 ? "bg-yellow-400" : "bg-red-400";

                  return (
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-1">
                          <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Waves size={15} className="text-cyan-400" />
                            Eau potable
                          </h2>
                          <span className="text-xs text-slate-500">
                            {eau.nb_prelevements} prélèvements · dernier le{" "}
                            {eau.derniere_analyse ? new Date(eau.derniere_analyse).toLocaleDateString("fr-FR") : "—"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-5">
                          Source : Hub'Eau — Contrôle sanitaire DIS (Ministère de la Santé)
                          {eau.distributeur && <> · <span className="text-slate-400">{eau.distributeur}</span></>}
                        </p>

                        {/* Conformité */}
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: "Conformité bactériologique", v: eau.taux_conformite_bact, nc: eau.nb_non_conformes_bact },
                            { label: "Conformité physico-chimique", v: eau.taux_conformite_pc,  nc: eau.nb_non_conformes_pc },
                          ].map(({ label, v, nc }) => (
                            <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">{label}</p>
                              {v !== null ? (
                                <>
                                  <div className="flex items-end gap-1 mb-2">
                                    <span className={`text-3xl font-bold ${conformBadge(v)}`}>{v.toFixed(1)}%</span>
                                    <span className="text-slate-500 text-sm mb-1">conformes</span>
                                  </div>
                                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                                    <div className={`h-1.5 rounded-full ${conformBar(v)}`} style={{ width: `${v}%` }} />
                                  </div>
                                  {nc > 0 && <p className="text-xs text-red-400 mt-2">{nc} non-conforme(s)</p>}
                                </>
                              ) : <p className="text-slate-500 text-sm">Non renseigné</p>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dureté — grande carte */}
                      {eau.th_avg !== null && th && (
                        <div className={`rounded-2xl border ${th.border} ${th.bg} p-5`}>
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Dureté de l'eau (TH)</p>
                              <div className="flex items-baseline gap-2">
                                <span className={`text-4xl font-black ${th.color}`}>{eau.th_avg.toFixed(1)}</span>
                                <span className="text-slate-400 text-sm">°f (degrés français)</span>
                              </div>
                              <span className={`inline-block mt-1 text-sm font-semibold ${th.color}`}>{th.label}</span>
                              {eau.physico_annee?.th_avg && eau.derniere_annee && eau.physico_annee.th_avg < eau.derniere_annee && (
                                <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                                  <AlertCircle size={11} /> données de {eau.physico_annee.th_avg}
                                </p>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 space-y-0.5 text-right">
                              <div><span className="text-sky-300">■</span> &lt; 7°f très douce</div>
                              <div><span className="text-cyan-400">■</span> 7–15°f douce</div>
                              <div><span className="text-teal-400">■</span> 15–25°f modérément dure</div>
                              <div><span className="text-amber-400">■</span> 25–42°f dure</div>
                              <div><span className="text-orange-400">■</span> &gt; 42°f très dure</div>
                            </div>
                          </div>
                          {/* Jauge */}
                          <div className="mt-4">
                            <div className="w-full h-2 rounded-full bg-gradient-to-r from-sky-400 via-teal-400 via-amber-400 to-orange-500 relative">
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-800 shadow"
                                style={{ left: `${Math.min(100, (eau.th_avg / 50) * 100)}%`, transform: "translateX(-50%) translateY(-50%)" }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                              <span>0°f</span><span>7</span><span>15</span><span>25</span><span>42</span><span>50+</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Autres paramètres */}
                      {[eau.nitrates_avg, eau.ph_avg, eau.conductivite_avg, eau.turbidite_avg, eau.calcium_avg, eau.sulfates_avg].some(v => v !== null) && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">Paramètres physico-chimiques moyens</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {([
                              { label: "Nitrates",     val: eau.nitrates_avg,     field: "nitrates_avg",     unite: "mg/L",  warn: eau.nitrates_avg !== null && eau.nitrates_avg > 25, limit: "limite 50 mg/L" },
                              { label: "pH",           val: eau.ph_avg,           field: "ph_avg",           unite: "",      warn: eau.ph_avg !== null && (eau.ph_avg < 6.5 || eau.ph_avg > 9), limit: "normal 6,5–9" },
                              { label: "Conductivité", val: eau.conductivite_avg, field: "conductivite_avg", unite: "µS/cm", warn: false, limit: "minéralisation" },
                              { label: "Turbidité",    val: eau.turbidite_avg,    field: "turbidite_avg",    unite: "NFU",   warn: eau.turbidite_avg !== null && eau.turbidite_avg > 1, limit: "limite 1 NFU" },
                              { label: "Calcium",      val: eau.calcium_avg,      field: "calcium_avg",      unite: "mg/L",  warn: false, limit: "" },
                              { label: "Sulfates",     val: eau.sulfates_avg,     field: "sulfates_avg",     unite: "mg/L",  warn: eau.sulfates_avg !== null && eau.sulfates_avg > 200, limit: "limite 250 mg/L" },
                            ] as { label: string; val: number | null; field: string; unite: string; warn: boolean; limit: string }[]).filter(p => p.val !== null).map(({ label, val, field, unite, warn, limit }) => {
                              const paramAnnee = eau.physico_annee?.[field];
                              const stale = paramAnnee && eau.derniere_annee && paramAnnee < eau.derniere_annee;
                              return (
                              <div key={label} className={`rounded-xl border p-3 ${warn ? "border-amber-700/50 bg-amber-900/20" : "border-slate-700 bg-slate-800"}`}>
                                <p className="text-[10px] text-slate-500 mb-1">{label}</p>
                                <p className={`text-xl font-bold ${warn ? "text-amber-400" : "text-white"}`}>
                                  {val!.toFixed(val! < 10 ? 2 : 1)}{unite && <span className="text-xs font-normal text-slate-400 ml-1">{unite}</span>}
                                </p>
                                {limit && <p className="text-[10px] text-slate-500 mt-0.5">{limit}</p>}
                                {warn && <p className="text-[10px] text-amber-400 mt-0.5">⚠ à surveiller</p>}
                                {stale && <p className="text-[10px] text-red-400 flex items-center gap-0.5 mt-0.5"><AlertCircle size={9} /> {paramAnnee}</p>}
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Historique */}
                      {eau.series.length > 1 && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                          <div className="px-5 py-3 border-b border-slate-800">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Historique des contrôles</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wide">
                                  <th className="px-4 py-2 text-left">Année</th>
                                  <th className="px-4 py-2 text-right">Prélèv.</th>
                                  <th className="px-4 py-2 text-right">Bact.</th>
                                  <th className="px-4 py-2 text-right">Chim.</th>
                                  <th className="px-4 py-2 text-right">TH (°f)</th>
                                  <th className="px-4 py-2 text-right">Nitrates</th>
                                  <th className="px-4 py-2 text-right">pH</th>
                                </tr>
                              </thead>
                              <tbody>
                                {eau.series.map((s, i) => (
                                  <tr key={s.annee} className={`border-b border-slate-800/40 ${i % 2 === 0 ? "" : "bg-slate-800/10"}`}>
                                    <td className="px-4 py-2 font-semibold text-slate-300">{s.annee}</td>
                                    <td className="px-4 py-2 text-right text-slate-400">{s.nb_prelevements}</td>
                                    <td className={`px-4 py-2 text-right font-medium ${s.taux_conformite_bact !== null ? conformBadge(s.taux_conformite_bact) : "text-slate-600"}`}>
                                      {s.taux_conformite_bact !== null ? `${s.taux_conformite_bact.toFixed(1)}%` : "—"}
                                    </td>
                                    <td className={`px-4 py-2 text-right font-medium ${s.taux_conformite_pc !== null ? conformBadge(s.taux_conformite_pc) : "text-slate-600"}`}>
                                      {s.taux_conformite_pc !== null ? `${s.taux_conformite_pc.toFixed(1)}%` : "—"}
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-300">{s.th_avg !== null ? s.th_avg.toFixed(1) : "—"}</td>
                                    <td className={`px-4 py-2 text-right ${s.nitrates_avg !== null && s.nitrates_avg > 25 ? "text-amber-400" : "text-slate-300"}`}>
                                      {s.nitrates_avg !== null ? `${s.nitrates_avg.toFixed(1)} mg/L` : "—"}
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-300">{s.ph_avg !== null ? s.ph_avg.toFixed(2) : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Graphique mensuel */}
                      {eauMensuel?.points?.length > 0 && (() => {
                        const eauParamOptions: { key: typeof eauParam; label: string; color: string; unit: string }[] = [
                          { key: "th_avg",           label: "Dureté (TH)",    color: "#22d3ee", unit: "°f"     },
                          { key: "nitrates_avg",      label: "Nitrates",       color: "#f59e0b", unit: "mg/L"   },
                          { key: "ph_avg",            label: "pH",             color: "#a78bfa", unit: ""       },
                          { key: "conductivite_avg",  label: "Conductivité",   color: "#34d399", unit: "µS/cm"  },
                          { key: "turbidite_avg",     label: "Turbidité",      color: "#fb923c", unit: "NFU"    },
                          { key: "calcium_avg",       label: "Calcium",        color: "#60a5fa", unit: "mg/L"   },
                          { key: "sulfates_avg",      label: "Sulfates",       color: "#f472b6", unit: "mg/L"   },
                        ];
                        const availableParams = eauParamOptions.filter(opt =>
                          eauMensuel.points.some((p: any) => p[opt.key] != null)
                        );
                        const selOpt = availableParams.find(p => p.key === eauParam) ?? availableParams[0];
                        const sel = selOpt ?? eauParamOptions[0];
                        const chartData = eauMensuel.points;
                        // Premier mois de chaque année présent dans les données → label d'année
                        const firstLabelPerYear = new Set<string>();
                        let lastYr = -1;
                        for (const p of chartData) {
                          if (p.annee !== lastYr) { firstLabelPerYear.add(p.label); lastYr = p.annee; }
                        }
                        const decimals = sel.key === "ph_avg" ? 2 : 1;
                        return (
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                              <h3 className="text-sm font-semibold text-white">Évolution mensuelle</h3>
                              <div className="flex flex-wrap gap-1">
                                {eauParamOptions.map(p => {
                                  const hasData = availableParams.some(a => a.key === p.key);
                                  const active = sel.key === p.key;
                                  return (
                                    <button key={p.key}
                                      onClick={() => hasData && setEauParam(p.key)}
                                      disabled={!hasData}
                                      title={!hasData ? "Pas de données disponibles" : undefined}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${active ? "text-white" : hasData ? "text-slate-400 hover:text-slate-200" : "text-slate-700 cursor-not-allowed line-through"}`}
                                      style={active ? { backgroundColor: p.color + "33", color: p.color, borderColor: p.color, border: "1px solid" } : {}}>
                                      {p.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }}
                                  interval={0}
                                  tickFormatter={(v: string) => firstLabelPerYear.has(v)
                                    ? String(chartData.find((p: any) => p.label === v)?.annee ?? "")
                                    : ""}
                                  height={20} />
                                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={50}
                                  tickFormatter={(v: number) => `${v.toFixed(decimals)} ${sel.unit}`} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                                  labelStyle={{ color: "#94a3b8" }}
                                  formatter={(v: number) => [`${v.toFixed(decimals)} ${sel.unit}`, sel.label]}
                                />
                                {/* ligne pointillée dans les trous */}
                                <Line type="monotone" dataKey={eauParam} stroke={sel.color} strokeWidth={1.5}
                                  strokeDasharray="4 4" strokeOpacity={0.35}
                                  dot={false} activeDot={false} connectNulls={true}
                                  legendType="none" tooltipType="none" />
                                {/* ligne pleine sur les vraies mesures */}
                                <Line type="monotone" dataKey={eauParam} stroke={sel.color} strokeWidth={2}
                                  dot={(props: any) => {
                                    if (props.value == null) return <g key={props.key} />;
                                    return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill={sel.color} stroke={sel.color} />;
                                  }}
                                  activeDot={{ r: 5 }} connectNulls={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── Tab: Économie ─────────────────────────────────────────── */}
            {tab === "economie" && (
              <div className="space-y-6">
                {fiscalitePro && (
                  <div>
                    {year !== effFiscPro && (
                      <p className="text-xs text-red-400 mb-2 flex items-center gap-1">
                        <AlertCircle size={11} />
                        Dernières données disponibles pour la fiscalité pro : {effFiscPro}
                      </p>
                    )}
                    <FiscaliteProSection data={fiscalitePro} />
                  </div>
                )}

                {loadingMarches && (
                  <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                    <Loader2 size={20} className="animate-spin" />
                    Chargement des marchés…
                  </div>
                )}
                {errorMarches && (
                  <div className="flex items-center gap-2 text-amber-400 bg-amber-900/20 border border-amber-800 rounded-xl p-4 text-sm">
                    <AlertCircle size={16} />
                    {errorMarches}
                  </div>
                )}
                {marches && (
                  <>
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center">
                        Marchés publics {marches.annee}
                        <StaleDataBadge selected={year} effective={effMarches} />
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {marches.total} marché
                        {marches.total > 1 ? "s" : ""} ·{" "}
                        {marches.scope === "acheteur"
                          ? "passés par la commune"
                          : "exécutés sur le territoire"}
                        <span className="ml-2 text-slate-600">
                          · DECP · seuil &gt; 40 000 €
                        </span>
                      </p>
                    </div>

                    {marches.marches.length === 0 ? (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                        <p className="text-sm">
                          Aucun marché publié pour {marches.annee}.
                        </p>
                        <p className="text-xs mt-1">
                          Les données DECP couvrent les marchés &gt; 40 000 €
                          depuis 2022.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <MarchesTable
                          marches={marches.marches}
                          showAcheteur={marches.scope === "lieu"}
                        />
                        {/* ── Pagination ── */}
                        <div className="px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>Lignes par page :</span>
                            {[10, 25, 50, 100].map((n) => (
                              <button
                                key={n}
                                onClick={() => { setMarchesLimit(n); setMarchesPage(1); }}
                                className={`px-2 py-0.5 rounded ${marchesLimit === n ? "bg-blue-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>
                              {((marchesPage - 1) * marchesLimit) + 1}–{Math.min(marchesPage * marchesLimit, marches.total)} sur {marches.total}
                            </span>
                            <button
                              disabled={marchesPage <= 1}
                              onClick={() => setMarchesPage((p) => p - 1)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              ‹
                            </button>
                            <span className="text-slate-300 font-medium">{marchesPage} / {marches.pages ?? 1}</span>
                            <button
                              disabled={marchesPage >= (marches.pages ?? 1)}
                              onClick={() => setMarchesPage((p) => p + 1)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              ›
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Tab: Conseil municipal ────────────────────────────────── */}
            {tab === "conseil" && (
              <div className="space-y-6">
                {(loadingElus || loadingHist) && !historiqueElections && (
                  <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                    <Loader2 size={20} className="animate-spin" />
                    Chargement…
                  </div>
                )}

                {historiqueElections && (() => {
                  const sortedElections = [...historiqueElections.elections].sort((a, b) => b.annee - a.annee);
                  const mostRecentId = sortedElections[0]?.id_election ?? null;

                  // Afficher le maire actuel pour toutes les élections depuis son mandat
                  const mairesParElection: Record<string, string> = {};
                  if (elus?.maire) {
                    const nom = `${elus.maire.prenom} ${elus.maire.nom}`.trim();
                    const mandatYear = elus.maire.date_mandat
                      ? new Date(elus.maire.date_mandat).getFullYear()
                      : null;
                    if (nom) {
                      sortedElections.forEach((e) => {
                        if (!mandatYear || e.annee >= mandatYear) {
                          mairesParElection[e.id_election] = nom;
                        }
                      });
                    }
                  }

                  const selectedElection = selectedElectionId != null
                    ? historiqueElections.elections.find((e) => e.id_election === selectedElectionId) ?? null
                    : sortedElections[0] ?? null;

                  return (
                    <>
                      {/* Chart 1 — Alternance (toujours visible) */}
                      <AlternanceTimeline
                        data={historiqueElections}
                        mairesParElection={mairesParElection}
                        selectedId={selectedElectionId ?? mostRecentId}
                        onSelect={setSelectedElectionId}
                      />

                      {/* Conseil municipal — affiché entre les deux graphiques quand une année est sélectionnée */}
                      {selectedElectionId != null && (
                        selectedElectionId === mostRecentId ? (
                          <>
                            {loadingElus && (
                              <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
                                <Loader2 size={13} className="animate-spin" />
                                Chargement du conseil (RNE)…
                              </div>
                            )}
                            {elus && <ElusSection data={elus} />}
                          </>
                        ) : (
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">
                            <p className="text-xs text-slate-500">
                              Composition du conseil municipal pour {selectedElection?.label} non disponible —
                              le Répertoire National des Élus ne conserve que le mandat en cours.
                            </p>
                          </div>
                        )
                      )}

                      {/* Chart 2 — Résultats (toujours visible, année sélectionnée ou la plus récente) */}
                      {selectedElection && (
                        <ResultatsBarChart election={selectedElection} />
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── Tab: Grand livre ──────────────────────────────────────── */}
            {/* ── Tab: Immobilier ──────────────────────────────────────── */}
            {tab === "immobilier" && (
              <div className="space-y-6">
                {/* ── Pas de données DVF ── */}
                {!loadingDvfEvo && !loadingDvfTx && !dvfEvo && !dvfTx && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                    <Building2 size={32} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium mb-1">Pas de données immobilières disponibles</p>
                    <p className="text-slate-500 text-sm">Cette commune n'a pas de transactions DVF enregistrées dans la base.</p>
                  </div>
                )}
                {/* ── Évolution maisons/appartements (toutes années dispo) ── */}
                {loadingDvfEvo && !dvfEvo && (
                  <div className="flex items-center gap-2 text-slate-400 py-4 justify-center">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Chargement de l'évolution DVF+…</span>
                  </div>
                )}
                {dvfEvo && (() => {
                  const hasEvo = dvfEvo.evolution.maisons.length > 1 || dvfEvo.evolution.appartements.length > 1;
                  if (!hasEvo) return null;
                  const allYears = Array.from(new Set([
                    ...dvfEvo.evolution.maisons.map(d => d.annee),
                    ...dvfEvo.evolution.appartements.map(d => d.annee),
                  ])).sort();
                  const mMap = Object.fromEntries(dvfEvo.evolution.maisons.map(d => [d.annee, d]));
                  const aMap = Object.fromEntries(dvfEvo.evolution.appartements.map(d => [d.annee, d]));
                  const chartData = allYears.map(yr => ({
                    annee: yr,
                    maisons:      mMap[yr]?.prix_m2_median ?? null,
                    appartements: aMap[yr]?.prix_m2_median ?? null,
                  }));
                  const yearMin = allYears[0];
                  const yearMax = allYears[allYears.length - 1];
                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                      <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                        <Building2 size={15} className="text-blue-400" />
                        Évolution du prix médian au m²
                        <span className="text-xs font-normal text-slate-400 ml-1">maisons & appartements · {yearMin}–{yearMax}</span>
                      </h2>
                      <p className="text-xs text-slate-500 mb-5">Source : DVF+ open data — DGFiP / Etalab (transactions individuelles géolocalisées)</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickLine={false} axisLine={false}
                            tickFormatter={(v) => `${new Intl.NumberFormat("fr-FR").format(v)} €`}
                            width={78}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
                            formatter={(v: number, name: string) => [
                              `${new Intl.NumberFormat("fr-FR").format(v)} €/m²`,
                              name === "maisons" ? "Maisons" : "Appartements",
                            ]}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 8 }}
                            formatter={(v) => v === "maisons" ? "Maisons" : "Appartements"}
                          />
                          <Line type="monotone" dataKey="maisons"      stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} activeDot={{ r: 5 }} connectNulls />
                          <Line type="monotone" dataKey="appartements" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 5 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                      {/* Stats récapitulatives dernière année */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {(["maisons", "appartements"] as const).map((type) => {
                          const series = type === "maisons" ? dvfEvo.evolution.maisons : dvfEvo.evolution.appartements;
                          const last   = series[series.length - 1];
                          if (!last) return null;
                          const prev   = series[series.length - 2];
                          const diff   = prev ? Math.round(((last.prix_m2_median - prev.prix_m2_median) / prev.prix_m2_median) * 100) : null;
                          const color  = type === "maisons" ? "text-amber-400" : "text-blue-400";
                          const label  = type === "maisons" ? "Maisons" : "Appartements";
                          return (
                            <div key={type} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                              <p className={`text-xs font-semibold ${color} mb-1`}>{label} — {last.annee}</p>
                              <p className="text-xl font-bold text-white">
                                {new Intl.NumberFormat("fr-FR").format(last.prix_m2_median)} €/m²
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {last.nb} ventes · moy. {last.surface_moy} m²
                                {diff !== null && (
                                  <span className={`ml-2 font-semibold ${diff >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                    {diff >= 0 ? "+" : ""}{diff}% vs {prev!.annee}
                                  </span>
                                )}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Carte des ventes depuis 2014 ─── */}
                {(dvfEvo || dvfTx || loadingDvfPoints) && (
                  <div id="dvf-map-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Building2 size={15} className="text-amber-400" />
                        Carte des ventes immobilières
                        <span className="text-xs font-normal text-slate-400 ml-1">toutes les ventes géolocalisées disponibles</span>
                      </h2>
                      {dvfPoints && dvfPoints.features?.length > 0 && (
                        <button
                          onClick={() => {
                            const next = dvfMapRef.current?.togglePoints();
                            if (next !== undefined) setDvfPointsVisible(next);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${dvfPointsVisible ? "bg-slate-700 hover:bg-slate-600 text-slate-300" : "bg-amber-600 hover:bg-amber-500 text-white"}`}
                        >
                          <MapPin size={11} />
                          {dvfPointsVisible ? "Masquer les points" : "Afficher les points"}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      Source : DVF+ open data — DGFiP / Etalab —
                      <span className="inline-flex items-center gap-1 ml-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Maisons
                      </span>
                      <span className="inline-flex items-center gap-1 ml-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Appartements
                      </span>
                    </p>
                    {loadingDvfPoints && !dvfPoints && (
                      <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-sm">Chargement de la carte…</span>
                      </div>
                    )}
                    {dvfPoints && dvfPoints.features?.length > 0 && (
                      <DvfSalesMap ref={dvfMapRef} pointsData={dvfPoints} />
                    )}
                    {!loadingDvfPoints && (!dvfPoints || dvfPoints.features?.length === 0) && (
                      <p className="text-xs text-slate-500 py-4 text-center">Aucune vente géolocalisée disponible.</p>
                    )}
                  </div>
                )}

                {/* ── Transactions de l'année sélectionnée ─── */}
                {(dvfEvo || dvfTx || loadingDvfTx) && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <Building2 size={15} className="text-emerald-400" />
                      Transactions {effTx}
                      {year !== effTx && <StaleDataBadge selected={year} effective={effTx} />}
                      {dvfTx && <span className="text-xs font-normal text-slate-400 ml-1">· {dvfTx.total} ventes</span>}
                    </h2>
                    <p className="text-xs text-slate-500 mb-4">Source : DVF+ open data — DGFiP / Etalab — valeurs nettes vendeur, hors frais de notaire</p>
                    {loadingDvfTx && (
                      <div className="flex items-center gap-2 text-slate-400 py-4 justify-center">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-sm">Chargement des transactions…</span>
                      </div>
                    )}
                    {!loadingDvfTx && (!dvfTx || dvfTx.transactions.length === 0) && (
                      <p className="text-xs text-slate-500 py-4 text-center">Aucune transaction enregistrée pour {effTx}.</p>
                    )}
                    {dvfTx && dvfTx.transactions.length > 0 && (() => {
                      const fmtNum = new Intl.NumberFormat("fr-FR");
                      type SortCol = "date" | "surface" | "prix" | "prix_m2";
                      const SortTh = ({ col, align = "right", children }: { col: SortCol; align?: "left"|"right"; children: React.ReactNode }) => {
                        const active = dvfTxSortBy === col;
                        const nextDir = active && dvfTxSortDir === "desc" ? "asc" : "desc";
                        return (
                          <th
                            className={`py-2 pr-3 font-medium cursor-pointer select-none group ${align === "right" ? "text-right" : "text-left"} ${active ? "text-white" : "text-slate-400 hover:text-slate-200"} transition-colors`}
                            onClick={() => { setDvfTxSortBy(col); setDvfTxSortDir(active ? nextDir : "desc"); setDvfTxPage(1); }}
                          >
                            <span className="inline-flex items-center gap-1">
                              {children}
                              <span className="text-[10px]">
                                {active ? (dvfTxSortDir === "desc" ? "↓" : "↑") : <span className="opacity-0 group-hover:opacity-40">↓</span>}
                              </span>
                            </span>
                          </th>
                        );
                      };
                      return (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-700">
                                  <SortTh col="date" align="left">Date</SortTh>
                                  <th className="text-left py-2 pr-3 font-medium text-slate-400">Type</th>
                                  <SortTh col="surface">Surface</SortTh>
                                  <SortTh col="prix">Prix total</SortTh>
                                  <SortTh col="prix_m2">€/m²</SortTh>
                                </tr>
                              </thead>
                              <tbody>
                                {dvfTx.transactions.map((tx, i) => {
                                  const isAppt   = tx.codtypbien === "Appartement";
                                  const isMaison = tx.codtypbien === "Maison";
                                  const typeColor = isAppt ? "text-blue-400" : isMaison ? "text-amber-400" : "text-slate-400";
                                  const typeShort = isAppt ? "Appt" : isMaison ? "Maison" : (tx.type || tx.codtypbien || "—");
                                  const hasGeo = tx.lat != null && tx.lon != null;
                                  const handleLocate = hasGeo ? () => {
                                    const feat = dvfPoints?.features?.find((f: any) => {
                                      const [flon, flat] = f.geometry.coordinates;
                                      return Math.abs(flat - tx.lat!) < 0.00001 && Math.abs(flon - tx.lon!) < 0.00001;
                                    });
                                    if (!feat?.properties?.id) return;
                                    const emoji = isMaison ? "🏠" : isAppt ? "🏢" : "🏠";
                                    const prixStr    = tx.prix    ? `${fmtNum.format(tx.prix)} €`    : "–";
                                    const prixM2Str  = tx.prix_m2 ? `${fmtNum.format(tx.prix_m2)} €/m²` : "–";
                                    const surfaceStr = tx.surface_bati ? `${tx.surface_bati} m²`    : "–";
                                    const dateStr    = tx.date ? new Date(tx.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "–";
                                    const popup = `<div style="font-size:12px;line-height:1.8;min-width:160px">
                                      <strong style="font-size:13px">${emoji} ${typeShort}${tx.vefa ? " · VEFA" : ""}</strong><br/>
                                      <span style="color:#888">${dateStr}</span><br/>
                                      <strong>${prixM2Str}</strong><br/>
                                      <span style="color:#555">${prixStr}</span> · <span style="color:#555">${surfaceStr}</span>
                                    </div>`;
                                    dvfMapRef.current?.isolateId(feat.properties.id, popup);
                                    setDvfPointsVisible(false);
                                    document.getElementById("dvf-map-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                                  } : undefined;
                                  return (
                                    <tr
                                      key={i}
                                      className={`border-b border-slate-800/50 transition-colors ${hasGeo ? "cursor-pointer hover:bg-emerald-900/20 group" : "hover:bg-slate-800/30"}`}
                                      onClick={handleLocate}
                                      title={hasGeo ? "Cliquer pour localiser sur la carte" : undefined}
                                    >
                                      <td className="py-1.5 pr-3 text-slate-300 flex items-center gap-1.5">
                                        {tx.date ? new Date(tx.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                        {hasGeo && <MapPin size={10} className="text-slate-600 group-hover:text-emerald-400 transition-colors flex-shrink-0" />}
                                      </td>
                                      <td className={`py-1.5 pr-3 font-medium ${typeColor}`}>
                                        {typeShort}{tx.vefa ? <span className="ml-1 text-[10px] text-violet-400">VEFA</span> : null}
                                      </td>
                                      <td className="py-1.5 pr-3 text-right text-slate-300">{tx.surface_bati ? `${tx.surface_bati} m²` : "—"}</td>
                                      <td className="py-1.5 pr-3 text-right text-slate-300">{tx.prix ? `${fmtNum.format(tx.prix)} €` : "—"}</td>
                                      <td className="py-1.5 text-right font-semibold text-white">{tx.prix_m2 ? `${fmtNum.format(tx.prix_m2)} €` : "—"}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800 gap-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>Lignes :</span>
                              {[25, 50, 100].map(n => (
                                <button
                                  key={n}
                                  onClick={() => { setDvfTxPageSize(n); setDvfTxPage(1); }}
                                  className={`px-2 py-0.5 rounded ${dvfTxPageSize === n ? "bg-emerald-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}
                                >{n}</button>
                              ))}
                            </div>
                            {dvfTx.pages > 1 && (
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500">
                                  {((dvfTx.page - 1) * dvfTxPageSize) + 1}–{Math.min(dvfTx.page * dvfTxPageSize, dvfTx.total)} sur {fmtNum.format(dvfTx.total)}
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setDvfTxPage(p => Math.max(1, p - 1))}
                                    disabled={dvfTx.page <= 1}
                                    className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  >← Préc.</button>
                                  <button
                                    onClick={() => setDvfTxPage(p => Math.min(dvfTx.pages, p + 1))}
                                    disabled={dvfTx.page >= dvfTx.pages}
                                    className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  >Suiv. →</button>
                                </div>
                              </div>
                            )}
                            {dvfTx.pages <= 1 && (
                              <span className="text-xs text-slate-500">{fmtNum.format(dvfTx.total)} ventes</span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* ── Loyers de marché (données 2023) ─── */}
                {errorImmo && (
                  <div className="flex items-center gap-2 text-amber-400 bg-amber-900/20 border border-amber-800 rounded-xl p-4 text-sm">
                    <AlertCircle size={16} /> Pas de données de loyers pour cette commune.
                  </div>
                )}
                {immo && (immo.loyer_app_m2 || immo.loyer_mai_m2) && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <Building2 size={15} className="text-emerald-400" />
                      Loyers de marché
                      <span className="text-xs font-normal text-slate-400 ml-1">données 2023</span>
                      {year !== 2023 && <StaleDataBadge selected={year} effective={2023} />}
                    </h2>
                    <p className="text-xs text-slate-500 mb-5">Source : Carte des loyers — Ministère de la Transition écologique</p>
                    <div className="grid grid-cols-2 gap-3">
                      {immo.loyer_app_m2 && (
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Loyer appartement</p>
                          <p className="text-2xl font-bold text-white">{immo.loyer_app_m2.toFixed(2)} €</p>
                          <p className="text-xs text-slate-500 mt-1">par m² par mois</p>
                        </div>
                      )}
                      {immo.loyer_mai_m2 && (
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Loyer maison</p>
                          <p className="text-2xl font-bold text-white">{immo.loyer_mai_m2.toFixed(2)} €</p>
                          <p className="text-xs text-slate-500 mt-1">par m² par mois</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "comptable" && (
              <div className="space-y-6">
                {fiscalite && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-sm font-bold text-white mb-4 flex items-center flex-wrap gap-x-2">
                      Fiscalité locale {fiscalite.annee}
                      <span className="text-xs font-normal text-slate-400">
                        — {fiscalite.intercommunalite || "—"}
                      </span>
                      <StaleDataBadge selected={year} effective={effComp} />
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          label: "TFB — commune",
                          value: fiscalite.tfb.taux_commune,
                          suffix: "%",
                          sub: `Global : ${fiscalite.tfb.taux_global?.toFixed(2)}%`,
                        },
                        {
                          label: "TFB — interco",
                          value: fiscalite.tfb.taux_intercommunal,
                          suffix: "%",
                          sub: "taux voté",
                        },
                        {
                          label: "TH rés. secondaires",
                          value: fiscalite.th.taux_commune,
                          suffix: "%",
                          sub: `Majoration RS : +${fiscalite.th.majoration_rs ?? 0}%`,
                        },
                        {
                          label: "TEOM",
                          value: fiscalite.teom.taux,
                          suffix: "%",
                          sub: "Taxe ordures ménagères",
                        },
                      ].map(({ label, value, suffix, sub }) => (
                        <div
                          key={label}
                          className="bg-slate-800 border border-slate-700 rounded-xl p-3"
                        >
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                            {label}
                          </p>
                          <p className="text-xl font-bold text-white">
                            {value != null
                              ? `${value?.toFixed(2)}${suffix}`
                              : "—"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {loadingComptes && (
                  <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                    <Loader2 size={20} className="animate-spin" />
                    Chargement du grand livre…
                  </div>
                )}
                {errorComptes && (
                  <div className="flex items-center gap-2 text-amber-400 bg-amber-900/20 border border-amber-800 rounded-xl p-4 text-sm">
                    <AlertCircle size={16} />
                    {errorComptes} — les balances DGFiP couvrent uniquement les
                    exercices 2013–2023.
                  </div>
                )}
                {comptes && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-bold text-white flex items-center flex-wrap gap-x-2">
                      Grand livre {comptes.annee}
                      <span className="text-xs font-normal text-slate-400">
                        nomenclature {comptes.nomen} · {comptes.nb_lignes}{" "}
                        lignes
                      </span>
                      <StaleDataBadge selected={year} effective={effComp} />
                    </h2>
                    {comptes.classes.map((classe) => (
                      <ClasseAccordion key={classe.classe} classe={classe} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Footer dark />
    </div>
  );
}
