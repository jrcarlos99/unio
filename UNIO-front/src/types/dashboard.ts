import type { Estagio, FaixaCapital, Necessidade, Segmento } from "./index";

// Tipos da home da startup ("Visão geral"). Tudo vem do back (ADR-011); null
// = a chamada daquele bloco falhou e a tela mostra "indisponível". Ver o
// comentário no topo de services/dashboardStartup.mapping.ts.

export interface MetricasStartup {
  // Visualizações dos últimos 28 dias
  visualizacoes: number | null;
  // Variação em relação aos 28 dias anteriores, em % (18 = +18%)
  variacaoVisualizacoes: number | null;
  // Investidores que clicaram "Tenho interesse" na startup
  interessados: number | null;
  // Interesse dos dois lados (match mútuo)
  matches: number | null;
}

export interface PontoSemana {
  semana: string;
  atual: number;
  anterior: number;
}

export interface EtapaFunil {
  rotulo: string;
  // null: sem dado do back (a chamada falhou)
  valor: number | null;
}

export interface ResumoStartup {
  // ISO: quando os números foram calculados
  atualizadoEm: string;
  metricas: MetricasStartup;
  visualizacoesSemanais: PontoSemana[] | null;
  // Visualizar perfil → interesse → match mútuo → reunião marcada
  funil: EtapaFunil[];
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
  id: "canvas" | "mercadoDetalhado";
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
