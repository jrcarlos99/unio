// T18 — Teste de carga do backend UNIO (RNF05 — escalabilidade)
//
// Executar (k6 instalado: https://grafana.com/docs/k6/latest/set-up/install-k6/):
//
//   k6 run \
//     -e BASE_URL=http://localhost:8080 \
//     -e STARTUP_EMAIL=carga-startup@teste.unio -e STARTUP_PASSWORD=senhaForte123 \
//     -e INVESTOR_EMAIL=carga-investidor@teste.unio -e INVESTOR_PASSWORD=senhaForte123 \
//     load-test/k6/unio-load-test.js
//
// Variáveis opcionais: PEAK_VUS (50), HOLD (5m), SUMMARY_FILE (load-test/resultados/summary.json)
//
// ⚠️ Rode em ambiente local ou de homologação. Não rode contra produção sem combinar com a equipe:
//    o cenário de mensagens grava dados no banco.

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { b64decode } from 'k6/encoding';
import { Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const PEAK_VUS = Number(__ENV.PEAK_VUS || 50);
const HOLD = __ENV.HOLD || '5m';

const recommendationsDuration = new Trend('unio_recommendations_duration', true);
const conversationsDuration = new Trend('unio_conversations_duration', true);
const sendMessageDuration = new Trend('unio_send_message_duration', true);

export const options = {
  scenarios: {
    // Navegação: leitura de perfil, recomendações, conversas e reuniões
    navegacao: {
      executor: 'ramping-vus',
      exec: 'navegacao',
      startVUs: 0,
      stages: [
        { duration: '1m', target: Math.ceil(PEAK_VUS * 0.4) },
        { duration: '2m', target: PEAK_VUS },
        { duration: HOLD, target: PEAK_VUS },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    // Escrita: envio de mensagens a uma taxa constante (2 por segundo)
    mensagens: {
      executor: 'constant-arrival-rate',
      exec: 'mensagens',
      rate: 2,
      timeUnit: '1s',
      duration: '8m',
      startTime: '1m',
      preAllocatedVUs: 5,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    checks: ['rate>0.99'],
    unio_recommendations_duration: ['p(95)<1200'],
    unio_send_message_duration: ['p(95)<800'],
  },
};

function login(email, password) {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /api/auth/login' },
  });
  if (res.status !== 200) {
    throw new Error(`Login falhou para ${email}: HTTP ${res.status} ${res.body}`);
  }
  const token = res.json('token');
  return { token, userId: userIdFromJwt(token) };
}

// O JWT do UNIO traz o claim "userId"
function userIdFromJwt(token) {
  const payload = JSON.parse(b64decode(token.split('.')[1], 'rawurl', 's'));
  return payload.userId;
}

// UUID "Long-encoded" usado pelo scorecard (D018): new UUID(0, id)
function scorecardUuid(id) {
  const hex = Number(id).toString(16).padStart(16, '0');
  return `00000000-0000-0000-${hex.slice(0, 4)}-${hex.slice(4)}`;
}

function auth(token, name) {
  return {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    tags: { name },
  };
}

export function setup() {
  const health = http.get(`${BASE_URL}/actuator/health`);
  if (health.status !== 200) {
    throw new Error(`API indisponível em ${BASE_URL} (health HTTP ${health.status})`);
  }

  const startup = login(__ENV.STARTUP_EMAIL, __ENV.STARTUP_PASSWORD);
  const investor = login(__ENV.INVESTOR_EMAIL, __ENV.INVESTOR_PASSWORD);

  // Garante uma conversa entre os dois usuários de teste
  const conversation = http.post(
    `${BASE_URL}/api/conversations`,
    JSON.stringify({ participantId: startup.userId }),
    auth(investor.token, 'POST /api/conversations'),
  );
  if (conversation.status !== 200) {
    throw new Error(`Não foi possível abrir a conversa: HTTP ${conversation.status} ${conversation.body}`);
  }

  return { startup, investor, conversationId: conversation.json('id') };
}

export function navegacao(data) {
  const { startup, investor, conversationId } = data;

  group('investidor', () => {
    const profile = http.get(`${BASE_URL}/api/profile/me`, auth(investor.token, 'GET /api/profile/me'));
    check(profile, { 'perfil 200': (r) => r.status === 200 });

    const recommendations = http.get(
      `${BASE_URL}/api/scorecard/recommendations?investorId=${scorecardUuid(investor.userId)}&limit=10`,
      auth(investor.token, 'GET /api/scorecard/recommendations'),
    );
    recommendationsDuration.add(recommendations.timings.duration);
    check(recommendations, { 'recomendações 200': (r) => r.status === 200 });

    const meetings = http.get(`${BASE_URL}/api/meetings`, auth(investor.token, 'GET /api/meetings'));
    check(meetings, { 'reuniões 200': (r) => r.status === 200 });
  });

  sleep(1);

  group('startup', () => {
    const conversations = http.get(`${BASE_URL}/api/conversations`, auth(startup.token, 'GET /api/conversations'));
    conversationsDuration.add(conversations.timings.duration);
    check(conversations, { 'conversas 200': (r) => r.status === 200 });

    const messages = http.get(
      `${BASE_URL}/api/conversations/${conversationId}/messages?size=30`,
      auth(startup.token, 'GET /api/conversations/{id}/messages'),
    );
    check(messages, { 'mensagens 200': (r) => r.status === 200 });
  });

  sleep(Math.random() * 2 + 1);
}

export function mensagens(data) {
  const { investor, conversationId } = data;
  const res = http.post(
    `${BASE_URL}/api/conversations/${conversationId}/messages`,
    JSON.stringify({ content: `Mensagem de carga ${__VU}-${__ITER} em ${new Date().toISOString()}` }),
    auth(investor.token, 'POST /api/conversations/{id}/messages'),
  );
  sendMessageDuration.add(res.timings.duration);
  check(res, { 'mensagem 201': (r) => r.status === 201 });
}

export function handleSummary(data) {
  const file = __ENV.SUMMARY_FILE || 'load-test/resultados/summary.json';
  const metric = (name, stat) => {
    const m = data.metrics[name];
    return m && m.values[stat] !== undefined ? m.values[stat].toFixed(2) : 'n/a';
  };
  const text = [
    '',
    '===== UNIO — resumo do teste de carga =====',
    `Requisições:          ${metric('http_reqs', 'count')} (${metric('http_reqs', 'rate')}/s)`,
    `Falhas HTTP:          ${(Number(metric('http_req_failed', 'rate')) * 100).toFixed(2)}%`,
    `Latência p95 / p99:   ${metric('http_req_duration', 'p(95)')} ms / ${metric('http_req_duration', 'p(99)')} ms`,
    `Recomendações p95:    ${metric('unio_recommendations_duration', 'p(95)')} ms`,
    `Conversas p95:        ${metric('unio_conversations_duration', 'p(95)')} ms`,
    `Enviar mensagem p95:  ${metric('unio_send_message_duration', 'p(95)')} ms`,
    `Checks OK:            ${(Number(metric('checks', 'rate')) * 100).toFixed(2)}%`,
    '',
  ].join('\n');
  return { stdout: text, [file]: JSON.stringify(data, null, 2) };
}
