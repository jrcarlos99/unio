// Serviço dos interesses recebidos (src/services/interessesRecebidosService.ts,
// ADR-015) contra respostas no formato do back: rotas, query, retribuir e
// erros. Só a camada HTTP é simulada.
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { INTERESSES_RECEBIDOS_BACK, erroBack } from "./fixtures/respostasBack.ts";
import { prepararNavegador, simularBack, tokenFalso } from "./helpers/httpSimulado.ts";

const navegador = prepararNavegador("/investidores");
const { default: api, TOKEN_KEY } = await import("../src/services/api.ts");
const {
  assinarRetribuicoes,
  contarInteressesRecebidos,
  gravarVistos,
  lerVistos,
  listarInteressesRecebidos,
  retribuirInteresse,
} = await import("../src/services/interessesRecebidosService.ts");

navegador.dados.set(TOKEN_KEY, tokenFalso(Math.floor(Date.now() / 1000) + 3600));

test("lista: GET /api/interests/received com limit e offset, autenticado", async () => {
  let params: unknown;
  const chamadas = simularBack(api, {
    "GET /api/interests/received": (config) => {
      params = config.params;
      return { status: 200, data: INTERESSES_RECEBIDOS_BACK };
    },
  });
  const recebidos = await listarInteressesRecebidos();
  assert.deepEqual(
    chamadas.map((c) => `${c.metodo} ${c.url}`),
    ["GET /api/interests/received"],
  );
  assert.deepEqual(params, { limit: 20, offset: 0 });
  assert.match(chamadas[0].autorizacao ?? "", /^Bearer /);
  assert.equal(recebidos.total, 3);
  assert.deepEqual(recebidos.itens.map((item) => item.id), ["34", "12"]);
});

test("contagem leve: GET /api/interests/received/count", async () => {
  const chamadas = simularBack(api, {
    "GET /api/interests/received/count": { status: 200, data: { total: 4 } },
  });
  assert.equal(await contarInteressesRecebidos(), 4);
  assert.deepEqual(
    chamadas.map((c) => `${c.metodo} ${c.url}`),
    ["GET /api/interests/received/count"],
  );
});

test("retribuir: PUT /api/interests/{id}, vira match e avisa as listas", async () => {
  const chamadas = simularBack(api, {
    "PUT /api/interests/34": { status: 200, data: { status: "MATCH", matchedAt: "2026-11-22T15:00:00Z" } },
  });
  const avisos: unknown[] = [];
  const parar = assinarRetribuicoes((evento) => avisos.push(evento));
  try {
    assert.equal(await retribuirInteresse("34"), "match");
  } finally {
    parar();
  }
  assert.deepEqual(
    chamadas.map((c) => `${c.metodo} ${c.url}`),
    ["PUT /api/interests/34"],
  );
  assert.equal(chamadas[0].corpo, undefined);
  assert.deepEqual(avisos, [{ id: "34", status: "match" }]);
});

test("retribuir quando o outro lado já desfez: fica só enviado", async () => {
  simularBack(api, { "PUT /api/interests/12": { status: 200, data: { status: "ENVIADO", matchedAt: null } } });
  assert.equal(await retribuirInteresse("12"), "enviado");
});

test("retribuir com erro: propaga o status e não avisa as listas", async () => {
  simularBack(api, { "PUT /api/interests/34": { status: 404, data: erroBack(404, "Participante não encontrado") } });
  const avisos: unknown[] = [];
  const parar = assinarRetribuicoes((evento) => avisos.push(evento));
  try {
    await assert.rejects(retribuirInteresse("34"), (erro: { response?: { status?: number } }) => {
      assert.equal(erro.response?.status, 404);
      return true;
    });
  } finally {
    parar();
  }
  assert.deepEqual(avisos, []);
});

test("id que não é do back nem chega ao back", async () => {
  const chamadas = simularBack(api, {});
  await assert.rejects(retribuirInteresse("abc"));
  await assert.rejects(retribuirInteresse("../saved/1"));
  assert.equal(chamadas.length, 0);
});

test("visto fica no navegador, separado por usuário", () => {
  gravarVistos("ana@exemplo.test", ["34@2026-11-22T14:50:00Z"]);
  assert.deepEqual(lerVistos("ana@exemplo.test"), ["34@2026-11-22T14:50:00Z"]);
  assert.deepEqual(lerVistos("bruno@exemplo.test"), []);
  assert.deepEqual(lerVistos(""), []);
  navegador.dados.set("unio_interesses_vistos_quebrado@exemplo.test", "{não é json");
  assert.deepEqual(lerVistos("quebrado@exemplo.test"), []);
});
