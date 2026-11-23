// Testes das funções puras de services/perfilFromOnboarding.ts.
// Rodar com: npm test (Node 22+, sem dependências extras).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  montarPayloadInvestidor,
  montarPayloadStartup,
  validarPayloadInvestidor,
  validarPayloadStartup,
} from "../src/services/perfilFromOnboarding.ts";
import type { RespostasInvestidor, RespostasStartup } from "../src/types/onboarding.ts";

const STARTUP: RespostasStartup = {
  nome: "  EcoTech  ",
  segmento: "Fintech",
  estagio: "MVP",
  necessidades: ["Investimento", "Mentoria"],
  capitalProcurado: "R$ 50 a 200 mil",
  localizacao: "Recife / Porto Digital",
  tracao: [],
  tamanhoEquipe: "3 a 5",
  modeloNegocio: "B2B",
  mercadoAlvo: "PMEs",
  pitch: "",
  consentimentoLgpd: true,
};

const INVESTIDOR: RespostasInvestidor = {
  segmentosInteresse: ["Fintech", "EdTech", "AgTech"],
  estagiosInteresse: ["MVP", "Operação"],
  preferenciasStartup: [],
  ticketMedio: "R$ 50 a 200 mil",
  apenasMentor: false,
  disponibilidade: "Média",
  formasInteracao: [],
  regioesInteresse: ["Recife / Porto Digital"],
  consentimentoLgpd: true,
};

function semUndefinedNemNaN(payload: object) {
  for (const [campo, valor] of Object.entries(payload)) {
    assert.notEqual(valor, undefined, `${campo} não pode ser undefined`);
    if (typeof valor === "number") assert.ok(Number.isFinite(valor), `${campo} não pode ser NaN`);
  }
}

test("startup: todas as faixas de capital", () => {
  const esperado = {
    "Até R$ 50 mil": 25000,
    "R$ 50 a 200 mil": 125000,
    "R$ 200 a 500 mil": 350000,
    "Acima de R$ 500 mil": 500000,
  } as const;
  for (const [faixa, valor] of Object.entries(esperado)) {
    const payload = montarPayloadStartup({ ...STARTUP, capitalProcurado: faixa as RespostasStartup["capitalProcurado"] });
    assert.equal(payload.capitalProcurado, valor, faixa);
    assert.deepEqual(validarPayloadStartup(payload), []);
  }
});

test("startup: campos básicos com trim e sem pitch vazio", () => {
  const payload = montarPayloadStartup(STARTUP);
  assert.deepEqual(payload, {
    nome: "EcoTech",
    segmento: "Fintech",
    estagio: "MVP",
    localizacao: "Recife / Porto Digital",
    modeloNegocio: "B2B",
    mercadoAlvo: "PMEs",
    capitalProcurado: 125000,
  });
  semUndefinedNemNaN(payload);
});

test("startup: frase de pitch vira pitchCanvas", () => {
  const payload = montarPayloadStartup({ ...STARTUP, pitch: " Crédito para PMEs " });
  assert.equal(payload.pitchCanvas, "Crédito para PMEs");
});

test("startup sem investimento não envia capital, mesmo com faixa marcada", () => {
  const payload = montarPayloadStartup({ ...STARTUP, necessidades: ["Mentoria"], capitalProcurado: "Até R$ 50 mil" });
  assert.equal("capitalProcurado" in payload, false);
  assert.deepEqual(validarPayloadStartup(payload), []);
  semUndefinedNemNaN(payload);
});

test("startup sem nome não passa na validação", () => {
  const erros = validarPayloadStartup(montarPayloadStartup({ ...STARTUP, nome: "   " }));
  assert.equal(erros.length, 1);
  assert.match(erros[0], /nome/);
});

test("startup com nome acima de 255 caracteres não passa", () => {
  const erros = validarPayloadStartup(montarPayloadStartup({ ...STARTUP, nome: "a".repeat(256) }));
  assert.equal(erros.length, 1);
});

test("investidor: todas as faixas de ticket", () => {
  const esperado = {
    "Até R$ 50 mil": [10000, 50000],
    "R$ 50 a 200 mil": [50000, 200000],
    "R$ 200 a 500 mil": [200000, 500000],
    "Acima de R$ 500 mil": [500000, 1000000],
  } as const;
  for (const [faixa, [minimo, maximo]] of Object.entries(esperado)) {
    const payload = montarPayloadInvestidor({ ...INVESTIDOR, ticketMedio: faixa as RespostasInvestidor["ticketMedio"] });
    assert.equal(payload.ticketMinimo, minimo, faixa);
    assert.equal(payload.ticketMaximo, maximo, faixa);
    assert.deepEqual(validarPayloadInvestidor(payload), []);
  }
});

test("investidor: payload completo, sem nome", () => {
  const payload = montarPayloadInvestidor(INVESTIDOR);
  assert.deepEqual(payload, {
    segmentosInteresse: ["Fintech", "EdTech", "AgTech"],
    estagiosInteresse: ["MVP", "Operação"],
    perfilRisco: "Investidor Anjo",
    ticketMinimo: 50000,
    ticketMaximo: 200000,
    disponibilidade: "MEDIA",
    regiaoInteresse: "Recife / Porto Digital",
  });
  assert.equal("nome" in payload, false);
  semUndefinedNemNaN(payload);
});

test("mentor sem faixa não envia tickets e vira perfilRisco Mentor", () => {
  const payload = montarPayloadInvestidor({ ...INVESTIDOR, apenasMentor: true, ticketMedio: null });
  assert.equal("ticketMinimo" in payload, false);
  assert.equal("ticketMaximo" in payload, false);
  assert.equal(payload.perfilRisco, "Mentor");
  assert.deepEqual(validarPayloadInvestidor(payload), []);
  semUndefinedNemNaN(payload);
});

test("mentor com faixa envia os dois tickets", () => {
  const payload = montarPayloadInvestidor({ ...INVESTIDOR, apenasMentor: true, ticketMedio: "Até R$ 50 mil" });
  assert.equal(payload.perfilRisco, "Mentor");
  assert.equal(payload.ticketMinimo, 10000);
  assert.equal(payload.ticketMaximo, 50000);
});

test("investidor: várias regiões juntas por vírgula", () => {
  const payload = montarPayloadInvestidor({
    ...INVESTIDOR,
    regioesInteresse: ["Recife / Porto Digital", "Nordeste", "Aberto a startups remotas"],
  });
  assert.equal(payload.regiaoInteresse, "Recife / Porto Digital,Nordeste,Aberto a startups remotas");
});

test("investidor: disponibilidade Baixa, Média e Alta", () => {
  assert.equal(montarPayloadInvestidor({ ...INVESTIDOR, disponibilidade: "Baixa" }).disponibilidade, "BAIXA");
  assert.equal(montarPayloadInvestidor({ ...INVESTIDOR, disponibilidade: "Média" }).disponibilidade, "MEDIA");
  assert.equal(montarPayloadInvestidor({ ...INVESTIDOR, disponibilidade: "Alta" }).disponibilidade, "ALTA");
  const semDisponibilidade = montarPayloadInvestidor({ ...INVESTIDOR, disponibilidade: null });
  assert.equal("disponibilidade" in semDisponibilidade, false);
});

test("validação do investidor recusa mínimo maior que máximo, NaN e undefined", () => {
  assert.equal(validarPayloadInvestidor({ ...montarPayloadInvestidor(INVESTIDOR), ticketMinimo: 300000 }).length, 1);
  assert.ok(validarPayloadInvestidor({ ...montarPayloadInvestidor(INVESTIDOR), ticketMaximo: Number.NaN }).length > 0);
  assert.ok(validarPayloadInvestidor({ ...montarPayloadInvestidor(INVESTIDOR), ticketMinimo: undefined }).length > 0);
});
