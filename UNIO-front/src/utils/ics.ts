// Geração de arquivo .ics (iCalendar, RFC 5545) no front, para a pessoa
// adicionar a reunião confirmada ao Google Agenda, Outlook ou Apple. Funções
// puras (testadas em tests/ics.test.ts); o download fica em baixarIcs().

export interface EventoIcs {
  // Estável: a mesma reunião sempre gera o mesmo UID (reimportar atualiza)
  uid: string;
  inicio: string;
  duracaoMin: number;
  titulo: string;
  descricao?: string;
  local?: string;
  url?: string;
}

// "2026-11-12T17:00:00.000Z" → "20261112T170000Z"
export function formatarDataIcs(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

// Escapa \ ; , e quebras de linha nos campos de texto
export function escaparTextoIcs(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

const LIMITE_OCTETOS = 75;
const codificador = new TextEncoder();

// Linhas com mais de 75 octetos continuam na linha seguinte, começando com
// espaço (sem quebrar caracteres acentuados no meio)
export function dobrarLinha(linha: string): string {
  if (codificador.encode(linha).length <= LIMITE_OCTETOS) return linha;
  const partes: string[] = [];
  let atual = "";
  let octetos = 0;
  for (const caractere of linha) {
    const tamanho = codificador.encode(caractere).length;
    const limite = partes.length === 0 ? LIMITE_OCTETOS : LIMITE_OCTETOS - 1;
    if (octetos + tamanho > limite) {
      partes.push(atual);
      atual = "";
      octetos = 0;
    }
    atual += caractere;
    octetos += tamanho;
  }
  partes.push(atual);
  return partes.join("\r\n ");
}

export function gerarConteudoIcs(evento: EventoIcs, agora: Date = new Date()): string {
  const fim = new Date(new Date(evento.inicio).getTime() + evento.duracaoMin * 60 * 1000).toISOString();
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UNIO//Reunioes//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${evento.uid}`,
    `DTSTAMP:${formatarDataIcs(agora.toISOString())}`,
    `DTSTART:${formatarDataIcs(evento.inicio)}`,
    `DTEND:${formatarDataIcs(fim)}`,
    `SUMMARY:${escaparTextoIcs(evento.titulo)}`,
  ];
  if (evento.descricao) linhas.push(`DESCRIPTION:${escaparTextoIcs(evento.descricao)}`);
  if (evento.local) linhas.push(`LOCATION:${escaparTextoIcs(evento.local)}`);
  if (evento.url) linhas.push(`URL:${evento.url}`);
  linhas.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");
  return `${linhas.map(dobrarLinha).join("\r\n")}\r\n`;
}

// Baixa o conteúdo como arquivo .ics (só no navegador)
export function baixarIcs(nomeArquivo: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
