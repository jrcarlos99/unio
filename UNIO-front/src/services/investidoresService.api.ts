import type { UserProfile } from "../contexts/AuthContext";
import type { DadosUnio, ResultadoDesfazerMatch, TipoEventoUnio } from "../types/contato";
import type { RefScorecard, StatusInteresse } from "../types/discovery";
import type {
  FiltrosInvestidores,
  InvestidorDetalhe,
  InvestidorRecomendado,
  ResumoStartupInvestidores,
} from "../types/investidores";
import { formatarMoeda } from "../utils/formatoDescoberta";
import { paraIdDoBack } from "../utils/idsBack";
import api from "./api";
import { obterContextoStartup } from "./dashboardStartupService";
import { buscarDescoberta, buscarDetalhe, comPopularidade, enviarFeedback } from "./descobertaApi";
import {
  contatoDeConexao,
  investidorDeConexao,
  investidorRecomendadoDoBack,
  motivosDoBack,
  statusDoInteresseEnviado,
  statusInteresseDoBack,
  type ConexaoBack,
  type InteresseBack,
  type RetiradaInteresseBack,
} from "./discovery.mapping";
import { aplicarFiltrosInvestidores } from "./investidoresService.mock";
import { chaveUsuario } from "./onboardingService";
import { unioLocalStartup as unioLocal } from "./unioLocal";

// MODO API (VITE_MOCK_BACKEND diferente de "true") dos investidores vistos
// pela startup: aba Investidores, Salvos, Meus unios, perfil do investidor e
// "Investidores recomendados" da Visão geral (ADR-008). Mesmas funções e tipos
// de investidoresService.mock.ts; as telas importam investidoresService.ts.
//
// - Lista e perfil: /api/discovery/investors (score do scorecard do back).
// - Interesse e match: /api/interests; salvos: /api/saved.
// - Contato depois do match: só o e-mail de /api/interests/matches.
// - Feedback do algoritmo: silencioso, nunca bloqueia a tela.
// - Continua local: os eventos de contato do popup (unioLocal).

const CAMINHO_LISTA = "/api/discovery/investors";

export { aplicarFiltrosInvestidores };

// Topo da aba: dados do perfil da startup. A captação da rodada não existe no
// back, então fica null e o card não aparece.
export async function obterResumoStartup(user: UserProfile | null): Promise<ResumoStartupInvestidores> {
  const { dados } = await obterContextoStartup(user);
  const capital = dados.capitalProcurado;
  return {
    segmento: dados.segmento,
    estagio: dados.estagio,
    capitalProcurado: capital === null ? null : typeof capital === "number" ? formatarMoeda(capital) : capital,
    captacao: null,
  };
}

export async function listarInvestidoresRecomendados(
  _user: UserProfile | null,
  filtros: FiltrosInvestidores = {},
): Promise<InvestidorRecomendado[]> {
  const itens = await buscarDescoberta(CAMINHO_LISTA, {
    busca: filtros.busca,
    segmento: filtros.segmento,
    tipo: filtros.tipo,
  });
  return comPopularidade(itens.map(investidorRecomendadoDoBack), (item) => item.investidor.id);
}

export async function obterInvestidor(_user: UserProfile | null, id: string): Promise<InvestidorDetalhe | null> {
  const userId = paraIdDoBack(id);
  if (userId === null) return null;
  const item = await buscarDetalhe(`${CAMINHO_LISTA}/${userId}`);
  if (!item) return null;
  // Abriu o perfil: feedback VIEWED, sem esperar e sem erro na tela
  void enviarFeedback(item.scorecard, "VIEWED");
  const [comSelo] = await comPopularidade([investidorRecomendadoDoBack(item)], (rec) => rec.investidor.id);
  return { ...comSelo, motivos: motivosDoBack(item, "startup") };
}

function idObrigatorio(id: string): number {
  const userId = paraIdDoBack(id);
  if (userId === null) throw new Error("Este perfil é de exemplo e não existe no back.");
  return userId;
}

export async function salvarInvestidor(_user: UserProfile | null, id: string): Promise<void> {
  await api.put(`/api/saved/${idObrigatorio(id)}`);
}

export async function removerSalvo(_user: UserProfile | null, id: string): Promise<void> {
  await api.delete(`/api/saved/${idObrigatorio(id)}`);
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
  return statusDoInteresseEnviado(data);
}

export async function desfazerInteresse(_user: UserProfile | null, id: string): Promise<StatusInteresse> {
  const { data } = await api.delete<RetiradaInteresseBack>(`/api/interests/${idObrigatorio(id)}`);
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
  return { status: statusInteresseDoBack(data.status), reunioesCanceladas: data.canceledMeetings };
}

export async function registrarEvento(user: UserProfile | null, id: string, tipo: TipoEventoUnio): Promise<void> {
  if (user) unioLocal.registrarEvento(chaveUsuario(user), id, tipo);
}
