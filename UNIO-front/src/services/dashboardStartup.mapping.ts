// Monta o resumo da home da startup ("Visão geral") só com dados do back
// (ADR-011). Função pura, testada em tests/dashboardStartup.mapping.test.ts.
//
// - Visualizações dos últimos 28 dias, variação, série semanal e interesses
//   recebidos: GET /api/profile/me/popularity.
// - Matches mútuos: GET /api/interests/matches.
// - Reuniões marcadas (CONFIRMADA e REALIZADA): GET /api/meetings.
// Se uma chamada falhar, o número daquele bloco fica null e a tela mostra
// "indisponível". Nunca há número de exemplo no lugar.
import type { Popularidade } from "../types/avaliacoes.ts";
import type { EtapaFunil, ResumoStartup } from "../types/dashboard.ts";
import type { Reuniao } from "../types/reunioes.ts";

export interface DadosReaisDashboard {
  // null: a chamada ao back falhou
  popularidade: Popularidade | null;
  reunioes: readonly Reuniao[] | null;
  // Matches mútuos; null: a chamada ao back falhou
  matches: number | null;
}

// Reuniões que contam no funil: confirmadas e realizadas
export function contarReunioesMarcadas(reunioes: readonly Reuniao[]): number {
  return reunioes.filter((reuniao) => reuniao.status === "confirmada" || reuniao.status === "realizada").length;
}

export const ROTULOS_FUNIL = ["Visualizaram perfil", "Demonstraram interesse", "Match mútuo", "Reunião marcada"] as const;

export function montarResumo(dados: DadosReaisDashboard, atualizadoEm: string): ResumoStartup {
  const visitas = dados.popularidade?.visitas ?? null;
  const interesses = dados.popularidade ? dados.popularidade.interessesRecebidos : null;
  const reunioes = dados.reunioes ? contarReunioesMarcadas(dados.reunioes) : null;
  const valores = [visitas ? visitas.total28d : null, interesses, dados.matches, reunioes];
  const funil: EtapaFunil[] = ROTULOS_FUNIL.map((rotulo, indice) => ({ rotulo, valor: valores[indice] }));

  return {
    atualizadoEm,
    metricas: {
      visualizacoes: visitas ? visitas.total28d : null,
      variacaoVisualizacoes: visitas ? visitas.variacaoPercentual : null,
      interessados: interesses,
      matches: dados.matches,
    },
    visualizacoesSemanais: visitas ? visitas.semanal.map((semana) => ({ ...semana })) : null,
    funil,
  };
}
