import type { DadosUnio, ResultadoDesfazerMatch, TipoEventoUnio } from "../types/contato";
import type {
  FiltrosDescoberta,
  RefScorecard,
  StartupDetalhe,
  StartupRecomendada,
  StatusInteresse,
  TeseInvestidor,
} from "../types/discovery";
import { paraIdDoBack } from "../utils/idsBack";
import api from "./api";
import { buscarDescoberta, buscarDetalhe, comPopularidade, enviarFeedback } from "./descobertaApi";
import {
  contatoDeConexao,
  motivosDoBack,
  startupDeConexao,
  startupRecomendadaDoBack,
  statusDoInteresseEnviado,
  statusInteresseDoBack,
  type ConexaoBack,
  type InteresseBack,
  type RetiradaInteresseBack,
} from "./discovery.mapping";
import { aplicarFiltros, obterTeseInvestidor as teseDoOnboarding } from "./discoveryService.mock";
import { unioLocalInvestidor as unioLocal } from "./unioLocal";

// MODO API (VITE_MOCK_BACKEND diferente de "true") das telas do investidor:
// Descobrir, Perfil da startup, Salvos e Meus unios (ADR-008). Mesmas funções
// e tipos de discoveryService.mock.ts; as telas importam discoveryService.ts.
//
// - Lista e perfil: /api/discovery/startups (score do scorecard do back).
// - Interesse e match: /api/interests; salvos: /api/saved.
// - Contato depois do match: só o e-mail de /api/interests/matches.
// - Feedback do algoritmo (VIEWED ao abrir o perfil, INTERESTED no "Tenho
//   interesse"): silencioso, nunca bloqueia a tela.
// - Continua local (não existe no back): a tese exibida no topo (respostas do
//   onboarding) e os eventos de contato do popup (unioLocal).
// O userKey não é usado nas chamadas: o token identifica o usuário.

const CAMINHO_LISTA = "/api/discovery/startups";

export { aplicarFiltros };

// A tese do topo do Descobrir vem das respostas do onboarding, como no mock
export async function obterTeseInvestidor(userKey: string): Promise<TeseInvestidor> {
  return teseDoOnboarding(userKey);
}

// A tesouraria alocada não existe no back: no modo API o card não aparece
export async function obterTesouraria(): Promise<string | null> {
  return null;
}

export async function listarStartupsRecomendadas(
  _userKey: string,
  filtros: FiltrosDescoberta = {},
): Promise<StartupRecomendada[]> {
  const itens = await buscarDescoberta(CAMINHO_LISTA, {
    busca: filtros.busca,
    segmento: filtros.segmento,
    estagio: filtros.estagio,
  });
  return comPopularidade(itens.map(startupRecomendadaDoBack), (item) => item.startup.id);
}

export async function obterStartup(_userKey: string, id: string): Promise<StartupDetalhe | null> {
  const userId = paraIdDoBack(id);
  if (userId === null) return null;
  const item = await buscarDetalhe(`${CAMINHO_LISTA}/${userId}`);
  if (!item) return null;
  // Abriu o perfil: feedback VIEWED, sem esperar e sem erro na tela
  void enviarFeedback(item.scorecard, "VIEWED");
  const [comSelo] = await comPopularidade([startupRecomendadaDoBack(item)], (rec) => rec.startup.id);
  return { ...comSelo, motivos: motivosDoBack(item, "investidor") };
}

function idObrigatorio(id: string): number {
  const userId = paraIdDoBack(id);
  if (userId === null) throw new Error("Este perfil é de exemplo e não existe no back.");
  return userId;
}

export async function salvarStartup(_userKey: string, id: string): Promise<void> {
  await api.put(`/api/saved/${idObrigatorio(id)}`);
}

export async function removerSalvo(_userKey: string, id: string): Promise<void> {
  await api.delete(`/api/saved/${idObrigatorio(id)}`);
}

export async function listarSalvos(_userKey: string): Promise<StartupRecomendada[]> {
  const { data } = await api.get<ConexaoBack[]>("/api/saved");
  return comPopularidade(
    data.filter((conexao) => conexao.role === "STARTUP").map(startupDeConexao),
    (item) => item.startup.id,
  );
}

export async function obterStatusInteresse(_userKey: string, id: string): Promise<StatusInteresse> {
  const startup = await obterStartup(_userKey, id);
  return startup?.statusInteresse ?? "nenhum";
}

// "Tenho interesse": o back diz se ficou enviado ou se virou match
export async function registrarInteresse(
  _userKey: string,
  id: string,
  scorecard?: RefScorecard | null,
): Promise<StatusInteresse> {
  const { data } = await api.put<InteresseBack>(`/api/interests/${idObrigatorio(id)}`);
  void enviarFeedback(scorecard, "INTERESTED");
  return statusDoInteresseEnviado(data);
}

// Retira o interesse enviado (antes do match)
export async function desfazerInteresse(_userKey: string, id: string): Promise<StatusInteresse> {
  const { data } = await api.delete<RetiradaInteresseBack>(`/api/interests/${idObrigatorio(id)}`);
  return statusInteresseDoBack(data.status);
}

async function listarMatches(): Promise<ConexaoBack[]> {
  const { data } = await api.get<ConexaoBack[]>("/api/interests/matches");
  return data.filter((conexao) => conexao.role === "STARTUP");
}

// Meus unios
export async function listarUnios(_userKey: string): Promise<StartupRecomendada[]> {
  const matches = await listarMatches();
  return comPopularidade(matches.map(startupDeConexao), (item) => item.startup.id);
}

// Contato só de quem tem match (o back garante; aqui só procura o par)
export async function obterContato(_userKey: string, id: string): Promise<DadosUnio | null> {
  const userId = paraIdDoBack(id);
  if (userId === null) return null;
  const conexao = (await listarMatches()).find((item) => item.userId === userId);
  return conexao ? contatoDeConexao(conexao) : null;
}

// Desfaz o match: o back apaga o interesse e cancela as reuniões futuras do par
export async function desfazerMatch(_userKey: string, id: string): Promise<ResultadoDesfazerMatch> {
  const { data } = await api.delete<RetiradaInteresseBack>(`/api/interests/${idObrigatorio(id)}`);
  return { status: statusInteresseDoBack(data.status), reunioesCanceladas: data.canceledMeetings };
}

// Eventos de contato (dashboard da startup) continuam locais: não há endpoint
export async function registrarEvento(userKey: string, id: string, tipo: TipoEventoUnio): Promise<void> {
  unioLocal.registrarEvento(userKey, id, tipo);
}
