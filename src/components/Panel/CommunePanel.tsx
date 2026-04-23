import {
  X, ExternalLink, MapPin, Users, Mountain, Waves,
  TreePine, Loader2, AlertCircle, Building2, ShieldCheck,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api } from "../../api/client";
import { StatCard } from "./StatCard";
import { formatEuro, formatNumber, trancheLabel } from "../../utils/format";
import { computeFinancialScore, NOTE_META } from "../../utils/financialScore";

interface Props {
  codeInsee: string;
  onClose: () => void;
}

const PANEL_AGREGATS = [
  { key: "Recettes de fonctionnement",    label: "Recettes fonct."  },
  { key: "Dépenses de fonctionnement",    label: "Dépenses fonct."  },
  { key: "Epargne brute",                 label: "Épargne brute"    },
  { key: "Encours de dette au 31/12/N",   label: "Encours dette"    },
  { key: "Dépenses d'équipement",         label: "Invest. équip."   },
  { key: "Charges de personnel",          label: "Charges personnel" },
];

export function CommunePanel({ codeInsee, onClose }: Props) {
  const { data: finances, loading, error } = useApi(
    () => api.getCommuneFinances(codeInsee),
    [codeInsee]
  );

  const { data: immo } = useApi(
    () => api.getImmobilier(codeInsee),
    [codeInsee]
  );

  const meta = finances?.meta;

  const financialScore = finances
    ? computeFinancialScore(finances.agregats, finances.evolution_yoy ?? {})
    : null;

  return (
    <div className="absolute top-4 right-4 z-[1000] w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-700 shrink-0">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-6 w-48 bg-slate-700 rounded animate-pulse" />
          ) : (
            <>
              <h2 className="text-lg font-bold text-white truncate">
                {meta?.nom || codeInsee}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <MapPin size={11} className="text-slate-400" />
                <span className="text-xs text-slate-400">
                  {meta?.departement} · {meta?.region}
                </span>
                <span className="text-xs text-slate-500">({meta?.departement_code})</span>
              </div>
            </>
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
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {loading && (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            Chargement...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-3 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {meta && (
          <>
            {/* Infos générales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800 rounded-xl p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Users size={13} />
                  <span className="text-xs uppercase tracking-wide font-medium">Population</span>
                </div>
                <span className="text-xl font-bold text-white">
                  {formatNumber(meta.population)}
                </span>
                <span className="text-xs text-slate-500">{trancheLabel(meta.tranche_population)}</span>
              </div>

              <div className="bg-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-wide font-medium text-slate-400">Caractéristiques</span>
                <div className="flex flex-wrap gap-1.5">
                  {meta.rural === "Oui" && (
                    <span className="flex items-center gap-1 text-xs bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full">
                      <TreePine size={10} /> Rural
                    </span>
                  )}
                  {meta.montagne === "Oui" && (
                    <span className="flex items-center gap-1 text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded-full">
                      <Mountain size={10} /> Montagne
                    </span>
                  )}
                  {meta.touristique === "Oui" && (
                    <span className="flex items-center gap-1 text-xs bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded-full">
                      <Waves size={10} /> Touristique
                    </span>
                  )}
                  {meta.rural !== "Oui" && meta.montagne !== "Oui" && meta.touristique !== "Oui" && (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Note de santé financière */}
            {financialScore && (() => {
              const c = NOTE_META[financialScore.note];
              return (
                <div className={`bg-gradient-to-br ${c.bg} border ${c.border} rounded-xl p-3`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={12} className={c.text} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Santé financière</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-lg font-black ${c.text}`}>{financialScore.note}</span>
                      <span className="text-xs text-slate-300">{c.label}</span>
                      <span className="text-xs text-slate-500">{financialScore.score}/100</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${financialScore.score}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Indicateurs financiers */}
            {finances && Object.keys(finances.agregats).length === 0 ? (
              <div className="text-xs text-slate-500 bg-slate-800 rounded-xl p-3 text-center">
                Données financières non disponibles pour ce territoire
              </div>
            ) : (
              finances && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                    Indicateurs financiers {meta.annee} (€/hab)
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {PANEL_AGREGATS.map(({ key, label }) => {
                      const val = finances.agregats[key];
                      if (!val) return null;
                      return (
                        <StatCard
                          key={key}
                          label={label}
                          value={formatEuro(val.euros_par_habitant)}
                          unit="/hab"
                          subValue={`Total : ${formatEuro(val.montant, true)}`}
                          size="sm"
                        />
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </>
        )}

        {/* Immobilier */}
        {immo && (immo.prix_m2 || immo.loyer_app_m2 || immo.loyer_mai_m2) && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Building2 size={12} /> Immobilier
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {immo.prix_m2 && (
                <div className="bg-slate-800 rounded-xl p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Vente m²</span>
                  <span className="text-base font-bold text-white">
                    {new Intl.NumberFormat("fr-FR").format(Math.round(immo.prix_m2))} €
                  </span>
                  <span className="text-[10px] text-slate-500">{immo.annee_dvf} · {immo.nb_mutations} ventes</span>
                </div>
              )}
              {immo.loyer_app_m2 && (
                <div className="bg-slate-800 rounded-xl p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Loyer appt</span>
                  <span className="text-base font-bold text-white">{immo.loyer_app_m2.toFixed(1)} €</span>
                  <span className="text-[10px] text-slate-500">/m²/mois · {immo.annee_loyer}</span>
                </div>
              )}
              {immo.loyer_mai_m2 && (
                <div className="bg-slate-800 rounded-xl p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Loyer maison</span>
                  <span className="text-base font-bold text-white">{immo.loyer_mai_m2.toFixed(1)} €</span>
                  <span className="text-[10px] text-slate-500">/m²/mois · {immo.annee_loyer}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {meta && finances && Object.keys(finances.agregats).length > 0 && (
        <div className="p-4 border-t border-slate-700 shrink-0">
          <button
            onClick={() => window.open(`/commune/${codeInsee}`, "_blank")}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors"
          >
            <ExternalLink size={15} />
            Voir toutes les finances
          </button>
        </div>
      )}
    </div>
  );
}
