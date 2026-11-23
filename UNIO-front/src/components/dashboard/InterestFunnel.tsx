import type { EtapaFunil } from "../../types/dashboard";
import { formatarPercentual } from "../../utils/formatoDescoberta";
import PainelCard from "./PainelCard";

// Degradê do verde claro ao escuro, uma cor por etapa
const CORES = ["bg-sage/60", "bg-deepgreen/60", "bg-deepgreen/80", "bg-deepgreen"];
const PONTOS = ["bg-sage", "bg-deepgreen/60", "bg-deepgreen/80", "bg-deepgreen"];

interface InterestFunnelProps {
  etapas: EtapaFunil[];
}

// Largura visual da barra: raiz cúbica da proporção, para as etapas finais
// (menos de 1%) continuarem visíveis. Os números exatos ficam no texto.
function largura(proporcao: number) {
  return Math.min(100, Math.max(8, Math.cbrt(proporcao) * 100));
}

// Taxa de visualização para reunião; null quando falta um dos dois números
// ou ninguém visualizou ainda (divisão por zero)
function taxaConversao(etapas: EtapaFunil[]): number | null {
  const topo = etapas[0]?.valor ?? null;
  const ultima = etapas[etapas.length - 1]?.valor ?? null;
  if (topo === null || ultima === null || topo === 0) return null;
  return (ultima / topo) * 100;
}

// "Funil de interesse": visualização → interesse → match → reunião, só com
// números do back. Etapa sem dado mostra "indisponível". Não há benchmark de
// mercado: o back não tem essa referência (ADR-011).
export default function InterestFunnel({ etapas }: InterestFunnelProps) {
  const topo = etapas[0]?.valor ?? 0;
  const conversao = taxaConversao(etapas);

  return (
    <PainelCard
      titulo="Funil de interesse"
      subtitulo={
        conversao === null ? (
          "A taxa de conversão aparece quando houver visualizações no perfil."
        ) : (
          <>
            Taxa de conversão de visualização para reunião:{" "}
            <strong className="font-bold text-deepgreen">{formatarPercentual(conversao)}</strong>
          </>
        )
      }
    >
      <ol className="space-y-5">
        {etapas.map((etapa, indice) => {
          const proporcao = etapa.valor !== null && topo > 0 ? etapa.valor / topo : 0;
          return (
            <li key={etapa.rotulo}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={`flex items-center gap-2 text-deepgreen ${indice === etapas.length - 1 ? "font-semibold" : ""}`}>
                  <span className={`h-2 w-2 rounded-full ${PONTOS[indice % PONTOS.length]}`} aria-hidden="true" />
                  {etapa.rotulo}
                </span>
                <span className="shrink-0 text-deepgreen">
                  {etapa.valor === null ? (
                    <span className="text-xs text-deepgreen/75">indisponível</span>
                  ) : (
                    <>
                      <strong className="font-bold">{etapa.valor.toLocaleString("pt-BR")}</strong>{" "}
                      {topo > 0 && (
                        <span className="text-xs text-deepgreen/75">({formatarPercentual(proporcao * 100)})</span>
                      )}
                    </>
                  )}
                </span>
              </div>
              <div className="mt-2 h-7 overflow-hidden rounded-lg bg-lightgray/50" aria-hidden="true">
                {etapa.valor !== null && etapa.valor > 0 && (
                  <div
                    className={`h-full rounded-lg ${CORES[indice % CORES.length]}`}
                    style={{ width: `${largura(proporcao)}%` }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </PainelCard>
  );
}
