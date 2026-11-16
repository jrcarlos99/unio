import type { UserProfile } from "../contexts/AuthContext";
import type { PerfilApp } from "./recomendacoes";

// Tipos das reuniões entre unios (investidor e startup que deram match).
// Não existe chat nem vídeo na plataforma: a reunião tem data, horário e um
// link (online) ou local (presencial) informado por quem organiza.
//
// Datas sempre em ISO (UTC) no armazenamento; a tela formata no fuso fixo
// America/Recife (GMT-3), em pt-BR, com a semana começando na segunda.

// "realizada": confirmada que já aconteceu e foi marcada com "Compareci"
// (POST /api/meetings/{id}/complete no back). Libera a avaliação (RF10).
export type StatusReuniao = "pendente" | "confirmada" | "recusada" | "cancelada" | "realizada";

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

// Quem chama o serviço de reuniões. No mock identifica o localStorage e os
// unios; com a API o token já identifica o usuário e o e-mail só separa o que
// fica guardado no navegador (última lista vista e notificações).
export interface SessaoReunioes {
  user: UserProfile | null;
  perfil: PerfilApp;
}

export interface ContraparteReuniao {
  // Mock: mesmo id do unio (startup.id ou investidor.id). API: userId do back
  id: string;
  nome: string;
  subtitulo: string;
  // Sem score calculado (API) o selo de match não aparece
  matchPercentual?: number;
  iniciais: string;
  tipo: "startup" | "investidor";
  // Ex.: "Rafael Moura, CEO e cofundador" ou "Investidor Anjo, Recife".
  // Fica de fora quando o back não traz o dado.
  cargoEmpresa?: string;
  // Segmento e estágio (startup) ou segmentos e estágios de interesse (investidor)
  selos: string[];
  // "Captação atual" (startup vista pelo investidor) ou "Ticket"/"Mentoria"
  // (investidor visto pela startup)
  destaque?: { rotulo: string; valor: string };
  // Perfil completo dentro do app (só no mock: as páginas de perfil ainda
  // usam os dados de exemplo)
  perfilHref?: string;
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
  // 30, 45 ou 60 nas telas; reuniões antigas do back podem ter de 15 a 240
  duracaoMin: number;
  formato: FormatoReuniao;
  mensagem?: string;
  pauta?: string;
  // ISO, até 3
  horariosSugeridos: string[];
  horarioConfirmado?: string;
  link?: string;
  local?: LocalReuniao;
  status: StatusReuniao;
  // Motivo do cancelamento, quando informado (ex.: "Não aconteceu")
  motivoCancelamento?: string;
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

// "avaliar": a reunião foi marcada como realizada e falta a sua avaliação
export type TipoNotificacao = "recebida" | "aceita" | "recusada" | "proposta" | "cancelada" | "avaliar";

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
