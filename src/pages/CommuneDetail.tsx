import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
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
  EauData,
} from "../types";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";
import { StatCard } from "../components/Panel/StatCard";
import { higherIsBetter as hib } from "../utils/indicators";
import { EvolutionChart } from "../components/Charts/EvolutionChart";
import { AreaChart, Area, LineChart, Line, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ComparisonChart } from "../components/Charts/ComparisonChart";
import { AgregatsChart } from "../components/Charts/AgregatsChart";
import { formatEuro, formatNumber, trancheLabel } from "../utils/format";
import {
  type FinancialNote,
  type FinancialScore,
  computeFinancialScore,
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
    try {
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layer = L.geoJSON(geoData as any, {
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

// ── Carte des ventes DVF (Leaflet canvas) ────────────────────────────────────

function DvfSalesMap({ mapData }: { mapData: import("../types").DvfMapData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    // Fond de carte clair CartoDB Positron (montre les bâtiments)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/">OSM</a> © <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);
    map.setView([46.5, 2.3], 5);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapData?.features?.length) return;
    const map = mapRef.current;
    const layers: L.Layer[] = [];
    const bounds: [number, number][] = [];

    for (const feat of mapData.features) {
      const p = feat.properties;
      const isMaison = p.codtypbien?.startsWith("11");
      const fillColor = isMaison ? "#f59e0b" : "#3b82f6";
      const borderColor = isMaison ? "#d97706" : "#1d4ed8";
      const popupHtml = `
        <div style="font-size:12px;line-height:1.7;min-width:160px">
          <strong style="font-size:13px">${isMaison ? "🏠 Maison" : "🏢 Appartement"}</strong>${p.vefa ? ' <em style="color:#7c3aed">VEFA</em>' : ""}<br/>
          <span style="color:#555">${p.surface} m²</span> — <strong>${new Intl.NumberFormat("fr-FR").format(p.prix)} €</strong><br/>
          <span style="color:#888">${new Intl.NumberFormat("fr-FR").format(p.prix_m2)} €/m² · ${p.date ? p.date.slice(0, 7) : p.annee}</span>
        </div>`;

      let layer: L.Layer;
      if (feat.geometry.type === "Point") {
        const [lon, lat] = feat.geometry.coordinates as [number, number];
        bounds.push([lat, lon]);
        layer = L.circleMarker([lat, lon], {
          radius: 5,
          fillColor,
          color: borderColor,
          weight: 1,
          fillOpacity: 0.75,
        }).bindPopup(popupHtml);
      } else {
        // Polygon ou MultiPolygon cadastral
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        layer = L.geoJSON(feat as any, {
          style: {
            fillColor,
            color: borderColor,
            weight: 1.5,
            fillOpacity: 0.55,
          },
        }).bindPopup(popupHtml);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (layer as any).eachLayer((sub: L.Path) => {
          const b = (sub as L.Polygon).getBounds();
          if (b.isValid()) bounds.push([b.getCenter().lat, b.getCenter().lng]);
        });
      }
      layer.addTo(map);
      layers.push(layer);
    }

    if (bounds.length) {
      try { map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24], maxZoom: 17 }); } catch { /* noop */ }
    }
    return () => { layers.forEach(l => l.remove()); };
  }, [mapData]);

  return <div ref={containerRef} style={{ width: "100%", height: "400px", borderRadius: "0.75rem", overflow: "hidden" }} />;
}

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
              <>
                <tr
                  key={rowId}
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
              </>
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

  const maxVoix = Math.max(...nuances.map((n) => n.nb_voix ?? 0), 1);
  const totalVoix = nuances.reduce((s, n) => s + (n.nb_voix ?? 0), 0);

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
              <div className="flex items-baseline justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: n.couleur }}
                  />
                  <span className="text-slate-200 font-medium truncate">
                    {n.libelle}
                  </span>
                  {n.tete_liste && (
                    <span className="text-slate-500 text-[10px] hidden sm:inline truncate">
                      — {n.tete_liste}
                    </span>
                  )}
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
                </div>
              </div>
              <div className="h-7 bg-slate-800 rounded-lg overflow-hidden">
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
              {n.tete_liste && (
                <p className="text-[10px] text-slate-600 mt-0.5 sm:hidden">{n.tete_liste}</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-600 mt-4">
        Votes blancs et nuls non disponibles dans cette source (données agrégées par liste).
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
    e.fonction.toLowerCase().includes("adjoint")
  );
  const conseillers = data.conseillers.filter(
    (e) => !e.fonction.toLowerCase().includes("adjoint") && !e.fonction.toLowerCase().includes("maire")
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

function FinancialScoreCard({ fs, onInfoClick }: { fs: FinancialScore; onInfoClick?: () => void }) {
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

export function CommuneDetail() {
  const { codeInsee } = useParams<{ codeInsee: string }>();
  const [year, setYear] = useState(2024);
  const { data: availableYearsData } = useApi(() => api.getAvailableYears(), []);
  const finMax = availableYearsData?.latest ?? 2024;
  // Mettre à jour l'année par défaut dès que les années dispo sont chargées
  useEffect(() => {
    if (availableYearsData?.latest) setYear(availableYearsData.latest);
  }, [availableYearsData?.latest]);

  // Années effectives par dataset — clamp sur le max disponible de chaque source
  const effFin     = Math.min(year, finMax);
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

  const {
    data: finances,
    loading: loadingFin,
    error: errorFin,
  } = useApi(() => api.getCommuneFinances(codeInsee!, effFin), [codeInsee, effFin]);

  const {
    data: comparison,
    loading: loadingCmp,
    error: errorCmp,
  } = useApi(
    () => api.getCommuneComparison(codeInsee!, effFin),
    [codeInsee, effFin]
  );

  const {
    data: comptes,
    loading: loadingComptes,
    error: errorComptes,
  } = useApi(
    () => api.getComptes(codeInsee!, effComp),
    [codeInsee, effComp]
  );

  const { data: fiscalite } = useApi(
    () => api.getFiscalite(codeInsee!, effComp),
    [codeInsee, effComp]
  );

  const {
    data: marches,
    loading: loadingMarches,
    error: errorMarches,
  } = useApi(
    () =>
      tab === "economie"
        ? api.getMarches(codeInsee!, effMarches)
        : Promise.resolve(null as unknown as import("../types").MarchesData),
    [codeInsee, effMarches, tab]
  );

  const { data: energie, loading: loadingEnergie } = useApi(
    () =>
      tab === "energie"
        ? api.getEnergie(codeInsee!, effEnergie)
        : Promise.resolve(null as unknown as EnergieData),
    [codeInsee, effEnergie, tab]
  );

  const { data: territoire, loading: loadingTerritoire } = useApi(
    () =>
      tab === "energie"
        ? api.getTerritoire(codeInsee!)
        : Promise.resolve(null as unknown as TerritoireData),
    [codeInsee, tab]
  );

  const { data: eau, loading: loadingEau } = useApi(
    () =>
      tab === "energie"
        ? api.getEau(codeInsee!)
        : Promise.resolve(null as unknown as EauData),
    [codeInsee, tab]
  );

  const { data: fiscalitePro } = useApi(
    () =>
      tab === "economie"
        ? api.getFiscalitePro(codeInsee!, effFiscPro)
        : Promise.resolve(null as unknown as FiscaliteProData),
    [codeInsee, effFiscPro, tab]
  );

  const { data: elus, loading: loadingElus } = useApi(
    () =>
      tab === "conseil"
        ? api.getElus(codeInsee!)
        : Promise.resolve(null as unknown as ElusData),
    [codeInsee, tab]
  );

  const { data: historiqueElections, loading: loadingHist } = useApi(
    () =>
      tab === "conseil"
        ? api.getHistoriqueElections(codeInsee!)
        : Promise.resolve(null as unknown as HistoriqueElections),
    [codeInsee, tab]
  );

  const { data: immo, loading: loadingImmo, error: errorImmo } = useApi(
    () =>
      tab === "immobilier"
        ? api.getImmobilier(codeInsee!, effImmo)
        : Promise.resolve(null as unknown as ImmobilierData),
    [codeInsee, tab, effImmo]
  );

  const { data: immoEvo } = useApi(
    () =>
      tab === "immobilier"
        ? api.getImmobilierEvolution(codeInsee!)
        : Promise.resolve(null as unknown as Array<{ annee: number; prix_m2: number; nb_mutations: number | null }>),
    [codeInsee, tab]
  );

  const { data: dvfEvo, loading: loadingDvfEvo } = useApi(
    () =>
      tab === "immobilier"
        ? api.getDvfEvolution(codeInsee!)
        : Promise.resolve(null as unknown as import("../types").DvfEvolutionData),
    [codeInsee, tab]
  );

  const effTx = Math.min(Math.max(year, 2020), 2025);
  const { data: dvfTx, loading: loadingDvfTx } = useApi(
    () =>
      tab === "immobilier"
        ? api.getDvfTransactions(codeInsee!, effTx)
        : Promise.resolve(null as unknown as import("../types").DvfTransactionsData),
    [codeInsee, tab, effTx]
  );

  const { data: dvfMap, loading: loadingDvfMap } = useApi(
    () =>
      tab === "immobilier"
        ? api.getDvfMap(codeInsee!)
        : Promise.resolve(null as unknown as import("../types").DvfMapData),
    [codeInsee, tab]
  );

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
                to="/"
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
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                        {label}
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
                {(() => {
                  const fs = computeFinancialScore(finances.agregats, finances.evolution_yoy ?? {});
                  return fs ? <FinancialScoreCard fs={fs} onInfoClick={scrollToScoreDetail} /> : null;
                })()}
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
                const fs = computeFinancialScore(finances.agregats, finances.evolution_yoy ?? {});
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
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Score de santé financière</p>
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
                              <th className="px-4 py-3 text-right">Min</th>
                              <th className="px-4 py-3 text-right">Max</th>
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
                                    {formatEuro(c.min_tranche)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400 text-xs">
                                    {formatEuro(c.max_tranche)}
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
                {eau && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Waves size={15} className="text-cyan-400" />
                        Eau potable
                      </h2>
                      <span className="text-xs text-slate-500">
                        {eau.nb_prelevements} prélèvements · dernier le{" "}
                        {eau.derniere_analyse
                          ? new Date(eau.derniere_analyse).toLocaleDateString("fr-FR")
                          : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-5">
                      Source : Hub'Eau — Contrôle sanitaire (Ministère de la Santé)
                      {eau.distributeur && <> · {eau.distributeur}</>}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Bactériologique */}
                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Conformité bactériologique</p>
                        {eau.taux_conformite_bact !== null ? (
                          <>
                            <div className="flex items-end gap-1 mb-2">
                              <span className={`text-3xl font-bold ${eau.taux_conformite_bact >= 99 ? "text-emerald-400" : eau.taux_conformite_bact >= 95 ? "text-yellow-400" : "text-red-400"}`}>
                                {eau.taux_conformite_bact.toFixed(1)}%
                              </span>
                              <span className="text-slate-500 text-sm mb-1">conformes</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${eau.taux_conformite_bact >= 99 ? "bg-emerald-400" : eau.taux_conformite_bact >= 95 ? "bg-yellow-400" : "bg-red-400"}`}
                                style={{ width: `${eau.taux_conformite_bact}%` }}
                              />
                            </div>
                            {eau.nb_non_conformes_bact > 0 && (
                              <p className="text-xs text-red-400 mt-2">{eau.nb_non_conformes_bact} non-conforme(s)</p>
                            )}
                          </>
                        ) : (
                          <p className="text-slate-500 text-sm">Non renseigné</p>
                        )}
                      </div>
                      {/* Physico-chimique */}
                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Conformité physico-chimique</p>
                        {eau.taux_conformite_pc !== null ? (
                          <>
                            <div className="flex items-end gap-1 mb-2">
                              <span className={`text-3xl font-bold ${eau.taux_conformite_pc >= 99 ? "text-emerald-400" : eau.taux_conformite_pc >= 95 ? "text-yellow-400" : "text-red-400"}`}>
                                {eau.taux_conformite_pc.toFixed(1)}%
                              </span>
                              <span className="text-slate-500 text-sm mb-1">conformes</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${eau.taux_conformite_pc >= 99 ? "bg-emerald-400" : eau.taux_conformite_pc >= 95 ? "bg-yellow-400" : "bg-red-400"}`}
                                style={{ width: `${eau.taux_conformite_pc}%` }}
                              />
                            </div>
                            {eau.nb_non_conformes_pc > 0 && (
                              <p className="text-xs text-red-400 mt-2">{eau.nb_non_conformes_pc} non-conforme(s)</p>
                            )}
                          </>
                        ) : (
                          <p className="text-slate-500 text-sm">Non renseigné</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                        {marches.total > marches.marches.length && (
                          <div className="px-6 py-3 border-t border-slate-800 text-xs text-slate-500 text-center">
                            {marches.marches.length} sur {marches.total} ·
                            triés par montant décroissant
                          </div>
                        )}
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
                    <span className="text-slate-600 text-xs ml-1">(premier chargement : ~30s)</span>
                  </div>
                )}

                {historiqueElections && (() => {
                  const sortedElections = [...historiqueElections.elections].sort((a, b) => b.annee - a.annee);
                  const mostRecentId = sortedElections[0]?.id_election ?? null;

                  const mairesParElection: Record<string, string> = {};
                  if (mostRecentId && elus?.maire) {
                    const nom = `${elus.maire.prenom} ${elus.maire.nom}`.trim();
                    if (nom) mairesParElection[mostRecentId] = nom;
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
                      <p className="text-xs text-slate-500 mb-5">Source : API DVF+ open data — Cerema / DGALN · médiane des ventes par année</p>
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
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <Building2 size={15} className="text-amber-400" />
                    Carte des ventes immobilières
                    <span className="text-xs font-normal text-slate-400 ml-1">ventes 2020–2025 · ~3 000 points</span>
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Source : DVF géolocalisées — DGFiP / Etalab —
                    <span className="inline-flex items-center gap-1 ml-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Maisons
                    </span>
                    <span className="inline-flex items-center gap-1 ml-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Appartements
                    </span>
                  </p>
                  {loadingDvfMap && !dvfMap && (
                    <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-sm">Chargement de la carte…</span>
                    </div>
                  )}
                  {dvfMap && dvfMap.features.length > 0 && (
                    <DvfSalesMap mapData={dvfMap} />
                  )}
                  {dvfMap && dvfMap.features.length === 0 && (
                    <p className="text-xs text-slate-500 py-4 text-center">Aucune vente géolocalisée disponible.</p>
                  )}
                </div>

                {/* ── Transactions de l'année sélectionnée ─── */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <Building2 size={15} className="text-emerald-400" />
                    Transactions {effTx}
                    {year !== effTx && <StaleDataBadge selected={year} effective={effTx} />}
                    <span className="text-xs font-normal text-slate-400 ml-1">· max 500</span>
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">Source : DVF+ open data Cerema — valeurs nettes vendeur, hors frais de notaire</p>
                  {loadingDvfTx && !dvfTx && (
                    <div className="flex items-center gap-2 text-slate-400 py-4 justify-center">
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-sm">Chargement des transactions…</span>
                    </div>
                  )}
                  {dvfTx && dvfTx.transactions.length === 0 && (
                    <p className="text-xs text-slate-500 py-4 text-center">Aucune transaction enregistrée pour {effTx}.</p>
                  )}
                  {dvfTx && dvfTx.transactions.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-700">
                            <th className="text-left py-2 pr-3 font-medium">Date</th>
                            <th className="text-left py-2 pr-3 font-medium">Type</th>
                            <th className="text-right py-2 pr-3 font-medium">Surface</th>
                            <th className="text-right py-2 pr-3 font-medium">Prix total</th>
                            <th className="text-right py-2 font-medium">€/m²</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dvfTx.transactions.map((tx, i) => {
                            const isAppt   = tx.codtypbien.startsWith("12");
                            const isMaison = tx.codtypbien.startsWith("11");
                            const typeColor = isAppt ? "text-blue-400" : isMaison ? "text-amber-400" : "text-slate-400";
                            const typeShort = isAppt ? "Appt" : isMaison ? "Maison" : tx.type.split(" ").slice(-1)[0];
                            return (
                              <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                <td className="py-1.5 pr-3 text-slate-300">{tx.date ? new Date(tx.date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "—"}</td>
                                <td className={`py-1.5 pr-3 font-medium ${typeColor}`}>
                                  {typeShort}{tx.vefa ? <span className="ml-1 text-[10px] text-violet-400">VEFA</span> : null}
                                </td>
                                <td className="py-1.5 pr-3 text-right text-slate-300">{tx.surface_bati} m²</td>
                                <td className="py-1.5 pr-3 text-right text-slate-300">{new Intl.NumberFormat("fr-FR").format(tx.prix)} €</td>
                                <td className="py-1.5 text-right font-semibold text-white">{new Intl.NumberFormat("fr-FR").format(tx.prix_m2)} €</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

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

      <footer className="mt-16 border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-slate-500">
          <p>
            Sources : OFGL · DGFiP · Agence ORE · Ecolab · geo.api.gouv.fr ·
            data.gouv.fr
          </p>
          <p>Licence Etalab 2.0</p>
        </div>
      </footer>
    </div>
  );
}
