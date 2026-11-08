import type {
  Segmento,
  Estagio,
  Necessidade,
  TipoPerfil,
  Disponibilidade,
  FaixaCapital,
  PreferenciaStartup,
  FormaInteracao,
  RegiaoInteresse,
} from "../types";
import type { ModeloNegocio, TamanhoEquipe, TracaoStartup } from "../types/onboarding";

export const SEGMENTOS: Segmento[] = [
  "Fintech",
  "HealthTech",
  "EdTech",
  "AgTech",
  "Economia Criativa",
  "Outro",
];

export const ESTAGIOS: Estagio[] = ["Ideação", "MVP", "Operação", "Escala"];

export const NECESSIDADES: Necessidade[] = [
  "Investimento",
  "Mentoria",
  "Networking",
  "Validação de mercado",
];

export const TIPOS_PERFIL: TipoPerfil[] = [
  "Investidor Anjo",
  "Mentor",
  "Ambos",
];

// ---------------------------------------------------------------------------
// Opções detalhadas (onboarding). Ficam aqui pra onboarding, perfil e home
// poderem reaproveitar. Os ícones de cada opção ficam em components/onboarding/icons.ts,
// pra este arquivo continuar sendo só dado.
// ---------------------------------------------------------------------------

export interface OpcaoDetalhada<T extends string> {
  valor: T;
  // Rótulo pequeno acima do título (ex.: "Finanças & Banking")
  categoria?: string;
  descricao?: string;
}

// Lista completa dos 12 segmentos. O SEGMENTOS acima continua com a lista
// curta usada nos filtros da home do investidor e no editor de perfil.
export const SEGMENTOS_DETALHADOS: OpcaoDetalhada<Segmento>[] = [
  { valor: "Fintech", categoria: "Finanças & Banking" },
  { valor: "HealthTech", categoria: "Saúde & Bem-estar" },
  { valor: "EdTech", categoria: "Educação" },
  { valor: "AgTech", categoria: "Agronegócio" },
  { valor: "Economia Criativa", categoria: "Cultura & Mídia" },
  { valor: "Games", categoria: "Jogos Digitais" },
  { valor: "Logística", categoria: "Transporte & Entregas" },
  { valor: "Energia", categoria: "Energia Limpa" },
  // \u2011 = hífen que não quebra a linha (senão o "E-" fica sozinho)
  { valor: "Varejo", categoria: "Comércio & E\u2011commerce" },
  { valor: "Sustentabilidade", categoria: "ESG & Clima" },
  { valor: "SaaS B2B", categoria: "Software Corporativo" },
  { valor: "Turismo", categoria: "Viagens & Hospitalidade" },
];

export const ESTAGIOS_DETALHADOS: OpcaoDetalhada<Estagio>[] = [
  { valor: "Ideação", descricao: "Só a ideia e a validação inicial" },
  { valor: "MVP", descricao: "Produto básico no ar, primeiros usuários" },
  { valor: "Operação", descricao: "Receita recorrente e clientes ativos" },
  { valor: "Escala", descricao: "Crescimento acelerado e expansão" },
];

export const FAIXAS_CAPITAL: FaixaCapital[] = [
  "Até R$ 50 mil",
  "R$ 50 a 200 mil",
  "R$ 200 a 500 mil",
  "Acima de R$ 500 mil",
];

// Faixa mostrada com o selo "Mais comum" na escolha do ticket
export const FAIXA_CAPITAL_MAIS_COMUM: FaixaCapital = "R$ 50 a 200 mil";

export const DISPONIBILIDADES_DETALHADAS: OpcaoDetalhada<Disponibilidade>[] = [
  { valor: "Baixa", descricao: "até 2h por mês" },
  { valor: "Média", descricao: "2 a 5h por mês" },
  { valor: "Alta", descricao: "mais de 5h por mês" },
];

export const PREFERENCIAS_STARTUP: PreferenciaStartup[] = [
  "Time fundador completo",
  "Primeiros clientes pagantes",
  "Protótipo funcional",
  "Pitch já estruturado",
];

export const FORMAS_INTERACAO: FormaInteracao[] = [
  "Mensagens",
  "Reuniões online",
  "Encontros presenciais no Recife",
];

export const REGIOES_INTERESSE: RegiaoInteresse[] = [
  "Recife / Porto Digital",
  "Pernambuco",
  "Nordeste",
  "Todo o Brasil",
  "Aberto a startups remotas",
];

export const TRACOES_STARTUP: TracaoStartup[] = [
  "Já tenho clientes pagantes",
  "Tenho usuários ativos",
  "Protótipo funcional",
  "Primeiras vendas",
  "Ainda em validação",
];

export const TAMANHOS_EQUIPE: TamanhoEquipe[] = ["1 a 2", "3 a 5", "6 a 10", "Mais de 10"];

export const MODELOS_NEGOCIO: ModeloNegocio[] = [
  "B2B",
  "B2C",
  "B2B2C",
  "Marketplace",
  "SaaS / assinatura",
  "Outro",
];

export const SUGESTOES_MERCADO_ALVO = [
  "PMEs",
  "Grandes empresas",
  "Consumidor final",
  "Setor público",
] as const;
