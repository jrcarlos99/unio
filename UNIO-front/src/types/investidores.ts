import type { Disponibilidade, Estagio, RegiaoInteresse, Segmento, TipoPerfil } from "./index";
import type { Compatibilidade, Motivo, RefScorecard, StatusInteresse } from "./discovery";

// Tipos dos investidores vistos pela startup (aba "Investidores", Salvos,
// Meus unios e perfil do investidor). Vêm de /api/discovery (ADR-008 e
// ADR-011). Campos que o back não tem ficam null ou vazios e as telas os
// escondem.

export interface InvestidorDescoberta {
  id: string;
  nome: string;
  // "Investidor Anjo", "Mentor" ou "Ambos" (mesma lista do cadastro)
  tipo: TipoPerfil;
  cidade: string;
  uf: string;
  verificado: boolean;
  // Tese de investimento em uma ou duas frases (card e busca)
  tese: string;
  segmentosInteresse: Segmento[];
  estagiosInteresse: Estagio[];
  // Ticket em reais; null para quem só mentora
  ticketMin: number | null;
  ticketMax: number | null;
  regioesInteresse: RegiaoInteresse[];
  // Texto livre da região no back, quando não cabe nas opções acima
  regiaoTexto?: string | null;
  disponibilidade: Disponibilidade | null;
  // Startups em que investiu (anjo) ou que mentorou (mentor); null = sem dado
  portfolio: number | null;
  // Perfil completo (tela /investidores/:id)
  bio: string;
  tesePrincipal: string;
  buscaEmStartups: string[];
  comoApoia: string[];
  // Ano em que começou a investir/mentorar
  desde: number | null;
  portfolioPortoDigital: number | null;
  tempoResposta: string | null;
}

// Investidor como chega nas telas: dados + compatibilidade + estado da startup
export interface InvestidorRecomendado {
  investidor: InvestidorDescoberta;
  compatibilidade: Compatibilidade;
  statusInteresse: StatusInteresse;
  salvo: boolean;
  // Popularidade visível em % (RF10). Nula abaixo do mínimo: sem selo.
  popularidade?: number | null;
  // Par do scorecard para o feedback (VIEWED, INTERESTED)
  scorecard?: RefScorecard | null;
}

// Perfil completo: inclui os motivos de "Por que você viu este investidor"
export interface InvestidorDetalhe extends InvestidorRecomendado {
  motivos: Motivo[];
}

export interface FiltrosInvestidores {
  busca?: string;
  segmento?: Segmento | null;
  // "Investidor Anjo" inclui quem é "Ambos"; idem para "Mentor"
  tipo?: Exclude<TipoPerfil, "Ambos"> | null;
}

// Resumo da startup logada mostrado no topo da aba
export interface ResumoStartupInvestidores {
  segmento: Segmento | null;
  estagio: Estagio | null;
  // Faixa do onboarding ("R$ 200 a 500 mil") ou valor do perfil formatado
  capitalProcurado: string | null;
}
