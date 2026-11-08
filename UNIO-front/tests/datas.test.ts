// Testes das funções puras de utils/datas.ts (fuso fixo de Recife, GMT-3).
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  camposDeIso,
  chaveDia,
  diasDaSemana,
  distribuirColunas,
  encontrarConflito,
  formatarFaixaHorario,
  formatarIntervaloSemana,
  haSobreposicao,
  inicioDaSemana,
  intervaloSemana,
  isoDeCampos,
  semanasDoMes,
} from "../src/utils/datas.ts";

test("semana começa na segunda (domingo pertence à semana anterior)", () => {
  assert.equal(inicioDaSemana("2026-11-08"), "2026-11-02");
  assert.equal(inicioDaSemana("2026-11-09"), "2026-11-09");
  assert.equal(inicioDaSemana("2026-11-04"), "2026-11-02");
  assert.deepEqual(diasDaSemana("2026-11-08"), [
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
    "2026-11-05",
    "2026-11-06",
    "2026-11-07",
    "2026-11-08",
  ]);
});

test("intervalo da semana vai de segunda 00:00 a segunda seguinte 00:00 em Recife", () => {
  assert.deepEqual(intervaloSemana("2026-11-05"), {
    inicio: "2026-11-02T03:00:00.000Z",
    fim: "2026-11-09T03:00:00.000Z",
  });
});

test("intervalo da semana formatado em pt-BR", () => {
  assert.equal(formatarIntervaloSemana("2026-10-14"), "12 – 18 out 2026");
  assert.equal(formatarIntervaloSemana("2026-10-28"), "26 out – 1 nov 2026");
  assert.equal(formatarIntervaloSemana("2026-12-31"), "28 dez 2026 – 3 jan 2027");
});

test("dia e hora sempre no fuso de Recife, independentemente do navegador", () => {
  // 02:30 UTC do dia 9 = 23:30 do dia 8 em Recife
  assert.equal(chaveDia("2026-11-09T02:30:00.000Z"), "2026-11-08");
  assert.deepEqual(camposDeIso("2026-11-12T17:00:00.000Z"), { data: "2026-11-12", hora: "14:00" });
  assert.equal(isoDeCampos("2026-11-12", "14:00"), "2026-11-12T17:00:00.000Z");
  assert.equal(formatarFaixaHorario("2026-11-12T17:00:00.000Z", 45), "14:00 a 14:45");
});

test("campos inválidos não viram data", () => {
  assert.equal(isoDeCampos("2026-02-31", "10:00"), null);
  assert.equal(isoDeCampos("", "10:00"), null);
  assert.equal(isoDeCampos("2026-11-12", "25:00"), null);
});

test("sobreposição: encostar não é conflito", () => {
  const as14 = "2026-11-12T17:00:00.000Z";
  assert.equal(haSobreposicao(as14, 30, "2026-11-12T17:30:00.000Z", 30), false);
  assert.equal(haSobreposicao(as14, 45, "2026-11-12T17:30:00.000Z", 30), true);
  assert.equal(haSobreposicao("2026-11-12T17:30:00.000Z", 30, as14, 60), true);
});

test("conflito só com reunião confirmada, ignorando a própria", () => {
  const reunioes = [
    { id: "a", status: "pendente", horarioConfirmado: undefined, duracaoMin: 60 },
    { id: "b", status: "confirmada", horarioConfirmado: "2026-11-12T17:00:00.000Z", duracaoMin: 45 },
    { id: "c", status: "cancelada", horarioConfirmado: "2026-11-12T17:00:00.000Z", duracaoMin: 45 },
  ];
  assert.equal(encontrarConflito(reunioes, "2026-11-12T17:30:00.000Z", 30)?.id, "b");
  assert.equal(encontrarConflito(reunioes, "2026-11-12T17:30:00.000Z", 30, "b"), null);
  assert.equal(encontrarConflito(reunioes, "2026-11-12T18:00:00.000Z", 30), null);
});

test("eventos sobrepostos ficam lado a lado", () => {
  const posicoes = distribuirColunas([
    { chave: "a", inicio: "2026-11-12T17:00:00.000Z", duracaoMin: 60 },
    { chave: "b", inicio: "2026-11-12T17:30:00.000Z", duracaoMin: 30 },
    { chave: "c", inicio: "2026-11-12T18:00:00.000Z", duracaoMin: 30 },
    { chave: "d", inicio: "2026-11-12T20:00:00.000Z", duracaoMin: 30 },
  ]);
  assert.deepEqual(posicoes.get("a"), { coluna: 0, colunas: 2 });
  assert.deepEqual(posicoes.get("b"), { coluna: 1, colunas: 2 });
  // c começa quando a e b terminam: novo grupo
  assert.deepEqual(posicoes.get("c"), { coluna: 0, colunas: 1 });
  assert.deepEqual(posicoes.get("d"), { coluna: 0, colunas: 1 });
});

test("mini calendário: semanas completas de segunda a domingo", () => {
  const semanas = semanasDoMes(2026, 11);
  assert.equal(semanas[0][0], "2026-10-26");
  assert.equal(semanas[semanas.length - 1][6], "2026-12-06");
  assert.ok(semanas.every((semana) => semana.length === 7));
});
