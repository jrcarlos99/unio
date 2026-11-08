import type { ResumoStartup } from "../types/dashboard";

// MOCK — números da home da startup ("Visão geral"), iguais aos do print.
// O back ainda NÃO tem: visualizações do perfil (total, variação e série
// semanal), funil de interesse, investidores interessados, matches, conversas
// iniciados nem benchmark de conversão. Contatos usam os eventos locais dos
// unios e reuniões usam as confirmadas do reunioesService, quando existirem
// (ver dashboardStartupService). Levar ao squad; só o
// services/dashboardStartupService.ts lê daqui. Os investidores recomendados
// ficam em mocks/investidoresMock.ts.

export const RESUMO_MOCK: Omit<ResumoStartup, "atualizadoEm"> = {
  metricas: {
    visualizacoes: 248,
    variacaoVisualizacoes: 18,
    interessados: 14,
    interessadosNovosSemana: 3,
    matches: 6,
    scoreMinimoMatches: 85,
    contatosIniciados: 3,
  },
  // Soma do "Atual" = 230 em 28 dias → 8,2 visualizações/dia
  visualizacoesSemanais: [
    { semana: "Sem 1", atual: 34, anterior: 28 },
    { semana: "Sem 2", atual: 52, anterior: 38 },
    { semana: "Sem 3", atual: 66, anterior: 52 },
    { semana: "Sem 4", atual: 78, anterior: 60 },
  ],
  funil: [
    { rotulo: "Visualizaram perfil", valor: 248 },
    { rotulo: "Demonstraram interesse", valor: 14 },
    { rotulo: "Contato iniciado", valor: 3 },
    { rotulo: "Reunião marcada", valor: 2 },
  ],
  benchmark: { min: 0.5, max: 1.2 },
};
