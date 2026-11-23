// Serviço do admin (src/services/adminService.ts) contra respostas no formato
// do back: rotas, métodos e mapeamento. Só a camada HTTP é simulada.
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDITORIA_BACK, METRICAS_ADMIN_BACK, USUARIOS_ADMIN_BACK } from "./fixtures/respostasBack.ts";
import { prepararNavegador, simularBack, tokenFalso } from "./helpers/httpSimulado.ts";

const navegador = prepararNavegador("/admin");
const { default: api, TOKEN_KEY } = await import("../src/services/api.ts");
const { listarAuditoria, listarUsuarios, obterVisaoGeralAdmin } = await import("../src/services/adminService.ts");

navegador.dados.set(TOKEN_KEY, tokenFalso(Math.floor(Date.now() / 1000) + 3600));

test("visão geral: GET /api/admin/metrics, só números do back", async () => {
  const chamadas = simularBack(api, { "GET /api/admin/metrics": { status: 200, data: METRICAS_ADMIN_BACK } });
  const visao = await obterVisaoGeralAdmin();
  assert.deepEqual(
    chamadas.map((c) => `${c.metodo} ${c.url}`),
    ["GET /api/admin/metrics"],
  );
  assert.deepEqual(visao.metricas, [
    { label: "Matches mútuos", valor: 1 },
    { label: "Interesses enviados", valor: 5 },
    { label: "Reuniões", valor: 2 },
  ]);
  assert.equal(visao.totalStartups, 3);
  assert.equal(visao.totalInvestidores, 2);
});

test("auditoria: GET /api/admin/audit", async () => {
  simularBack(api, { "GET /api/admin/audit": { status: 200, data: AUDITORIA_BACK } });
  const [linha] = await listarAuditoria();
  assert.equal(linha.id, "31");
  assert.equal(linha.usuario, "admin@unio.test");
  assert.match(linha.acao, /^BOOTSTRAP_ADMIN em User 9/);
});

test("cadastros: GET /api/admin/users, id numérico vira texto, admin fora, conta excluída marcada", async () => {
  simularBack(api, { "GET /api/admin/users": { status: 200, data: USUARIOS_ADMIN_BACK } });
  const usuarios = await listarUsuarios();
  assert.deepEqual(
    usuarios.map((u) => [u.id, u.tipo, u.excluida]),
    [
      ["2", "Startup", false],
      ["3", "Investidor", true],
    ],
  );
});

test("403 do back chega à tela como erro (sem lista inventada)", async () => {
  simularBack(api, { "GET /api/admin/users": { status: 403, data: { status: 403, error: "Forbidden" } } });
  await assert.rejects(listarUsuarios(), (erro: { response?: { status?: number } }) => erro.response?.status === 403);
});
