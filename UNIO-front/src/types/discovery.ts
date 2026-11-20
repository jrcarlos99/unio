import type {
  Disponibilidade,
  Estagio,
  FaixaCapital,
  Necessidade,
  RegiaoInteresse,
  Segmento,
} from "./index";

// Tipos da descoberta de startups pelo investidor (telas "Descobrir" e
// "Perfil da startup"). No modo mock vêm de mocks/startupsMock.ts; no modo API,
// de /api/discovery (ADR-008). Campos que o back não tem ficam null e as telas
// os escondem (nunca inventam).

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
  fundacao: number | null;
  verificada: boolean;
  descricao: string;
  tags: string[];
  necessidades: Necessidade[];
  // null = o back não tem o dado (modo API): a tela esconde o campo
  tamanhoEquipe: number | null;
  modeloNegocio: string;
  mercadoAlvo: string;
  canvas: CanvasPitch | null;
  captacao: Captacao | null;
  metrica: MetricaDestaque | null;
  // Capital procurado do perfil do back, em reais (modo API; null se não informado)
  capitalProcurado?: number | null;
  icone?: IconeStartup;
  corLogo: CorLogo;
  // MOCK: a startup já demonstrou interesse no investidor, então o clique em
  // "Tenho interesse" vira match na hora. No back isso viria do lado da startup.
  interesseReciproco: boolean;
}

// Startup de exemplo (modo mock): sempre com todos os campos preenchidos
export interface StartupDescobertaCompleta extends StartupDescoberta {
  fundacao: number;
  tamanhoEquipe: number;
  canvas: CanvasPitch;
  captacao: Captacao;
  metrica: MetricaDestaque;
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
  // Só os critérios que existem na fonte: no modo API não há "disponibilidade"
  // no scorecard, então ela não aparece (ADR-008)
  notas: Partial<NotasCompatibilidade>;
  // Modo API: classificação do scorecard (EXCELENTE, FORTE...) e próximo passo
  classificacao?: string | null;
  proximoPasso?: string | null;
  fonte?: "local" | "scorecard";
}

// Compatibilidade calculada no front (modo mock): sempre com as cinco notas
export interface CompatibilidadeLocal extends Compatibilidade {
  notas: NotasCompatibilidade;
}

// Par do scorecard no back, usado no feedback do algoritmo (modo API)
export interface RefScorecard {
  startupId: string;
  investorId: string;
  scorePolicyId: number;
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
  // Modo API: par do scorecard para o feedback (VIEWED, INTERESTED)
  scorecard?: RefScorecard | null;
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
