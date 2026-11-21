import type { DadosUnio, ResultadoDesfazerMatch } from "../types/contato";
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
import type { RespostasInvestidor } from "../types/onboarding";
import { normalizarBusca } from "../utils/formatoDescoberta";
import { readAnswer } from "./onboardingAnswersStore";
import { CHAVE_RESPOSTAS_ONBOARDING } from "./perfilOnboardingService";

// Único ponto de dados das telas do investidor: Descobrir, Perfil da startup,
// Salvos e Meus unios (ADR-008 e ADR-011). Só o back:
//
// - Lista e perfil: /api/discovery/startups (score do scorecard do back).
// - Interesse e match: /api/interests; salvos: /api/saved.
// - Contato depois do match: só o e-mail de /api/interests/matches.
// - Feedback do algoritmo (VIEWED ao abrir o perfil, INTERESTED no "Tenho
//   interesse"): silencioso, nunca bloqueia a tela.
// - Tese no topo do Descobrir: respostas do onboarding guardadas no back
//   (GET /api/profile/onboarding, chave "onboarding").
// O userKey não é usado nas chamadas: o token identifica o usuário.

const CAMINHO_LISTA = "/api/discovery/startups";

// Filtro puro sobre a lista já carregada: as telas filtram no cliente a cada
// tecla, sem buscar de novo
export function aplicarFiltros(lista: StartupRecomendada[], filtros: FiltrosDescoberta) {
  const termo = normalizarBusca(filtros.busca?.trim() ?? "");
  return lista.filter(({ startup }) => {
    if (filtros.segmento && startup.segmento !== filtros.segmento) return false;
    if (filtros.estagio && startup.estagio !== filtros.estagio) return false;
    if (!termo) return true;
    const alvo = [
      startup.nome,
      startup.segmento,
      ...startup.segmentosSecundarios,
      startup.categoria,
      startup.descricao,
      startup.cidade,
      ...startup.tags,
    ].join(" ");
    return normalizarBusca(alvo).includes(termo);
  });
}

// Respostas do onboarding (podem estar incompletas ou nem existir) → tese
export function teseDasRespostas(respostas: Partial<RespostasInvestidor> | null): TeseInvestidor {
  return {
    segmentosInteresse: respostas?.segmentosInteresse ?? [],
    estagiosInteresse: respostas?.estagiosInteresse ?? [],
    ticketMedio: respostas?.ticketMedio ?? null,
    apenasMentor: respostas?.apenasMentor ?? false,
    disponibilidade: respostas?.disponibilidade ?? null,
    regioesInteresse: respostas?.regioesInteresse ?? [],
  };
}

// Tese do topo do Descobrir, das respostas do onboarding guardadas no back.
// Sem resposta do back, a tese fica vazia e a tela diz "tese ainda não
// configurada" (nunca um valor inventado).
export async function obterTeseInvestidor(): Promise<TeseInvestidor> {
  try {
    const respostas = await readAnswer(CHAVE_RESPOSTAS_ONBOARDING);
    const objeto = respostas && typeof respostas === "object" ? (respostas as Partial<RespostasInvestidor>) : null;
    return teseDasRespostas(objeto);
  } catch {
    return teseDasRespostas(null);
  }
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
  if (userId === null) throw new Error("Perfil não encontrado.");
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

