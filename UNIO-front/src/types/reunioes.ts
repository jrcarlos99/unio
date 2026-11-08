// Tipos das reuniões entre unios (investidor e startup que deram match).
// Não existe chat nem vídeo na plataforma: a reunião tem data, horário e um
// link (online) ou local (presencial) informado por quem organiza.
//
// Datas sempre em ISO (UTC) no armazenamento; a tela formata no fuso fixo
// America/Recife (GMT-3), em pt-BR, com a semana começando na segunda.

export type StatusReuniao = "pendente" | "confirmada" | "recusada" | "cancelada";

export type AssuntoReuniao = "Apresentação de pitch" | "Conversa sobre investimento" | "Mentoria" | "Outro";

export const ASSUNTOS_REUNIAO: AssuntoReuniao[] = [
  "Apresentação de pitch",
  "Conversa sobre investimento",
  "Mentoria",
  "Outro",
];

export type DuracaoReuniao = 30 | 45 | 60;

export const DURACOES_REUNIAO: DuracaoReuniao[] = [30, 45, 60];

export type FormatoReuniao = "online" | "presencial";

// "eu" = o usuário logado; "outro" = a contraparte
export type LadoReuniao = "eu" | "outro";

export const MAX_HORARIOS_SUGERIDOS = 3;
export const MAX_CARACTERES_MENSAGEM = 280;

export interface ContraparteReuniao {
  // Mesmo id do unio (startup.id ou investidor.id)
  id: string;
  nome: string;
  subtitulo: string;
  matchPercentual: number;
  iniciais: string;
  tipo: "startup" | "investidor";
  // Ex.: "Rafael Moura, CEO e cofundador" ou "Investidor Anjo, Recife"
  cargoEmpresa: string;
  // Segmento e estágio (startup) ou segmentos e estágios de interesse (investidor)
  selos: string[];
  // "Captação atual" (startup vista pelo investidor) ou "Ticket"/"Mentoria"
  // (investidor visto pela startup)
  destaque?: { rotulo: string; valor: string };
  // Perfil completo dentro do app
  perfilHref: string;
}

export interface ParticipanteReuniao {
  nome: string;
  cargo: string;
  papel: "Host" | "Organizador";
}

export interface LocalReuniao {
  nome: string;
  endereco: string;
  referencia?: string;
}

export interface Reuniao {
  id: string;
  unioId: string;
  // Quem fez a proposta de horários que está valendo. Numa pendente, quem
  // responde é sempre o outro lado: "outro" = solicitação recebida.
  solicitante: LadoReuniao;
  // Quem criou a reunião: só ele informa ou edita o link/local
  organizador: LadoReuniao;
  contraparte: ContraparteReuniao;
  participante?: ParticipanteReuniao;
  assunto: AssuntoReuniao;
  duracaoMin: DuracaoReuniao;
  formato: FormatoReuniao;
  mensagem?: string;
  pauta?: string;
  // ISO, até 3
  horariosSugeridos: string[];
  horarioConfirmado?: string;
  link?: string;
  local?: LocalReuniao;
  status: StatusReuniao;
  criadaEm: string;
  atualizadaEm: string;
  // Ex.: "UNIO-9842"
  codigo: string;
}

export interface IntervaloDatas {
  // ISO, inclusivo
  inicio: string;
  // ISO, exclusivo
  fim: string;
}

export interface DadosSolicitacao {
  unioId: string;
  assunto: AssuntoReuniao;
  duracaoMin: DuracaoReuniao;
  formato: FormatoReuniao;
  horarios: string[];
  mensagem?: string;
  link?: string;
  local?: LocalReuniao;
}

export type AcaoResposta = "aceitar" | "recusar" | "propor";

export interface RespostaSolicitacao {
  acao: AcaoResposta;
  // Obrigatório em "aceitar": um dos horários sugeridos
  horario?: string;
  // Obrigatório em "propor": até 3 novos horários
  novosHorarios?: string[];
}

export type ValorLinkOuLocal = { link: string } | { local: LocalReuniao };

export type TipoNotificacao = "recebida" | "aceita" | "recusada" | "proposta" | "cancelada";

export interface NotificacaoReuniao {
  id: string;
  tipo: TipoNotificacao;
  reuniaoId: string;
  texto: string;
  em: string;
  lida: boolean;
}

export interface ArquivoIcs {
  nomeArquivo: string;
  conteudo: string;
}
