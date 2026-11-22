import type { PontoSemana } from "./dashboard";

// Avaliação pós-interação (RF10) e popularidade. ADR-006.
//
// Regra de visibilidade escolhida pelo grupo (o RF10 não define): só a NOTA
// conta e aparece, como porcentagem e só a partir de 3 avaliações. O
// comentário é opcional, fica guardado e NUNCA é exibido a ninguém, nem a
// quem recebeu a avaliação.

export type NotaAvaliacao = 1 | 2 | 3 | 4 | 5;

export const NOTAS_AVALIACAO: NotaAvaliacao[] = [1, 2, 3, 4, 5];

export const MAX_CARACTERES_COMENTARIO = 500;

export interface AvaliacaoReuniao {
  reuniaoId: string;
  nota: NotaAvaliacao;
  criadaEm: string;
  // Só usado no ENVIO. Nenhuma função de leitura devolve este campo.
  comentario?: string;
}

export interface VisitasPerfil {
  // Visitas nos últimos 28 dias (uma por visitante por dia, no back)
  total28d: number;
  // Variação em relação aos 28 dias anteriores, em % (18 = +18%)
  variacaoPercentual: number;
  // 4 semanas (mesmo formato do gráfico da Visão geral)
  semanal: PontoSemana[];
}

export interface Popularidade {
  // Média das notas em % (0 a 100). Nulo abaixo do mínimo de avaliações.
  percentual: number | null;
  totalAvaliacoes: number;
  // true quando há o mínimo de avaliações (MIN_AVALIACOES_EXIBIR)
  visivel: boolean;
  reunioesRealizadas: number;
  visitas: VisitasPerfil;
  interessesRecebidos: number;
}

// O que o outro lado vê: só a porcentagem, quando visível
export interface PopularidadePublica {
  percentual: number | null;
  visivel: boolean;
}
