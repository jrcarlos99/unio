// Único lugar do front que conhece o JSON de /api/admin/moderation/** (D063 do
// back, ADR-013). Funções puras, testadas com node.
import type {
  BlocoCanvas,
  ContaModeracao,
  EnvioPitch,
  FiltroContas,
  PaginaModeracao,
  SituacaoConta,
  SituacaoEnvio,
  TipoConta,
} from "../pages/admin/types";

// moderation/dto/AccountModerationItem
export interface ContaModeracaoBack {
  userId: number | string;
  email: string | null;
  role: string;
  nome: string | null;
  status: string;
  reason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  profileComplete: boolean;
}

// moderation/dto/PitchModerationItem
export interface EnvioPitchBack {
  id: number | string;
  startupId: number | string;
  startupName: string | null;
  startupEmail: string | null;
  version: number;
  status: string;
  reason: string | null;
  current: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  shortPitch: string | null;
  videoUrl: string | null;
  leanCanvas: Record<string, string | null> | null;
}

// moderation/dto/ModerationPage
export interface PaginaModeracaoBack<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

// Mesma ordem de LEAN_CANVAS_FIELDS (utils/pitch.ts), sem importar a tela
export const ORDEM_CANVAS = [
  "problem",
  "solution",
  "keyMetrics",
  "uniqueValueProposition",
  "unfairAdvantage",
  "channels",
  "customerSegments",
  "costStructure",
  "revenueStreams",
] as const;

export const LIMITE_PAGINA = 20;

const SITUACOES_CONTA: SituacaoConta[] = ["APROVADO", "PENDENTE", "RECUSADO", "SUSPENSO"];
const SITUACOES_ENVIO: SituacaoEnvio[] = ["EM_REVISAO", "PUBLICADO", "REMOVIDO"];

function texto(valor: unknown) {
  return typeof valor === "string" ? valor : "";
}

function textoOuNulo(valor: unknown) {
  const limpo = texto(valor).trim();
  return limpo ? limpo : null;
}

function tipoDaConta(role: string): TipoConta {
  const papel = role.toUpperCase();
  if (papel === "STARTUP") return "Startup";
  if (papel === "INVESTOR") return "Investidor";
  return "Admin";
}

export function contaDoBack(conta: ContaModeracaoBack): ContaModeracao {
  return {
    id: String(conta.userId),
    email: texto(conta.email),
    tipo: tipoDaConta(String(conta.role ?? "")),
    nome: textoOuNulo(conta.nome),
    // Situação desconhecida não vira "aprovada" por engano: aparece como pendente
    situacao: SITUACOES_CONTA.find((situacao) => situacao === conta.status) ?? "PENDENTE",
    motivo: textoOuNulo(conta.reason),
    revisadoPor: textoOuNulo(conta.reviewedBy),
    revisadoEm: conta.reviewedAt ?? null,
    dataCadastro: conta.createdAt ?? null,
    perfilCompleto: Boolean(conta.profileComplete),
  };
}

export function canvasDoBack(canvas: Record<string, string | null> | null | undefined): BlocoCanvas[] {
  return ORDEM_CANVAS.map((chave) => ({ chave, texto: texto(canvas?.[chave]).trim() }));
}

export function envioDoBack(envio: EnvioPitchBack): EnvioPitch {
  return {
    id: String(envio.id),
    startupId: String(envio.startupId),
    startupNome: textoOuNulo(envio.startupName),
    startupEmail: textoOuNulo(envio.startupEmail),
    versao: typeof envio.version === "number" ? envio.version : 0,
    situacao: SITUACOES_ENVIO.find((situacao) => situacao === envio.status) ?? "EM_REVISAO",
    motivo: textoOuNulo(envio.reason),
    atual: Boolean(envio.current),
    enviadoEm: envio.submittedAt ?? null,
    revisadoEm: envio.reviewedAt ?? null,
    revisadoPor: textoOuNulo(envio.reviewedBy),
    pitchCurto: texto(envio.shortPitch).trim(),
    videoUrl: textoOuNulo(envio.videoUrl),
    canvas: canvasDoBack(envio.leanCanvas),
  };
}

export function paginaDoBack<B, F>(pagina: PaginaModeracaoBack<B>, mapear: (item: B) => F): PaginaModeracao<F> {
  return {
    total: typeof pagina.total === "number" ? pagina.total : 0,
    limite: typeof pagina.limit === "number" ? pagina.limit : LIMITE_PAGINA,
    deslocamento: typeof pagina.offset === "number" ? pagina.offset : 0,
    itens: (pagina.items ?? []).map(mapear),
  };
}

// Query string de GET /api/admin/moderation/accounts (campos vazios ficam de fora)
export function parametrosContas(filtro: FiltroContas): Record<string, string | number> {
  const parametros: Record<string, string | number> = { limit: LIMITE_PAGINA, offset: filtro.deslocamento };
  if (filtro.situacao) parametros.status = filtro.situacao;
  if (filtro.perfil) parametros.role = filtro.perfil;
  const busca = filtro.busca.trim();
  if (busca) parametros.q = busca;
  return parametros;
}

// Botões de cada situação: aprovar quem espera ou foi recusado, suspender
// quem está ativo, reativar quem está suspenso e recusar quem ainda não foi
export function acoesDaConta(situacao: SituacaoConta): Array<"aprovar" | "recusar" | "suspender" | "reativar"> {
  switch (situacao) {
    case "PENDENTE":
      return ["aprovar", "recusar"];
    case "APROVADO":
      return ["suspender", "recusar"];
    case "SUSPENSO":
      return ["reativar", "recusar"];
    case "RECUSADO":
      return ["aprovar"];
  }
}

// Ações de um envio: só o atual; aprovar o que não está publicado e remover o que não foi removido
export function acoesDoEnvio(envio: EnvioPitch): Array<"aprovar" | "remover"> {
  if (!envio.atual) return [];
  const acoes: Array<"aprovar" | "remover"> = [];
  if (envio.situacao !== "PUBLICADO") acoes.push("aprovar");
  if (envio.situacao !== "REMOVIDO") acoes.push("remover");
  return acoes;
}

export const MOTIVO_MIN = 3;
export const MOTIVO_MAX = 255;

// Mesma regra do back (ModerationActions.requireReason)
export function erroDoMotivo(motivo: string): string | null {
  const limpo = motivo.trim();
  if (limpo.length < MOTIVO_MIN) return `Escreva o motivo, com pelo menos ${MOTIVO_MIN} caracteres.`;
  if (limpo.length > MOTIVO_MAX) return `O motivo pode ter no máximo ${MOTIVO_MAX} caracteres.`;
  return null;
}
