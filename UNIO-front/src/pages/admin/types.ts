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
