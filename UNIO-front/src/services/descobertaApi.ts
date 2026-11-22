import axios from "axios";
import type { RefScorecard } from "../types/discovery";
import { ordenarComPopularidade } from "../utils/popularidade";
import api from "./api";
import { obterPopularidadePublica } from "./avaliacoesService";
import {
  corpoFeedback,
  feedbackJaGravado,
  parametrosDescoberta,
  type AcaoFeedback,
  type FiltrosDescobertaBack,
  type ItemDescobertaBack,
  type PaginaDescobertaBack,
} from "./discovery.mapping";

// Peças comuns de discoveryService.ts e investidoresService.ts (ADR-008). O
// JSON do back só é lido em discovery.mapping.ts.

// No máximo 3 páginas de 100: as telas filtram e paginam no cliente sobre a
// lista já ordenada pelo score do back
const MAX_PAGINAS = 3;

export async function buscarDescoberta(
  caminho: "/api/discovery/startups" | "/api/discovery/investors",
  filtros: FiltrosDescobertaBack = {},
): Promise<ItemDescobertaBack[]> {
  const itens: ItemDescobertaBack[] = [];
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const { data } = await api.get<PaginaDescobertaBack>(caminho, {
      params: parametrosDescoberta(filtros, itens.length),
    });
    itens.push(...data.items);
    if (data.items.length === 0 || itens.length >= data.total) break;
  }
  return itens;
}

// Detalhe de um candidato: id que não é do back ou 404 viram
// null, e a tela mostra "não encontrado"
export async function buscarDetalhe(caminho: string): Promise<ItemDescobertaBack | null> {
  try {
    const { data } = await api.get<ItemDescobertaBack>(caminho);
    return data;
  } catch (erro) {
    if (axios.isAxiosError(erro) && erro.response?.status === 404) return null;
    throw erro;
  }
}

// Quantos matches mútuos o usuário logado tem (dashboard da startup)
export async function contarMatches(): Promise<number> {
  const { data } = await api.get<unknown[]>("/api/interests/matches");
  return Array.isArray(data) ? data.length : 0;
}

// Feedback do algoritmo: nunca bloqueia a tela nem mostra erro. 409
// FEEDBACK_DUPLICATE é sucesso (o evento já existe).
export async function enviarFeedback(scorecard: RefScorecard | null | undefined, acao: AcaoFeedback): Promise<void> {
  if (!scorecard) return;
  try {
    await api.post("/api/scorecard/feedback", corpoFeedback(scorecard, acao));
  } catch (erro) {
    if (axios.isAxiosError(erro) && feedbackJaGravado(erro.response?.status, erro.response?.data?.message)) return;
    // Silencioso de propósito: o feedback é sinal para o algoritmo, não ação do usuário
  }
}

// Popularidade pública (selo) por id, com cache da sessão: o resumo muda pouco
// e as listas pedem os mesmos ids várias vezes
const cachePopularidade = new Map<string, Promise<number | null>>();
const MAX_SELOS_POR_LISTA = 60;

function percentualPublico(id: string): Promise<number | null> {
  let promessa = cachePopularidade.get(id);
  if (!promessa) {
    promessa = obterPopularidadePublica(id)
      .then((popularidade) => (popularidade.visivel ? popularidade.percentual : null))
      .catch(() => {
        cachePopularidade.delete(id);
        return null;
      });
    cachePopularidade.set(id, promessa);
  }
  return promessa;
}

// Preenche o selo de popularidade (GET /api/reviews/summary/{id}) e aplica a
// ordenação da ADR-006: score primeiro, popularidade só desempata e dá um
// bônus pequeno (utils/popularidade.ts, ADR-006)
export async function comPopularidade<T extends { popularidade?: number | null; compatibilidade: { total: number } }>(
  itens: T[],
  idDe: (item: T) => string,
): Promise<T[]> {
  const comSelo = await Promise.all(
    itens.map(async (item, indice) =>
      indice < MAX_SELOS_POR_LISTA ? { ...item, popularidade: await percentualPublico(idDe(item)) } : item,
    ),
  );
  return ordenarComPopularidade(
    comSelo,
    (item) => item.compatibilidade.total,
    (item) => item.popularidade,
  );
}
