// Testes do mapeamento front ↔ /api/meetings (src/services/reunioes.mapping.ts).
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ErroReunioes,
  MENSAGEM_CONFLITO,
  contraparteDoBack,
  erroDaApi,
  fromBackStatus,
  gerarCodigo,
  paraDetailsRequest,
  paraMeetingCreateRequest,
  reuniaoDoBack,
  toBackStatus,
  type CounterpartBack,
  type MeetingResponseBack,
} from "../src/services/reunioes.mapping.ts";

const BASE: MeetingResponseBack = {
  id: 42,
  title: "Apresentação de pitch",
  agenda: null,
  startsAt: "2026-11-12T17:00:00Z",
  endsAt: "2026-11-12T17:45:00Z",
  durationMinutes: 45,
  meetingUrl: "https://meet.google.com/abc-defg-hij",
  status: "PENDENTE",
  cancelReason: null,
  organizer: true,
  participant: { id: 12, name: "Tidalog", role: "STARTUP", active: true },
  createdAt: "2026-11-08T12:00:00Z",
  updatedAt: "2026-11-08T12:00:00Z",
  subject: "Apresentação de pitch",
  message: "Queremos conhecer a operação.",
  format: "ONLINE",
  location: null,
  suggestedTimes: ["2026-11-12T17:00:00Z", "2026-11-13T13:00:00Z", "2026-11-14T19:30:00Z"],
  proposedByMe: true,
};

const TIDALOG: CounterpartBack = {
  userId: 12,
  name: "Tidalog",
  role: "STARTUP",
  subtitle: "Logística • Seed",
  segment: "Logística",
  stage: "Seed",
  tipoInvestidor: null,
  ticketMin: null,
  ticketMax: null,
  matchScore: 87.5,
};

test("status: REALIZADA vira realizada; ida e volta dos demais", () => {
  assert.equal(fromBackStatus("PENDENTE"), "pendente");
  assert.equal(fromBackStatus("CONFIRMADA"), "confirmada");
  assert.equal(fromBackStatus("RECUSADA"), "recusada");
  assert.equal(fromBackStatus("CANCELADA"), "cancelada");
  assert.equal(fromBackStatus("REALIZADA"), "realizada");
  for (const status of ["pendente", "confirmada", "recusada", "cancelada", "realizada"] as const) {
    assert.equal(fromBackStatus(toBackStatus(status)), status);
  }
});

test("horários: sugeridos em ISO do front e confirmado só em CONFIRMADA/REALIZADA", () => {
  const pendente = reuniaoDoBack(BASE);
  assert.deepEqual(pendente.horariosSugeridos, [
    "2026-11-12T17:00:00.000Z",
    "2026-11-13T13:00:00.000Z",
    "2026-11-14T19:30:00.000Z",
  ]);
  assert.equal(pendente.horarioConfirmado, undefined);
  assert.equal(pendente.duracaoMin, 45);

  const confirmada = reuniaoDoBack({ ...BASE, status: "CONFIRMADA", startsAt: "2026-11-13T13:00:00Z" });
  assert.equal(confirmada.horarioConfirmado, "2026-11-13T13:00:00.000Z");

  const realizada = reuniaoDoBack({ ...BASE, status: "REALIZADA", startsAt: "2026-11-13T13:00:00Z" });
  assert.equal(realizada.status, "realizada");
  assert.equal(realizada.horarioConfirmado, "2026-11-13T13:00:00.000Z");

  // Reunião antiga sem suggestedTimes: o startsAt vira o único horário
  assert.deepEqual(reuniaoDoBack({ ...BASE, suggestedTimes: [] }).horariosSugeridos, ["2026-11-12T17:00:00.000Z"]);
});

test("solicitante vem de proposedByMe e organizador de organizer", () => {
  const minha = reuniaoDoBack(BASE);
  assert.equal(minha.solicitante, "eu");
  assert.equal(minha.organizador, "eu");

  const recebida = reuniaoDoBack({ ...BASE, proposedByMe: false, organizer: false });
  assert.equal(recebida.solicitante, "outro");
  assert.equal(recebida.organizador, "outro");

  // Contraproposta da outra parte numa reunião que eu criei
  const devolvida = reuniaoDoBack({ ...BASE, proposedByMe: false, organizer: true });
  assert.equal(devolvida.solicitante, "outro");
  assert.equal(devolvida.organizador, "eu");
});

test("formato, local, assunto, mensagem, link, ids e código", () => {
  const presencial = reuniaoDoBack({
    ...BASE,
    format: "PRESENCIAL",
    meetingUrl: null,
    location: { name: "Porto Digital", address: "Rua do Apolo, 181", reference: null },
  });
  assert.equal(presencial.formato, "presencial");
  assert.deepEqual(presencial.local, { nome: "Porto Digital", endereco: "Rua do Apolo, 181" });
  assert.equal(presencial.link, undefined);

  const online = reuniaoDoBack(BASE);
  assert.equal(online.formato, "online");
  assert.equal(online.link, "https://meet.google.com/abc-defg-hij");
  assert.equal(online.assunto, "Apresentação de pitch");
  assert.equal(online.mensagem, "Queremos conhecer a operação.");
  assert.equal(online.id, "42");
  assert.equal(online.unioId, "12");
  assert.equal(online.codigo, gerarCodigo("42"));
  assert.match(online.codigo, /^UNIO-\d{4}$/);

  // Assunto fora das 4 opções do front (ex.: reunião antiga)
  assert.equal(reuniaoDoBack({ ...BASE, subject: null }).assunto, "Outro");
});

test("contraparte: usa a lista do counterparts e cai para o participante", () => {
  const contrapartes = new Map([["12", contraparteDoBack(TIDALOG)]]);
  const comLista = reuniaoDoBack(BASE, contrapartes);
  assert.equal(comLista.contraparte.matchPercentual, 88);
  assert.deepEqual(comLista.contraparte.selos, ["Logística", "Seed"]);

  const semLista = reuniaoDoBack(BASE);
  assert.equal(semLista.contraparte.nome, "Tidalog");
  assert.equal(semLista.contraparte.matchPercentual, undefined);
  assert.equal(semLista.contraparte.cargoEmpresa, undefined);
});

test("counterparts: sem score o selo some e nada é inventado", () => {
  const investidor = contraparteDoBack({
    userId: 7,
    name: "rafael",
    role: "INVESTOR",
    subtitle: "Investidor Anjo",
    segment: null,
    stage: null,
    tipoInvestidor: "Investidor Anjo",
    ticketMin: 50000,
    ticketMax: 200000,
    matchScore: null,
  });
  assert.equal(investidor.id, "7");
  assert.equal(investidor.tipo, "investidor");
  assert.equal(investidor.matchPercentual, undefined);
  assert.equal(investidor.cargoEmpresa, "Investidor Anjo");
  assert.deepEqual(investidor.destaque, { rotulo: "Ticket", valor: "R$ 50k a 200k" });
  assert.equal(investidor.perfilHref, undefined);

  const semTicket = contraparteDoBack({ ...TIDALOG, role: "INVESTOR", tipoInvestidor: null, matchScore: null });
  assert.equal(semTicket.destaque, undefined);
  assert.equal(semTicket.cargoEmpresa, undefined);
});

test("criação: nomes do back, UTC, local só no presencial", () => {
  const online = paraMeetingCreateRequest({
    unioId: "12",
    assunto: "Mentoria",
    duracaoMin: 30,
    formato: "online",
    horarios: ["2026-11-12T17:00:00.000Z", "2026-11-13T13:00:00.000Z"],
    mensagem: "  Olá!  ",
    link: "https://meet.google.com/abc",
  });
  assert.deepEqual(online, {
    participantId: 12,
    subject: "Mentoria",
    durationMinutes: 30,
    suggestedTimes: ["2026-11-12T17:00:00.000Z", "2026-11-13T13:00:00.000Z"],
    format: "ONLINE",
    message: "Olá!",
    meetingUrl: "https://meet.google.com/abc",
  });

  const presencial = paraMeetingCreateRequest({
    unioId: "12",
    assunto: "Outro",
    duracaoMin: 60,
    formato: "presencial",
    horarios: ["2026-11-12T17:00:00.000Z"],
    link: "https://ignorado.com",
    local: { nome: "Porto Digital", endereco: "Rua do Apolo, 181" },
  });
  assert.equal(presencial.format, "PRESENCIAL");
  assert.equal(presencial.meetingUrl, undefined);
  assert.equal(presencial.locationName, "Porto Digital");
  assert.equal(presencial.locationAddress, "Rua do Apolo, 181");
  assert.equal(presencial.locationReference, undefined);
});

test("details: link vazio apaga e local substitui o inteiro", () => {
  assert.deepEqual(paraDetailsRequest({ link: " " }), { meetingUrl: "" });
  assert.deepEqual(paraDetailsRequest({ local: { nome: "Cais", endereco: "Rua X", referencia: "Sala 3" } }), {
    location: { name: "Cais", address: "Rua X", reference: "Sala 3" },
  });
});

function erroAxios(status: number, data: unknown) {
  return { isAxiosError: true, response: { status, data } };
}

test("erro 409 de agenda vira mensagem amigável; outros 409 mantêm o texto", () => {
  const conflito = erroDaApi(
    erroAxios(409, { message: "Esse horário já está ocupado por uma reunião confirmada de um dos participantes" }),
    "padrão",
  );
  assert.ok(conflito instanceof ErroReunioes);
  assert.equal(conflito.status, 409);
  assert.equal(conflito.message, MENSAGEM_CONFLITO);
  assert.equal(erroDaApi(erroAxios(409, {}), "padrão").message, MENSAGEM_CONFLITO);
  assert.equal(
    erroDaApi(erroAxios(409, { message: "O horário da reunião já passou" }), "padrão").message,
    "O horário da reunião já passou",
  );
});

test("erro 400 vem por campo do front", () => {
  const erro = erroDaApi(
    erroAxios(400, {
      message: "Informe de 1 a 3 horários sugeridos",
      errors: [
        { field: "suggestedTimes", defaultMessage: "Informe de 1 a 3 horários sugeridos" },
        { field: "meetingUrl", defaultMessage: "O link da reunião deve começar com https://" },
        { field: "location.name", defaultMessage: "O nome do local deve ter no máximo 150 caracteres" },
      ],
    }),
    "padrão",
  );
  assert.equal(erro.status, 400);
  assert.deepEqual(erro.campos, {
    horarios: "Informe de 1 a 3 horários sugeridos",
    link: "O link da reunião deve começar com https://",
    local: "O nome do local deve ter no máximo 150 caracteres",
  });
  assert.equal(erro.message, "Informe de 1 a 3 horários sugeridos");

  // 400 do service (sem errors[]): usa a mensagem do back
  const semCampos = erroDaApi(erroAxios(400, { message: "O horário escolhido não está entre os sugeridos" }), "padrão");
  assert.equal(semCampos.message, "O horário escolhido não está entre os sugeridos");
  assert.deepEqual(semCampos.campos, {});
});

test("sem resposta do servidor e erros desconhecidos", () => {
  assert.match(erroDaApi({ isAxiosError: true }, "padrão").message, /conectar ao servidor/);
  assert.equal(erroDaApi(new Error("x"), "padrão").message, "padrão");
  assert.equal(erroDaApi(erroAxios(500, {}), "padrão").message, "padrão");
});
