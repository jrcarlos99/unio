// Tipos usados só dentro da área do admin. Tudo vem do back (ADR-010 e
// ADR-011); os JSON do back são lidos só em services/admin.mapping.ts.

export type TipoConta = "Startup" | "Investidor" | "Admin";

// Uma conta de GET /api/admin/users
export interface UsuarioCadastrado {
  id: string;
  email: string;
  tipo: TipoConta;
  // ISO; null se o back não mandar
  dataCadastro: string | null;
  // Conta excluída pelo titular (LGPD): o back anonimiza e marca deletedAt
  excluida: boolean;
}

// Moderação de cadastros (GET /api/admin/moderation/accounts, D063 do back).
// Sem registro no back, a conta vale APROVADO.
export type SituacaoConta = "APROVADO" | "PENDENTE" | "RECUSADO" | "SUSPENSO";
export type PerfilModerado = "STARTUP" | "INVESTOR";
export type AcaoConta = "aprovar" | "recusar" | "suspender" | "reativar";

export interface ContaModeracao {
  id: string;
  email: string;
  tipo: TipoConta;
  // Nome da startup; null para investidor ou startup sem perfil
  nome: string | null;
  situacao: SituacaoConta;
  motivo: string | null;
  revisadoPor: string | null;
  revisadoEm: string | null;
  dataCadastro: string | null;
  perfilCompleto: boolean;
}

export interface FiltroContas {
  situacao: SituacaoConta | "";
  perfil: PerfilModerado | "";
  busca: string;
  deslocamento: number;
}

// Moderação de conteúdo (GET /api/admin/moderation/content)
export type SituacaoEnvio = "EM_REVISAO" | "PUBLICADO" | "REMOVIDO";

export interface BlocoCanvas {
  chave: string;
  texto: string;
}

export interface EnvioPitch {
  id: string;
  startupId: string;
  startupNome: string | null;
  startupEmail: string | null;
  versao: number;
  situacao: SituacaoEnvio;
  motivo: string | null;
  // false: a startup já mandou um envio mais novo; só o atual aceita ação
  atual: boolean;
  enviadoEm: string | null;
  revisadoEm: string | null;
  revisadoPor: string | null;
  pitchCurto: string;
  videoUrl: string | null;
  // Os nove blocos, na ordem de leitura do canvas
  canvas: BlocoCanvas[];
}

export interface PaginaModeracao<T> {
  total: number;
  limite: number;
  deslocamento: number;
  itens: T[];
}

// Uma linha do log de auditoria (GET /api/admin/audit)
export interface LogEntry {
  id: string;
  dataHora: string;
  usuario: string;
  acao: string;
}

// Um card de número no topo da Visão Geral. O back não tem histórico, então
// não há variação nem sparkline (ADR-010).
export interface Metrica {
  label: string;
  valor: number;
}

export interface FatiaSegmento {
  segmento: string;
  quantidade: number;
}

export interface RegiaoCadastro {
  local: string;
  quantidade: number;
}
