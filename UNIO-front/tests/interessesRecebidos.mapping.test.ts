// Interesses recebidos (src/services/interessesRecebidos.mapping.ts, ADR-015):
// leitura do JSON do back, textos da notificação, link do perfil e "visto".
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { INTERESSES_RECEBIDOS_BACK } from "./fixtures/respostasBack.ts";
import {
  chaveVisto,
  contarNaoVistos,
  detalheInteresseRecebido,
  interessesRecebidosDoBack,
  linkDoPerfil,
  marcarComoVistos,
  mensagemErroRetribuir,
  semOInteresse,
  textoInteresseRecebido,
} from "../src/services/interessesRecebidos.mapping.ts";
import { interesseRecebidoDoBack as recebidoNaDescoberta } from "../src/services/discovery.mapping.ts";

test("página do back vira a lista do sino, sem inventar campo", () => {
  const recebidos = interessesRecebidosDoBack(INTERESSES_RECEBIDOS_BACK);
  assert.equal(recebidos.total, 3);
  assert.deepEqual(recebidos.itens[0], {
    id: "34",
    nome: "Ana Capital",
    tipo: "investidor",
    segmento: "Logística, Fintech",
    estagio: "Seed",
    localizacao: "Nordeste",
    compatibilidade: 79,
    em: "2026-11-22T14:50:00Z",
  });
  assert.equal(recebidos.itens[1].tipo, "startup");
  assert.equal(recebidos.itens[1].compatibilidade, null);
  // Nada de contato no item (o back não manda e o front não cria)
  assert.equal(JSON.stringify(recebidos).includes("@"), false);
});

test("resposta vazia ou estranha vira lista vazia", () => {
  assert.deepEqual(interessesRecebidosDoBack(null), { total: 0, itens: [] });
  assert.deepEqual(interessesRecebidosDoBack({ total: 0, limit: 20, offset: 0, items: [] }), { total: 0, itens: [] });
});

test("texto da notificação conforme o papel, detalhe e link do perfil", () => {
  const [investidor, startup] = interessesRecebidosDoBack(INTERESSES_RECEBIDOS_BACK).itens;
  assert.equal(textoInteresseRecebido(investidor), "O investidor Ana Capital demonstrou interesse em você");
  assert.equal(textoInteresseRecebido(startup), "A startup Tidalog demonstrou interesse em você");
  assert.equal(detalheInteresseRecebido(startup), "Logística · Seed");
  assert.equal(detalheInteresseRecebido({ segmento: null, estagio: "Seed" }), "Seed");
  assert.equal(linkDoPerfil(investidor), "/investidores/34");
  assert.equal(linkDoPerfil(startup), "/startups/12");
});

test("não vistos: o que está na lista e não foi visto, mais o que ficou além da página", () => {
  const recebidos = interessesRecebidosDoBack(INTERESSES_RECEBIDOS_BACK);
  // Nada visto: 2 na lista + 1 além da página
  assert.equal(contarNaoVistos(recebidos, []), 3);
  const vistos = marcarComoVistos(recebidos);
  assert.deepEqual(vistos, ["34@2026-11-22T14:50:00Z", "12@2026-11-20T09:00:00Z"]);
  assert.equal(contarNaoVistos(recebidos, vistos), 1);
  // A mesma pessoa desfez e demonstrou de novo: volta a ser novo
  const deNovo = { ...recebidos, itens: [{ ...recebidos.itens[0], em: "2026-11-23T08:00:00Z" }], total: 1 };
  assert.equal(contarNaoVistos(deNovo, vistos), 1);
  assert.equal(chaveVisto(deNovo.itens[0]), "34@2026-11-23T08:00:00Z");
});

test("retribuído sai da lista e do total", () => {
  const recebidos = interessesRecebidosDoBack(INTERESSES_RECEBIDOS_BACK);
  const depois = semOInteresse(recebidos, "34");
  assert.deepEqual(depois.itens.map((item) => item.id), ["12"]);
  assert.equal(depois.total, 2);
  // id que não está na lista não muda nada
  assert.deepEqual(semOInteresse(depois, "999"), depois);
});

test("mensagens amigáveis quando retribuir falha", () => {
  assert.equal(mensagemErroRetribuir(404), "Este perfil não está mais disponível.");
  assert.equal(mensagemErroRetribuir(409), "Crie seu perfil antes de demonstrar interesse.");
  assert.equal(mensagemErroRetribuir(500), "Não foi possível enviar seu interesse. Tente novamente.");
  assert.equal(mensagemErroRetribuir(undefined), "Não foi possível enviar seu interesse. Tente novamente.");
});

test("descoberta: RECEIVED liga a etiqueta Demonstrou interesse em você", () => {
  assert.equal(recebidoNaDescoberta("RECEIVED"), true);
  for (const status of ["NONE", "SENT", "MATCH", undefined, null]) {
    assert.equal(recebidoNaDescoberta(status), false);
  }
});
