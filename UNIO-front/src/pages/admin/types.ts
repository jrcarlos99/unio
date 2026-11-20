// Tipos usados só dentro da área do admin (src/admin).

export type TipoCadastro = "Startup" | "Investidor";
export type StatusCadastro = "Pendente" | "Aprovado" | "Rejeitado";

// Detalhes do perfil reaproveitando os campos do RF01 (startup) e RF02 (investidor)
export interface DetalhesCadastro {
  segmento?: string;
  estagio?: string;
  necessidades?: string[];
  descricao?: string;
  tipoPerfil?: string;
  areaInteresse?: string[];
  ticketMedio?: number | null;
  disponibilidade?: string;
}

export interface CadastroPendente {
  id: string;
  nome: string;
  tipo: TipoCadastro;
  dataCadastro: string;
  status: StatusCadastro;
  detalhes: DetalhesCadastro;
}

export interface ConteudoPublicado {
  id: string;
  startup: string;
  trecho: string;
  dataPublicacao: string;
  sinalizado: boolean;
}

export interface PontoEvolucao {
  periodo: string;
  matches: number;
}

// Uma linha do log de auditoria (alimentado pelas ações de moderação)
export interface LogEntry {
  id: string;
  dataHora: string;
  usuario: string;
  acao: string;
}

// Um card de métrica no topo da Visão Geral: valor + variação + um
// mini-histórico (sparkline) dos últimos períodos. Variação e sparkline só
// existem nos dados de exemplo; o back não tem histórico (ADR-010).
export interface Metrica {
  label: string;
  valor: number;
  variacaoPercentual?: number;
  sparkline?: number[];
}

export interface FatiaSegmento {
  segmento: string;
  quantidade: number;
}

export interface RegiaoCadastro {
  local: string;
  quantidade: number;
}

export interface PerfilAdmin {
  nome: string;
  cargo: string;
  iniciais: string;
}
