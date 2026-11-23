import axios from "axios";
import {
  MAX_CARACTERES_COMENTARIO,
  NOTAS_AVALIACAO,
  type AvaliacaoReuniao,
  type NotaAvaliacao,
  type Popularidade,
  type PopularidadePublica,
} from "../types/avaliacoes";
import type { Reuniao } from "../types/reunioes";
import { paraIdDoBack } from "../utils/idsBack";
import api, { getApiErrorMessage } from "./api";
import {
  MENSAGEM_JA_AVALIOU,
  avaliacaoEhMinha,
  ehAvaliacaoRepetida,
  fromBackPopularity,
  fromBackSummary,
  realizadasParaConsultar,
  toBackReview,
  type PopularityBack,
  type ReviewBack,
  type ReviewSummaryBack,
} from "./avaliacoes.mapping";
import { chaveUsuario } from "./onboardingService";
import { listarReunioes, type SessaoReunioes } from "./reunioesService";

// Único ponto de dados da avaliação pós-reunião e da popularidade (RF10,
// ADR-006, ADR-007 e ADR-011). As telas e hooks usam só estas funções (todas
// devolvem Promise). Só o back, com o cliente axios `api`:
// - avaliarReuniao: POST /api/meetings/{id}/reviews (toBackReview).
// - Pendentes e jaAvaliou: as reuniões REALIZADA do GET /api/meetings e, para
//   cada uma (no máximo 20, as mais recentes), GET /api/meetings/{id}/reviews.
//   Resultado em cache na memória, por usuário, até recarregar a página.
// - obterPopularidade: GET /api/profile/me/popularity (fromBackPopularity).
// - obterPopularidadePublica: GET /api/reviews/summary/{id}, só para id real.
// - registrarVisitaPerfil: POST /api/profile-views, só para id real.
// Regra de ouro (ADR-007): só ids numéricos reais vão ao back. Id que não é
// do back não gera chamada: a popularidade fica oculta e a visita não sai.
//
// O COMENTÁRIO só existe na ida: nenhuma função de leitura deste arquivo
// devolve o texto, e o back também não o devolve (D043).

const chaveDe = (sessao: SessaoReunioes) => (sessao.user ? chaveUsuario(sessao.user) : "");

// ---------------------------------------------------------------------------
// Avisos de mudança (drawer, aviso de pendentes e popularidade se atualizam)
// ---------------------------------------------------------------------------

type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();

export function assinarAvaliacoes(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

// Validação antes de qualquer chamada
function validarEnvio(nota: NotaAvaliacao, comentario?: string): string {
  if (!NOTAS_AVALIACAO.includes(nota)) throw new Error("Escolha uma nota de 1 a 5.");
  const texto = comentario?.trim() ?? "";
  if (texto.length > MAX_CARACTERES_COMENTARIO) {
    throw new Error(`O comentário deve ter no máximo ${MAX_CARACTERES_COMENTARIO} caracteres.`);
  }
  return texto;
}

// Cache por usuário: reuniaoId → já avaliei? Guarda a promessa para várias
// telas pedirem juntas sem repetir a chamada. Falha não fica no cache.
const avaliadasPorUsuario = new Map<string, Map<string, Promise<boolean>>>();

function cacheDe(sessao: SessaoReunioes) {
  const chave = chaveDe(sessao);
  let cache = avaliadasPorUsuario.get(chave);
  if (!cache) {
    cache = new Map();
    avaliadasPorUsuario.set(chave, cache);
  }
  return cache;
}

function meuId(sessao: SessaoReunioes) {
  const id = sessao.user?.id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

function apiJaAvaliei(sessao: SessaoReunioes, reuniao: Reuniao): Promise<boolean> {
  const cache = cacheDe(sessao);
  const emCache = cache.get(reuniao.id);
  if (emCache) return emCache;
  const id = paraIdDoBack(reuniao.id);
  if (id === null) return Promise.resolve(false);
  const promessa = api
    .get<ReviewBack[]>(`/api/meetings/${id}/reviews`)
    .then(({ data }) => avaliacaoEhMinha(Array.isArray(data) ? data : [], meuId(sessao), reuniao.unioId));
  cache.set(reuniao.id, promessa);
  promessa.catch(() => {
    if (cache.get(reuniao.id) === promessa) cache.delete(reuniao.id);
  });
  return promessa;
}

function marcarAvaliada(sessao: SessaoReunioes, reuniaoId: string) {
  cacheDe(sessao).set(reuniaoId, Promise.resolve(true));
  avisar();
}

async function apiPendentes(sessao: SessaoReunioes): Promise<Reuniao[]> {
  const realizadas = realizadasParaConsultar(await listarReunioes(sessao));
  const estados = await Promise.all(
    // Sem resposta do back, a reunião fica fora da lista (sem aviso falso)
    realizadas.map((reuniao) => apiJaAvaliei(sessao, reuniao).catch(() => true)),
  );
  return realizadas.filter((_, indice) => !estados[indice]);
}

async function apiJaAvaliou(sessao: SessaoReunioes, reuniaoId: string): Promise<boolean> {
  const reuniao = (await listarReunioes(sessao)).find((item) => item.id === reuniaoId);
  if (!reuniao || reuniao.status !== "realizada") return false;
  return apiJaAvaliei(sessao, reuniao);
}

async function apiAvaliar(
  sessao: SessaoReunioes,
  reuniaoId: string,
  nota: NotaAvaliacao,
  texto: string,
): Promise<AvaliacaoReuniao> {
  const id = paraIdDoBack(reuniaoId);
  if (id === null) throw new Error("Reunião não encontrada.");
  try {
    const { data } = await api.post<ReviewBack>(`/api/meetings/${id}/reviews`, toBackReview(nota, texto));
    marcarAvaliada(sessao, reuniaoId);
    // Só nota e data: o comentário não volta (nem o back o devolve)
    return { reuniaoId, nota, criadaEm: data?.createdAt ?? new Date().toISOString() };
  } catch (erro) {
    if (axios.isAxiosError(erro)) {
      const dados = erro.response?.data as { message?: unknown } | undefined;
      const mensagem = typeof dados?.message === "string" ? dados.message : undefined;
      if (ehAvaliacaoRepetida(erro.response?.status, mensagem)) {
        marcarAvaliada(sessao, reuniaoId);
        throw new Error(MENSAGEM_JA_AVALIOU);
      }
    }
    throw new Error(getApiErrorMessage(erro, "Não foi possível enviar a avaliação. Tente novamente."));
  }
}

async function apiPopularidade(): Promise<Popularidade> {
  const { data } = await api.get<PopularityBack>("/api/profile/me/popularity");
  return fromBackPopularity(data);
}

// ---------------------------------------------------------------------------
// Funções usadas pelas telas
// ---------------------------------------------------------------------------

// Reuniões realizadas que você ainda não avaliou (mais recente primeiro)
export async function listarPendentesDeAvaliacao(sessao: SessaoReunioes): Promise<Reuniao[]> {
  if (!sessao.user) return [];
  return apiPendentes(sessao);
}

export async function jaAvaliou(sessao: SessaoReunioes, reuniaoId: string): Promise<boolean> {
  if (!sessao.user) return false;
  return apiJaAvaliou(sessao, reuniaoId);
}

// Uma vez por reunião, só se realizada. A avaliação é do OUTRO participante.
// Devolve só nota e data: o comentário é enviado e não volta.
export async function avaliarReuniao(
  sessao: SessaoReunioes,
  reuniaoId: string,
  nota: NotaAvaliacao,
  comentario?: string,
): Promise<AvaliacaoReuniao> {
  if (!chaveDe(sessao)) throw new Error("Entre na sua conta para avaliar.");
  const texto = validarEnvio(nota, comentario);
  return apiAvaliar(sessao, reuniaoId, nota, texto);
}

// Popularidade do usuário logado (card da Visão geral e aba do investidor)
export async function obterPopularidade(): Promise<Popularidade> {
  return apiPopularidade();
}

// O que o outro lado vê de um perfil: só a porcentagem, quando visível.
// Id real (numérico): resumo do back (GET /api/reviews/summary/{id}). Id que
// não é do back: sem selo, sem chamada.
export const POPULARIDADE_OCULTA: PopularidadePublica = { percentual: 0, visivel: false };

export async function obterPopularidadePublica(perfilId: string): Promise<PopularidadePublica> {
  const id = paraIdDoBack(perfilId);
  if (id === null) return POPULARIDADE_OCULTA;
  const { data } = await api.get<ReviewSummaryBack>(`/api/reviews/summary/${id}`);
  return fromBackSummary(data);
}

// Chamada por PerfilStartup e PerfilInvestidor uma vez por abertura
// (useRegistrarVisita). Com a API, o back conta uma visita por visitante por
// dia e nunca expõe o visitante (D041). Nunca bloqueia a tela nem mostra erro.
export async function registrarVisitaPerfil(sessao: SessaoReunioes, perfilAlvoId: string): Promise<void> {
  if (!sessao.user || !perfilAlvoId) return;
  // Id que não é do back: não envia nada
  const targetUserId = paraIdDoBack(perfilAlvoId);
  if (targetUserId === null) return;
  try {
    await api.post("/api/profile-views", { targetUserId });
  } catch {
    // silencioso: a visita é só uma estatística
  }
}

export { fromBackPopularity, fromBackSummary, toBackReview } from "./avaliacoes.mapping";
