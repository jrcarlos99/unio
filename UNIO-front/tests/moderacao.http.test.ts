// Serviços da moderação e da publicação do pitch (moderacaoService.ts e
// pitchPublicacaoService.ts, ADR-013) contra respostas no formato do back:
// rotas, métodos, corpos e erros. Só a camada HTTP é simulada.
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONTAS_MODERACAO_BACK,
  ENVIO_PITCH_BACK,
  PITCH_PUBLICADO_BACK,
  PUBLICACAO_REMOVIDA_BACK,
  erroBack,
} from "./fixtures/respostasBack.ts";
import { prepararNavegador, simularBack, tokenFalso } from "./helpers/httpSimulado.ts";

const navegador = prepararNavegador("/admin/cadastros");
const { default: api, TOKEN_KEY, getApiErrorMessage } = await import("../src/services/api.ts");
const { aprovarEnvio, listarContasModeracao, listarEnvios, moderarConta, removerEnvio } = await import(
  "../src/services/moderacaoService.ts"
);
const { enviarPublicacao, obterMinhaPublicacao, obterPitchPublicado } = await import(
  "../src/services/pitchPublicacaoService.ts"
);

navegador.dados.set(TOKEN_KEY, tokenFalso(Math.floor(Date.now() / 1000) + 3600));

const CONTA = CONTAS_MODERACAO_BACK.items[0];

test("cadastros: GET /api/admin/moderation/accounts com os filtros na query", async () => {
  let params: unknown;
  const chamadas = simularBack(api, {
    "GET /api/admin/moderation/accounts": (config) => {
      params = config.params;
      return { status: 200, data: CONTAS_MODERACAO_BACK };
    },
  });
  const pagina = await listarContasModeracao({ situacao: "PENDENTE", perfil: "", busca: "tido", deslocamento: 0 });
  assert.deepEqual(
    chamadas.map((c) => `${c.metodo} ${c.url}`),
    ["GET /api/admin/moderation/accounts"],
  );
  assert.deepEqual(params, { limit: 20, offset: 0, status: "PENDENTE", q: "tido" });
  assert.equal(chamadas[0].autorizacao?.startsWith("Bearer "), true);
  assert.equal(pagina.itens[0].id, "12");
});

test("cadastros: recusar e suspender mandam o motivo; aprovar e reativar vão sem corpo", async () => {
  const chamadas = simularBack(api, {
    "POST /api/admin/moderation/accounts/12/reject": { status: 200, data: { ...CONTA, status: "RECUSADO", reason: "Cadastro falso" } },
    "POST /api/admin/moderation/accounts/12/suspend": { status: 200, data: { ...CONTA, status: "SUSPENSO", reason: "Spam" } },
    "POST /api/admin/moderation/accounts/12/approve": { status: 200, data: { ...CONTA, status: "APROVADO" } },
    "POST /api/admin/moderation/accounts/12/reactivate": { status: 200, data: { ...CONTA, status: "APROVADO" } },
  });
  const recusada = await moderarConta("12", "recusar", "  Cadastro falso ");
  await moderarConta("12", "suspender", "Spam");
  await moderarConta("12", "aprovar");
  await moderarConta("12", "reativar");
  assert.deepEqual(
    chamadas.map((c) => [c.url, c.corpo]),
    [
      ["/api/admin/moderation/accounts/12/reject", { reason: "Cadastro falso" }],
      ["/api/admin/moderation/accounts/12/suspend", { reason: "Spam" }],
      ["/api/admin/moderation/accounts/12/approve", undefined],
      ["/api/admin/moderation/accounts/12/reactivate", undefined],
    ],
  );
  assert.equal(recusada.situacao, "RECUSADO");
  assert.equal(recusada.motivo, "Cadastro falso");
});

test("cadastros: a mensagem do back chega à tela (a si mesmo, outro admin)", async () => {
  simularBack(api, {
    "POST /api/admin/moderation/accounts/1/suspend": {
      status: 400,
      data: erroBack(400, "Você não pode moderar a própria conta"),
    },
  });
  await assert.rejects(moderarConta("1", "suspender", "Teste"), (erro: unknown) => {
    assert.equal(getApiErrorMessage(erro, "falhou"), "Você não pode moderar a própria conta");
    return true;
  });
});

test("conteúdo: lista com várias situações e ações aprovar e remover", async () => {
  let params: unknown;
  const chamadas = simularBack(api, {
    "GET /api/admin/moderation/content": (config) => {
      params = config.params;
      return { status: 200, data: { total: 1, limit: 20, offset: 0, items: [ENVIO_PITCH_BACK] } };
    },
    "POST /api/admin/moderation/content/5/approve": { status: 200, data: { ...ENVIO_PITCH_BACK, status: "PUBLICADO" } },
    "POST /api/admin/moderation/content/5/remove": {
      status: 200,
      data: { ...ENVIO_PITCH_BACK, status: "REMOVIDO", reason: "Fora das regras" },
    },
  });
  const pagina = await listarEnvios(["PUBLICADO", "REMOVIDO"], 20);
  assert.deepEqual(params, { limit: 20, offset: 20, status: "PUBLICADO,REMOVIDO" });
  assert.equal(pagina.itens[0].pitchCurto, "Logística inteligente para o Nordeste");
  assert.equal((await aprovarEnvio("5")).situacao, "PUBLICADO");
  const removido = await removerEnvio("5", " Fora das regras ");
  assert.equal(removido.motivo, "Fora das regras");
  assert.deepEqual(chamadas.at(-1)?.corpo, { reason: "Fora das regras" });
});

test("moderação: 403 para quem não é admin chega como erro, sem lista inventada", async () => {
  simularBack(api, { "GET /api/admin/moderation/content": { status: 403, data: erroBack(403, "Acesso negado") } });
  await assert.rejects(listarEnvios(["EM_REVISAO"]), (erro: { response?: { status?: number } }) => erro.response?.status === 403);
});

test("pitch da startup: GET e POST /api/profile/startup/pitch/publication", async () => {
  const chamadas = simularBack(api, {
    "GET /api/profile/startup/pitch/publication": { status: 200, data: PUBLICACAO_REMOVIDA_BACK },
    "POST /api/profile/startup/pitch/publication": {
      status: 200,
      data: { ...PUBLICACAO_REMOVIDA_BACK, status: "EM_REVISAO", reason: null, version: 3 },
    },
  });
  const atual = await obterMinhaPublicacao();
  assert.equal(atual.status, "REJECTED");
  assert.equal(atual.reason, "Contém telefone pessoal");
  const enviada = await enviarPublicacao();
  assert.equal(enviada.status, "IN_REVIEW");
  // O back lê o pitch salvo no onboarding: o POST vai sem corpo
  assert.deepEqual(
    chamadas.map((c) => [c.metodo, c.url, c.corpo]),
    [
      ["GET", "/api/profile/startup/pitch/publication", undefined],
      ["POST", "/api/profile/startup/pitch/publication", undefined],
    ],
  );
});

test("pitch da startup: erro 400 do envio chega com a mensagem do back", async () => {
  simularBack(api, {
    "POST /api/profile/startup/pitch/publication": {
      status: 400,
      data: erroBack(400, "O link do vídeo precisa ser do YouTube ou do Vimeo"),
    },
  });
  await assert.rejects(enviarPublicacao(), (erro: unknown) => {
    assert.equal(getApiErrorMessage(erro, "falhou"), "O link do vídeo precisa ser do YouTube ou do Vimeo");
    return true;
  });
});

test("pitch da startup: back sem a rota (404) abre como rascunho; outros erros sobem", async () => {
  simularBack(api, {});
  assert.equal((await obterMinhaPublicacao()).status, "DRAFT");
  simularBack(api, { "GET /api/profile/startup/pitch/publication": { status: 500, data: erroBack(500, "Falha") } });
  await assert.rejects(obterMinhaPublicacao());
});

test("investidor: GET /api/discovery/startups/{id}/pitch; 404 = ainda não publicou, sem erro", async () => {
  const chamadas = simularBack(api, {
    "GET /api/discovery/startups/12/pitch": { status: 200, data: PITCH_PUBLICADO_BACK },
    "GET /api/discovery/startups/99/pitch": {
      status: 404,
      data: erroBack(404, "Esta startup ainda não publicou o pitch"),
    },
  });
  const pitch = await obterPitchPublicado("12");
  assert.equal(pitch?.shortPitch, "Logística inteligente para o Nordeste");
  assert.equal(await obterPitchPublicado("99"), null);
  assert.deepEqual(
    chamadas.map((c) => c.url),
    ["/api/discovery/startups/12/pitch", "/api/discovery/startups/99/pitch"],
  );
});

test("login: 403 de conta recusada ou suspensa mostra a mensagem do back", async () => {
  navegador.dados.delete(TOKEN_KEY);
  simularBack(api, {
    "POST /api/auth/login": { status: 403, data: erroBack(403, "Conta suspensa") },
  });
  await assert.rejects(api.post("/api/auth/login", { email: "a@b.c", password: "x" }), (erro: unknown) => {
    assert.equal(getApiErrorMessage(erro, "Não foi possível entrar."), "Conta suspensa");
    return true;
  });
  // Não é sessão vencida: não manda para /login?sessao=expirada
  assert.deepEqual(navegador.destinos, []);
});
