// Mapeamento entre a avaliação/popularidade do front (types/avaliacoes.ts) e
// a API do back (D040 a D044 em unio/docs/decisoes.md; ADR-006). Funções
// puras, testadas em tests/avaliacoes.mapping.test.ts (imports com .ts).
//
// Regra de ouro: o COMENTÁRIO só existe na ida (toBackReview). Se alguma
// resposta do back trouxer `comment`, ele é descartado aqui e nunca chega às
// telas.
import type { NotaAvaliacao, Popularidade, PopularidadePublica } from "../types/avaliacoes.ts";
import type { Reuniao } from "../types/reunioes.ts";
import { paraIdDoBack } from "../utils/idsBack.ts";
import { variacaoPercentual } from "../utils/popularidade.ts";

// GET /api/meetings/{id}/reviews (ReviewResponse do back, sem comment, D043)
export interface ParticipanteReviewBack {
  id: number;
  name?: string;
  role?: string;
  active?: boolean;
}

export interface ReviewBack {
  id: number;
  meetingId: number;
  reviewer: ParticipanteReviewBack | null;
  reviewed: ParticipanteReviewBack | null;
  rating: number;
  createdAt: string;
}

// Quantas reuniões realizadas (as mais recentes) são consultadas para saber
// quais ainda faltam avaliar: uma chamada GET /reviews por reunião
export const MAX_REUNIOES_CONSULTADAS = 20;

export const MENSAGEM_JA_AVALIOU = "Você já avaliou esta reunião.";

// A avaliação dessa reunião já foi feita por mim? Pelo id do usuário logado
// (reviewer). Sem o meu id, vale a avaliação feita sobre a outra parte
// (reviewed), já que a reunião tem só dois participantes.
export function avaliacaoEhMinha(
  avaliacoes: readonly ReviewBack[],
  meuId: string | number | null | undefined,
  outraParteId: string | number | null | undefined,
): boolean {
  const eu = paraIdDoBack(meuId ?? null);
  if (eu !== null) return avaliacoes.some((avaliacao) => avaliacao.reviewer?.id === eu);
  const outro = paraIdDoBack(outraParteId ?? null);
  return outro !== null && avaliacoes.some((avaliacao) => avaliacao.reviewed?.id === outro);
}

// Erro do POST /reviews que significa "você já avaliou": 409 (ou 400) com a
// mensagem do back. Um 409 sem mensagem também conta. O outro 409 do back
// ("só depois de realizada") NÃO conta.
export function ehAvaliacaoRepetida(status: number | undefined, mensagem: string | undefined): boolean {
  if (status !== 409 && status !== 400) return false;
  const texto = mensagem?.trim() ?? "";
  if (!texto) return status === 409;
  return /j[áa]\s+avaliou|already\s+review/i.test(texto);
}

// Realizadas mais recentes primeiro, até o limite de consulta
export function realizadasParaConsultar(reunioes: readonly Reuniao[], limite = MAX_REUNIOES_CONSULTADAS): Reuniao[] {
  return reunioes
    .filter((reuniao) => reuniao.status === "realizada")
    .sort((a, b) => (b.horarioConfirmado ?? "").localeCompare(a.horarioConfirmado ?? ""))
    .slice(0, limite);
}

// POST /api/meetings/{id}/reviews
export interface ReviewCreateRequestBack {
  rating: number;
  comment?: string;
}

// GET /api/reviews/summary/{userId}
export interface ReviewSummaryBack {
  userId: number;
  totalReviews: number;
  averageRating: number | null;
  percentage: number | null;
  visible: boolean;
}

// GET /api/profile/me/popularity
export interface PopularityBack extends ReviewSummaryBack {
  meetingsCompleted: number;
  profileViews28d: number;
  profileViewsPrev28d: number;
  weeklyViews: { weekStart: string; views: number }[];
  interestsReceived: number;
}

export function toBackReview(nota: NotaAvaliacao, comentario?: string): ReviewCreateRequestBack {
  const corpo: ReviewCreateRequestBack = { rating: nota };
  const limpo = comentario?.trim();
  if (limpo) corpo.comment = limpo;
  return corpo;
}

// Só os agregados; qualquer outro campo (comment, reviewer...) é ignorado
export function fromBackSummary(resumo: ReviewSummaryBack): PopularidadePublica {
  const visivel = resumo.visible === true && typeof resumo.percentage === "number";
  return { percentual: visivel ? Math.round(resumo.percentage as number) : null, visivel };
}

export function fromBackPopularity(dados: PopularityBack): Popularidade {
  const { percentual, visivel } = fromBackSummary(dados);
  // O back devolve o total do período anterior, não a série semanal dele:
  // a linha "Anterior" do gráfico usa a média semanal desse total
  const anteriorSemanal = Math.round((dados.profileViewsPrev28d ?? 0) / 4);
  return {
    percentual,
    totalAvaliacoes: dados.totalReviews,
    visivel,
    reunioesRealizadas: dados.meetingsCompleted,
    visitas: {
      total28d: dados.profileViews28d,
      variacaoPercentual: variacaoPercentual(dados.profileViews28d, dados.profileViewsPrev28d),
      // weeklyViews: 4 janelas de 7 dias, da mais antiga à mais recente (D042)
      semanal: (dados.weeklyViews ?? []).map((semana, indice) => ({
        semana: `Sem ${indice + 1}`,
        atual: semana.views,
        anterior: anteriorSemanal,
      })),
    },
    // Sempre 0 por enquanto: o interesse mútuo ainda não existe no back (D039,
    // D042). As telas mostram o número como veio, sem trocar por exemplo.
    interessesRecebidos: dados.interestsReceived ?? 0,
  };
}
