// Regra "só ids numéricos reais vão ao back" (src/utils/idsBack.ts, ADR-007).
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { ehIdDoBack, paraIdDoBack } from "../src/utils/idsBack.ts";

test("paraIdDoBack: inteiros positivos em texto ou número", () => {
  assert.equal(paraIdDoBack("42"), 42);
  assert.equal(paraIdDoBack(" 7 "), 7);
  assert.equal(paraIdDoBack(12), 12);
});

test("paraIdDoBack: ids de mock e valores inválidos viram null (nunca NaN)", () => {
  for (const invalido of ["biopay", "marcos-andrade", "", "0", "-3", "4.5", "1e3", "0x10", "12abc", undefined, null]) {
    assert.equal(paraIdDoBack(invalido), null, String(invalido));
  }
  for (const invalido of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 2]) {
    assert.equal(paraIdDoBack(invalido), null, String(invalido));
  }
});

test("ehIdDoBack: separa id real de slug de exemplo", () => {
  assert.equal(ehIdDoBack("15"), true);
  assert.equal(ehIdDoBack("biopay"), false);
});
