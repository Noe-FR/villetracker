'use client';
import {
  X, ExternalLink, MapPin, Users, Mountain, Waves,
  TreePine, Loader2, AlertCircle, Building2, ShieldCheck, User,
  DatabaseZap,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api } from "../../api/client";
import { formatEuro, formatNumber, trancheLabel } from "../../utils/format";
import { type FinancialNote, NOTE_META } from "../../utils/financialScore";
import type { CommuneMapInfo } from "../Map/FranceMap";

interface Props {
  codeInsee: string;
  initialInfo?: CommuneMapInfo;
  onClose: () => void;
}

const PANEL_AGREGATS = [
  { key: "Recettes de fonctionnement",  label: "Recettes fonct." },
  { key: "Epargne brute",               label: "Épargne brute"   },
  { key: "Encours de dette au 31/12/N", label: "Encours dette"   },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
    </div>
  );
}

// COM territories have no statistical data in DB
const COM_CODES = new Set(["975", "977", "978", "986", "987", "988"]);

function isCOM(deptCode: string | null | undefined): boolean {
  return !!deptCode && COM_CODES.has(deptCode);
}

// ── Overseas flash card (no stats available) ──────────────────────────────────

function OverseasCard({
  codeInsee, initialInfo, onClose,
}: { codeInsee: string; initialInfo?: CommuneMapInfo; onClose: () => void }) {
  const nom        = initialInfo?.nom ?? codeInsee;
  const population = initialInfo?.population ?? null;
  const deptNom    = initialInfo?.departement_nom  ?? null;
  const deptCode   = initialInfo?.departement_code ?? null;
  const regionNom  = initialInfo?.region_nom       ?? null;

  return (
    <div
      className="absolute top-4 right-4 z-[1000] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      style={{ width: 320 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-700">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{nom}</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{codeInsee}</p>
          {(deptNom || regionNom) && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} className="text-slate-400 shrink-0" />
              <span className="text-xs text-slate-400 truncate">
                {[deptNom && `${deptNom}${deptCode ? ` (${deptCode})` : ""}`, regionNom].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-3 p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-3">
        {population != null && (
          <div className="bg-slate-800 rounded-xl p-3 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Users size={12} />
              <span className="text-[11px] uppercase tracking-wide font-medium">Population</span>
            </div>
            <span className="text-xl font-bold text-white">{formatNumber(population)}</span>
          </div>
        )}

        <div className="flex items-start gap-2.5 bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-3">
          <DatabaseZap size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/80 leading-relaxed">
            Données statistiques non disponibles pour ce territoire
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Full panel (metropolitan + DROM with data) ────────────────────────────────

export function CommunePanel({ codeInsee, initialInfo, onClose }: Props) {
  const com = isCOM(initialInfo?.departement_code);

  const { data: panel, loading, error } = useApi(
    () => api.getPanel(codeInsee),
    // Pass null as dep to skip the API call for com communes
    com ? [null] : [codeInsee],
    `panel:${codeInsee}`
  );

  if (com) {
    return <OverseasCard codeInsee={codeInsee} initialInfo={initialInfo} onClose={onClose} />;
  }

  const finances   = panel?.finances ?? null;
  const immo       = panel?.immobilier ?? null;
  const maire      = panel?.maire ?? null;
  const scoreRaw   = panel?.score as { score: number; note: FinancialNote; annee?: number } | null | undefined;
  const scoreNote  = scoreRaw?.note  ?? null;
  const scoreValue = scoreRaw?.score ?? null;
  const scoreAnnee = scoreRaw?.annee ?? null;

  const nom        = initialInfo?.nom        ?? finances?.meta?.nom        ?? codeInsee;
  const population = initialInfo?.population ?? finances?.meta?.population ?? null;
  const deptNom    = initialInfo?.departement_nom  ?? finances?.meta?.departement ?? null;
  const deptCode   = initialInfo?.departement_code ?? finances?.meta?.departement_code ?? null;
  const regionNom  = initialInfo?.region_nom       ?? finances?.meta?.region ?? null;
  const rural      = initialInfo?.rural      != null ? initialInfo.rural      : finances?.meta?.rural      === "Oui";
  const montagne   = initialInfo?.montagne   != null ? initialInfo.montagne   : finances?.meta?.montagne   === "Oui";
  const touristique= initialInfo?.touristique!= null ? initialInfo.touristique: finances?.meta?.touristique === "Oui";

  return (
    <div className="absolute top-4 right-4 bottom-4 z-[1000] w-88 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden"
      style={{ width: 352 }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between p-5 border-b border-slate-700 shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{nom}</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{codeInsee}</p>
          {(deptNom || regionNom) && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} className="text-slate-400 shrink-0" />
              <span className="text-xs text-slate-400 truncate">
                {[deptNom && `${deptNom}${deptCode ? ` (${deptCode})` : ""}`, regionNom].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-3 p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Bloc 1 — Identité (instant) */}
        <div className="flex items-start gap-3">
          <div className="bg-slate-800 rounded-xl p-3 flex-1 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Users size={12} />
              <span className="text-[11px] uppercase tracking-wide font-medium">Population</span>
            </div>
            {population != null ? (
              <>
                <span className="text-xl font-bold text-white">{formatNumber(population)}</span>
                <span className="text-[11px] text-slate-500">{trancheLabel(finances?.meta?.tranche_population ?? 0)}</span>
              </>
            ) : (
              <div className="h-7 w-20 bg-slate-700 rounded animate-pulse" />
            )}
          </div>

          <div className="bg-slate-800 rounded-xl p-3 flex-1 flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wide font-medium text-slate-400">Caractéristiques</span>
            <div className="flex flex-wrap gap-1">
              {rural && (
                <span className="flex items-center gap-0.5 text-[11px] bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded-full">
                  <TreePine size={9} /> Rural
                </span>
              )}
              {montagne && (
                <span className="flex items-center gap-0.5 text-[11px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded-full">
                  <Mountain size={9} /> Montagne
                </span>
              )}
              {touristique && (
                <span className="flex items-center gap-0.5 text-[11px] bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded-full">
                  <Waves size={9} /> Touristique
                </span>
              )}
              {!rural && !montagne && !touristique && (
                <span className="text-xs text-slate-500">—</span>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm">Chargement…</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-3 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Bloc 2 — Score financier */}
        {scoreNote && scoreValue != null && (() => {
          const c = NOTE_META[scoreNote];
          return (
            <div className={`rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} p-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={12} className={c.text} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Santé financière{scoreAnnee ? ` ${scoreAnnee}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-black ${c.text}`}>{scoreNote}</span>
                  <span className="text-xs text-slate-400">{c.label}</span>
                  <span className="text-xs text-slate-500">{scoreValue}/100</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${scoreValue}%` }} />
              </div>
            </div>
          );
        })()}

        {finances && Object.keys(finances.agregats).length > 0 && (
          <div className="bg-slate-800 rounded-xl px-4 py-1">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest pt-3 pb-1">
              Finances {finances.meta.annee} · €/hab
            </p>
            {PANEL_AGREGATS.map(({ key, label }) => {
              const val = finances.agregats[key];
              if (!val?.euros_par_habitant) return null;
              return <Row key={key} label={label} value={formatEuro(val.euros_par_habitant)} />;
            })}
          </div>
        )}

        {/* Bloc 3 — Immobilier */}
        {immo && (immo.prix_m2 || immo.loyer_app_m2) && (
          <div className="bg-slate-800 rounded-xl px-4 py-1">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest pt-3 pb-1 flex items-center gap-1">
              <Building2 size={10} /> Immobilier
            </p>
            {immo.prix_m2 && (
              <Row
                label={`Prix m² vente${immo.annee_dvf ? ` (${immo.annee_dvf})` : ""}`}
                value={`${new Intl.NumberFormat("fr-FR").format(Math.round(immo.prix_m2))} €`}
              />
            )}
            {immo.loyer_app_m2 && (
              <Row
                label={`Loyer appt${immo.annee_loyer ? ` (${immo.annee_loyer})` : ""}`}
                value={`${immo.loyer_app_m2.toFixed(1)} €/m²/mois`}
              />
            )}
          </div>
        )}

        {/* Maire */}
        {maire && (
          <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-4 py-3">
            <User size={13} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Maire</p>
              <p className="text-sm font-semibold text-white truncate">
                {maire.prenom} {maire.nom}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-4 border-t border-slate-700 shrink-0">
        <button
          onClick={() => window.open(`/commune/${codeInsee}`, "_blank")}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors"
        >
          <ExternalLink size={15} />
          Voir le détail complet
        </button>
      </div>
    </div>
  );
}
