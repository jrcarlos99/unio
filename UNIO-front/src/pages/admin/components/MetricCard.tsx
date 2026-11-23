import type { Metrica } from "../types";

// Card de métrica: só o número que o back devolve. Não há variação nem
// sparkline porque o back não guarda histórico (ADR-010 e ADR-011).
export default function MetricCard({ label, valor }: Metrica) {
  return (
    <div className="rounded-2xl border border-deepgreen/10 bg-white p-5">
      <p className="text-sm font-medium text-deepgreen">{label}</p>
      <p className="mt-3 text-3xl font-bold text-deepgreen">{valor.toLocaleString("pt-BR")}</p>
    </div>
  );
}
