import { useId, useState } from "react";
import { CircleHelp } from "lucide-react";
import { rotuloClassificacao } from "../../services/discovery.mapping";
import type { Compatibilidade, CriterioCompatibilidade } from "../../types/discovery";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import MatchRing from "./MatchRing";
import ScoreBar from "./ScoreBar";
import SecaoPerfil from "./SecaoPerfil";

const CRITERIOS: { chave: CriterioCompatibilidade; rotulo: string }[] = [
  { chave: "segmento", rotulo: "Segmento" },
  { chave: "estagio", rotulo: "Estágio" },
  { chave: "ticket", rotulo: "Ticket e capital" },
  { chave: "regiao", rotulo: "Região" },
  { chave: "disponibilidade", rotulo: "Disponibilidade" },
];

function fraseCompatibilidade(total: number | null, classificacao?: string | null) {
  if (total === null || classificacao === "DADOS_INSUFICIENTES") return "Dados insuficientes para avaliar";
  if (classificacao === "EXCELENTE") return "Excelente match com sua tese";
  if (classificacao === "FORTE") return "Forte alinhamento com sua tese";
  if (classificacao === "MODERADO") return "Match moderado com sua tese";
  if (classificacao === "FRACO") return "Match fraco com sua tese";
  if (classificacao === "SEM_MATCH") return "Baixo alinhamento com sua tese";
  if (total >= 85) return "Excelente match com sua tese";
  if (total >= 70) return "Forte alinhamento com sua tese";
  if (total >= 55) return "Match moderado com sua tese";
  if (total >= 40) return "Match fraco com sua tese";
  return "Baixo alinhamento com sua tese";
}

export default function CompatibilidadeCard({ compatibilidade }: { compatibilidade: Compatibilidade }) {
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const idAjuda = useId();

  return (
    <SecaoPerfil
      titulo="Compatibilidade de Tese"
      destaque
      selo={
        <button
          type="button"
          onClick={() => setAjudaAberta((aberta) => !aberta)}
          aria-expanded={ajudaAberta}
          aria-controls={idAjuda}
          aria-label="Como a compatibilidade é calculada"
          className={`rounded-full p-1 text-deepgreen hover:bg-lightgray ${FOCO_VISIVEL}`}
        >
          <CircleHelp size={20} aria-hidden="true" />
        </button>
      }
    >
      <p id={idAjuda} hidden={!ajudaAberta} className="mb-4 rounded-2xl bg-lightgray/50 p-3 text-xs leading-relaxed text-deepgreen/80">
        {compatibilidade.fonte === "agente_ia"
          ? "A IA avalia cada critério com evidências dos perfis e do onboarding. O agente aplica pesos de 30% para segmento e mercado, 20% para estágio, 25% para ticket e capital, 15% para região e 10% para complementaridade. Critérios sem dados não entram no cálculo; a cobertura informa quanto do peso total teve evidência."
          : compatibilidade.fonte === "scorecard"
            ? "Calculado pelo scorecard da UNIO a partir dos dois perfis, com pesos definidos pela política de score do tipo de investidor."
            : "Comparamos as respostas da sua tese com os dados do perfil, considerando segmento, estágio, capital, região e complementaridade."}
      </p>

      <div className="flex flex-col items-center">
        <MatchRing valor={compatibilidade.total} tamanho="lg" />
        <p className="mt-5 text-center text-sm font-bold text-deepgreen">
          {fraseCompatibilidade(compatibilidade.total, compatibilidade.classificacao)}
        </p>
        {rotuloClassificacao(compatibilidade.classificacao) && (
          <p className="mt-1 text-center text-xs text-deepgreen/75">Classificação: {rotuloClassificacao(compatibilidade.classificacao)}</p>
        )}
      </div>

      <div className="mt-6 space-y-4 border-t border-lightgray pt-5">
        {compatibilidade.fatores
          ? compatibilidade.fatores.map((fator) => (
              <div key={fator.codigo}>
                {fator.nota === null ? (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>{fator.rotulo} ({fator.peso}%)</span>
                    <span className="text-xs text-deepgreen/60">Sem dados</span>
                  </div>
                ) : (
                  <ScoreBar rotulo={`${fator.rotulo} (${fator.peso}%)`} valor={fator.nota} />
                )}
                {fator.explicacao && <p className="mt-1 text-xs leading-relaxed text-deepgreen/65">{fator.explicacao}</p>}
              </div>
            ))
          : CRITERIOS.filter(({ chave }) => typeof compatibilidade.notas[chave] === "number").map(({ chave, rotulo }) => (
              <ScoreBar key={chave} rotulo={rotulo} valor={compatibilidade.notas[chave] as number} />
            ))}
        {typeof compatibilidade.coberturaDados === "number" && (
          <p className="text-xs text-deepgreen/65">Cobertura de dados utilizada: {compatibilidade.coberturaDados}%</p>
        )}
      </div>
      {compatibilidade.proximoPasso && (
        <p className="mt-5 rounded-2xl bg-lightgray/50 p-3 text-xs leading-relaxed text-deepgreen/80">
          Próximo passo: {compatibilidade.proximoPasso}
        </p>
      )}
    </SecaoPerfil>
  );
}
