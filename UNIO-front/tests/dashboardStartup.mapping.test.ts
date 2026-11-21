// Resumo da Visão geral só com dados do back (src/services/dashboardStartup.mapping.ts,
// ADR-011). Entradas no formato real do back, passando pelos mapeamentos.
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromBackPopularity } from "../src/services/avaliacoes.mapping.ts";
import { ROTULOS_FUNIL, contarReunioesMarcadas, montarResumo } from "../src/services/dashboardStartup.mapping.ts";
import { reuniaoDoBack } from "../src/services/reunioes.mapping.ts";
import { POPULARIDADE_BACK, POPULARIDADE_ZERADA_BACK, reuniaoBack } from "./fixtures/respostasBack.ts";

const AGORA = "2026-11-16T12:00:00.000Z";

const reunioes = (["PENDENTE", "CONFIRMADA", "REALIZADA", "CANCELADA", "RECUSADA", "CONFIRMADA"] as const).map(
  (status, i) => reuniaoDoBack(reuniaoBack(i + 1, status)),
);

test("contarReunioesMarcadas: só confirmadas e realizadas", () => {
  assert.equal(contarReunioesMarcadas(reunioes), 3);
});

test("montarResumo: números do back, funil visualização → interesse → match → reunião", () => {
  const resumo = montarResumo(
    { popularidade: fromBackPopularity(POPULARIDADE_BACK), reunioes, matches: 2 },
    AGORA,
  );
  assert.equal(resumo.metricas.visualizacoes, 59);
  assert.equal(resumo.metricas.interessados, 4);
  assert.equal(resumo.metricas.matches, 2);
  assert.equal(typeof resumo.metricas.variacaoVisualizacoes, "number");
  assert.deepEqual(
    resumo.funil.map((etapa) => etapa.rotulo),
    [...ROTULOS_FUNIL],
  );
  assert.deepEqual(
    resumo.funil.map((etapa) => etapa.valor),
    [59, 4, 2, 3],
  );
  assert.deepEqual(
    resumo.visualizacoesSemanais?.map((semana) => semana.atual),
    [10, 14, 16, 19],
  );
  assert.equal(resumo.atualizadoEm, AGORA);
});

test("montarResumo: zeros reais continuam zero (conta nova)", () => {
  const resumo = montarResumo(
    { popularidade: fromBackPopularity(POPULARIDADE_ZERADA_BACK), reunioes: [], matches: 0 },
    AGORA,
  );
  assert.equal(resumo.metricas.visualizacoes, 0);
  assert.equal(resumo.metricas.interessados, 0);
  assert.equal(resumo.metricas.matches, 0);
  assert.deepEqual(
    resumo.funil.map((etapa) => etapa.valor),
    [0, 0, 0, 0],
  );
});

test("montarResumo: chamada que falhou vira null (indisponível), nunca número inventado", () => {
  const resumo = montarResumo({ popularidade: null, reunioes: null, matches: null }, AGORA);
  assert.equal(resumo.metricas.visualizacoes, null);
  assert.equal(resumo.metricas.variacaoVisualizacoes, null);
  assert.equal(resumo.metricas.interessados, null);
  assert.equal(resumo.metricas.matches, null);
  assert.equal(resumo.visualizacoesSemanais, null);
  assert.deepEqual(
    resumo.funil.map((etapa) => etapa.valor),
    [null, null, null, null],
  );
  // Não há mais selo, benchmark, "novos esta semana" nem contatos iniciados
  assert.deepEqual(Object.keys(resumo).sort(), ["atualizadoEm", "funil", "metricas", "visualizacoesSemanais"]);
  assert.deepEqual(Object.keys(resumo.metricas).sort(), [
    "interessados",
    "matches",
    "variacaoVisualizacoes",
    "visualizacoes",
  ]);
});

test("montarResumo: uma falha não derruba as outras", () => {
  const resumo = montarResumo({ popularidade: null, reunioes, matches: 1 }, AGORA);
  assert.equal(resumo.metricas.visualizacoes, null);
  assert.equal(resumo.metricas.matches, 1);
  assert.equal(resumo.funil[3].valor, 3);
});
