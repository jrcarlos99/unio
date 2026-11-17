import type { Estagio, FaixaCapital, Necessidade, Segmento } from "./index";

// Tipos da home da startup ("Visão geral"). No modo API, visualizações, série
// semanal e reuniões vêm do back; o resto ainda é exemplo (ADR-007). Ver o
// comentário no topo de services/dashboardStartupService.ts.

export interface MetricasStartup {
  visualizacoes: number;
  // variação em relação ao mês anterior, em % (18 = +18%)
  variacaoVisualizacoes: number;
  // investidores que clicaram "Tenho interesse" na startup
  interessados: number;
  interessadosNovosSemana: number;
  // interessados que a startup também aceitou (match mútuo)
  matches: number;
  scoreMinimoMatches: number;
  // Unios em que a startup abriu um canal externo (WhatsApp, e-mail, telefone).
  // Não há chat na plataforma.
  contatosIniciados: number;
}

export interface PontoSemana {
  semana: string;
  atual: number;
  anterior: number;
}

export interface EtapaFunil {
  rotulo: string;
  valor: number;
  // Etapa sem dado do back (modo API): mostrada com o aviso "exemplo"
  exemplo?: boolean;
}

// Blocos que, no modo API, ainda mostram dados de exemplo (selo "Dados de
// exemplo"). Ausente no modo mock, que é todo de exemplo e não leva selo.
export interface BlocosDeExemplo {
  visualizacoes: boolean;
  interessados: boolean;
  matches: boolean;
  grafico: boolean;
  funil: boolean;
}

export interface ResumoStartup {
  // ISO: quando os números foram calculados
  atualizadoEm: string;
  metricas: MetricasStartup;
  visualizacoesSemanais: PontoSemana[];
  // Visualizar perfil → interesse → contato iniciado → reunião marcada
  funil: EtapaFunil[];
  // Faixa de mercado da conversão visualização → reunião, em %
  benchmark: { min: number; max: number };
  exemplo?: BlocosDeExemplo;
}

// Dados da startup logada usados na home (perfil do back + onboarding)
export interface DadosStartup {
  segmento: Segmento | null;
  estagio: Estagio | null;
  localizacao: string;
  modeloNegocio: string;
  mercadoAlvo: string;
  pitch: string;
  tamanhoEquipe: string;
  tracao: string[];
  necessidades: Necessidade[];
  // Faixa do onboarding, ou valor exato vindo do perfil do back
  capitalProcurado: FaixaCapital | number | null;
}

export interface ItemCompletude {
  id: "canvas" | "logo" | "mercadoDetalhado";
  rotulo: string;
  // pontos percentuais que o item soma ao perfil
  pontos: number;
  concluido: boolean;
}

export interface CompletudePerfil {
  percentual: number;
  nivel: "Bronze" | "Prata" | "Ouro";
  itens: ItemCompletude[];
}
