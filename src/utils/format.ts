export function formatEuro(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined) return "—";
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000)
      return (value / 1_000_000_000).toFixed(2) + " Md€";
    if (Math.abs(value) >= 1_000_000)
      return (value / 1_000_000).toFixed(1) + " M€";
    if (Math.abs(value) >= 1_000)
      return (value / 1_000).toFixed(0) + " k€";
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function trancheLabel(tranche: number | null | undefined): string {
  const labels: Record<number, string> = {
    1: "< 500 hab.",
    2: "500 – 2 000 hab.",
    3: "2 000 – 10 000 hab.",
    4: "10 000 – 50 000 hab.",
    5: "50 000 – 100 000 hab.",
    6: "> 100 000 hab.",
  };
  return labels[tranche ?? 0] ?? "—";
}

export function diffColor(diff: number | null): string {
  if (diff === null || diff === undefined) return "text-slate-400";
  if (diff > 10) return "text-red-400";
  if (diff > 5) return "text-orange-400";
  if (diff < -10) return "text-emerald-400";
  if (diff < -5) return "text-teal-400";
  return "text-slate-400";
}
