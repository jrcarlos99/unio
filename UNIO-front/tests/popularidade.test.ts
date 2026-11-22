// Funções puras da popularidade (RF10, ADR-006)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BONUS_MAXIMO_POPULARIDADE,
  MIN_AVALIACOES_EXIBIR,
  calcularPercentual,
  chaveOrdenacao,
  ordenarComPopularidade,
  resumirPopularidade,
  variacaoPercentual,
} from "../src/utils/popularidade.ts";

test("percentual: sem avaliações é nulo", () => {
  assert.equal(calcularPercentual([]), null);
});

test("percentual: uma nota", () => {
  assert.equal(calcularPercentual([5]), 100);
  assert.equal(calcularPercentual([1]), 20);
});

test("percentual: três notas e notas mistas", () => {
  assert.equal(calcularPercentual([5, 5, 4]), 93); // 4,67 / 5 = 93,3%
  assert.equal(calcularPercentual([3, 4, 5, 2]), 70); // 3,5 / 5
});

test("percentual: arredondamento para o inteiro mais próximo", () => {
  assert.equal(calcularPercentual([4, 5]), 90); // 4,5 / 5 = 90%
  assert.equal(calcularPercentual([5, 4, 4]), 87); // 4,33 / 5 = 86,7%
  assert.equal(calcularPercentual([5, 5, 5, 4, 4, 4, 4, 4]), 88); // 4,375 / 5 = 87,5% → 88
});

test("mínimo: abaixo de 3 avaliações não exibe e diz quantas faltam", () => {
  assert.equal(MIN_AVALIACOES_EXIBIR, 3);
  assert.deepEqual(resumirPopularidade([]), { percentual: null, totalAvaliacoes: 0, visivel: false, faltam: 3 });
  assert.deepEqual(resumirPopularidade([5]), { percentual: null, totalAvaliacoes: 1, visivel: false, faltam: 2 });
  assert.deepEqual(resumirPopularidade([5, 4]), { percentual: null, totalAvaliacoes: 2, visivel: false, faltam: 1 });
});

test("mínimo: com 3 ou mais avaliações exibe o percentual", () => {
  assert.deepEqual(resumirPopularidade([5, 4, 5]), { percentual: 93, totalAvaliacoes: 3, visivel: true, faltam: 0 });
});

test("variação: em % e sem base vira 0", () => {
  assert.equal(variacaoPercentual(118, 100), 18);
  assert.equal(variacaoPercentual(80, 100), -20);
  assert.equal(variacaoPercentual(10, 0), 0);
});

interface Item {
  id: string;
  compat: number;
  pop: number | null;
}

const ordenar = (lista: Item[]) =>
  ordenarComPopularidade(
    lista,
    (item) => item.compat,
    (item) => item.pop,
  ).map((item) => item.id);

test("ordenação: continua por compatibilidade quando a diferença é grande", () => {
  assert.deepEqual(
    ordenar([
      { id: "b", compat: 80, pop: 100 },
      { id: "a", compat: 92, pop: null },
    ]),
    ["a", "b"],
  );
});

test("ordenação: desempate pela popularidade", () => {
  assert.deepEqual(
    ordenar([
      { id: "sem", compat: 90, pop: null },
      { id: "baixa", compat: 90, pop: 60 },
      { id: "alta", compat: 90, pop: 96 },
    ]),
    ["alta", "baixa", "sem"],
  );
});

test("ordenação: bônus de no máximo 5 pontos", () => {
  assert.equal(chaveOrdenacao(90, 100), 90 + BONUS_MAXIMO_POPULARIDADE);
  assert.equal(chaveOrdenacao(90, null), 90);
  // 88 com 100% (93) passa 92 sem popularidade; 87 com 100% (92) empata e
  // ganha no desempate; 86 com 100% (91) não passa
  assert.deepEqual(
    ordenar([
      { id: "92", compat: 92, pop: null },
      { id: "88", compat: 88, pop: 100 },
    ]),
    ["88", "92"],
  );
  assert.deepEqual(
    ordenar([
      { id: "92", compat: 92, pop: null },
      { id: "86", compat: 86, pop: 100 },
    ]),
    ["92", "86"],
  );
});

test("ordenação: não altera os itens nem a compatibilidade exibida", () => {
  const lista: Item[] = [
    { id: "a", compat: 70, pop: 100 },
    { id: "b", compat: 71, pop: null },
  ];
  const copia = structuredClone(lista);
  const ordenada = ordenarComPopularidade(
    lista,
    (item) => item.compat,
    (item) => item.pop,
  );
  assert.deepEqual(lista, copia);
  assert.deepEqual(
    ordenada.map((item) => item.compat).sort(),
    [70, 71],
  );
  assert.ok(ordenada.every((item) => lista.includes(item)));
});
