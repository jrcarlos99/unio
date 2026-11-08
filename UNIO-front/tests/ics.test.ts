// Testes da geração do .ics (utils/ics.ts). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { dobrarLinha, escaparTextoIcs, formatarDataIcs, gerarConteudoIcs } from "../src/utils/ics.ts";

const EVENTO = {
  uid: "abc-123@unio.app",
  inicio: "2026-11-12T17:00:00.000Z",
  duracaoMin: 45,
  titulo: "Pitch Verde Pay",
  descricao: "Apresentação de pitch com Verde Pay (UNIO).\nID #UNIO-9842",
  url: "https://meet.google.com/abc-defg-hij",
};

test("datas em UTC no formato básico", () => {
  assert.equal(formatarDataIcs("2026-11-12T17:00:00.000Z"), "20261112T170000Z");
});

test("gera VEVENT com DTSTART/DTEND em UTC, SUMMARY, DESCRIPTION, URL e UID estável", () => {
  const agora = new Date("2026-11-08T12:00:00.000Z");
  const ics = gerarConteudoIcs(EVENTO, agora);
  const linhas = ics.split("\r\n");
  assert.equal(linhas[0], "BEGIN:VCALENDAR");
  assert.ok(linhas.includes("BEGIN:VEVENT"));
  assert.ok(linhas.includes("UID:abc-123@unio.app"));
  assert.ok(linhas.includes("DTSTAMP:20261108T120000Z"));
  assert.ok(linhas.includes("DTSTART:20261112T170000Z"));
  assert.ok(linhas.includes("DTEND:20261112T174500Z"));
  assert.ok(linhas.includes("SUMMARY:Pitch Verde Pay"));
  assert.ok(linhas.includes("URL:https://meet.google.com/abc-defg-hij"));
  assert.ok(ics.includes("DESCRIPTION:Apresentação de pitch com Verde Pay (UNIO).\\nID #UNIO-9842"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  // Mesmo evento → mesmo UID
  assert.equal(gerarConteudoIcs(EVENTO, agora), ics);
});

test("presencial usa LOCATION com o texto escapado", () => {
  const ics = gerarConteudoIcs({ ...EVENTO, url: undefined, local: "Porto Digital, Cais do Apolo; 222" });
  assert.ok(ics.includes("LOCATION:Porto Digital\\, Cais do Apolo\\; 222"));
  assert.ok(!ics.includes("URL:"));
});

test("escapa caracteres especiais", () => {
  assert.equal(escaparTextoIcs("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});

test("linhas longas são dobradas em até 75 octetos", () => {
  const longa = `DESCRIPTION:${"ação ".repeat(40)}`;
  const dobrada = dobrarLinha(longa);
  const partes = dobrada.split("\r\n");
  assert.ok(partes.length > 1);
  const encoder = new TextEncoder();
  assert.ok(partes.every((parte) => encoder.encode(parte).length <= 75));
  assert.ok(partes.slice(1).every((parte) => parte.startsWith(" ")));
  assert.equal(partes.map((parte, i) => (i === 0 ? parte : parte.slice(1))).join(""), longa);
});
