// Mapeamento entre a avaliação/popularidade do front (types/avaliacoes.ts) e
// a API do back (D040 a D044 em unio/docs/decisoes.md; ADR-006). Funções
// puras, testadas em tests/avaliacoes.mapping.test.ts (imports com .ts).
//
// Regra de ouro: o COMENTÁRIO só existe na ida (toBackReview). Se alguma
// resposta do back trouxer `comment`, ele é descartado aqui e nunca chega às
// telas.
import type { NotaAvaliacao, Popularidade, PopularidadePublica } from "../types/avaliacoes.ts";
import { variacaoPercentual } from "../utils/popularidade.ts";

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
      semanal: (dados.weeklyViews ?? []).map((semana, indice) => ({
        semana: `Sem ${indice + 1}`,
        atual: semana.views,
        anterior: anteriorSemanal,
      })),
    },
    interessesRecebidos: dados.interestsReceived,
  };
}
