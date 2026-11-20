// Resumo da Visão geral no modo API (src/services/dashboardStartup.mapping.ts,
// ADR-007 e ADR-009). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { RESUMO_MOCK } from "../src/mocks/dashboardStartupMock.ts";
import { contarReunioesMarcadas, montarResumoApi } from "../src/services/dashboardStartup.mapping.ts";
import type { Popularidade } from "../src/types/avaliacoes.ts";
import type { Reuniao, StatusReuniao } from "../src/types/reunioes.ts";

const AGORA = "2026-11-16T12:00:00.000Z";

function reuniao(id: string, status: StatusReuniao): Reuniao {
  return {
    id,
    unioId: "12",
    solicitante: "eu",
    organizador: "eu",
    contraparte: { id: "12", nome: "Rafael", subtitulo: "Investidor", iniciais: "RA", tipo: "investidor", selos: [] },
    assunto: "Mentoria",
    duracaoMin: 30,
    formato: "online",
    horariosSugeridos: [AGORA],
    status,
    criadaEm: AGORA,
    atualizadaEm: AGORA,
    codigo: "UNIO-1234",
  };
}

function popularidade(total28d: number, semanal: number[], variacao = 0, interesses = 0): Popularidade {
  return {
    percentual: null,
    totalAvaliacoes: 0,
    visivel: false,
    reunioesRealizadas: 0,
    visitas: {
      total28d,
      variacaoPercentual: variacao,
      semanal: semanal.map((atual, indice) => ({ semana: `Sem ${indice + 1}`, atual, anterior: 0 })),
    },
    interessesRecebidos: interesses,
  };
}

test("contarReunioesMarcadas: só confirmadas e realizadas", () => {
  const lista = ["pendente", "confirmada", "realizada", "cancelada", "recusada", "confirmada"].map((status, i) =>
    reuniao(String(i + 1), status as StatusReuniao),
  );
  assert.equal(contarReunioesMarcadas(lista), 3);
});

test("montarResumoApi: zeros reais nunca viram número do mock", () => {
  const resumo = montarResumoApi(
    { popularidade: popularidade(0, [0, 0, 0, 0]), reunioes: [], matches: 0, contatosIniciados: 0 },
    AGORA,
  );
  assert.equal(resumo.metricas.visualizacoes, 0);
  assert.equal(resumo.metricas.contatosIniciados, 0);
  assert.equal(resumo.metricas.interessados, 0);
  assert.equal(resumo.metricas.matches, 0);
  assert.equal(resumo.funil[0].valor, 0);
  assert.equal(resumo.funil[1].valor, 0);
  assert.equal(resumo.funil[2].valor, 0);
  assert.equal(resumo.funil[3].valor, 0);
  assert.deepEqual(
    resumo.visualizacoesSemanais.map((semana) => semana.atual),
    [0, 0, 0, 0],
  );
  assert.equal(resumo.atualizadoEm, AGORA);
});

test("montarResumoApi: tudo do back, sem selo de exemplo (ADR-009)", () => {
  const resumo = montarResumoApi(
    {
      popularidade: popularidade(59, [10, 14, 16, 19], -5, 4),
      reunioes: [reuniao("1", "confirmada"), reuniao("2", "realizada"), reuniao("3", "pendente")],
      matches: 3,
      contatosIniciados: 2,
    },
    AGORA,
  );
  assert.equal(resumo.metricas.visualizacoes, 59);
  assert.equal(resumo.metricas.variacaoVisualizacoes, -5);
  assert.equal(resumo.metricas.interessados, 4);
  assert.equal(resumo.metricas.matches, 3);
  assert.equal(resumo.funil[1].valor, 4);
  assert.equal(resumo.funil[3].valor, 2);
  assert.equal(resumo.funil[2].valor, 2);
  assert.deepEqual(resumo.exemplo, {
    visualizacoes: false,
    interessados: false,
    matches: false,
    grafico: false,
    funil: false,
  });
  assert.deepEqual(
    resumo.funil.map((etapa) => Boolean(etapa.exemplo)),
    [false, false, false, false],
  );
});

test("montarResumoApi: chamada que falhou volta ao mock com selo", () => {
  const resumo = montarResumoApi({ popularidade: null, reunioes: null, matches: null, contatosIniciados: 1 }, AGORA);
  assert.equal(resumo.metricas.visualizacoes, RESUMO_MOCK.metricas.visualizacoes);
  assert.equal(resumo.metricas.interessados, RESUMO_MOCK.metricas.interessados);
  assert.equal(resumo.metricas.matches, RESUMO_MOCK.metricas.matches);
  assert.equal(resumo.exemplo?.visualizacoes, true);
  assert.equal(resumo.exemplo?.interessados, true);
  assert.equal(resumo.exemplo?.matches, true);
  assert.equal(resumo.funil[1].exemplo, true);
  assert.equal(resumo.exemplo?.grafico, true);
  assert.equal(resumo.funil[0].exemplo, true);
  assert.equal(resumo.funil[3].exemplo, true);
  assert.equal(resumo.funil[3].valor, RESUMO_MOCK.funil[3].valor);
  // Contatos são contagem local, não mock: continuam reais
  assert.equal(resumo.metricas.contatosIniciados, 1);
});
