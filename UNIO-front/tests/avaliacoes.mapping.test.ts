// Mapeamento da avaliação/popularidade para a API do back (ADR-006)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_REUNIOES_CONSULTADAS,
  avaliacaoEhMinha,
  ehAvaliacaoRepetida,
  fromBackPopularity,
  fromBackSummary,
  realizadasParaConsultar,
  toBackReview,
  type PopularityBack,
  type ReviewBack,
  type ReviewSummaryBack,
} from "../src/services/avaliacoes.mapping.ts";
import type { Reuniao, StatusReuniao } from "../src/types/reunioes.ts";

test("toBackReview: nota e comentário opcional sem espaços", () => {
  assert.deepEqual(toBackReview(4), { rating: 4 });
  assert.deepEqual(toBackReview(5, "   "), { rating: 5 });
  assert.deepEqual(toBackReview(3, "  Pontual e preparada  "), { rating: 3, comment: "Pontual e preparada" });
});

test("fromBackSummary: abaixo do mínimo não tem percentual", () => {
  const resumo: ReviewSummaryBack = { userId: 7, totalReviews: 2, averageRating: null, percentage: null, visible: false };
  assert.deepEqual(fromBackSummary(resumo), { percentual: null, visivel: false });
});

test("fromBackSummary: só agregados, comentário descartado", () => {
  const resposta = {
    userId: 7,
    totalReviews: 3,
    averageRating: 4.7,
    percentage: 93,
    visible: true,
    comment: "não pode chegar à tela",
  } as ReviewSummaryBack;
  const mapeado = fromBackSummary(resposta);
  assert.deepEqual(mapeado, { percentual: 93, visivel: true });
  assert.ok(!JSON.stringify(mapeado).includes("não pode chegar"));
});

test("fromBackPopularity: visitas, variação e semanas", () => {
  const dados = {
    userId: 7,
    totalReviews: 4,
    averageRating: 4.5,
    percentage: 90,
    visible: true,
    meetingsCompleted: 4,
    profileViews28d: 59,
    profileViewsPrev28d: 50,
    weeklyViews: [
      { weekStart: "2026-10-20", views: 10 },
      { weekStart: "2026-10-27", views: 14 },
      { weekStart: "2026-11-03", views: 16 },
      { weekStart: "2026-11-10", views: 19 },
    ],
    interestsReceived: 0,
    comment: "ignorado",
  } as PopularityBack;
  const popularidade = fromBackPopularity(dados);
  assert.equal(popularidade.percentual, 90);
  assert.equal(popularidade.reunioesRealizadas, 4);
  assert.equal(popularidade.visitas.total28d, 59);
  assert.equal(popularidade.visitas.variacaoPercentual, 18);
  assert.deepEqual(
    popularidade.visitas.semanal.map((semana) => semana.semana),
    ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
  );
  assert.equal(popularidade.visitas.semanal[3].atual, 19);
  assert.ok(!JSON.stringify(popularidade).includes("ignorado"));
});

// ---------------------------------------------------------------------------
// Modo API: pendentes, "já avaliei" e erro de avaliação repetida (ADR-007)
// ---------------------------------------------------------------------------

function review(reviewerId: number, reviewedId: number): ReviewBack {
  return {
    id: reviewerId * 10,
    meetingId: 5,
    reviewer: { id: reviewerId, name: "A", role: "STARTUP", active: true },
    reviewed: { id: reviewedId, name: "B", role: "INVESTOR", active: true },
    rating: 5,
    createdAt: "2026-11-16T12:00:00Z",
  };
}

test("avaliacaoEhMinha: pelo reviewer igual ao usuário logado", () => {
  const lista = [review(3, 7)];
  assert.equal(avaliacaoEhMinha(lista, "3", "7"), true);
  assert.equal(avaliacaoEhMinha(lista, 7, "3"), false);
  assert.equal(avaliacaoEhMinha([], "3", "7"), false);
});

test("avaliacaoEhMinha: sem o meu id, vale a avaliação feita sobre a outra parte", () => {
  const lista = [review(3, 7)];
  assert.equal(avaliacaoEhMinha(lista, undefined, "7"), true);
  assert.equal(avaliacaoEhMinha(lista, null, "3"), false);
  assert.equal(avaliacaoEhMinha(lista, undefined, "biopay"), false);
});

test("ehAvaliacaoRepetida: 409 ou 400 do 'já avaliou', não o 409 de reunião não realizada", () => {
  assert.equal(ehAvaliacaoRepetida(409, "Você já avaliou esta reunião"), true);
  assert.equal(ehAvaliacaoRepetida(400, "Voce ja avaliou esta reuniao"), true);
  assert.equal(ehAvaliacaoRepetida(409, undefined), true);
  assert.equal(
    ehAvaliacaoRepetida(409, "A avaliação fica disponível depois que a reunião for marcada como realizada"),
    false,
  );
  assert.equal(ehAvaliacaoRepetida(400, undefined), false);
  assert.equal(ehAvaliacaoRepetida(500, "Você já avaliou esta reunião"), false);
});

function reuniaoCom(id: string, status: StatusReuniao, horario: string): Reuniao {
  return {
    id,
    unioId: "7",
    solicitante: "eu",
    organizador: "eu",
    contraparte: { id: "7", nome: "Rafael", subtitulo: "Investidor", iniciais: "RA", tipo: "investidor", selos: [] },
    assunto: "Mentoria",
    duracaoMin: 30,
    formato: "online",
    horariosSugeridos: [horario],
    horarioConfirmado: horario,
    status,
    criadaEm: horario,
    atualizadaEm: horario,
    codigo: "UNIO-1234",
  };
}

test("realizadasParaConsultar: só realizadas, mais recentes primeiro, até 20", () => {
  const lista = Array.from({ length: 25 }, (_, i) =>
    reuniaoCom(String(i + 1), "realizada", new Date(Date.UTC(2026, 9, i + 1, 15)).toISOString()),
  );
  lista.push(reuniaoCom("99", "confirmada", "2026-11-30T15:00:00.000Z"));
  const consultadas = realizadasParaConsultar(lista);
  assert.equal(consultadas.length, MAX_REUNIOES_CONSULTADAS);
  assert.equal(consultadas[0].id, "25");
  assert.ok(consultadas.every((reuniao) => reuniao.status === "realizada"));
});

test("fromBackPopularity: interestsReceived ausente vira 0 (sem número de exemplo)", () => {
  const dados = {
    userId: 7,
    totalReviews: 1,
    averageRating: null,
    percentage: null,
    visible: false,
    meetingsCompleted: 1,
    profileViews28d: 0,
    profileViewsPrev28d: 0,
    weeklyViews: [],
  } as unknown as PopularityBack;
  const popularidade = fromBackPopularity(dados);
  assert.equal(popularidade.interessesRecebidos, 0);
  assert.equal(popularidade.percentual, null);
  assert.equal(popularidade.visitas.total28d, 0);
});
