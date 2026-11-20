import { Bar, BarChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Metrica } from "../types";

// Card de métrica: número grande + variação (verde se subiu, vermelho se
// caiu) + uma sparkline (mini gráfico de barras, só decorativo) ao lado.
// Variação e sparkline são opcionais: no modo API o back não tem histórico e
// o card mostra só o número (ADR-010).
export default function MetricCard({ label, valor, variacaoPercentual, sparkline }: Metrica) {
  const temVariacao = typeof variacaoPercentual === "number";
  const subiu = (variacaoPercentual ?? 0) >= 0;
  const dados = (sparkline ?? []).map((v) => ({ v }));

  return (
    <div className="rounded-2xl border border-deepgreen/10 bg-white p-5">
      <p className="text-sm font-medium text-deepgreen">{label}</p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold text-deepgreen">{valor.toLocaleString("pt-BR")}</p>
          {temVariacao && (
            <p
              className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
                subiu ? "text-green-700" : "text-red-600"
              }`}
            >
              {subiu ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(variacaoPercentual)}% este mês
            </p>
          )}
        </div>

        {/* Sparkline: só decorativa, sem eixos nem tooltip. deepgreen aqui —
            sage é claro demais pra aparecer sobre o card branco */}
        {dados.length > 0 && (
          <div className="h-10 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados}>
                <Bar dataKey="v" fill={subiu ? "#00412E" : "#dc2626"} radius={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
