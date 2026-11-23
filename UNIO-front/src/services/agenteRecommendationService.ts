import api, { TOKEN_KEY } from "./api";
import { investidorDoBack, startupDoBack, statusInteresseDoBack, type PerfilPublicoBack } from "./discovery.mapping";
import type { Compatibilidade, FatorCompatibilidade, Motivo, StartupDetalhe, StartupRecomendada } from "../types/discovery";
import type { InvestidorDetalhe, InvestidorRecomendado } from "../types/investidores";

export interface AiRecommendationFactor {
  factorCode: string;
  label: string;
  score: number | null;
  weight: number;
  explanation: string;
}

export interface AiRecommendation {
  candidateId: number;
  candidateName: string;
  candidateProfile: PerfilPublicoBack;
  compatibility: number | null;
  classification: string;
  dataCoverage: number;
  summary: string;
  strengths: string[];
  attentionPoints: string[];
  factors: AiRecommendationFactor[];
  nextStep: string;
  interestStatus: string;
  saved: boolean;
}

export interface AiRecommendationResponse {
  candidateType: "STARTUP" | "INVESTOR";
  recommendations: AiRecommendation[];
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { expiresAt: number; request: Promise<AiRecommendationResponse> }>();

export function limparCacheRecomendacoesIa() {
  cache.clear();
}

export async function getAgenteRecommendations(limit = 20): Promise<AiRecommendationResponse> {
  const token = localStorage.getItem(TOKEN_KEY) ?? "anonymous";
  const key = `${token}:${limit}`;
  const atual = cache.get(key);
  if (atual && atual.expiresAt > Date.now()) return atual.request;

  const request = api
    .get<AiRecommendationResponse>("/api/agente/recommendations", { params: { limit } })
    .then(({ data }) => {
      const responseAtualizada = Array.isArray(data.recommendations)
        && data.recommendations.every((item) =>
          item.candidateProfile !== null
          && typeof item.candidateProfile === "object"
          && Array.isArray(item.factors)
          && typeof item.dataCoverage === "number"
          && typeof item.interestStatus === "string");
      if (!responseAtualizada) {
        throw new Error("O backend precisa receber a atualização do agente de recomendações.");
      }
      return data;
    })
    .catch((erro: unknown) => {
      cache.delete(key);
      throw erro;
    });
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, request });
  return request;
}

const NOTA_DO_FATOR: Record<string, string> = {
  strategic_fit: "segmento",
  stage_readiness: "estagio",
  ticket_capital_fit: "ticket",
  geography_fit: "regiao",
  strategic_complementarity: "disponibilidade",
};

function compatibilidadeDaIa(item: AiRecommendation): Compatibilidade {
  const fatores: FatorCompatibilidade[] = item.factors.map((factor) => ({
    codigo: factor.factorCode,
    rotulo: factor.label,
    nota: factor.score,
    peso: factor.weight,
    explicacao: factor.explanation,
  }));
  const notas: Compatibilidade["notas"] = {};
  for (const factor of item.factors) {
    const chave = NOTA_DO_FATOR[factor.factorCode] as keyof Compatibilidade["notas"] | undefined;
    if (chave && factor.score !== null) notas[chave] = factor.score;
  }
  return {
    total: item.compatibility,
    notas,
    classificacao: item.classification,
    proximoPasso: item.nextStep,
    fonte: "agente_ia",
    fatores,
    coberturaDados: item.dataCoverage,
  };
}

function motivosDaIa(item: AiRecommendation): Motivo[] {
  return [item.summary, ...item.strengths.map((texto) => `Ponto forte: ${texto}`),
    ...item.attentionPoints.map((texto) => `Ponto de atenção: ${texto}`)]
    .filter((texto) => texto.trim().length > 0)
    .map((texto) => [{ texto }]);
}

function estadoDoItem(item: AiRecommendation) {
  return {
    compatibilidade: compatibilidadeDaIa(item),
    statusInteresse: statusInteresseDoBack(item.interestStatus),
    salvo: item.saved,
    popularidade: null,
    scorecard: null,
  };
}

export function startupRecomendadaDaIa(item: AiRecommendation): StartupRecomendada {
  return {
    startup: startupDoBack(item.candidateId, item.candidateName, item.candidateProfile),
    ...estadoDoItem(item),
  };
}

export function startupDetalheDaIa(item: AiRecommendation): StartupDetalhe {
  return { ...startupRecomendadaDaIa(item), motivos: motivosDaIa(item) };
}

export function investidorRecomendadoDaIa(item: AiRecommendation): InvestidorRecomendado {
  return {
    investidor: investidorDoBack(item.candidateId, item.candidateName, item.candidateProfile),
    ...estadoDoItem(item),
  };
}

export function investidorDetalheDaIa(item: AiRecommendation): InvestidorDetalhe {
  return { ...investidorRecomendadoDaIa(item), motivos: motivosDaIa(item) };
}
