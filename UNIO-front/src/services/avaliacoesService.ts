import { RESUMO_MOCK } from "../mocks/dashboardStartupMock";
import {
  INTERESSES_RECEBIDOS_INVESTIDOR_EXEMPLO,
  NOTAS_RECEBIDAS_EXEMPLO,
  REUNIOES_REALIZADAS_EXEMPLO,
  VISITAS_INVESTIDOR_EXEMPLO,
} from "../mocks/popularidadeMock";
import {
  MAX_CARACTERES_COMENTARIO,
  NOTAS_AVALIACAO,
  type AvaliacaoReuniao,
  type NotaAvaliacao,
  type Popularidade,
  type PopularidadePublica,
} from "../types/avaliacoes";
import type { Reuniao } from "../types/reunioes";
import { resumirPopularidade, variacaoPercentual } from "../utils/popularidade";
import { gravarAvaliacoes, lerAvaliacoes } from "./avaliacoesStore";
import { chaveUsuario } from "./onboardingService";
import { popularidadeDoPerfil } from "./popularidadePerfis";
import { listarReunioes, type SessaoReunioes } from "./reunioesService";

// MOCK, SEM BACK para avaliação e popularidade (RF10, ADR-006). As telas usam
// só estas funções (todas devolvem Promise), então trocar pela API não muda
// as telas:
// - Avaliações enviadas, notas de exemplo recebidas e visitas: localStorage
//   por e-mail (avaliacoesStore.ts, unio_avaliacoes_<email>), com try/catch.
// - As reuniões vêm do reunioesService (mock ou API, conforme o modo).
// - Dados de exemplo da popularidade: mocks/popularidadeMock.ts; as visitas da
//   startup reaproveitam o dashboardStartupMock.
// - O COMENTÁRIO é guardado no envio e NUNCA volta para as telas: nenhuma
//   função de leitura deste arquivo devolve o texto.
// - O mapeamento para a API (POST /api/meetings/{id}/reviews,
//   GET /api/reviews/summary/{userId}, GET /api/profile/me/popularity e
//   POST /api/profile-views) fica isolado no bloco no fim do arquivo.

const LATENCIA_MS = 250;

function esperar() {
  return new Promise((resolve) => setTimeout(resolve, LATENCIA_MS));
}

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

// ---------------------------------------------------------------------------
// Avaliação da reunião
// ---------------------------------------------------------------------------

function idsAvaliados(userKey: string) {
  return new Set(lerAvaliacoes(userKey).enviadas.map((avaliacao) => avaliacao.reuniaoId));
}

// Reuniões realizadas que você ainda não avaliou (mais recente primeiro)
export async function listarPendentesDeAvaliacao(sessao: SessaoReunioes): Promise<Reuniao[]> {
  if (!sessao.user) return [];
  const reunioes = await listarReunioes(sessao);
  const avaliadas = idsAvaliados(chaveDe(sessao));
  return reunioes
    .filter((reuniao) => reuniao.status === "realizada" && !avaliadas.has(reuniao.id))
    .sort((a, b) => (b.horarioConfirmado ?? "").localeCompare(a.horarioConfirmado ?? ""));
}

export async function jaAvaliou(sessao: SessaoReunioes, reuniaoId: string): Promise<boolean> {
  return idsAvaliados(chaveDe(sessao)).has(reuniaoId);
}

// Uma vez por reunião, só se realizada. A avaliação é do OUTRO participante.
// Devolve só nota e data: o comentário fica guardado e não volta.
export async function avaliarReuniao(
  sessao: SessaoReunioes,
  reuniaoId: string,
  nota: NotaAvaliacao,
  comentario?: string,
): Promise<AvaliacaoReuniao> {
  const userKey = chaveDe(sessao);
  if (!userKey) throw new Error("Entre na sua conta para avaliar.");
  if (!NOTAS_AVALIACAO.includes(nota)) throw new Error("Escolha uma nota de 1 a 5.");
  const texto = comentario?.trim() ?? "";
  if (texto.length > MAX_CARACTERES_COMENTARIO) {
    throw new Error(`O comentário deve ter no máximo ${MAX_CARACTERES_COMENTARIO} caracteres.`);
  }
  const reuniao = (await listarReunioes(sessao)).find((item) => item.id === reuniaoId);
  if (!reuniao) throw new Error("Reunião não encontrada.");
  if (reuniao.status !== "realizada") {
    throw new Error("A avaliação fica disponível depois que a reunião for marcada como realizada.");
  }
  await esperar();
  const banco = lerAvaliacoes(userKey);
  if (banco.enviadas.some((avaliacao) => avaliacao.reuniaoId === reuniaoId)) {
    throw new Error("Você já avaliou esta reunião.");
  }
  const criadaEm = new Date().toISOString();
  banco.enviadas.push({ reuniaoId, nota, criadaEm, ...(texto ? { comentario: texto } : {}) });
  gravarAvaliacoes(userKey, banco);
  avisar();
  return { reuniaoId, nota, criadaEm };
}

// ---------------------------------------------------------------------------
// Popularidade
// ---------------------------------------------------------------------------

function somaAtual(semanas: { atual: number }[]) {
  return semanas.reduce((soma, semana) => soma + semana.atual, 0);
}

// Popularidade do usuário logado: notas recebidas (exemplo + as da outra
// parte do mock), reuniões realizadas, visitas e interesses (exemplo)
export async function obterPopularidade(sessao: SessaoReunioes): Promise<Popularidade> {
  const userKey = chaveDe(sessao);
  const banco = lerAvaliacoes(userKey);
  const notas = [...NOTAS_RECEBIDAS_EXEMPLO, ...banco.recebidas.map((avaliacao) => avaliacao.nota)];
  const resumo = resumirPopularidade(notas);
  const realizadas = sessao.user
    ? (await listarReunioes(sessao).catch(() => [] as Reuniao[])).filter((r) => r.status === "realizada").length
    : 0;
  await esperar();

  const startup = sessao.perfil === "startup";
  const semanal = startup ? RESUMO_MOCK.visualizacoesSemanais : VISITAS_INVESTIDOR_EXEMPLO;
  const total28d = somaAtual(semanal);
  const anterior = semanal.reduce((soma, semana) => soma + semana.anterior, 0);

  return {
    percentual: resumo.percentual,
    totalAvaliacoes: resumo.totalAvaliacoes,
    visivel: resumo.visivel,
    reunioesRealizadas: REUNIOES_REALIZADAS_EXEMPLO + realizadas,
    visitas: {
      total28d,
      variacaoPercentual: startup ? RESUMO_MOCK.metricas.variacaoVisualizacoes : variacaoPercentual(total28d, anterior),
      semanal: semanal.map((semana) => ({ ...semana })),
    },
    interessesRecebidos: startup ? RESUMO_MOCK.metricas.interessados : INTERESSES_RECEBIDOS_INVESTIDOR_EXEMPLO,
  };
}

// O que o outro lado vê de um perfil: só a porcentagem, quando visível
export async function obterPopularidadePublica(perfilId: string): Promise<PopularidadePublica> {
  return popularidadeDoPerfil(perfilId);
}

// Chamada pelas páginas PerfilStartup e PerfilInvestidor uma vez por abertura.
// MOCK: só incrementa um contador local, sem guardar quem visitou nem quando.
// Com a API, o back faz a contagem (uma visita por visitante por dia) e nunca
// expõe o visitante.
export async function registrarVisitaPerfil(sessao: SessaoReunioes, perfilAlvoId: string): Promise<void> {
  const userKey = chaveDe(sessao);
  if (!userKey || !perfilAlvoId) return;
  const banco = lerAvaliacoes(userKey);
  banco.visitasRegistradas[perfilAlvoId] = (banco.visitasRegistradas[perfilAlvoId] ?? 0) + 1;
  gravarAvaliacoes(userKey, banco);
}

// ---------------------------------------------------------------------------
// API (pronto para trocar o mock). O mapeamento puro fica em
// avaliacoes.mapping.ts, testado sem axios. Para ligar:
// - avaliarReuniao: api.post(`/api/meetings/${id}/reviews`, toBackReview(nota, comentario))
// - jaAvaliou / listarPendentesDeAvaliacao: 409 "Você já avaliou" no POST, ou
//   guardar localmente os ids avaliados (o back não devolve mais o comentário
//   em nenhuma rota de leitura, D043)
// - obterPopularidade: fromBackPopularity((await api.get("/api/profile/me/popularity")).data)
// - obterPopularidadePublica: fromBackSummary((await api.get(`/api/reviews/summary/${userId}`)).data)
// - registrarVisitaPerfil: api.post("/api/profile-views", { targetUserId: Number(id) }) (204)
// ---------------------------------------------------------------------------

export { fromBackPopularity, fromBackSummary, toBackReview } from "./avaliacoes.mapping";
