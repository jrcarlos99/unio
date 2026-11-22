// Testes das notificações derivadas da lista (src/services/reunioesNotificacoes.ts).
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Reuniao } from "../src/types/reunioes.ts";
import { derivarNotificacoes, fotografar, juntarNotificacoes } from "../src/services/reunioesNotificacoes.ts";

const AGORA = new Date("2026-11-08T15:00:00.000Z");

function reuniao(id: string, parcial: Partial<Reuniao>): Reuniao {
  return {
    id,
    unioId: "12",
    solicitante: "outro",
    organizador: "outro",
    contraparte: { id: "12", nome: "Tidalog", subtitulo: "Logística • Seed", iniciais: "TI", tipo: "startup", selos: [] },
    assunto: "Mentoria",
    duracaoMin: 30,
    formato: "online",
    horariosSugeridos: ["2026-11-12T17:00:00.000Z"],
    status: "pendente",
    criadaEm: AGORA.toISOString(),
    atualizadaEm: AGORA.toISOString(),
    codigo: "UNIO-1234",
    ...parcial,
  };
}

let contador = 0;
const novoId = () => `n${++contador}`;

test("pendente recebida que não estava na última lista vira 'recebida'", () => {
  const [nova] = derivarNotificacoes({}, [reuniao("1", {})], AGORA, novoId);
  assert.equal(nova.tipo, "recebida");
  assert.equal(nova.reuniaoId, "1");
  assert.equal(nova.texto, "Tidalog solicitou uma reunião: Mentoria.");
  assert.equal(nova.lida, false);

  // Já vista: nada de novo
  const vista = fotografar([reuniao("1", {})]);
  assert.deepEqual(derivarNotificacoes(vista, [reuniao("1", {})], AGORA, novoId), []);
  // Pendente enviada por mim não notifica
  assert.deepEqual(derivarNotificacoes({}, [reuniao("2", { solicitante: "eu" })], AGORA, novoId), []);
});

test("minha proposta aceita, recusada ou cancelada pela outra parte", () => {
  const anterior = fotografar([
    reuniao("a", { solicitante: "eu" }),
    reuniao("b", { solicitante: "eu" }),
    reuniao("c", { solicitante: "eu" }),
  ]);
  const atuais = [
    reuniao("a", { solicitante: "eu", status: "confirmada", horarioConfirmado: "2026-11-12T17:00:00.000Z" }),
    reuniao("b", { solicitante: "eu", status: "recusada" }),
    reuniao("c", { solicitante: "eu", status: "cancelada" }),
  ];
  const tipos = derivarNotificacoes(anterior, atuais, AGORA, novoId).map((n) => n.tipo);
  assert.deepEqual(tipos.sort(), ["aceita", "cancelada", "recusada"]);
  const aceita = derivarNotificacoes(anterior, atuais, AGORA, novoId).find((n) => n.tipo === "aceita");
  assert.match(aceita?.texto ?? "", /^Tidalog aceitou sua solicitação para .+ às 14:00\.$/);
});

test("confirmada cancelada e contraproposta da outra parte", () => {
  const anterior = fotografar([
    reuniao("x", { status: "confirmada", horarioConfirmado: "2026-11-12T17:00:00.000Z" }),
    reuniao("y", { solicitante: "eu" }),
    reuniao("z", { status: "confirmada", solicitante: "eu", horarioConfirmado: "2026-11-12T17:00:00.000Z" }),
  ]);
  const atuais = [
    reuniao("x", { status: "cancelada" }),
    reuniao("y", { solicitante: "outro" }),
    reuniao("z", { solicitante: "outro" }),
  ];
  const porId = Object.fromEntries(derivarNotificacoes(anterior, atuais, AGORA, novoId).map((n) => [n.reuniaoId, n]));
  assert.equal(porId.x.tipo, "cancelada");
  assert.equal(porId.y.tipo, "proposta");
  assert.equal(porId.y.texto, "Tidalog propôs outros horários.");
  assert.equal(porId.z.texto, "Tidalog pediu para remarcar a reunião.");
});

test("lista de notificações guarda no máximo 30, mais recentes primeiro", () => {
  const antigas = Array.from({ length: 30 }, (_, i) => ({
    id: `v${i}`,
    tipo: "recebida" as const,
    reuniaoId: String(i),
    texto: "antiga",
    em: AGORA.toISOString(),
    lida: true,
  }));
  const novas = derivarNotificacoes({}, [reuniao("nova", {})], AGORA, novoId);
  const juntas = juntarNotificacoes(novas, antigas);
  assert.equal(juntas.length, 30);
  assert.equal(juntas[0].reuniaoId, "nova");
});
