// Mapeamento da avaliação/popularidade para a API do back (ADR-006)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fromBackPopularity,
  fromBackSummary,
  toBackReview,
  type PopularityBack,
  type ReviewSummaryBack,
} from "../src/services/avaliacoes.mapping.ts";

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
