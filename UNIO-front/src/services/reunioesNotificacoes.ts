// Notificações de reunião no modo API (ADR-005). O back não tem endpoint de
// notificações: o front compara a lista atual de GET /api/meetings com a
// última lista vista (guardada no navegador) e cria os avisos. Funções puras,
// testadas em tests/reunioesNotificacoes.test.ts.
import type {
  LadoReuniao,
  NotificacaoReuniao,
  Reuniao,
  StatusReuniao,
  TipoNotificacao,
} from "../types/reunioes.ts";
import { formatarDataCurta, formatarHora } from "../utils/datas.ts";

export interface ReuniaoVista {
  status: StatusReuniao;
  solicitante: LadoReuniao;
  horarioConfirmado?: string;
}

// id da reunião → como estava na última lista vista
export type ListaVista = Record<string, ReuniaoVista>;

export function vistaDe(reuniao: Reuniao): ReuniaoVista {
  return {
    status: reuniao.status,
    solicitante: reuniao.solicitante,
    ...(reuniao.horarioConfirmado ? { horarioConfirmado: reuniao.horarioConfirmado } : {}),
  };
}

export function fotografar(reunioes: Reuniao[]): ListaVista {
  const lista: ListaVista = {};
  for (const reuniao of reunioes) lista[reuniao.id] = vistaDe(reuniao);
  return lista;
}

function quando(iso: string) {
  return `${formatarDataCurta(iso)} às ${formatarHora(iso)}`;
}

function ehRecebida(vista: Pick<ReuniaoVista, "status" | "solicitante">) {
  return vista.status === "pendente" && vista.solicitante === "outro";
}

// Texto e tipo do aviso para a mudança de `antes` para `reuniao` (null = nada)
function avisoDaMudanca(antes: ReuniaoVista | undefined, reuniao: Reuniao): { tipo: TipoNotificacao; texto: string } | null {
  const nome = reuniao.contraparte.nome;
  if (!antes) {
    return ehRecebida(reuniao) ? { tipo: "recebida", texto: `${nome} solicitou uma reunião: ${reuniao.assunto}.` } : null;
  }
  if (antes.status === reuniao.status && antes.solicitante === reuniao.solicitante) return null;

  if (ehRecebida(reuniao)) {
    if (antes.status === "confirmada") return { tipo: "proposta", texto: `${nome} pediu para remarcar a reunião.` };
    if (antes.status === "pendente") return { tipo: "proposta", texto: `${nome} propôs outros horários.` };
    return null;
  }
  if (antes.status !== "pendente" || antes.solicitante !== "eu") {
    return reuniao.status === "cancelada" && antes.status !== "cancelada" && antes.status !== "recusada"
      ? { tipo: "cancelada", texto: `${nome} cancelou a reunião.` }
      : null;
  }
  // Antes: proposta minha aguardando a outra parte
  if (reuniao.status === "confirmada" && reuniao.horarioConfirmado) {
    return { tipo: "aceita", texto: `${nome} aceitou sua solicitação para ${quando(reuniao.horarioConfirmado)}.` };
  }
  if (reuniao.status === "recusada") return { tipo: "recusada", texto: `${nome} recusou sua solicitação.` };
  if (reuniao.status === "cancelada") return { tipo: "cancelada", texto: `${nome} cancelou a solicitação.` };
  return null;
}

// Avisos novos (mais recente primeiro). "recebida": pendente da outra parte
// que não estava na última lista; "aceita", "recusada" e "cancelada": o status
// de uma reunião mudou; "proposta": a outra parte devolveu com outros horários.
export function derivarNotificacoes(
  anterior: ListaVista,
  atuais: Reuniao[],
  agora: Date,
  novoId: () => string,
): NotificacaoReuniao[] {
  const novas: NotificacaoReuniao[] = [];
  for (const reuniao of atuais) {
    const aviso = avisoDaMudanca(anterior[reuniao.id], reuniao);
    if (!aviso) continue;
    novas.push({ id: novoId(), tipo: aviso.tipo, reuniaoId: reuniao.id, texto: aviso.texto, em: agora.toISOString(), lida: false });
  }
  return novas.reverse();
}

export const MAX_NOTIFICACOES = 30;

export function juntarNotificacoes(novas: NotificacaoReuniao[], atuais: NotificacaoReuniao[]) {
  return [...novas, ...atuais].slice(0, MAX_NOTIFICACOES);
}
