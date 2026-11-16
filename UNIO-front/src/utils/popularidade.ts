// Popularidade (RF10, ADR-006): funções puras, testadas em
// tests/popularidade.test.ts (por isso sem imports do app).
//
// Popularidade = média das notas (1 a 5) em porcentagem, só exibida a partir
// de MIN_AVALIACOES_EXIBIR avaliações. Mesma regra do back
// (GET /api/reviews/summary/{userId}, D040).

export const MIN_AVALIACOES_EXIBIR = 3;

// Bônus máximo de ordenação, em pontos de compatibilidade
export const BONUS_MAXIMO_POPULARIDADE = 5;

// round(média / 5 * 100). Sem notas: null.
export function calcularPercentual(notas: readonly number[]): number | null {
  if (notas.length === 0) return null;
  const media = notas.reduce((soma, nota) => soma + nota, 0) / notas.length;
  return Math.round((media / 5) * 100);
}

export interface ResumoPopularidade {
  // Nulo abaixo do mínimo
  percentual: number | null;
  totalAvaliacoes: number;
  visivel: boolean;
  // Quantas avaliações ainda faltam para exibir (0 quando visível)
  faltam: number;
}

export function resumirPopularidade(notas: readonly number[]): ResumoPopularidade {
  const total = notas.length;
  const visivel = total >= MIN_AVALIACOES_EXIBIR;
  return {
    percentual: visivel ? calcularPercentual(notas) : null,
    totalAvaliacoes: total,
    visivel,
    faltam: Math.max(0, MIN_AVALIACOES_EXIBIR - total),
  };
}

// Variação percentual entre dois períodos (18 = +18%). Sem base: 0.
export function variacaoPercentual(atual: number, anterior: number): number {
  if (anterior <= 0) return 0;
  return Math.round(((atual - anterior) / anterior) * 100);
}

// Ordenação das listas de descoberta (Descobrir, Investidores, Salvos, Meus
// unios). A ordem continua sendo por COMPATIBILIDADE; a popularidade visível
// entra só como:
//   1) pequeno bônus de ordenação: até BONUS_MAXIMO_POPULARIDADE pontos
//      (popularidade 100% = +5; 60% = +3);
//   2) desempate: com a mesma chave, quem tem popularidade maior vem antes.
// O bônus NUNCA é somado ao número de compatibilidade exibido no card: esta
// função só reordena e devolve os mesmos itens, sem alterá-los. Popularidade
// nula (abaixo do mínimo) não ganha bônus nem perde posição por isso.
export function chaveOrdenacao(compatibilidade: number, popularidade: number | null | undefined): number {
  const bonus = typeof popularidade === "number" ? (popularidade / 100) * BONUS_MAXIMO_POPULARIDADE : 0;
  return compatibilidade + bonus;
}

export function ordenarComPopularidade<T>(
  lista: readonly T[],
  compatibilidadeDe: (item: T) => number,
  popularidadeDe: (item: T) => number | null | undefined,
): T[] {
  return [...lista].sort((a, b) => {
    const diferenca =
      chaveOrdenacao(compatibilidadeDe(b), popularidadeDe(b)) - chaveOrdenacao(compatibilidadeDe(a), popularidadeDe(a));
    if (diferenca !== 0) return diferenca;
    return (popularidadeDe(b) ?? -1) - (popularidadeDe(a) ?? -1);
  });
}
