// Mapeamento entre as reuniões do front (types/reunioes.ts) e o /api/meetings
// do back (D032 a D039 em unio/docs/decisoes.md; ADR-005). É o ÚNICO lugar
// que conhece os nomes do back. Funções puras, testadas em
// tests/reunioes.mapping.test.ts (por isso os imports com .ts e sem axios).
import {
  ASSUNTOS_REUNIAO,
  type AssuntoReuniao,
  type ContraparteReuniao,
  type DadosSolicitacao,
  type Reuniao,
  type StatusReuniao,
  type ValorLinkOuLocal,
} from "../types/reunioes.ts";
import { formatarFaixaTicket } from "../utils/formatoDescoberta.ts";
import { ehIdDoBack, paraIdDoBack } from "../utils/idsBack.ts";
import { iniciais } from "../utils/nomeUsuario.ts";

// ---------------------------------------------------------------------------
// Formato do back
// ---------------------------------------------------------------------------

export type StatusBack = "PENDENTE" | "CONFIRMADA" | "RECUSADA" | "CANCELADA" | "REALIZADA";
export type FormatoBack = "ONLINE" | "PRESENCIAL";
export type PapelBack = "STARTUP" | "INVESTOR";

export interface ParticipanteBack {
  id: number;
  name: string;
  role: PapelBack | string;
  active: boolean;
}

export interface LocalBack {
  name: string | null;
  address: string | null;
  reference: string | null;
}

export interface MeetingResponseBack {
  id: number;
  title: string;
  agenda: string | null;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  meetingUrl: string | null;
  status: StatusBack;
  cancelReason: string | null;
  organizer: boolean;
  participant: ParticipanteBack;
  createdAt: string;
  updatedAt: string;
  subject: string | null;
  message: string | null;
  format: FormatoBack;
  location: LocalBack | null;
  suggestedTimes: string[];
  proposedByMe: boolean;
}

export interface CounterpartBack {
  userId: number;
  name: string;
  role: PapelBack | string;
  subtitle: string;
  segment: string | null;
  stage: string | null;
  tipoInvestidor: string | null;
  ticketMin: number | null;
  ticketMax: number | null;
  matchScore: number | null;
}

export interface MeetingCreateRequestBack {
  participantId: number;
  subject: string;
  durationMinutes: number;
  suggestedTimes: string[];
  format: FormatoBack;
  message?: string;
  meetingUrl?: string;
  locationName?: string;
  locationAddress?: string;
  locationReference?: string;
}

export interface MeetingDetailsRequestBack {
  meetingUrl?: string;
  location?: { name: string; address: string; reference: string | null };
}

// ---------------------------------------------------------------------------
// Status, lados e datas
// ---------------------------------------------------------------------------

const PARA_BACK: Record<StatusReuniao, StatusBack> = {
  pendente: "PENDENTE",
  confirmada: "CONFIRMADA",
  recusada: "RECUSADA",
  cancelada: "CANCELADA",
  realizada: "REALIZADA",
};

export function toBackStatus(status: StatusReuniao): StatusBack {
  return PARA_BACK[status];
}

// REALIZADA é um status do front desde a ADR-006 ("Compareci")
export function fromBackStatus(status: StatusBack): StatusReuniao {
  switch (status) {
    case "PENDENTE":
      return "pendente";
    case "RECUSADA":
      return "recusada";
    case "CANCELADA":
      return "cancelada";
    case "REALIZADA":
      return "realizada";
    default:
      return "confirmada";
  }
}

// O back devolve Instant ("2026-11-05T17:00:00Z"); o front guarda sempre o
// formato de toISOString ("...:00.000Z") para comparar horários como texto
export function isoDoBack(instante: string): string {
  return new Date(instante).toISOString();
}

// Sempre UTC para o back (toISOString)
export function isoParaBack(iso: string): string {
  return new Date(iso).toISOString();
}

// Código curto e estável a partir do id ("UNIO-9842")
export function gerarCodigo(id: string) {
  let hash = 0;
  for (const caractere of id) hash = (hash * 31 + caractere.charCodeAt(0)) >>> 0;
  return `UNIO-${1000 + (hash % 9000)}`;
}

function assuntoDoBack(subject: string | null): AssuntoReuniao {
  return ASSUNTOS_REUNIAO.find((assunto) => assunto === subject) ?? "Outro";
}

function textoOuNada(valor: string | null | undefined): string | undefined {
  const limpo = valor?.trim();
  return limpo ? limpo : undefined;
}

// ---------------------------------------------------------------------------
// Contrapartes
// ---------------------------------------------------------------------------

// Só o que o endpoint traz: o que faltar fica de fora, sem inventar texto
export function contraparteDoBack(item: CounterpartBack): ContraparteReuniao {
  const tipo = item.role === "STARTUP" ? "startup" : "investidor";
  const contraparte: ContraparteReuniao = {
    id: String(item.userId),
    nome: item.name,
    subtitulo: item.subtitle,
    iniciais: iniciais(item.name),
    tipo,
    selos: [],
    // A contraparte é sempre do outro perfil: a rota existe para quem vê
    perfilHref: `${tipo === "startup" ? "/startups" : "/investidores"}/${encodeURIComponent(String(item.userId))}`,
  };
  if (item.matchScore !== null && item.matchScore !== undefined) {
    contraparte.matchPercentual = Math.round(Number(item.matchScore));
  }
  if (tipo === "startup") {
    contraparte.selos = [item.segment, item.stage].map(textoOuNada).filter((selo): selo is string => !!selo);
  } else {
    const tipoInvestidor = textoOuNada(item.tipoInvestidor);
    if (tipoInvestidor) contraparte.cargoEmpresa = tipoInvestidor;
    if (item.ticketMin !== null && item.ticketMax !== null) {
      contraparte.destaque = {
        rotulo: "Ticket",
        valor: formatarFaixaTicket(Number(item.ticketMin), Number(item.ticketMax), " a "),
      };
    }
  }
  return contraparte;
}

// Quando a pessoa não está na lista de contrapartes (ex.: removeu a conta)
export function contraparteDoParticipante(participante: ParticipanteBack): ContraparteReuniao {
  const tipo = participante.role === "STARTUP" ? "startup" : "investidor";
  return {
    id: String(participante.id),
    nome: participante.name,
    subtitulo: tipo === "startup" ? "Startup" : "Investidor",
    iniciais: iniciais(participante.name),
    tipo,
    selos: [],
  };
}

// ---------------------------------------------------------------------------
// Reunião
// ---------------------------------------------------------------------------

export function reuniaoDoBack(
  meeting: MeetingResponseBack,
  contrapartes: ReadonlyMap<string, ContraparteReuniao> = new Map(),
): Reuniao {
  const id = String(meeting.id);
  const unioId = String(meeting.participant.id);
  const status = fromBackStatus(meeting.status);
  const sugeridos = (meeting.suggestedTimes?.length ? meeting.suggestedTimes : [meeting.startsAt]).map(isoDoBack);
  const confirmada = meeting.status === "CONFIRMADA" || meeting.status === "REALIZADA";
  const formato = meeting.format === "PRESENCIAL" ? "presencial" : "online";

  const reuniao: Reuniao = {
    id,
    unioId,
    // proposedByMe verdadeiro: a proposta vigente é minha e quem responde é o outro
    solicitante: meeting.proposedByMe ? "eu" : "outro",
    organizador: meeting.organizer ? "eu" : "outro",
    contraparte: contrapartes.get(unioId) ?? contraparteDoParticipante(meeting.participant),
    assunto: assuntoDoBack(meeting.subject),
    duracaoMin: meeting.durationMinutes,
    formato,
    horariosSugeridos: sugeridos,
    status,
    criadaEm: isoDoBack(meeting.createdAt),
    atualizadaEm: isoDoBack(meeting.updatedAt),
    codigo: gerarCodigo(id),
  };
  const mensagem = textoOuNada(meeting.message);
  if (mensagem) reuniao.mensagem = mensagem;
  const motivo = textoOuNada(meeting.cancelReason);
  if (motivo && status === "cancelada") reuniao.motivoCancelamento = motivo;
  const pauta = textoOuNada(meeting.agenda);
  if (pauta) reuniao.pauta = pauta;
  if (confirmada) reuniao.horarioConfirmado = isoDoBack(meeting.startsAt);
  const link = textoOuNada(meeting.meetingUrl);
  if (link) reuniao.link = link;
  if (meeting.location && (meeting.location.name || meeting.location.address)) {
    const referencia = textoOuNada(meeting.location.reference);
    reuniao.local = {
      nome: meeting.location.name ?? "",
      endereco: meeting.location.address ?? "",
      ...(referencia ? { referencia } : {}),
    };
  }
  return reuniao;
}

// ---------------------------------------------------------------------------
// Com quem (ADR-007): só ids reais do back viram participantId
// ---------------------------------------------------------------------------

export const MENSAGEM_ESCOLHA_CADASTRADO = "Escolha um usuário cadastrado da lista.";
// Popup aberto a partir de um perfil que não está na lista de contrapartes
// (sem match mútuo ou conta excluída)
export const MENSAGEM_CONTATO_SEM_MATCH = `Esta pessoa não está entre os seus matches. ${MENSAGEM_ESCOLHA_CADASTRADO}`;

// participantId do POST /api/meetings. Lança ErroReunioes (com o erro no campo
// "unioId") quando o id não é um inteiro positivo: nunca sai NaN nem null.
export function idDoParticipante(unioId: string): number {
  const id = paraIdDoBack(unioId);
  if (id === null) {
    throw new ErroReunioes(MENSAGEM_ESCOLHA_CADASTRADO, undefined, { unioId: MENSAGEM_ESCOLHA_CADASTRADO });
  }
  return id;
}

// O id escolhido é um usuário real que está na lista de contrapartes?
export function contraparteValida(id: string | undefined, contrapartes: readonly { id: string }[]): boolean {
  return !!id && ehIdDoBack(id) && contrapartes.some((contraparte) => contraparte.id === id);
}

// Pré-seleção do modal: o unio do popup só vem marcado se for um
// usuário real da lista; senão o modal abre sem ninguém escolhido
export function preSelecaoDeContraparte(
  unioInicial: string | undefined,
  contrapartes: readonly { id: string }[],
): string {
  return unioInicial && contraparteValida(unioInicial, contrapartes) ? unioInicial : "";
}

export function paraMeetingCreateRequest(dados: DadosSolicitacao): MeetingCreateRequestBack {
  const corpo: MeetingCreateRequestBack = {
    participantId: idDoParticipante(dados.unioId),
    subject: dados.assunto,
    durationMinutes: dados.duracaoMin,
    suggestedTimes: dados.horarios.map(isoParaBack),
    format: dados.formato === "presencial" ? "PRESENCIAL" : "ONLINE",
  };
  const mensagem = textoOuNada(dados.mensagem);
  if (mensagem) corpo.message = mensagem;
  if (dados.formato === "online") {
    const link = textoOuNada(dados.link);
    if (link) corpo.meetingUrl = link;
  } else if (dados.local) {
    const nome = textoOuNada(dados.local.nome);
    const endereco = textoOuNada(dados.local.endereco);
    const referencia = textoOuNada(dados.local.referencia);
    if (nome) corpo.locationName = nome;
    if (endereco) corpo.locationAddress = endereco;
    if (referencia) corpo.locationReference = referencia;
  }
  return corpo;
}

// Link vazio apaga; local substitui o inteiro
export function paraDetailsRequest(valor: ValorLinkOuLocal): MeetingDetailsRequestBack {
  if ("link" in valor) return { meetingUrl: valor.link.trim() };
  return {
    location: {
      name: valor.local.nome.trim(),
      address: valor.local.endereco.trim(),
      reference: textoOuNada(valor.local.referencia) ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export const MENSAGEM_CONFLITO = "Esse horário já está ocupado para um dos participantes.";

// Nome do campo no back → nome do campo no front (DadosSolicitacao)
const CAMPOS_FRONT: Record<string, string> = {
  participantId: "unioId",
  subject: "assunto",
  title: "assunto",
  durationMinutes: "duracaoMin",
  suggestedTimes: "horarios",
  startsAt: "horarios",
  message: "mensagem",
  format: "formato",
  meetingUrl: "link",
  locationName: "local",
  locationAddress: "local",
  locationReference: "local",
  location: "local",
};

// "suggestedTimes[0]" e "location.name" contam como o campo de fora
function campoDoFront(campo: string): string {
  const raiz = campo.split(/[.[]/)[0];
  return CAMPOS_FRONT[raiz] ?? raiz;
}

export class ErroReunioes extends Error {
  readonly status?: number;
  // Erros de validação (400) por campo do front
  readonly campos: Record<string, string>;

  constructor(mensagem: string, status?: number, campos: Record<string, string> = {}) {
    super(mensagem);
    this.name = "ErroReunioes";
    this.status = status;
    this.campos = campos;
  }
}

interface RespostaErro {
  status?: number;
  data?: unknown;
}

function respostaDoErro(erro: unknown): RespostaErro | null {
  if (!erro || typeof erro !== "object" || !("response" in erro)) return null;
  const resposta = (erro as { response?: RespostaErro }).response;
  return resposta ?? null;
}

// Erro do axios → mensagem amigável. 409 de agenda vira MENSAGEM_CONFLITO;
// 400 traz os erros por campo (errors[].field + defaultMessage).
export function erroDaApi(erro: unknown, padrao: string): ErroReunioes {
  if (erro instanceof ErroReunioes) return erro;
  const resposta = respostaDoErro(erro);
  if (!resposta) {
    const semRede = erro && typeof erro === "object" && "isAxiosError" in erro;
    return new ErroReunioes(
      semRede ? "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente." : padrao,
    );
  }
  const status = resposta.status;
  const dados = (resposta.data && typeof resposta.data === "object" ? resposta.data : {}) as {
    message?: unknown;
    errors?: unknown;
  };
  const mensagemBack = typeof dados.message === "string" && dados.message.trim() ? dados.message.trim() : "";

  if (status === 409) {
    // Os outros 409 (status inválido, horário que já passou) já vêm em pt-BR
    if (!mensagemBack || /ocupad|conflit/i.test(mensagemBack)) return new ErroReunioes(MENSAGEM_CONFLITO, 409);
    return new ErroReunioes(mensagemBack, 409);
  }

  if (status === 400) {
    const campos: Record<string, string> = {};
    if (Array.isArray(dados.errors)) {
      for (const item of dados.errors) {
        if (!item || typeof item !== "object") continue;
        const { field, defaultMessage } = item as { field?: unknown; defaultMessage?: unknown };
        if (typeof defaultMessage !== "string") continue;
        const chave = typeof field === "string" && field ? campoDoFront(field) : "geral";
        if (!campos[chave]) campos[chave] = defaultMessage;
      }
    }
    const mensagens = Object.values(campos);
    return new ErroReunioes(mensagens[0] ?? (mensagemBack || padrao), 400, campos);
  }

  if (status === 403 || status === 404) return new ErroReunioes(mensagemBack || padrao, status);
  return new ErroReunioes(padrao, status);
}
