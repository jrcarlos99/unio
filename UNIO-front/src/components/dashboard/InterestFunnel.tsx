import { TrendingUp } from "lucide-react";
import type { EtapaFunil } from "../../types/dashboard";
import { formatarPercentual } from "../../utils/formatoDescoberta";
import PainelCard from "./PainelCard";
import SeloExemplo from "./SeloExemplo";

// Degradê do verde claro ao escuro, uma cor por etapa
const CORES = ["bg-sage/60", "bg-deepgreen/60", "bg-deepgreen/80", "bg-deepgreen"];
const PONTOS = ["bg-sage", "bg-deepgreen/60", "bg-deepgreen/80", "bg-deepgreen"];

interface InterestFunnelProps {
  etapas: EtapaFunil[];
  benchmark: { min: number; max: number };
}

function avaliar(conversao: number, { min, max }: InterestFunnelProps["benchmark"]) {
  if (conversao < min) return "Abaixo do mercado";
  if (conversao > max) return "Acima do mercado";
  return "Desempenho saudável";
}

// Largura visual da barra: raiz cúbica da proporção, para as etapas finais
// (menos de 1%) continuarem visíveis. Os números exatos ficam no texto.
function largura(proporcao: number) {
  // Limite de 100%: no modo API uma etapa de exemplo pode passar do topo real
  return Math.min(100, Math.max(8, Math.cbrt(proporcao) * 100));
}

// "Funil de interesse": visualização → interesse → conversa → reunião
export default function InterestFunnel({ etapas, benchmark }: InterestFunnelProps) {
  const topo = etapas[0]?.valor || 1;
  const ultima = etapas[etapas.length - 1]?.valor ?? 0;
  const conversao = (ultima / topo) * 100;
  const avaliacao = avaliar(conversao, benchmark);
  const temExemplo = etapas.some((etapa) => etapa.exemplo);

  return (
    <PainelCard
      titulo="Funil de interesse"
      subtitulo={
        <>
          Taxa de conversão de visualização para reunião:{" "}
          <strong className="font-bold text-deepgreen">{formatarPercentual(conversao)}</strong>
        </>
      }
      extra={temExemplo ? <SeloExemplo /> : undefined}
    >
      <ol className="space-y-5">
        {etapas.map((etapa, indice) => {
          const proporcao = etapa.valor / topo;
          return (
            <li key={etapa.rotulo}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={`flex items-center gap-2 text-deepgreen ${indice === etapas.length - 1 ? "font-semibold" : ""}`}>
                  <span className={`h-2 w-2 rounded-full ${PONTOS[indice % PONTOS.length]}`} aria-hidden="true" />
                  {etapa.rotulo}
                  {etapa.exemplo && <span className="text-xs font-normal text-deepgreen/75">(exemplo)</span>}
                </span>
                <span className="shrink-0 text-deepgreen">
                  <strong className="font-bold">{etapa.valor.toLocaleString("pt-BR")}</strong>{" "}
                  {!etapa.exemplo && (
                    <span className="text-xs text-deepgreen/75">({formatarPercentual(proporcao * 100)})</span>
                  )}
                </span>
              </div>
              <div className="mt-2 h-7 overflow-hidden rounded-lg bg-lightgray/50" aria-hidden="true">
                <div
                  className={`h-full rounded-lg ${CORES[indice % CORES.length]}`}
                  style={{ width: `${largura(proporcao)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-lightgray pt-4 text-xs">
        <p className="flex items-center gap-1.5 text-deepgreen/75">
          <TrendingUp size={14} aria-hidden="true" />
          Benchmark de mercado: {formatarPercentual(benchmark.min)} a {formatarPercentual(benchmark.max)}
        </p>
        <p className="font-semibold text-deepgreen">{avaliacao}</p>
      </div>
    </PainelCard>
  );
}
