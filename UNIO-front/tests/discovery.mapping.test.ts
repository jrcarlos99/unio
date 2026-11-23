// Mapeamento da descoberta, interesse, match e salvos (src/services/discovery.mapping.ts,
// ADR-008). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compatibilidadeDoBack,
  contatoDeConexao,
  corpoFeedback,
  feedbackJaGravado,
  investidorDoBack,
  investidorRecomendadoDoBack,
  motivosDoBack,
  parametrosDescoberta,
  separarLocalizacao,
  startupDeConexao,
  startupDoBack,
  startupRecomendadaDoBack,
  statusDoInteresseEnviado,
  statusInteresseDoBack,
  teseDoInvestidor,
  tipoDoPerfilRisco,
  type ConexaoBack,
  type ItemDescobertaBack,
} from "../src/services/discovery.mapping.ts";
import { capitalDaStartup, localDaStartup, localDoInvestidor, textoCapital } from "../src/utils/perfilDescoberta.ts";

const SCORECARD = {
  startupId: "00000000-0000-0000-0000-00000000000c",
  investorId: "00000000-0000-0000-0000-000000000007",
  scorePolicyId: 1,
};

function itemStartup(extra: Partial<ItemDescobertaBack> = {}): ItemDescobertaBack {
  return {
    userId: 12,
    name: "Tidalog",
    role: "STARTUP",
    profile: {
      segmento: "Logística",
      estagio: "MVP",
      localizacao: "Recife, PE",
      modeloNegocio: "B2B",
      mercadoAlvo: "Transportadoras",
      capitalProcurado: 300000,
      pitchCanvas: "Roteirização para transportadoras regionais",
    },
    scoreFinal: 92.5,
    classification: "EXCELENTE",
    dimensions: [
      { dimension: "SEGMENTO", score: 100 },
      { dimension: "ESTAGIO", score: 100 },
      { dimension: "CAPITAL", score: 100 },
      { dimension: "REGIAO", score: 100 },
      { dimension: "MODELO_NEGOCIO", score: 50 },
    ],
    topPositiveFactors: [
      { factorCode: "SEGMENTO_MATCH", factorScore: 100 },
      { factorCode: "REGIAO_FIT", factorScore: 100 },
    ],
    topAttentionFactors: [{ factorCode: "MODELO_NEGOCIO_FIT", factorScore: 50 }],
    nextStep: { code: "GENERIC_REVIEW", text: "Revisar os fatores de atenção identificados." },
    scorecard: SCORECARD,
    interestStatus: "NONE",
    saved: false,
    calculatedAt: "2026-11-16T22:00:00Z",
    ...extra,
  };
}

test("statusInteresseDoBack: RECEIVED aparece como nenhum (o botão continua disponível)", () => {
  assert.equal(statusInteresseDoBack("NONE"), "nenhum");
  assert.equal(statusInteresseDoBack("SENT"), "enviado");
  assert.equal(statusInteresseDoBack("RECEIVED"), "nenhum");
  assert.equal(statusInteresseDoBack("MATCH"), "match");
  assert.equal(statusInteresseDoBack(undefined), "nenhum");
  assert.equal(statusDoInteresseEnviado({ status: "ENVIADO", matchedAt: null }), "enviado");
  assert.equal(statusDoInteresseEnviado({ status: "MATCH", matchedAt: "2026-11-16T22:00:00Z" }), "match");
});

test("compatibilidadeDoBack: total arredondado e só os critérios que existem no scorecard", () => {
  const compatibilidade = compatibilidadeDoBack(92.5, "EXCELENTE", itemStartup().dimensions, itemStartup().nextStep);
  assert.equal(compatibilidade.total, 93);
  assert.deepEqual(compatibilidade.notas, { segmento: 100, estagio: 100, ticket: 100, regiao: 100 });
  assert.equal("disponibilidade" in compatibilidade.notas, false);
  assert.equal(compatibilidade.classificacao, "EXCELENTE");
  assert.equal(compatibilidade.proximoPasso, "Revisar os fatores de atenção identificados.");
  assert.equal(compatibilidade.fonte, "scorecard");

  const semMatch = compatibilidadeDoBack(0, "SEM_MATCH", [], { code: "NO_ACTION_NEEDED", text: "Nada" });
  assert.equal(semMatch.total, 0);
  assert.deepEqual(semMatch.notas, {});
  assert.equal(semMatch.proximoPasso, null);
  assert.equal(compatibilidadeDoBack(null, null).total, 0);
  assert.equal(compatibilidadeDoBack(140, "EXCELENTE").total, 100);
});

test("motivosDoBack: só fatores a favor, com o texto de quem vê", () => {
  const paraInvestidor = motivosDoBack(itemStartup(), "investidor");
  assert.equal(paraInvestidor.length, 2);
  assert.deepEqual(paraInvestidor[0][1], { texto: "Logística", forte: true });
  assert.deepEqual(paraInvestidor[1][1], { texto: "Recife, PE", forte: true });

  const semFatores = motivosDoBack(itemStartup({ topPositiveFactors: [], classification: "FRACO" }), "startup");
  assert.deepEqual(semFatores, [[{ texto: "Classificação do scorecard: " }, { texto: "Fraco", forte: true }]]);
});

test("startupDoBack: campos que o back não tem ficam null ou vazios (nada inventado)", () => {
  const startup = startupDoBack(12, "Tidalog", itemStartup().profile);
  assert.equal(startup.id, "12");
  assert.equal(startup.cidade, "Recife");
  assert.equal(startup.uf, "PE");
  assert.equal(startup.descricao, "Roteirização para transportadoras regionais");
  assert.equal(startup.capitalProcurado, 300000);
  assert.equal(startup.fundacao, null);
  assert.equal(startup.tamanhoEquipe, null);
  assert.equal(startup.canvas, null);
  
  assert.equal(startup.metrica, null);
  assert.equal(startup.verificada, false);
  assert.deepEqual(startup.tags, []);

  const vazia = startupDoBack(3, "Sem perfil", null);
  assert.equal(vazia.segmento, "");
  assert.equal(vazia.capitalProcurado, null);
});

test("investidorDoBack: tipo, ticket, região e disponibilidade do perfil real", () => {
  const investidor = investidorDoBack(7, "rafael", {
    segmentosInteresse: ["Logística", "Fintech"],
    estagiosInteresse: ["MVP"],
    ticketMinimo: 50000,
    ticketMaximo: 300000,
    perfilRisco: "Mentor",
    disponibilidade: "MEDIA",
    regiaoInteresse: "Recife / Porto Digital,Região livre",
  });
  assert.equal(investidor.id, "7");
  assert.equal(investidor.tipo, "Mentor");
  assert.equal(investidor.ticketMin, 50000);
  assert.equal(investidor.disponibilidade, "Média");
  assert.deepEqual(investidor.regioesInteresse, ["Recife / Porto Digital"]);
  assert.equal(investidor.regiaoTexto, "Recife / Porto Digital,Região livre");
  assert.equal(investidor.tese, "Investe em Logística & Fintech, estágios MVP.");
  assert.equal(investidor.portfolio, null);
  assert.equal(investidor.desde, null);
  assert.equal(investidor.tempoResposta, null);
  assert.equal(investidor.bio, "");

  // Ticket incompleto conta como "sem ticket" (só mentoria), igual ao mock
  const soMinimo = investidorDoBack(8, "ana", { ticketMinimo: 10000, ticketMaximo: null });
  assert.equal(soMinimo.ticketMin, null);
  assert.equal(soMinimo.ticketMax, null);
  assert.equal(soMinimo.disponibilidade, null);
});

test("tipoDoPerfilRisco e teseDoInvestidor", () => {
  assert.equal(tipoDoPerfilRisco("Mentor"), "Mentor");
  assert.equal(tipoDoPerfilRisco("Ambos"), "Ambos");
  assert.equal(tipoDoPerfilRisco("Capital de risco"), "Investidor Anjo");
  assert.equal(tipoDoPerfilRisco(null), "Investidor Anjo");
  assert.equal(teseDoInvestidor([], []), "");
  assert.equal(teseDoInvestidor([], ["MVP"]), "Estágios MVP.");
});

test("itens da lista guardam o par do scorecard para o feedback", () => {
  const startup = startupRecomendadaDoBack(itemStartup({ interestStatus: "SENT", saved: true }));
  assert.equal(startup.statusInteresse, "enviado");
  assert.equal(startup.salvo, true);
  assert.deepEqual(startup.scorecard, SCORECARD);

  const investidor = investidorRecomendadoDoBack(
    itemStartup({ role: "INVESTOR", profile: { perfilRisco: "Ambos" }, interestStatus: "MATCH" }),
  );
  assert.equal(investidor.investidor.tipo, "Ambos");
  assert.equal(investidor.statusInteresse, "match");
});

test("conexões: matches e salvos sem notas por critério; contato só com e-mail", () => {
  const conexao: ConexaoBack = {
    userId: 12,
    name: "Tidalog",
    role: "STARTUP",
    matchedAt: "2026-11-16T22:15:00Z",
    savedAt: null,
    scoreFinal: 78.4,
    classification: "FORTE",
    interestStatus: "MATCH",
    saved: false,
    profile: { segmento: "Logística" },
    contact: { email: "contato@exemplo.com.br" },
  };
  const rec = startupDeConexao(conexao);
  assert.equal(rec.compatibilidade.total, 78);
  assert.deepEqual(rec.compatibilidade.notas, {});
  assert.equal(rec.statusInteresse, "match");
  assert.deepEqual(contatoDeConexao(conexao), {
    contato: { email: "contato@exemplo.com.br" },
    matchEm: "2026-11-16T22:15:00Z",
  });
  assert.deepEqual(contatoDeConexao({ ...conexao, contact: null, matchedAt: null }), { contato: {}, matchEm: null });
});

test("parametrosDescoberta: só filtros preenchidos, com paginação", () => {
  assert.deepEqual(parametrosDescoberta(), { limit: 100, offset: 0 });
  assert.deepEqual(parametrosDescoberta({ busca: "  tidalog ", segmento: "Logística", estagio: null }, 100), {
    limit: 100,
    offset: 100,
    q: "tidalog",
    segmento: "Logística",
  });
  assert.deepEqual(parametrosDescoberta({ tipo: "Mentor", busca: "   " }), { limit: 100, offset: 0, tipo: "Mentor" });
});

test("feedback: corpo do back e 409 duplicado como sucesso silencioso", () => {
  assert.deepEqual(corpoFeedback(SCORECARD, "VIEWED"), { ...SCORECARD, action: "VIEWED" });
  assert.equal(feedbackJaGravado(409, "FEEDBACK_DUPLICATE"), true);
  assert.equal(feedbackJaGravado(409, undefined), true);
  assert.equal(feedbackJaGravado(409, "Outro conflito"), false);
  assert.equal(feedbackJaGravado(403, "FEEDBACK_DUPLICATE"), false);
});

test("separarLocalizacao e textos de perfil sem dado inventado", () => {
  assert.deepEqual(separarLocalizacao("Recife - PE"), { cidade: "Recife", uf: "PE" });
  assert.deepEqual(separarLocalizacao("Caruaru/pe"), { cidade: "Caruaru", uf: "PE" });
  assert.deepEqual(separarLocalizacao("Remoto"), { cidade: "Remoto", uf: "" });
  assert.deepEqual(separarLocalizacao(null), { cidade: "", uf: "" });

  assert.equal(localDaStartup({ cidade: "Recife", uf: "" }), "Recife");
  assert.equal(localDaStartup({ cidade: "", uf: "" }), "");
  assert.equal(localDoInvestidor({ cidade: "", uf: "", regiaoTexto: "Nordeste" }), "Nordeste");
  assert.equal(capitalDaStartup({ capitalProcurado: 300000 }), 300000);
  assert.equal(textoCapital({ capitalProcurado: null }), "Não informado");
  assert.match(textoCapital({ capitalProcurado: 300000 }), /^Busca R\$/);
});
