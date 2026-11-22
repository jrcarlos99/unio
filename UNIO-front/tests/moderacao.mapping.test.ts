// Mapeamento da moderação e da publicação do pitch (D063 do back, ADR-013):
// src/services/moderacao.mapping.ts, pitchPublicacao.mapping.ts e o texto
// das ações novas no log de auditoria (admin.mapping.ts).
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acoesDaConta,
  acoesDoEnvio,
  contaDoBack,
  envioDoBack,
  erroDoMotivo,
  paginaDoBack,
  parametrosContas,
} from "../src/services/moderacao.mapping.ts";
import { pitchPublicadoDoBack, publicacaoDoBack } from "../src/services/pitchPublicacao.mapping.ts";
import { logDoBack } from "../src/services/admin.mapping.ts";
import {
  CONTAS_MODERACAO_BACK,
  ENVIO_PITCH_BACK,
  PITCH_PUBLICADO_BACK,
  PUBLICACAO_REMOVIDA_BACK,
  SEM_PUBLICACAO_BACK,
} from "./fixtures/respostasBack.ts";

test("contaDoBack: id vira texto, tipo em português, motivo e perfil completo", () => {
  const pagina = paginaDoBack(CONTAS_MODERACAO_BACK, contaDoBack);
  assert.equal(pagina.total, 2);
  assert.deepEqual(pagina.itens[0], {
    id: "12",
    email: "nova@startup.test",
    tipo: "Startup",
    nome: "Tidalog",
    situacao: "PENDENTE",
    motivo: null,
    revisadoPor: null,
    revisadoEm: null,
    dataCadastro: "2026-11-20T10:00:00Z",
    perfilCompleto: true,
  });
  assert.equal(pagina.itens[1].tipo, "Investidor");
  assert.equal(pagina.itens[1].situacao, "SUSPENSO");
  assert.equal(pagina.itens[1].motivo, "Spam em mensagens");
  assert.equal(pagina.itens[1].perfilCompleto, false);
});

test("contaDoBack: situação desconhecida não vira aprovada", () => {
  const conta = contaDoBack({ ...CONTAS_MODERACAO_BACK.items[0], status: "OUTRA" });
  assert.equal(conta.situacao, "PENDENTE");
});

test("parametrosContas: só os filtros preenchidos vão na query", () => {
  assert.deepEqual(parametrosContas({ situacao: "", perfil: "", busca: "  ", deslocamento: 0 }), { limit: 20, offset: 0 });
  assert.deepEqual(parametrosContas({ situacao: "PENDENTE", perfil: "STARTUP", busca: " tido ", deslocamento: 20 }), {
    limit: 20,
    offset: 20,
    status: "PENDENTE",
    role: "STARTUP",
    q: "tido",
  });
});

test("acoesDaConta: botões de cada situação", () => {
  assert.deepEqual(acoesDaConta("PENDENTE"), ["aprovar", "recusar"]);
  assert.deepEqual(acoesDaConta("APROVADO"), ["suspender", "recusar"]);
  assert.deepEqual(acoesDaConta("SUSPENSO"), ["reativar", "recusar"]);
  assert.deepEqual(acoesDaConta("RECUSADO"), ["aprovar"]);
});

test("envioDoBack: conteúdo completo, canvas nos nove blocos na ordem de leitura", () => {
  const envio = envioDoBack(ENVIO_PITCH_BACK);
  assert.equal(envio.id, "5");
  assert.equal(envio.startupId, "12");
  assert.equal(envio.versao, 2);
  assert.equal(envio.situacao, "EM_REVISAO");
  assert.equal(envio.atual, true);
  assert.equal(envio.pitchCurto, "Logística inteligente para o Nordeste");
  assert.equal(envio.videoUrl, "https://youtu.be/dQw4w9WgXcQ");
  assert.equal(envio.canvas.length, 9);
  assert.deepEqual(envio.canvas[0], { chave: "problem", texto: "Frete caro" });
  assert.deepEqual(envio.canvas[2], { chave: "keyMetrics", texto: "" });
});

test("acoesDoEnvio: só o envio atual aceita ação", () => {
  const envio = envioDoBack(ENVIO_PITCH_BACK);
  assert.deepEqual(acoesDoEnvio(envio), ["aprovar", "remover"]);
  assert.deepEqual(acoesDoEnvio({ ...envio, situacao: "PUBLICADO" }), ["remover"]);
  assert.deepEqual(acoesDoEnvio({ ...envio, situacao: "REMOVIDO" }), ["aprovar"]);
  assert.deepEqual(acoesDoEnvio({ ...envio, atual: false }), []);
});

test("erroDoMotivo: mesma regra do back (3 a 255 sem espaços nas pontas)", () => {
  assert.equal(erroDoMotivo("  abc "), null);
  assert.match(erroDoMotivo(" ab ") ?? "", /pelo menos 3/);
  assert.match(erroDoMotivo("x".repeat(256)) ?? "", /255/);
});

test("publicacaoDoBack: situação do back vira a da página, motivo só quando removido", () => {
  const removida = publicacaoDoBack(PUBLICACAO_REMOVIDA_BACK);
  assert.equal(removida.status, "REJECTED");
  assert.equal(removida.reason, "Contém telefone pessoal");
  assert.equal(removida.content?.shortPitch, "Logística inteligente para o Nordeste");
  assert.equal(removida.content?.leanCanvas.revenueStreams, "Assinatura mensal");

  assert.equal(publicacaoDoBack({ ...PUBLICACAO_REMOVIDA_BACK, status: "EM_REVISAO" }).status, "IN_REVIEW");
  assert.equal(publicacaoDoBack({ ...PUBLICACAO_REMOVIDA_BACK, status: "EM_REVISAO" }).reason, null);
  assert.equal(publicacaoDoBack({ ...PUBLICACAO_REMOVIDA_BACK, status: "PUBLICADO" }).status, "PUBLISHED");

  const nunca = publicacaoDoBack(SEM_PUBLICACAO_BACK);
  assert.equal(nunca.status, "DRAFT");
  assert.equal(nunca.content, null);
  assert.equal(nunca.requiresApproval, false);
});

test("pitchPublicadoDoBack: texto, vídeo e canvas do investidor", () => {
  const pitch = pitchPublicadoDoBack(PITCH_PUBLICADO_BACK);
  assert.equal(pitch.startupId, "12");
  assert.equal(pitch.shortPitch, "Logística inteligente para o Nordeste");
  assert.equal(pitch.leanCanvas.problem, "Frete caro");
  assert.equal(pitch.leanCanvas.channels, "");
  assert.equal(pitch.publishedAt, "2026-11-22T10:00:00Z");
});

test("logDoBack: ações de moderação em português, as antigas iguais", () => {
  const linha = logDoBack({
    id: 40,
    actorEmail: "admin@unio.test",
    action: "MODERACAO_CONTA_SUSPENSA",
    entityType: "User",
    entityId: "13",
    details: "Situação anterior: APROVADO. Nova situação: SUSPENSO. Motivo: Spam em mensagens.",
    createdAt: "2026-11-21T10:00:00Z",
  });
  assert.equal(
    linha.acao,
    "Suspendeu a conta 13. Situação anterior: APROVADO. Nova situação: SUSPENSO. Motivo: Spam em mensagens.",
  );
  assert.equal(
    logDoBack({
      id: 41,
      actorEmail: "admin@unio.test",
      action: "MODERACAO_PITCH_APROVADO",
      entityType: "StartupPitchPublication",
      entityId: "5",
      details: null,
      createdAt: "2026-11-22T10:00:00Z",
    }).acao,
    "Aprovou o envio de pitch 5",
  );
  assert.equal(
    logDoBack({
      id: 31,
      actorEmail: "admin@unio.test",
      action: "BOOTSTRAP_ADMIN",
      entityType: "User",
      entityId: "9",
      details: null,
      createdAt: "2026-11-16T12:00:00Z",
    }).acao,
    "BOOTSTRAP_ADMIN em User 9",
  );
});
