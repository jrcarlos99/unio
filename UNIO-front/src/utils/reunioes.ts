import type { Reuniao, StatusReuniao } from "../types/reunioes";
import { diaSemanaFala, formatarFaixaHorario } from "./datas";

// Textos e links das reuniões usados pelas telas. Links externos (sala da
// reunião, Google Maps) só são montados a partir de valores validados aqui.

// Só https, com host; devolve a URL normalizada ou null
export function validarLinkHttps(texto: string | undefined | null): string | null {
  const valor = texto?.trim() ?? "";
  if (!valor) return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

// "meet.google.com"
export function dominioDoLink(link: string): string {
  const valido = validarLinkHttps(link);
  return valido ? new URL(valido).hostname.replace(/^www\./, "") : "";
}

export function linkGoogleMaps(endereco: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco.trim())}`;
}

// "Pitch Verde Pay", "Mentoria com Marcos Andrade"...
export function tituloReuniao(reuniao: Pick<Reuniao, "assunto" | "contraparte">): string {
  const nome = reuniao.contraparte.nome;
  switch (reuniao.assunto) {
    case "Apresentação de pitch":
      return reuniao.contraparte.tipo === "startup" ? `Pitch ${nome}` : `Pitch para ${nome}`;
    case "Conversa sobre investimento":
      return `Investimento com ${nome}`;
    case "Mentoria":
      return `Mentoria com ${nome}`;
    default:
      return `Reunião com ${nome}`;
  }
}

export const ROTULO_STATUS: Record<StatusReuniao, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

export function ehRecebidaPendente(reuniao: Reuniao) {
  return reuniao.status === "pendente" && reuniao.solicitante === "outro";
}

export function ehEnviadaPendente(reuniao: Reuniao) {
  return reuniao.status === "pendente" && reuniao.solicitante === "eu";
}

// Horário que representa a reunião: o confirmado ou o primeiro sugerido
export function horarioPrincipal(reuniao: Reuniao): string {
  return reuniao.horarioConfirmado ?? reuniao.horariosSugeridos[0];
}

// "Pitch Verde Pay, quinta, 14:00 a 14:45, confirmada"
export function descreverEvento(reuniao: Reuniao, inicio: string): string {
  const status = reuniao.status === "pendente" ? "aguardando confirmação" : ROTULO_STATUS[reuniao.status].toLowerCase();
  return `${tituloReuniao(reuniao)}, ${diaSemanaFala(inicio)}, ${formatarFaixaHorario(inicio, reuniao.duracaoMin)}, ${status}`;
}

// Tooltip do bloco: assunto, nome, horário e status
export function tooltipEvento(reuniao: Reuniao, inicio: string): string {
  const status = reuniao.status === "pendente" ? "Aguardando confirmação" : ROTULO_STATUS[reuniao.status];
  return `${reuniao.assunto} com ${reuniao.contraparte.nome}, ${diaSemanaFala(inicio)}, ${formatarFaixaHorario(
    inicio,
    reuniao.duracaoMin,
  )}, ${status}`;
}
