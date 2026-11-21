// Cliente HTTP (src/services/api.ts, ADR-011): endereço do back, token,
// sessão expirada (401) e mensagens de erro (400, 401, 403, 404, 409, rede).
// Só a camada HTTP é simulada. Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { erroBack } from "./fixtures/respostasBack.ts";
import { prepararNavegador, simularBack, tokenFalso, axios } from "./helpers/httpSimulado.ts";

const navegador = prepararNavegador("/home-startup");
const { default: api, API_URL, API_URL_PADRAO, TOKEN_KEY, getApiErrorMessage, resolverApiUrl, tokenExpirado } =
  await import("../src/services/api.ts");

const NUVEM = "https://unio-webapp-ghbmd2a6a4fmc4cb.brazilsouth-01.azurewebsites.net";
const daqui1h = () => Math.floor(Date.now() / 1000) + 3600;

test("endereço do back: VITE_API_URL ou, sem ela, a nuvem; sem barra no final e sem localhost", () => {
  assert.equal(API_URL_PADRAO, NUVEM);
  assert.equal(API_URL, NUVEM);
  assert.equal(api.defaults.baseURL, NUVEM);
  assert.equal(resolverApiUrl(undefined), NUVEM);
  assert.equal(resolverApiUrl("  "), NUVEM);
  assert.equal(resolverApiUrl("http://localhost:8080/"), "http://localhost:8080");
  assert.equal(resolverApiUrl(`${NUVEM}//`), NUVEM);
  assert.doesNotMatch(API_URL_PADRAO, /localhost|127\.0\.0\.1|:8080/);
});

test("token: vai no Authorization; login não leva token", async () => {
  const token = tokenFalso(daqui1h());
  navegador.dados.set(TOKEN_KEY, token);
  const chamadas = simularBack(api, {
    "GET /api/profile/me": { status: 200, data: { email: "e2e@unio.test", role: "STARTUP" } },
    "POST /api/auth/login": { status: 200, data: { token, email: "e2e@unio.test", role: "STARTUP" } },
  });
  await api.get("/api/profile/me");
  await api.post("/api/auth/login", { email: "e2e@unio.test", password: "x" });
  assert.equal(chamadas[0].autorizacao, `Bearer ${token}`);
  assert.equal(chamadas[0].urlCompleta, `${NUVEM}/api/profile/me`);
  assert.equal(chamadas[1].autorizacao, undefined);
});

test("401 numa rota autenticada: apaga o token e volta ao login", async () => {
  navegador.dados.set(TOKEN_KEY, tokenFalso(daqui1h()));
  navegador.destinos.length = 0;
  simularBack(api, { "GET /api/meetings": { status: 401, data: "" } });
  await assert.rejects(api.get("/api/meetings"));
  assert.equal(navegador.dados.has(TOKEN_KEY), false);
  assert.deepEqual(navegador.destinos, ["/login?sessao=expirada"]);
});

test("401 do login (credenciais inválidas) não é sessão expirada: sem redirecionar", async () => {
  navegador.destinos.length = 0;
  simularBack(api, { "POST /api/auth/login": { status: 401, data: erroBack(401, "Credenciais inválidas") } });
  const erro = await api.post("/api/auth/login", { email: "x@y.z", password: "errada" }).catch((e: unknown) => e);
  assert.equal(getApiErrorMessage(erro, "falhou"), "Credenciais inválidas");
  assert.deepEqual(navegador.destinos, []);
});

test("401 do login sem corpo (como o back local responde): mensagem da tela, não 'sessão expirada'", async () => {
  navegador.destinos.length = 0;
  simularBack(api, { "POST /api/auth/login": { status: 401, data: "" } });
  const erro = await api.post("/api/auth/login", { email: "x@y.z", password: "errada" }).catch((e: unknown) => e);
  assert.equal(getApiErrorMessage(erro, "Não foi possível entrar. Verifique suas credenciais."), "Não foi possível entrar. Verifique suas credenciais.");
  assert.deepEqual(navegador.destinos, []);
});

test("token vencido não sai do navegador: a chamada é cancelada e volta ao login", async () => {
  navegador.dados.set(TOKEN_KEY, tokenFalso(Math.floor(Date.now() / 1000) - 60));
  navegador.destinos.length = 0;
  const chamadas = simularBack(api, { "GET /api/saved": { status: 200, data: [] } });
  const erro = await api.get("/api/saved").catch((e: unknown) => e);
  assert.equal(chamadas.length, 0);
  assert.equal(axios.isCancel(erro), true);
  assert.equal(getApiErrorMessage(erro, "falhou"), "Sua sessão expirou. Entre novamente.");
  assert.deepEqual(navegador.destinos, ["/login?sessao=expirada"]);
});

test("tokenExpirado: lê o exp; token ilegível conta como vencido", () => {
  assert.equal(tokenExpirado(tokenFalso(daqui1h())), false);
  assert.equal(tokenExpirado(tokenFalso(100)), true);
  assert.equal(tokenExpirado("lixo"), true);
});

test("mensagens de erro: texto do back primeiro; 403 sem texto tem mensagem própria", async () => {
  navegador.dados.set(TOKEN_KEY, tokenFalso(daqui1h()));
  simularBack(api, {
    "POST /api/meetings": { status: 403, data: erroBack(403, "Reunião só entre quem deu match") },
    "GET /api/admin/metrics": { status: 403, data: { status: 403, error: "Forbidden", path: "/api/admin/metrics" } },
    "PUT /api/interests/9": { status: 404, data: erroBack(404, "Usuário não encontrado") },
    "POST /api/profile/startup": { status: 409, data: erroBack(409, "Perfil já existe") },
    "PUT /api/profile/me": {
      status: 400,
      data: { message: "Validation failed", errors: [{ field: "nome", defaultMessage: "Nome é obrigatório" }] },
    },
  });
  const mensagem = (promessa: Promise<unknown>) => promessa.catch((e: unknown) => getApiErrorMessage(e, "padrão"));
  assert.equal(await mensagem(api.post("/api/meetings", {})), "Reunião só entre quem deu match");
  assert.equal(await mensagem(api.get("/api/admin/metrics")), "Você não tem permissão para esta ação.");
  assert.equal(await mensagem(api.put("/api/interests/9")), "Usuário não encontrado");
  assert.equal(await mensagem(api.post("/api/profile/startup", {})), "Perfil já existe");
  assert.equal(await mensagem(api.put("/api/profile/me", {})), "Nome é obrigatório");
});

test("sem resposta (rede ou CORS bloqueado): mensagem de conexão, sem citar localhost", () => {
  const erro = new axios.AxiosError("Network Error", "ERR_NETWORK");
  const texto = getApiErrorMessage(erro, "padrão");
  assert.match(texto, /conectar ao servidor/);
  assert.doesNotMatch(texto, /localhost|rodando/);
});
