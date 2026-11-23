// Métricas e auditoria do admin (src/services/admin.mapping.ts, ADR-010).
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { logDoBack, visaoGeralAdminDoBack, type MetricasAdminBack } from "../src/services/admin.mapping.ts";

const METRICAS: MetricasAdminBack = {
  totalStartups: 1,
  totalInvestors: 1,
  totalMatches: 1,
  totalFeedbacks: 2,
  distributionByClassification: { EXCELENTE: 1, FRACO: 0 },
  totalConversations: 0,
  totalMessages: 0,
  totalMeetings: 1,
  meetingsByStatus: { PENDENTE: 0, CONFIRMADA: 0, RECUSADA: 0, CANCELADA: 0, REALIZADA: 1 },
  totalReviews: 2,
  averageRating: 4.5,
  interestsSent: 2,
  mutualMatches: 1,
};

test("visaoGeralAdminDoBack: números reais, sem variação nem sparkline inventadas", () => {
  const visao = visaoGeralAdminDoBack(METRICAS);
  assert.deepEqual(visao.metricas, [
    { label: "Matches mútuos", valor: 1 },
    { label: "Interesses enviados", valor: 2 },
    { label: "Reuniões", valor: 1 },
  ]);
  assert.deepEqual(visao.avaliacao, { percentual: 90, legenda: "média 4,5 de 5 (2 avaliações)" });
  assert.deepEqual(visao.reunioesPorStatus, [{ segmento: "Realizadas", quantidade: 1 }]);
  assert.deepEqual(visao.scoresPorClassificacao, [{ local: "Excelente", quantidade: 1 }]);
  assert.equal(visao.totalStartups + visao.totalInvestidores, 2);
});

test("visaoGeralAdminDoBack: back antigo sem campos novos e sem avaliações", () => {
  const visao = visaoGeralAdminDoBack({
    ...METRICAS,
    interestsSent: undefined,
    mutualMatches: undefined,
    averageRating: null,
    totalReviews: 0,
    meetingsByStatus: null,
    distributionByClassification: null,
  });
  assert.equal(visao.metricas[0].valor, 0);
  assert.deepEqual(visao.avaliacao, { percentual: 0, legenda: "sem avaliações ainda" });
  assert.deepEqual(visao.reunioesPorStatus, []);
  assert.deepEqual(visao.scoresPorClassificacao, []);
});

test("logDoBack: ação, alvo e quem fez", () => {
  const entrada = logDoBack({
    id: 7,
    actorEmail: "admin@exemplo.com.br",
    action: "BOOTSTRAP_ADMIN",
    entityType: "User",
    entityId: "12",
    details: null,
    createdAt: "2026-11-16T22:00:00Z",
  });
  assert.equal(entrada.id, "7");
  assert.equal(entrada.usuario, "admin@exemplo.com.br");
  assert.equal(entrada.acao, "BOOTSTRAP_ADMIN em User 12");
  assert.equal(logDoBack({ ...entradaVazia(), actorEmail: null }).usuario, "sistema");
});

function entradaVazia() {
  return { id: 1, actorEmail: null, action: "X", entityType: null, entityId: null, details: null, createdAt: "x" };
}
