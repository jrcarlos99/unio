import type {
  Disponibilidade,
  Estagio,
  FaixaCapital,
  Necessidade,
  RegiaoInteresse,
  Segmento,
} from "./index";

// Tipos da descoberta de startups pelo investidor (telas "Descobrir" e
// "Perfil da startup"). Nada disso existe no back ainda — ver o comentário no
// topo de services/discoveryService.ts.

// Relacionamento investidor ↔ startup (match mútuo):
// - nenhum: o investidor ainda não se manifestou
// - enviado: o investidor demonstrou interesse; a startup ainda não respondeu
// - match: os dois demonstraram interesse (só aí abre conversa/reunião)
export type StatusInteresse = "nenhum" | "enviado" | "match";

// Ícone da logo (mapeado para lucide em components/discovery/StartupLogo.tsx).
// Sem ícone, a logo vira um monograma com as iniciais do nome.
export type IconeStartup =
  | "digital"
  | "pulso"
  | "folha"
  | "capelo"
  | "caminhao"
  | "paleta"
  | "raio"
  | "coracao"
  | "carrinho"
  | "codigo"
  | "mala"
  | "controle";

export type CorLogo = "escuro" | "salvia" | "neutro";

export interface CanvasPitch {
  problema: string;
  solucao: string;
  mercado: string;
  tracao: string;
}

export interface Captacao {
  // valores em reais
  meta: number;
  captado: number;
  valuation: number;
  // percentual (9.3 = 9,3%)
  equity: number;
  instrumento: string;
  // ex.: "Pré-Seed", "Seed", "Série A", "Anjo"
  rodada: string;
  investidoresConfirmados: number;
}

// Métrica de destaque no rodapé do card (Valuation, ARR atual, Hectares...)
export interface MetricaDestaque {
  rotulo: string;
  valor: string;
}

export interface StartupDescoberta {
  id: string;
  nome: string;
  segmento: Segmento;
  // Segmentos em que a startup também atua (contam como match parcial)
  segmentosSecundarios: Segmento[];
  // Selo do card (ex.: "HealthTech AI", "AgTech & Clima")
  categoria: string;
  estagio: Estagio;
  cidade: string;
  uf: string;
  // Atende/opera remotamente (conta pra "Aberto a startups remotas")
  remota: boolean;
  fundacao: number;
  verificada: boolean;
  descricao: string;
  tags: string[];
  necessidades: Necessidade[];
  tamanhoEquipe: number;
  modeloNegocio: string;
  mercadoAlvo: string;
  canvas: CanvasPitch;
  captacao: Captacao;
  metrica: MetricaDestaque;
  icone?: IconeStartup;
  corLogo: CorLogo;
  // MOCK: a startup já demonstrou interesse no investidor, então o clique em
  // "Tenho interesse" vira match na hora. No back isso viria do lado da startup.
  interesseReciproco: boolean;
}

// Notas de 0 a 100 de cada critério da tese
export interface NotasCompatibilidade {
  segmento: number;
  estagio: number;
  ticket: number;
  regiao: number;
  disponibilidade: number;
}

export type CriterioCompatibilidade = keyof NotasCompatibilidade;

export interface Compatibilidade {
  total: number;
  notas: NotasCompatibilidade;
}

// Trecho de texto de um motivo; `forte` = negrito (ex.: "Atua em **Fintech**")
export interface TrechoMotivo {
  texto: string;
  forte?: boolean;
}

export type Motivo = TrechoMotivo[];

// Startup como chega nas telas: dados + compatibilidade + estado do usuário
export interface StartupRecomendada {
  startup: StartupDescoberta;
  compatibilidade: Compatibilidade;
  statusInteresse: StatusInteresse;
  salvo: boolean;
  // Popularidade visível em % (RF10). Nula abaixo do mínimo de avaliações:
  // sem selo. Nunca é somada à compatibilidade exibida.
  popularidade?: number | null;
}

// Perfil completo: inclui os motivos de "Por que você viu esta startup"
export interface StartupDetalhe extends StartupRecomendada {
  motivos: Motivo[];
}

export interface FiltrosDescoberta {
  busca?: string;
  segmento?: Segmento | null;
  estagio?: Estagio | null;
}

// Dados do investidor usados no cálculo (vêm das respostas do onboarding)
export interface TeseInvestidor {
  segmentosInteresse: Segmento[];
  estagiosInteresse: Estagio[];
  ticketMedio: FaixaCapital | null;
  apenasMentor: boolean;
  disponibilidade: Disponibilidade | null;
  regioesInteresse: RegiaoInteresse[];
}
