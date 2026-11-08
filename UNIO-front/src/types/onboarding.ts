import type {
  Disponibilidade,
  Estagio,
  Necessidade,
  FaixaCapital,
  FormaInteracao,
  PreferenciaStartup,
  RegiaoInteresse,
  Segmento,
} from "./index";

export type PerfilOnboarding = "investidor" | "startup";

// Situação do onboarding de um usuário. "pendente" = ainda não concluiu nem
// pulou, então o login/cadastro manda pra rota de onboarding.
export type StatusOnboarding = "pendente" | "concluido" | "pulado";

// Respostas do onboarding do investidor/mentor. Os nomes seguem os do back
// sempre que existe um campo parecido (ver services/onboarding.mapping.ts).
export interface RespostasInvestidor {
  // Passo 1
  segmentosInteresse: Segmento[];
  // Passo 2
  estagiosInteresse: Estagio[];
  preferenciasStartup: PreferenciaStartup[];
  // Passo 3
  ticketMedio: FaixaCapital | null;
  apenasMentor: boolean;
  disponibilidade: Disponibilidade | null;
  formasInteracao: FormaInteracao[];
  // Passo 4
  regioesInteresse: RegiaoInteresse[];
  consentimentoLgpd: boolean;
}

export type TracaoStartup =
  | "Já tenho clientes pagantes"
  | "Tenho usuários ativos"
  | "Protótipo funcional"
  | "Primeiras vendas"
  | "Ainda em validação";

export type TamanhoEquipe =
  | "1 a 2"
  | "3 a 5"
  | "6 a 10"
  | "Mais de 10";

export type ModeloNegocio =
  | "B2B"
  | "B2C"
  | "B2B2C"
  | "Marketplace"
  | "SaaS / assinatura"
  | "Outro";

export interface RespostasStartup {
  // Obrigatório no back (StartupCreateRequest.nome); pedido no passo 1
  nome: string;
  segmento: Segmento | null;
  estagio: Estagio | null;
  necessidades: Necessidade[];
  capitalProcurado: FaixaCapital | null;
  localizacao: string;
  tracao: TracaoStartup[];
  tamanhoEquipe: TamanhoEquipe | null;
  modeloNegocio: ModeloNegocio | null;
  mercadoAlvo: string;
  pitch: string;
  consentimentoLgpd: boolean;
}
