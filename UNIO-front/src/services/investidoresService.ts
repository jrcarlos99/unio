import type { UserProfile } from "../contexts/AuthContext";
import type { DadosUnio, ResultadoDesfazerMatch } from "../types/contato";
import type { RefScorecard, StatusInteresse } from "../types/discovery";
import type {
  FiltrosInvestidores,
  InvestidorDetalhe,
  InvestidorRecomendado,
  ResumoStartupInvestidores,
} from "../types/investidores";
import { formatarMoeda, normalizarBusca } from "../utils/formatoDescoberta";
import { paraIdDoBack } from "../utils/idsBack";
import api from "./api";
import { obterContextoStartup } from "./dashboardStartupService";
import { comPopularidade, enviarFeedback } from "./descobertaApi";
import {
  getAgenteRecommendations,
  limparCacheRecomendacoesIa,
  investidorDetalheDaIa,
  investidorRecomendadoDaIa,
} from "./agenteRecommendationService";
import {
  contatoDeConexao,
  investidorDeConexao,
  statusDoInteresseEnviado,
  statusInteresseDoBack,
  type ConexaoBack,
  type InteresseBack,
  type RetiradaInteresseBack,
} from "./discovery.mapping";

// Único ponto de dados dos investidores vistos pela startup: aba
// Investidores, Salvos, Meus unios, perfil do investidor e "Investidores
// recomendados" da Visão geral (ADR-008 e ADR-011). Só o back:
//
// - Lista e perfil recomendado: mesma resposta de /api/agente/recommendations (nota e ranking da IA).
// - Interesse e match: /api/interests; salvos: /api/saved.
// - Contato depois do match: só o e-mail de /api/interests/matches.
// - Feedback do algoritmo: silencioso, nunca bloqueia a tela.

// Filtro puro sobre a lista já carregada: as telas filtram no cliente a cada
// tecla, sem buscar de novo
export function aplicarFiltrosInvestidores(lista: InvestidorRecomendado[], filtros: FiltrosInvestidores) {
  const termo = normalizarBusca(filtros.busca?.trim() ?? "");
  return lista.filter(({ investidor }) => {
    if (filtros.segmento && !investidor.segmentosInteresse.includes(filtros.segmento)) return false;
    if (filtros.tipo && investidor.tipo !== filtros.tipo && investidor.tipo !== "Ambos") return false;
    if (!termo) return true;
    const alvo = [
      investidor.nome,
      investidor.tese,
      investidor.cidade,
      investidor.tipo,
      ...investidor.segmentosInteresse,
      ...investidor.estagiosInteresse,
    ].join(" ");
    return normalizarBusca(alvo).includes(termo);
  });
}

// Topo da aba: dados do perfil da startup logada (perfil do back e respostas
// do onboarding)
export async function obterResumoStartup(user: UserProfile | null): Promise<ResumoStartupInvestidores> {
  const { dados } = await obterContextoStartup(user);
  const capital = dados.capitalProcurado;
  return {
    segmento: dados.segmento,
    estagio: dados.estagio,
    capitalProcurado: capital === null ? null : typeof capital === "number" ? formatarMoeda(capital) : capital,
  };
}

export async function listarInvestidoresRecomendados(
  _user: UserProfile | null,
  filtros: FiltrosInvestidores = {},
): Promise<InvestidorRecomendado[]> {
  const response = await getAgenteRecommendations(20);
  if (response.candidateType !== "INVESTOR") return [];
  return response.recommendations.map(investidorRecomendadoDaIa).filter((item) => {
    if (filtros.segmento && !item.investidor.segmentosInteresse.includes(filtros.segmento)) return false;
    if (filtros.tipo && ![filtros.tipo, "Ambos"].includes(item.investidor.tipo)) return false;
    if (filtros.busca?.trim()) {
      const alvo = [item.investidor.nome, item.investidor.tese, ...item.investidor.segmentosInteresse,
        ...item.investidor.estagiosInteresse].join(" ").toLowerCase();
      if (!alvo.includes(filtros.busca.trim().toLowerCase())) return false;
    }
    return true;
  });
}

export async function obterInvestidor(_user: UserProfile | null, id: string): Promise<InvestidorDetalhe | null> {
  const response = await getAgenteRecommendations(20);
  if (response.candidateType !== "INVESTOR") return null;
  const item = response.recommendations.find((recommendation) => String(recommendation.candidateId) === id);
  return item ? investidorDetalheDaIa(item) : null;
}

function idObrigatorio(id: string): number {
  const userId = paraIdDoBack(id);
  if (userId === null) throw new Error("Perfil não encontrado.");
  return userId;
}

export async function salvarInvestidor(_user: UserProfile | null, id: string): Promise<void> {
  await api.put(`/api/saved/${idObrigatorio(id)}`);
  limparCacheRecomendacoesIa();
}

export async function removerSalvo(_user: UserProfile | null, id: string): Promise<void> {
  await api.delete(`/api/saved/${idObrigatorio(id)}`);
  limparCacheRecomendacoesIa();
}

export async function listarSalvos(_user: UserProfile | null): Promise<InvestidorRecomendado[]> {
  const { data } = await api.get<ConexaoBack[]>("/api/saved");
  return comPopularidade(
    data.filter((conexao) => conexao.role === "INVESTOR").map(investidorDeConexao),
    (item) => item.investidor.id,
  );
}

async function listarMatches(): Promise<ConexaoBack[]> {
  const { data } = await api.get<ConexaoBack[]>("/api/interests/matches");
  return data.filter((conexao) => conexao.role === "INVESTOR");
}

export async function listarUnios(_user: UserProfile | null): Promise<InvestidorRecomendado[]> {
  const matches = await listarMatches();
  return comPopularidade(matches.map(investidorDeConexao), (item) => item.investidor.id);
}

export async function obterStatusInteresse(user: UserProfile | null, id: string): Promise<StatusInteresse> {
  const investidor = await obterInvestidor(user, id);
  return investidor?.statusInteresse ?? "nenhum";
}

export async function registrarInteresse(
  _user: UserProfile | null,
  id: string,
  scorecard?: RefScorecard | null,
): Promise<StatusInteresse> {
  const { data } = await api.put<InteresseBack>(`/api/interests/${idObrigatorio(id)}`);
  void enviarFeedback(scorecard, "INTERESTED");
  limparCacheRecomendacoesIa();
  return statusDoInteresseEnviado(data);
}

export async function desfazerInteresse(_user: UserProfile | null, id: string): Promise<StatusInteresse> {
  const { data } = await api.delete<RetiradaInteresseBack>(`/api/interests/${idObrigatorio(id)}`);
  limparCacheRecomendacoesIa();
  return statusInteresseDoBack(data.status);
}

export async function obterContato(_user: UserProfile | null, id: string): Promise<DadosUnio | null> {
  const userId = paraIdDoBack(id);
  if (userId === null) return null;
  const conexao = (await listarMatches()).find((item) => item.userId === userId);
  return conexao ? contatoDeConexao(conexao) : null;
}

export async function desfazerMatch(_user: UserProfile | null, id: string): Promise<ResultadoDesfazerMatch> {
  const { data } = await api.delete<RetiradaInteresseBack>(`/api/interests/${idObrigatorio(id)}`);
  limparCacheRecomendacoesIa();
  return { status: statusInteresseDoBack(data.status), reunioesCanceladas: data.canceledMeetings };
}

