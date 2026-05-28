interface Props {
  label: string;
  annee?: number | string | null;
  description?: string;
}

export function SourceBadge({ label, annee, description }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-800/60 border border-slate-700/60 rounded px-2 py-0.5"
      title={description}
    >
      <span className="text-slate-600">Source :</span>
      <span>{label}</span>
      {annee != null && <span className="text-slate-600">· {annee}</span>}
    </span>
  );
}
