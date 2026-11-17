// Monta o resumo da home da startup ("Visão geral") no MODO API (ADR-007).
// Função pura, testada em tests/dashboardStartup.mapping.test.ts.
//
// Regra: número real nunca é trocado pelo valor do mock, nem quando é 0.
// - Do back: visualizações dos últimos 28 dias, variação e série semanal
//   (GET /api/profile/me/popularity) e reuniões marcadas (CONFIRMADA e
//   REALIZADA do GET /api/meetings).
// - Contatos iniciados: eventos locais do popup do unio (unioLocal.ts). Não
//   é mock: é a contagem real deste navegador, então 0 fica 0.
// - Ainda sem endpoint no back (interessados, matches, etapa "Demonstraram
//   interesse" do funil): continuam com o mock e levam o selo "Dados de
//   exemplo". Se uma chamada ao back falhar, aquele bloco também volta ao
//   mock com o selo, para a tela não ficar vazia.
import { RESUMO_MOCK } from "../mocks/dashboardStartupMock.ts";
import type { Popularidade } from "../types/avaliacoes.ts";
import type { EtapaFunil, ResumoStartup } from "../types/dashboard.ts";
import type { Reuniao } from "../types/reunioes.ts";

export interface DadosReaisDashboard {
  // null: a chamada ao back falhou
  popularidade: Popularidade | null;
  reunioes: readonly Reuniao[] | null;
  contatosIniciados: number;
}

// Reuniões que contam no funil: confirmadas e realizadas
export function contarReunioesMarcadas(reunioes: readonly Reuniao[]): number {
  return reunioes.filter((reuniao) => reuniao.status === "confirmada" || reuniao.status === "realizada").length;
}

export function montarResumoApi(dados: DadosReaisDashboard, atualizadoEm: string): ResumoStartup {
  const [visualizaramMock, interesseMock, contatoMock, reuniaoMock] = RESUMO_MOCK.funil;
  const visitas = dados.popularidade?.visitas ?? null;
  const visualizacoes = visitas ? visitas.total28d : RESUMO_MOCK.metricas.visualizacoes;
  const reunioes = dados.reunioes ? contarReunioesMarcadas(dados.reunioes) : null;

  const funil: EtapaFunil[] = [
    visitas ? { ...visualizaramMock, valor: visualizacoes } : { ...visualizaramMock, exemplo: true },
    { ...interesseMock, exemplo: true },
    { ...contatoMock, valor: dados.contatosIniciados },
    reunioes !== null ? { ...reuniaoMock, valor: reunioes } : { ...reuniaoMock, exemplo: true },
  ];

  return {
    ...RESUMO_MOCK,
    metricas: {
      ...RESUMO_MOCK.metricas,
      visualizacoes,
      variacaoVisualizacoes: visitas ? visitas.variacaoPercentual : RESUMO_MOCK.metricas.variacaoVisualizacoes,
      contatosIniciados: dados.contatosIniciados,
    },
    visualizacoesSemanais:
      visitas && visitas.semanal.length > 0
        ? visitas.semanal.map((semana) => ({ ...semana }))
        : RESUMO_MOCK.visualizacoesSemanais.map((semana) => ({ ...semana })),
    funil,
    exemplo: {
      visualizacoes: !visitas,
      interessados: true,
      matches: true,
      grafico: !visitas || visitas.semanal.length === 0,
      funil: funil.some((etapa) => etapa.exemplo),
    },
    atualizadoEm,
  };
}
